// Global variables
let socket;
let currentUser = null;
let selectedUser = null;
let onlineUsers = new Map();
let friends = new Map();
let messages = [];
let typingTimeout;
let activeCall = null;
let localStream = null;
let remoteStream = null;
let peerConnection = null;
let searchTimeout;

// DOM elements
const authScreen = document.getElementById('authScreen');
const chatScreen = document.getElementById('chatScreen');
const usernameInput = document.getElementById('username');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileOverlay = document.getElementById('mobileOverlay');
const usersList = document.getElementById('usersList');
const friendsList = document.getElementById('friendsList');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const friendRequests = document.getElementById('friendRequests');
const requestsCount = document.getElementById('requestsCount');
const onlineCount = document.getElementById('onlineCount');
const friendsCount = document.getElementById('friendsCount');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const fileInput = document.getElementById('fileInput');
const currentChatUser = document.getElementById('currentChatUser');
const typingIndicator = document.getElementById('typingIndicator');
const darkModeToggle = document.getElementById('darkModeToggle');
const mediaModal = document.getElementById('mediaModal');
const mediaPreview = document.getElementById('mediaPreview');
const loadingSpinner = document.getElementById('loadingSpinner');

// Call elements
const callModal = document.getElementById('callModal');
const callTitle = document.getElementById('callTitle');
const callStatus = document.getElementById('callStatus');
const callUser = document.getElementById('callUser');
const callType = document.getElementById('callType');
const callTimer = document.getElementById('callTimer');
const acceptCallBtn = document.getElementById('acceptCallBtn');
const rejectCallBtn = document.getElementById('rejectCallBtn');
const endCallBtn = document.getElementById('endCallBtn');
const voiceCallBtn = document.getElementById('voiceCallBtn');
const videoCallBtn = document.getElementById('videoCallBtn');
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const callVideoContainer = document.querySelector('.call-video-container');

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    setupEventListeners();
    initializeDarkMode();
});

// Check if user is already authenticated
async function checkAuthStatus() {
    try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            showChatScreen();
            initializeSocket();
            loadFriends();
            loadFriendRequests();
        } else {
            showAuthScreen();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showAuthScreen();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth events
    loginBtn.addEventListener('click', handleLogin);
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Chat events
    logoutBtn.addEventListener('click', handleLogout);
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    // File upload
    fileInput.addEventListener('change', handleFileUpload);

    // Dark mode toggle
    darkModeToggle.addEventListener('click', toggleDarkMode);

    // Modal close
    document.querySelector('.close-modal').addEventListener('click', closeModal);
    mediaModal.addEventListener('click', (e) => {
        if (e.target === mediaModal) closeModal();
    });

    // Typing indicators
    messageInput.addEventListener('input', handleTyping);

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Search
    searchInput.addEventListener('input', handleSearch);

    // Call controls
    voiceCallBtn.addEventListener('click', () => initiateCall('voice'));
    videoCallBtn.addEventListener('click', () => initiateCall('video'));
    acceptCallBtn.addEventListener('click', acceptCall);
    rejectCallBtn.addEventListener('click', rejectCall);
    endCallBtn.addEventListener('click', endCall);

    // Handle window resize
    window.addEventListener('resize', handleResize);
}

// Handle login/registration
async function handleLogin() {
    const username = usernameInput.value.trim();
    
    if (!username || username.length < 3) {
        showToast('Username must be at least 3 characters long', 'error');
        return;
    }

    showLoading(true);
    loginBtn.disabled = true;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username })
        });

        const data = await response.json();

        if (response.ok) {
            currentUser = data.user;
            showChatScreen();
            initializeSocket();
            showToast('Login successful!', 'success');
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Login failed. Please try again.', 'error');
    } finally {
        showLoading(false);
        loginBtn.disabled = false;
    }
}

// Handle logout
async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
        
        if (socket) {
            socket.disconnect();
        }
        
        currentUser = null;
        selectedUser = null;
        messages = [];
        onlineUsers.clear();
        
        showAuthScreen();
        showToast('Logged out successfully', 'success');
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Logout failed', 'error');
    }
}

