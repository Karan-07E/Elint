const mongoose = require('mongoose');

const partyFollowUpSchema = new mongoose.Schema({
    partyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Party',
        required: true
    },
    partyName: {
        type: String,
        required: true
    },
    meetingDateTime: {
        type: Date,
        required: true
    },
    remarks: {
        type: String,
        required: true
    },
    flag: {
        type: String,
        enum: ['neutral', 'positive', 'negative'],
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdByRole: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('party_followups', partyFollowUpSchema);
