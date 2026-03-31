# Real-time Chat Application

A fully functional real-time chat web application with voice/video calling and friend system that allows users to send text messages, images, and videos to other online users.

## Features

### Core Features
- **User Authentication**: Simple username-based registration and login
- **Real-time Chat**: Instant messaging using Socket.IO
- **Online User Presence**: See who's online and available to chat
- **Media Sharing**: Upload and send images and videos
- **Chat History**: Persistent message storage in MongoDB
- **Responsive Design**: Mobile-friendly interface

### Advanced Features
- **Friend System**: Send, accept, and manage friend requests
- **Voice & Video Calling**: Real-time WebRTC-based calling
- **User Search**: Find and add new friends
- **Typing Indicators**: See when someone is typing
- **Message Read Receipts**: Visual indicators for message status
- **Dark Mode**: Toggle between light and dark themes
- **File Upload Validation**: Secure file handling with size limits
- **Modern UI**: Clean, intuitive chat interface with tabs

### New Premium Features
- **Friend Requests**: Build your social network
- **Voice Calls**: High-quality audio conversations
- **Video Calls**: Face-to-face video chats
- **Call History**: Track your communication
- **Online Status Management**: Real-time presence updates

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **Socket.IO** - Real-time communication
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **Multer** - File upload handling
- **Express Session** - Session management
- **UUID** - Unique identifier generation
- **Simple Peer** - WebRTC peer connections

### Frontend
- **HTML5** - Structure
- **CSS3** - Styling with modern design
- **Vanilla JavaScript** - No frameworks required
- **Socket.IO Client** - Real-time client

## Project Structure

```
nehachat/
├── controllers/
│   ├── authController.js    # Authentication logic
│   ├── friendController.js  # Friend system logic
│   ├── callController.js    # Call management logic
│   └── socketController.js  # Socket.IO handlers
├── middleware/
│   └── upload.js           # File upload middleware
├── models/
│   ├── User.js             # User schema
│   ├── Message.js          # Message schema
│   ├── FriendRequest.js    # Friend request schema
│   ├── Friendship.js       # Friendship schema
│   └── Call.js             # Call schema
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── friends.js          # Friend system routes
│   ├── calls.js            # Call management routes
│   └── upload.js           # File upload routes
├── public/
│   ├── css/
│   │   └── style.css       # Application styles
│   ├── js/
│   │   └── app.js          # Frontend JavaScript
│   └── index.html          # Main HTML file
├── uploads/                # Uploaded files directory
├── .env                    # Environment variables
├── package.json            # Dependencies and scripts
├── server.js               # Main server file
└── README.md              # This file
```

## Installation and Setup

### Prerequisites
- **Node.js** (v14 or higher)
- **MongoDB** (installed and running)

### Step 1: Clone and Install Dependencies

```bash
# Clone the repository (or navigate to the project directory)
cd nehachat

# Install dependencies
npm install
```

### Step 2: Configure Environment Variables

Create a `.env` file in the root directory with the following:

```env
MONGODB_URI=mongodb://localhost:27017/chatapp
PORT=3000
SESSION_SECRET=your-secret-key-here
```

**Note**: Replace `your-secret-key-here` with a secure random string.

### Step 3: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# On Windows (if installed as service)
net start MongoDB

# On macOS (using Homebrew)
brew services start mongodb-community

# On Linux
sudo systemctl start mongod
```

### Step 4: Run the Application

```bash
# For development (with auto-restart)
npm run dev

# For production
npm start
```

The application will be available at `http://localhost:3000`

## Usage

### Getting Started

1. **Open the Application**: Navigate to `http://localhost:3000` in your browser
2. **Enter Username**: Type a username (minimum 3 characters) and click "Start Chatting"
3. **Navigate Tabs**: Use the sidebar tabs to switch between Online Users, Friends, and Search
4. **Add Friends**: Use the Search tab to find and send friend requests
5. **Manage Requests**: Accept or reject friend requests in the Requests section
6. **Start Chatting**: Click on any online user or friend to begin a conversation

### Features in Action

