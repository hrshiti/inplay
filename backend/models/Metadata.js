const mongoose = require('mongoose');

const metadataSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true, // 'tabs' or 'categories'
        enum: ['tabs', 'categories']
    },
    value: [{
        type: String,
        required: true
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Metadata', metadataSchema);
