const User = require('../models/User');
const Message = require('../models/Message');
const FriendRequest = require('../models/FriendRequest');
const Call = require('../models/Call');

const onlineUsers = new Map();

const socketHandler = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        socket.on('user_connect', async (userData) => {
            try {
                const user = await User.findById(userData.userId);
                if (user) {
                    onlineUsers.set(socket.id, { userId: user._id, username: user.username });
                    
                    await User.findByIdAndUpdate(user._id, { 
                        isOnline: true, 
                        lastSeen: new Date() 
                    });

                    socket.userId = user._id;
                    socket.username = user.username;

                    const allOnlineUsers = Array.from(onlineUsers.values());
                    io.emit('online_users', allOnlineUsers);

                    const messages = await Message.find({
                        $or: [
                            { sender: user._id },
                            { receiver: user._id }
                        ]
                    })
                    .populate('sender', 'username')
                    .populate('receiver', 'username')
                    .sort({ timestamp: 1 });

                    socket.emit('chat_history', messages);
                }
            } catch (error) {
                console.error('Error handling user connection:', error);
            }
        });

        socket.on('send_message', async (data) => {
            try {
                const { receiverId, message, mediaUrl, mediaType } = data;
                
                const newMessage = new Message({
                    sender: socket.userId,
                    receiver: receiverId,
                    message,
                    mediaUrl,
                    mediaType
                });

                await newMessage.save();
                await newMessage.populate('sender', 'username');
                await newMessage.populate('receiver', 'username');

                const receiverSocket = Array.from(onlineUsers.entries())
                    .find(([_, user]) => user.userId.toString() === receiverId);

                if (receiverSocket) {
                    io.to(receiverSocket[0]).emit('receive_message', newMessage);
                }

                socket.emit('message_sent', newMessage);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('typing_start', (data) => {
            const { receiverId } = data;
            const receiverSocket = Array.from(onlineUsers.entries())
                .find(([_, user]) => user.userId.toString() === receiverId);

            if (receiverSocket) {
                io.to(receiverSocket[0]).emit('user_typing', {
                    username: socket.username,
                    isTyping: true
                });
            }
        });

        socket.on('typing_stop', (data) => {
            const { receiverId } = data;
            const receiverSocket = Array.from(onlineUsers.entries())
                .find(([_, user]) => user.userId.toString() === receiverId);

            if (receiverSocket) {
                io.to(receiverSocket[0]).emit('user_typing', {
                    username: socket.username,
                    isTyping: false
                });
            }
        });

        socket.on('mark_messages_read', async (data) => {
            try {
                const { senderId } = data;
                await Message.updateMany(
                    { sender: senderId, receiver: socket.userId, read: false },
                    { read: true }
                );
            } catch (error) {
                console.error('Error marking messages as read:', error);
            }
        });

        socket.on('disconnect', async () => {
            console.log('User disconnected:', socket.id);
            
            if (socket.userId) {
                onlineUsers.delete(socket.id);
                
                await User.findByIdAndUpdate(socket.userId, { 
                    isOnline: false, 
                    lastSeen: new Date() 
                });

                const allOnlineUsers = Array.from(onlineUsers.values());
                io.emit('online_users', allOnlineUsers);
            }
        });

        // Friend request events
        socket.on('friend_request_sent', async (data) => {
            try {
                const { requestId } = data;
                const request = await FriendRequest.findById(requestId)
                    .populate('sender', 'username')
                    .populate('receiver', 'username');

                if (request) {
                    const receiverSocket = Array.from(onlineUsers.entries())
                        .find(([_, user]) => user.userId.toString() === request.receiver._id.toString());

                    if (receiverSocket) {
                        io.to(receiverSocket[0]).emit('friend_request_received', request);
                    }
                }
            } catch (error) {
                console.error('Error handling friend request sent:', error);
            }
        });

        socket.on('friend_request_responded', async (data) => {
            try {
                const { requestId, status } = data;
                const request = await FriendRequest.findById(requestId)
                    .populate('sender', 'username')
                    .populate('receiver', 'username');

                if (request) {
                    const senderSocket = Array.from(onlineUsers.entries())
                        .find(([_, user]) => user.userId.toString() === request.sender._id.toString());

                    if (senderSocket) {
                        io.to(senderSocket[0]).emit('friend_request_response', {
                            request,
                            status
                        });
                    }

                    if (status === 'accepted') {
                        // Notify both users about new friendship
                        io.emit('friendship_update', {
                            type: 'added',
                            users: [request.sender._id, request.receiver._id]
                        });
                    }
                }
            } catch (error) {
                console.error('Error handling friend request response:', error);
            }
        });

        // Call events
        socket.on('call_initiated', async (data) => {
            try {
                const { call } = data;
                const calleeSocket = Array.from(onlineUsers.entries())
                    .find(([_, user]) => user.userId.toString() === call.callee._id.toString());

                if (calleeSocket) {
                    io.to(calleeSocket[0]).emit('incoming_call', call);
                }
            } catch (error) {
                console.error('Error handling call initiated:', error);
            }
        });

        socket.on('call_responded', async (data) => {
            try {
                const { call, action } = data;
                const callerSocket = Array.from(onlineUsers.entries())
                    .find(([_, user]) => user.userId.toString() === call.caller._id.toString());

                if (callerSocket) {
                    io.to(callerSocket[0]).emit('call_response', {
                        call,
                        action
                    });
                }
            } catch (error) {
                console.error('Error handling call response:', error);
            }
        });

        socket.on('call_ended', async (data) => {
            try {
                const { call } = data;
                const otherUserId = call.caller._id.toString() === socket.userId.toString() 
                    ? call.callee._id.toString() 
                    : call.caller._id.toString();

                const otherUserSocket = Array.from(onlineUsers.entries())
                    .find(([_, user]) => user.userId.toString() === otherUserId);

                if (otherUserSocket) {
                    io.to(otherUserSocket[0]).emit('call_ended', call);
                }
            } catch (error) {
                console.error('Error handling call ended:', error);
            }
        });

        // WebRTC signaling
        socket.on('webrtc_offer', (data) => {
            const { targetUserId, offer } = data;
            const targetSocket = Array.from(onlineUsers.entries())
                .find(([_, user]) => user.userId.toString() === targetUserId);

            if (targetSocket) {
                io.to(targetSocket[0]).emit('webrtc_offer', {
                    offer,
                    fromUserId: socket.userId
                });
            }
        });

        socket.on('webrtc_answer', (data) => {
            const { targetUserId, answer } = data;
            const targetSocket = Array.from(onlineUsers.entries())
                .find(([_, user]) => user.userId.toString() === targetUserId);

            if (targetSocket) {
                io.to(targetSocket[0]).emit('webrtc_answer', {
                    answer,
                    fromUserId: socket.userId
                });
            }
        });

        socket.on('webrtc_ice_candidate', (data) => {
            const { targetUserId, candidate } = data;
            const targetSocket = Array.from(onlineUsers.entries())
                .find(([_, user]) => user.userId.toString() === targetUserId);

            if (targetSocket) {
                io.to(targetSocket[0]).emit('webrtc_ice_candidate', {
                    candidate,
                    fromUserId: socket.userId
                });
            }
        });
    });
};

module.exports = socketHandler;
