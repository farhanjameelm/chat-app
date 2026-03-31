const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const Friendship = require('../models/Friendship');

const sendFriendRequest = async (req, res) => {
    try {
        const { receiverId } = req.body;
        const senderId = req.session.userId;

        if (senderId === receiverId) {
            return res.status(400).json({ error: 'Cannot send friend request to yourself' });
        }

        // Check if already friends
        const existingFriendship = await Friendship.findOne({
            $or: [
                { user1: senderId, user2: receiverId },
                { user1: receiverId, user2: senderId }
            ]
        });

        if (existingFriendship) {
            return res.status(400).json({ error: 'Already friends' });
        }

        // Check if request already exists
        const existingRequest = await FriendRequest.findOne({
            $or: [
                { sender: senderId, receiver: receiverId },
                { sender: receiverId, receiver: senderId }
            ]
        });

        if (existingRequest) {
            return res.status(400).json({ error: 'Friend request already sent or received' });
        }

        const friendRequest = new FriendRequest({
            sender: senderId,
            receiver: receiverId
        });

        await friendRequest.save();
        await friendRequest.populate('sender', 'username');
        await friendRequest.populate('receiver', 'username');

        res.status(201).json({
            message: 'Friend request sent',
            request: friendRequest
        });
    } catch (error) {
        console.error('Send friend request error:', error);
        res.status(500).json({ error: 'Failed to send friend request' });
    }
};

const getFriendRequests = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const requests = await FriendRequest.find({
            receiver: userId,
            status: 'pending'
        })
        .populate('sender', 'username avatar')
        .sort({ createdAt: -1 });

        res.json(requests);
    } catch (error) {
        console.error('Get friend requests error:', error);
        res.status(500).json({ error: 'Failed to get friend requests' });
    }
};

const respondToFriendRequest = async (req, res) => {
    try {
        const { requestId, action } = req.body; // action: 'accept' or 'reject'
        const userId = req.session.userId;

        const friendRequest = await FriendRequest.findById(requestId);
        
        if (!friendRequest) {
            return res.status(404).json({ error: 'Friend request not found' });
        }

        if (friendRequest.receiver.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (friendRequest.status !== 'pending') {
            return res.status(400).json({ error: 'Request already processed' });
        }

        friendRequest.status = action === 'accept' ? 'accepted' : 'rejected';
        await friendRequest.save();

        if (action === 'accept') {
            // Create friendship
            const friendship = new Friendship({
                user1: friendRequest.sender,
                user2: friendRequest.receiver
            });
            await friendship.save();

            // Add to users' friends lists
            await User.findByIdAndUpdate(friendRequest.sender, {
                $push: { friends: friendRequest.receiver }
            });
            await User.findByIdAndUpdate(friendRequest.receiver, {
                $push: { friends: friendRequest.sender }
            });
        }

        res.json({
            message: `Friend request ${action}ed`,
            status: friendRequest.status
        });
    } catch (error) {
        console.error('Respond to friend request error:', error);
        res.status(500).json({ error: 'Failed to respond to friend request' });
    }
};

const getFriends = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const user = await User.findById(userId).populate({
            path: 'friends',
            select: 'username avatar isOnline lastSeen'
        });

        res.json(user.friends || []);
    } catch (error) {
        console.error('Get friends error:', error);
        res.status(500).json({ error: 'Failed to get friends' });
    }
};

const searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        const currentUserId = req.session.userId;

        if (!query || query.length < 2) {
            return res.status(400).json({ error: 'Query must be at least 2 characters' });
        }

        const users = await User.find({
            _id: { $ne: currentUserId },
            username: { $regex: query, $options: 'i' }
        })
        .select('username avatar isOnline lastSeen friends')
        .limit(10);

        // Check friendship status for each user
        const usersWithFriendshipStatus = await Promise.all(
            users.map(async (user) => {
                const isFriend = user.friends.includes(currentUserId);
                const hasPendingRequest = await FriendRequest.findOne({
                    $or: [
                        { sender: currentUserId, receiver: user._id, status: 'pending' },
                        { sender: user._id, receiver: currentUserId, status: 'pending' }
                    ]
                });

                return {
                    _id: user._id,
                    username: user.username,
                    avatar: user.avatar,
                    isOnline: user.isOnline,
                    lastSeen: user.lastSeen,
                    isFriend,
                    hasPendingRequest: !!hasPendingRequest,
                    requestSent: hasPendingRequest?.sender.toString() === currentUserId
                };
            })
        );

        res.json(usersWithFriendshipStatus);
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: 'Failed to search users' });
    }
};

module.exports = {
    sendFriendRequest,
    getFriendRequests,
    respondToFriendRequest,
    getFriends,
    searchUsers
};
