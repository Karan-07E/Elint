const express = require('express');
const router = express.Router();
const Mapping = require('../models/Mapping');
const authenticateToken = require('../middleware/auth');

// Get all mappings grouped by order
router.get('/', authenticateToken, async (req, res) => {
    try {
        const mappings = await Mapping.aggregate([
            {
                $group: {
                    _id: "$orderId",
                    items: {
                        $push: {
                            itemId: "$itemId",
                            jobNumber: "$jobNumber",
                            assignedEmployeeId: "$assignedEmployeeId"
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "orders",
                    localField: "_id",
                    foreignField: "_id",
                    as: "order"
                }
            },
            {
                $unwind: {
                    path: "$order",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    orderId: "$_id",
                    order: 1, // Optional enrichment
                    items: 1
                }
            }
        ]);

        res.json(mappings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
