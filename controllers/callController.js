const Call = require('../models/Call');
const User = require('../models/User');

const initiateCall = async (req, res) => {
    try {
        const { calleeId, callType } = req.body; // callType: 'voice' or 'video'
        const callerId = req.session.userId;

        if (callerId === calleeId) {
            return res.status(400).json({ error: 'Cannot call yourself' });
        }

        // Check if callee is online
        const callee = await User.findById(calleeId);
        if (!callee.isOnline) {
            return res.status(400).json({ error: 'User is not online' });
        }

        // Check if there's an active call
        const activeCall = await Call.findOne({
            $or: [
                { caller: callerId, callee: calleeId, status: { $in: ['initiated', 'ringing', 'connected'] } },
                { caller: calleeId, callee: callerId, status: { $in: ['initiated', 'ringing', 'connected'] } }
            ]
        });

        if (activeCall) {
            return res.status(400).json({ error: 'There is already an active call' });
        }

        const call = new Call({
            caller: callerId,
            callee: calleeId,
            type: callType,
            status: 'initiated'
        });

        await call.save();
        await call.populate('caller', 'username');
        await call.populate('callee', 'username');

        res.status(201).json({
            message: 'Call initiated',
            call
        });
    } catch (error) {
        console.error('Initiate call error:', error);
        res.status(500).json({ error: 'Failed to initiate call' });
    }
};

const respondToCall = async (req, res) => {
    try {
        const { callId, action } = req.body; // action: 'accept' or 'reject'
        const userId = req.session.userId;

        const call = await Call.findById(callId);
        
        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (call.callee.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (call.status !== 'initiated' && call.status !== 'ringing') {
            return res.status(400).json({ error: 'Call cannot be responded to' });
        }

        if (action === 'accept') {
            call.status = 'connected';
            call.startTime = new Date();
        } else {
            call.status = 'rejected';
        }

        await call.save();
        await call.populate('caller', 'username');
        await call.populate('callee', 'username');

        res.json({
            message: `Call ${action}ed`,
            call
        });
    } catch (error) {
        console.error('Respond to call error:', error);
        res.status(500).json({ error: 'Failed to respond to call' });
    }
};

const endCall = async (req, res) => {
    try {
        const { callId } = req.body;
        const userId = req.session.userId;

        const call = await Call.findById(callId);
        
        if (!call) {
            return res.status(404).json({ error: 'Call not found' });
        }

        if (call.caller.toString() !== userId && call.callee.toString() !== userId) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        if (call.status === 'connected') {
            call.status = 'ended';
            call.endTime = new Date();
            call.duration = Math.floor((call.endTime - call.startTime) / 1000);
        } else if (call.status === 'initiated' || call.status === 'ringing') {
            call.status = 'missed';
            call.endTime = new Date();
        }

        await call.save();

        res.json({
            message: 'Call ended',
            call
        });
    } catch (error) {
        console.error('End call error:', error);
        res.status(500).json({ error: 'Failed to end call' });
    }
};

const getCallHistory = async (req, res) => {
    try {
        const userId = req.session.userId;
        
        const calls = await Call.find({
            $or: [
                { caller: userId },
                { callee: userId }
            ]
        })
        .populate('caller', 'username')
        .populate('callee', 'username')
        .sort({ startTime: -1 })
        .limit(50);

        res.json(calls);
    } catch (error) {
        console.error('Get call history error:', error);
        res.status(500).json({ error: 'Failed to get call history' });
    }
};

module.exports = {
    initiateCall,
    respondToCall,
    endCall,
    getCallHistory
};