// Initialize Socket.IO
function initializeSocket() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('user_connect', { userId: currentUser.id });
    });

    socket.on('online_users', (users) => {
        updateOnlineUsers(users);
    });

    socket.on('chat_history', (chatMessages) => {
        messages = chatMessages;
        displayMessages();
    });

    socket.on('receive_message', (message) => {
        messages.push(message);
        displayMessages();
        
        if (selectedUser && message.sender._id === selectedUser.userId) {
            socket.emit('mark_messages_read', { senderId: message.sender._id });
        }
    });

    socket.on('message_sent', (message) => {
        messages.push(message);
        displayMessages();
    });

    socket.on('user_typing', (data) => {
        if (selectedUser && data.username === selectedUser.username) {
            showTypingIndicator(data.isTyping);
        }
    });

    // Friend request events
    socket.on('friend_request_received', (request) => {
        showToast(`Friend request from ${request.sender.username}`, 'info');
        loadFriendRequests();
    });

    socket.on('friend_request_response', (data) => {
        const status = data.status === 'accepted' ? 'accepted' : 'rejected';
        showToast(`Friend request ${status}`, data.status === 'accepted' ? 'success' : 'info');
        loadFriends();
        loadFriendRequests();
    });

    socket.on('friendship_update', (data) => {
        if (data.type === 'added') {
            loadFriends();
        }
    });

    // Call events
    socket.on('incoming_call', (call) => {
        activeCall = call;
        showCallModal('incoming', call.type, call.caller.username);
    });

    socket.on('call_response', (data) => {
        if (data.action === 'accept') {
            callStatus.textContent = 'Connected';
            acceptCallBtn.classList.add('hidden');
            rejectCallBtn.classList.add('hidden');
            endCallBtn.classList.remove('hidden');
            startCallTimer();
            setupWebRTC();
        } else if (data.action === 'reject') {
            hideCallModal();
            showToast('Call was rejected', 'info');
        }
    });

    socket.on('call_ended', (call) => {
        if (activeCall && activeCall._id === call._id) {
            hideCallModal();
            showToast('Call ended', 'info');
        }
    });

    // WebRTC signaling events
    socket.on('webrtc_offer', async (data) => {
        // Handle WebRTC offer
        console.log('Received WebRTC offer:', data);
    });

    socket.on('webrtc_answer', async (data) => {
        // Handle WebRTC answer
        console.log('Received WebRTC answer:', data);
    });

    socket.on('webrtc_ice_candidate', async (data) => {
        // Handle ICE candidate
        console.log('Received ICE candidate:', data);
    });

    socket.on('error', (data) => {
        showToast(data.message || 'An error occurred', 'error');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

// Update online users list
function updateOnlineUsers(users) {
    onlineUsers.clear();
    users.forEach(user => {
        if (user.userId !== currentUser.id) {
            onlineUsers.set(user.userId, user);
        }
    });

    renderUsersList();
    onlineCount.textContent = users.length;
}

// Render users list
function renderUsersList() {
    usersList.innerHTML = '';

    if (onlineUsers.size === 0) {
        usersList.innerHTML = '<div class="no-users">No online users</div>';
        return;
    }

    onlineUsers.forEach((user, userId) => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        if (selectedUser && selectedUser.userId === userId) {
            userElement.classList.add('active');
        }

        userElement.innerHTML = `
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <div class="user-name">${user.username}</div>
                <div class="user-status">Online</div>
            </div>
        `;

        userElement.addEventListener('click', () => selectUser(userId, user));
        usersList.appendChild(userElement);
    });
}

// Select a user to chat with
function selectUser(userId, user) {
    selectedUser = { userId, username: user.username };
    
    // Update UI
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('active');
    });
    event.currentTarget.classList.add('active');

    currentChatUser.textContent = `Chatting with ${user.username}`;
    messageInput.disabled = false;
    sendBtn.disabled = false;
    voiceCallBtn.disabled = false;
    videoCallBtn.disabled = false;

    // Filter and display messages for this user
    displayMessages();
}

