const mongoose = require('mongoose');

const mappingSchema = new mongoose.Schema({
    // Reference / foreign key Fetch from orders schema
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        index: true
    },

    // Reference / foreign key Fetch from items schema
    itemId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Item',
        required: true,
        index: true
    },

    // Reference / foreign key Fetch from employees schema
    assignedEmployeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    }, 

    // Format: EJB-00001 (must support existing job number system)
    jobNumber: {
        type: String,
        required: true,
        trim: true
    },

    // Work tracking fields
    status: {
        type: String,
        enum: ['pending', 'in-progress', 'completed'],
        default: 'pending'
    },

    progressPercentage: {
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },

    startedAt: {
        type: Date
    },

    completedAt: {
        type: Date
    },

    notes: {
        type: String,
        trim: true
    }
}, {
    timestamps: true
});

// Index for employee queries
mappingSchema.index({ assignedEmployeeId: 1, status: 1 });

module.exports = mongoose.model('Mapping', mappingSchema);
