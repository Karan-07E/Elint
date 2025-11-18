const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const Party = require('../models/Party');
const Order = require('../models/Order');
const Item = require('../models/Item');

const connect = async () => {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not defined in environment');
  }

  await mongoose.connect(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

const seed = async () => {
  await connect();
  console.log('✅ Connected to MongoDB');

  try {
    // Sample parties similar to screenshot (Abhinav, etc.)
    const partiesData = [
      {
        name: 'Abhinav',
        type: 'customer',
        phone: '9333911911',
        billingAddress: {
          street: 'Street 1',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
        openingBalance: 2000,
        balanceType: 'receivable',
        currentBalance: 2000,
      },
      {
        name: 'Gauransh',
        type: 'customer',
        phone: '9000000001',
        billingAddress: {
          street: 'Street 2',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560002',
        },
      },
      {
        name: 'Kabita',
        type: 'customer',
        phone: '9000000002',
      },
      {
        name: 'Radhika',
        type: 'customer',
        phone: '9000000003',
      },
      {
        name: 'Ranveer',
        type: 'customer',
        phone: '9000000004',
      },
    ];

    console.log('🧹 Clearing existing Parties and Orders collections...');
    await Order.deleteMany({});
    await Party.deleteMany({});

    console.log('🌱 Inserting parties...');
    const createdParties = await Party.insertMany(partiesData);

    // Ensure at least one sample item exists for orders
    let sampleItem = await Item.findOne();
    if (!sampleItem) {
      console.log('🧱 No items found, creating a sample item for orders...');
      sampleItem = await Item.create({
        type: 'product',
        name: 'Sample Product',
        hsn: '',
        unit: 'pcs',
        category: 'General',
        code: 'SP-001',
      });
    }

    console.log('🧾 Creating sample purchase orders...');
    const ordersData = [
      {
        orderNumber: 'PO-1001',
        party: createdParties[0]._id,
        items: [
          {
            item: sampleItem._id,
            quantity: 30,
            rate: 100,
            amount: 3000,
          },
        ],
        totalAmount: 3000,
        status: 'queue',
        priority: 'high',
        notes: 'Example purchase order with 30 items.',
      },
      {
        orderNumber: 'PO-1002',
        party: createdParties[1]._id,
        items: [
          {
            item: sampleItem._id,
            quantity: 10,
            rate: 150,
            amount: 1500,
          },
        ],
        totalAmount: 1500,
        status: 'in_progress',
        priority: 'medium',
      },
    ];

    await Order.insertMany(ordersData);

    console.log('✅ Seed completed successfully');
  } catch (err) {
    console.error('❌ Seed failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

seed();