// Display messages
function displayMessages() {
    if (!selectedUser) {
        messagesContainer.innerHTML = `
            <div class="welcome-message">
                <i class="fas fa-comments"></i>
                <h3>Welcome to Chat App!</h3>
                <p>Select an online user from the sidebar to start chatting.</p>
            </div>
        `;
        voiceCallBtn.disabled = true;
        videoCallBtn.disabled = true;
        return;
    }

    const userMessages = messages.filter(msg => 
        (msg.sender._id === currentUser.id && msg.receiver._id === selectedUser.userId) ||
        (msg.sender._id === selectedUser.userId && msg.receiver._id === currentUser.id)
    );

    messagesContainer.innerHTML = '';

    userMessages.forEach(message => {
        const messageElement = createMessageElement(message);
        messagesContainer.appendChild(messageElement);
    });

    scrollToBottom();
}

// Create message element
function createMessageElement(message) {
    const messageDiv = document.createElement('div');
    const isSent = message.sender._id === currentUser.id;
    messageDiv.className = `message ${isSent ? 'sent' : 'received'}`;

    let content = '<div class="message-content">';
    
    if (message.message) {
        content += `<div class="message-text">${escapeHtml(message.message)}</div>`;
    }

    if (message.mediaUrl) {
        const mediaHtml = message.mediaType === 'image' 
            ? `<img src="${message.mediaUrl}" alt="Image" onclick="openMediaModal('${message.mediaUrl}', 'image')">`
            : `<video controls><source src="${message.mediaUrl}" type="video/mp4"></video>`;
        
        content += `<div class="message-media">${mediaHtml}</div>`;
    }

    const time = new Date(message.timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });

    content += `
        <div class="message-info">
            <span class="message-time">${time}</span>
            ${isSent ? `<span class="message-status">${message.read ? '✓✓' : '✓'}</span>` : ''}
        </div>
    </div>`;

    messageDiv.innerHTML = content;
    return messageDiv;
}

// Send message
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (!selectedUser) {
        showToast('Please select a user to chat with', 'warning');
        return;
    }

    if (!messageText) {
        showToast('Please enter a message', 'warning');
        return;
    }

    socket.emit('send_message', {
        receiverId: selectedUser.userId,
        message: messageText
    });

    messageInput.value = '';
    stopTyping();
}

// Handle file upload
async function handleFileUpload(event) {
    const file = event.target.files[0];
    
    if (!file) return;

    if (!selectedUser) {
        showToast('Please select a user to chat with', 'warning');
        event.target.value = '';
        return;
    }

    // Validate file type
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        showToast('Only image and video files are allowed', 'error');
        event.target.value = '';
        return;
    }

    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
        showToast('File size must be less than 50MB', 'error');
        event.target.value = '';
        return;
    }

    const formData = new FormData();
    formData.append('media', file);

    showLoading(true);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            socket.emit('send_message', {
                receiverId: selectedUser.userId,
                mediaUrl: data.mediaUrl,
                mediaType: data.mediaType
            });
        } else {
            showToast(data.error || 'File upload failed', 'error');
        }
    } catch (error) {
        console.error('Upload error:', error);
        showToast('File upload failed', 'error');
    } finally {
        showLoading(false);
        event.target.value = '';
    }
}

// Handle typing indicators
function handleTyping() {
    if (!selectedUser) return;

    socket.emit('typing_start', { receiverId: selectedUser.userId });

    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        stopTyping();
    }, 1000);
}

function stopTyping() {
    if (selectedUser) {
        socket.emit('typing_stop', { receiverId: selectedUser.userId });
    }
}

function showTypingIndicator(isTyping) {
    if (isTyping) {
        typingIndicator.textContent = `${selectedUser.username} is typing`;
        typingIndicator.classList.remove('hidden');
    } else {
        typingIndicator.classList.add('hidden');
    }
}

// Media modal functions
function openMediaModal(url, type) {
    const content = type === 'image' 
        ? `<img src="${url}" alt="Image">`
        : `<video controls autoplay><source src="${url}" type="video/mp4"></video>`;
    
    mediaPreview.innerHTML = content;
    mediaModal.classList.remove('hidden');
}

function closeModal() {
    mediaModal.classList.add('hidden');
    mediaPreview.innerHTML = '';
}

// Dark mode functions
function initializeDarkMode() {
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (isDarkMode) {
        document.body.classList.add('dark-mode');
        updateDarkModeIcon(true);
    }
}

function toggleDarkMode() {
    const isDarkMode = document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', isDarkMode);
    updateDarkModeIcon(isDarkMode);
}

