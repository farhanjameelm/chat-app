const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
    caller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    callee: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    type: {
        type: String,
        enum: ['voice', 'video'],
        required: true
    },
    status: {
        type: String,
        enum: ['initiated', 'ringing', 'connected', 'ended', 'missed', 'rejected'],
        default: 'initiated'
    },
    startTime: {
        type: Date,
        default: Date.now
    },
    endTime: {
        type: Date
    },
    duration: {
        type: Number // in seconds
    }
});

module.exports = mongoose.model('Call', CallSchema);
