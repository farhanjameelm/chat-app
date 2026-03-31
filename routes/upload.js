const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');

router.post('/', upload.single('media'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const mediaType = req.file.mimetype.startsWith('image/') ? 'image' : 'video';
        const mediaUrl = `/uploads/${req.file.filename}`;

        res.json({
            message: 'File uploaded successfully',
            mediaUrl,
            mediaType
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

module.exports = router;