function updateDarkModeIcon(isDarkMode) {
    const icon = darkModeToggle.querySelector('i');
    icon.className = isDarkMode ? 'fas fa-sun' : 'fas fa-moon';
}

// UI helper functions
function showAuthScreen() {
    authScreen.classList.remove('hidden');
    chatScreen.classList.add('hidden');
    usernameInput.value = '';
    usernameInput.focus();
}

function showChatScreen() {
    authScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
}

function showLoading(show) {
    if (show) {
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Tab switching
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
}

// Friend functions
async function loadFriends() {
    try {
        const response = await fetch('/api/friends');
        const friendsData = await response.json();
        
        friends.clear();
        friendsData.forEach(friend => {
            friends.set(friend._id, friend);
        });
        
        renderFriendsList();
        friendsCount.textContent = friendsData.length;
    } catch (error) {
        console.error('Load friends error:', error);
    }
}

async function loadFriendRequests() {
    try {
        const response = await fetch('/api/friends/requests');
        const requests = await response.json();
        
        renderFriendRequests(requests);
        requestsCount.textContent = requests.length;
        requestsCount.classList.toggle('hidden', requests.length === 0);
    } catch (error) {
        console.error('Load friend requests error:', error);
    }
}

function renderFriendsList() {
    friendsList.innerHTML = '';

    if (friends.size === 0) {
        friendsList.innerHTML = '<div class="no-users">No friends yet</div>';
        return;
    }

    friends.forEach((friend, friendId) => {
        const friendElement = document.createElement('div');
        friendElement.className = 'user-item';
        if (selectedUser && selectedUser.userId === friendId) {
            friendElement.classList.add('active');
        }

        const isOnline = onlineUsers.has(friendId);
        
        friendElement.innerHTML = `
            <div class="user-avatar">${friend.username.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <div class="user-name">${friend.username}</div>
                <div class="user-status">${isOnline ? 'Online' : 'Offline'}</div>
            </div>
            <div class="user-actions">
                <button class="call-btn" onclick="initiateCallWithUser('${friendId}', 'voice')" title="Voice Call">
                    <i class="fas fa-phone"></i>
                </button>
                <button class="call-btn video" onclick="initiateCallWithUser('${friendId}', 'video')" title="Video Call">
                    <i class="fas fa-video"></i>
                </button>
            </div>
        `;

        friendElement.addEventListener('click', (e) => {
            if (!e.target.closest('.user-actions')) {
                selectUser(friendId, friend);
            }
        });
        
        friendsList.appendChild(friendElement);
    });
}

function renderFriendRequests(requests) {
    friendRequests.innerHTML = '';

    if (requests.length === 0) {
        friendRequests.innerHTML = '<div class="no-requests">No pending requests</div>';
        return;
    }

    requests.forEach(request => {
        const requestElement = document.createElement('div');
        requestElement.className = 'friend-request-item';
        
        requestElement.innerHTML = `
            <div class="friend-request-info">
                <div class="friend-request-name">${request.sender.username}</div>
            </div>
            <div class="friend-request-actions">
                <button class="friend-request-btn accept" onclick="respondToFriendRequest('${request._id}', 'accept')">
                    <i class="fas fa-check"></i>
                </button>
                <button class="friend-request-btn reject" onclick="respondToFriendRequest('${request._id}', 'reject')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        friendRequests.appendChild(requestElement);
    });
}

async function respondToFriendRequest(requestId, action) {
    try {
        const response = await fetch('/api/friends/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ requestId, action })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Friend request ${action}ed`, 'success');
            loadFriends();
            loadFriendRequests();
            
            // Notify socket
            socket.emit('friend_request_responded', {
                requestId,
                status: action
            });
        } else {
            showToast(data.error || 'Failed to respond to request', 'error');
        }
    } catch (error) {
        console.error('Respond to friend request error:', error);
        showToast('Failed to respond to request', 'error');
    }
}