#### Friend Management
- **Find Users**: Search for users by username in the Search tab
- **Send Requests**: Click the + button to send friend requests
- **Accept/Reject**: Manage incoming requests in the Requests section
- **View Friends**: See all your friends in the Friends tab

#### Voice & Video Calling
- **Initiate Calls**: Click the phone/video icons next to users or in chat header
- **Receive Calls**: Accept or reject incoming calls in the call modal
- **Call Controls**: Mute, end calls, and see call duration
- **Video Support**: Enable camera for video calls

#### Enhanced Chat
- **Real-time Messaging**: Instant message delivery with read receipts
- **Media Sharing**: Send images and videos up to 50MB
- **Typing Indicators**: See when someone is typing a message
- **Online Status**: Know who's available for conversation

#### User Interface
- **Tab Navigation**: Switch between Online, Friends, and Search views
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works seamlessly on mobile and desktop
- **Modern UI**: Clean, intuitive interface with smooth animations

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login or register with username
- `POST /api/auth/logout` - Logout current user
- `GET /api/auth/check` - Check authentication status

### Friends
- `POST /api/friends/request` - Send friend request
- `GET /api/friends/requests` - Get pending friend requests
- `POST /api/friends/respond` - Accept/reject friend request
- `GET /api/friends` - Get user's friends
- `GET /api/friends/search?query=...` - Search users

### Calls
- `POST /api/calls/initiate` - Initiate voice/video call
- `POST /api/calls/respond` - Accept/reject call
- `POST /api/calls/end` - End active call
- `GET /api/calls/history` - Get call history

### File Upload
- `POST /api/upload` - Upload image or video files

### Socket.IO Events

#### Client to Server
- `user_connect` - Notify server of user connection
- `send_message` - Send a new message
- `typing_start` - User started typing
- `typing_stop` - User stopped typing
- `mark_messages_read` - Mark messages as read
- `friend_request_sent` - Notify of sent friend request
- `friend_request_responded` - Notify of friend request response
- `call_initiated` - Notify of initiated call
- `call_responded` - Notify of call response
- `call_ended` - Notify of call end
- `webrtc_offer` - WebRTC offer signaling
- `webrtc_answer` - WebRTC answer signaling
- `webrtc_ice_candidate` - WebRTC ICE candidate

#### Server to Client
- `online_users` - List of online users
- `chat_history` - Previous messages for user
- `receive_message` - New message received
- `message_sent` - Confirmation of sent message
- `user_typing` - Typing indicator status
- `friend_request_received` - New friend request
- `friend_request_response` - Friend request response
- `friendship_update` - Friendship status update
- `incoming_call` - Incoming call notification
- `call_response` - Call response notification
- `call_ended` - Call ended notification
- `webrtc_offer` - WebRTC offer received
- `webrtc_answer` - WebRTC answer received
- `webrtc_ice_candidate` - WebRTC ICE candidate received
- `error` - Error notifications

## Security Features

- **Input Validation**: All user inputs are validated
- **File Type Restrictions**: Only images and videos allowed
- **File Size Limits**: Maximum 50MB per file
- **XSS Protection**: HTML escaping for user content
- **Session Management**: Secure session handling

## Browser Support

- Chrome (v60+)
- Firefox (v55+)
- Safari (v12+)
- Edge (v79+)

## Troubleshooting

### Common Issues

#### MongoDB Connection Error
```bash
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running on your system

#### Port Already in Use
```bash
Error: listen EADDRINUSE :::3000
```
**Solution**: Change the PORT in `.env` file or stop the conflicting service

#### File Upload Issues
**Solution**: Ensure the `uploads/` directory exists and has write permissions

### Development Tips

1. **Auto-restart**: Use `npm run dev` for development with automatic restarts
2. **Console Logs**: Check browser console for client-side errors
3. **Network Tab**: Use browser dev tools to inspect Socket.IO connections
4. **MongoDB Logs**: Check MongoDB logs for database issues

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the ISC License.

## Support

For issues and questions:
- Check the troubleshooting section
- Review the code comments
- Test with different browsers
- Ensure all dependencies are up to date

---