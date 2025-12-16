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
        required: true
    },

    // Format: EJB-00001 (must support existing job number system)
    jobNumber: {
        type: String,
        required: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Mapping', mappingSchema);