// Search functions
function handleSearch() {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/friends/search?query=${encodeURIComponent(query)}`);
            const users = await response.json();
            
            renderSearchResults(users);
        } catch (error) {
            console.error('Search error:', error);
        }
    }, 500);
}

function renderSearchResults(users) {
    searchResults.innerHTML = '';

    if (users.length === 0) {
        searchResults.innerHTML = '<div class="no-results">No users found</div>';
        return;
    }

    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        
        userElement.innerHTML = `
            <div class="user-avatar">${user.username.charAt(0).toUpperCase()}</div>
            <div class="user-info">
                <div class="user-name">${user.username}</div>
                <div class="user-status">${user.isOnline ? 'Online' : 'Offline'}</div>
            </div>
            <div class="user-actions">
                ${user.isFriend ? '<span class="badge">Friends</span>' : 
                  user.hasPendingRequest ? 
                    (user.requestSent ? '<span class="badge">Sent</span>' : 
                      '<button class="friend-request-btn accept" onclick="sendFriendRequest(\'' + user._id + '\')"><i class="fas fa-user-plus"></i></button>') :
                    '<button class="friend-request-btn accept" onclick="sendFriendRequest(\'' + user._id + '\')"><i class="fas fa-user-plus"></i></button>'}
            </div>
        `;
        
        searchResults.appendChild(userElement);
    });
}

async function sendFriendRequest(receiverId) {
    try {
        const response = await fetch('/api/friends/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ receiverId })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Friend request sent', 'success');
            handleSearch(); // Refresh search results
            
            // Notify socket
            socket.emit('friend_request_sent', {
                requestId: data.request._id
            });
        } else {
            showToast(data.error || 'Failed to send friend request', 'error');
        }
    } catch (error) {
        console.error('Send friend request error:', error);
        showToast('Failed to send friend request', 'error');
    }
}

// Call functions
async function initiateCall(type) {
    if (!selectedUser) {
        showToast('Please select a user to call', 'warning');
        return;
    }

    try {
        const response = await fetch('/api/calls/initiate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                calleeId: selectedUser.userId,
                callType: type
            })
        });

        const data = await response.json();

        if (response.ok) {
            activeCall = data.call;
            showCallModal('outgoing', type, selectedUser.username);
            
            // Notify socket
            socket.emit('call_initiated', {
                call: data.call
            });
        } else {
            showToast(data.error || 'Failed to initiate call', 'error');
        }
    } catch (error) {
        console.error('Initiate call error:', error);
        showToast('Failed to initiate call', 'error');
    }
}

async function initiateCallWithUser(userId, type) {
    const user = friends.get(userId) || Array.from(onlineUsers.values()).find(u => u.userId === userId);
    if (!user) return;

    selectedUser = { userId, username: user.username };
    currentChatUser.textContent = `Chatting with ${user.username}`;
    
    await initiateCall(type);
}

function showCallModal(direction, type, username) {
    callModal.classList.remove('hidden');
    callTitle.textContent = direction === 'incoming' ? 'Incoming Call' : 'Outgoing Call';
    callUser.textContent = username;
    callType.textContent = type === 'video' ? 'Video Call' : 'Voice Call';
    callStatus.textContent = direction === 'incoming' ? 'Ringing...' : 'Calling...';
    
    if (direction === 'incoming') {
        acceptCallBtn.classList.remove('hidden');
        rejectCallBtn.classList.remove('hidden');
        endCallBtn.classList.add('hidden');
    } else {
        acceptCallBtn.classList.add('hidden');
        rejectCallBtn.classList.add('hidden');
        endCallBtn.classList.remove('hidden');
    }

    if (type === 'video') {
        callVideoContainer.classList.remove('hidden');
        setupVideoCall();
    } else {
        callVideoContainer.classList.add('hidden');
    }
}

function hideCallModal() {
    callModal.classList.add('hidden');
    if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
        localStream = null;
    }
    if (remoteStream) {
        remoteStream.getTracks().forEach(track => track.stop());
        remoteStream = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    activeCall = null;
}

async function acceptCall() {
    if (!activeCall) return;

    try {
        const response = await fetch('/api/calls/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                callId: activeCall._id,
                action: 'accept'
            })
        });

        const data = await response.json();

        if (response.ok) {
            activeCall = data.call;
            callStatus.textContent = 'Connected';
            acceptCallBtn.classList.add('hidden');
            rejectCallBtn.classList.add('hidden');
            endCallBtn.classList.remove('hidden');
            
            startCallTimer();
            setupWebRTC();
            
            // Notify socket
            socket.emit('call_responded', {
                call: data.call,
                action: 'accept'
            });
        } else {
            showToast(data.error || 'Failed to accept call', 'error');
        }
    } catch (error) {
        console.error('Accept call error:', error);
        showToast('Failed to accept call', 'error');
    }
}

async function rejectCall() {
    if (!activeCall) return;

    try {
        await fetch('/api/calls/respond', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                callId: activeCall._id,
                action: 'reject'
            })
        });

        // Notify socket
        socket.emit('call_responded', {
            call: activeCall,
            action: 'reject'
        });

        hideCallModal();
        showToast('Call rejected', 'info');
    } catch (error) {
        console.error('Reject call error:', error);
    }
}

async function endCall() {
    if (!activeCall) return;

    try {
        await fetch('/api/calls/end', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                callId: activeCall._id
            })
        });

        // Notify socket
        socket.emit('call_ended', {
            call: activeCall
        });

        hideCallModal();
        showToast('Call ended', 'info');
    } catch (error) {
        console.error('End call error:', error);
    }
}

function startCallTimer() {
    let seconds = 0;
    const timerInterval = setInterval(() => {
        seconds++;
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        callTimer.textContent = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (!activeCall || activeCall.status !== 'connected') {
            clearInterval(timerInterval);
        }
    }, 1000);
}

async function setupVideoCall() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ 
            video: true, 
            audio: true 
        });
        localVideo.srcObject = localStream;
    } catch (error) {
        console.error('Setup video call error:', error);
        showToast('Failed to access camera/microphone', 'error');
    }
}

function setupWebRTC() {
    // WebRTC implementation would go here
    // This is a simplified version - full implementation would require
    // STUN/TURN servers and more complex peer connection handling
    console.log('Setting up WebRTC connection...');
}

// Mobile menu functions
function toggleMobileMenu() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    
    sidebar.classList.toggle('show');
    overlay.classList.toggle('show');
    
    // Debug logging
    console.log('Mobile menu toggled:', {
        sidebarVisible: sidebar.classList.contains('show'),
        overlayVisible: overlay.classList.contains('show')
    });
}

function handleResize() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('mobileOverlay');
    const isMobile = window.innerWidth <= 768;
    
    if (!isMobile) {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    }
}

// Touch-friendly improvements
function addTouchSupport() {
    // Add ripple effect to buttons on touch devices
    const buttons = document.querySelectorAll('button, .user-item, .friend-request-btn, .tab-btn');
    
    buttons.forEach(button => {
        // Touch events
        button.addEventListener('touchstart', function(e) {
            this.style.transform = 'scale(0.95)';
            this.style.transition = 'transform 0.1s ease';
        }, { passive: true });
        
        button.addEventListener('touchend', function(e) {
            this.style.transform = 'scale(1)';
            this.style.transition = 'transform 0.2s ease';
        }, { passive: true });
        
        // Mouse events for desktop
        button.addEventListener('mousedown', function(e) {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('mouseup', function(e) {
            this.style.transform = 'scale(1)';
        });
    });
}

// Initialize mobile features
document.addEventListener('DOMContentLoaded', () => {
    addTouchSupport();
    handleResize();
    
    // Enhanced mobile menu toggle with multiple event listeners
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    if (mobileMenuToggle) {
        // Touch events
        mobileMenuToggle.addEventListener('touchstart', function(e) {
            e.preventDefault();
            toggleMobileMenu();
        }, { passive: false });
        
        // Mouse events
        mobileMenuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            toggleMobileMenu();
        });
        
        // Debug: Log if element is found
        console.log('Mobile menu toggle found:', {
            element: mobileMenuToggle,
            visible: mobileMenuToggle.offsetWidth > 0 && mobileMenuToggle.offsetHeight > 0,
            clickable: window.getComputedStyle(mobileMenuToggle).pointerEvents !== 'none'
        });
    } else {
        console.error('Mobile menu toggle not found!');
    }
    
    // Close mobile menu when clicking overlay
    const overlay = document.getElementById('mobileOverlay');
    if (overlay) {
        overlay.addEventListener('touchstart', () => {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        }, { passive: true });
        
        overlay.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        });
    }
});
