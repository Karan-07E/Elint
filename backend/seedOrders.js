const mongoose = require('mongoose');
const Order = require('./models/Order');
const Party = require('./models/Party');
const Item = require('./models/Item');
require('dotenv').config();

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ Connected to MongoDB");

    // --- FIX: Drop the obsolete 'orderNumber' index if it exists ---
    try {
      await mongoose.connection.collection('orders').dropIndex('orderNumber_1');
      console.log("⚠️ Dropped obsolete index 'orderNumber_1' to fix duplicate error.");
    } catch (e) {
      // If index doesn't exist, we just ignore the error and continue
    }
    // --------------------------------------------------------------

    // 1. Ensure we have Parties
    let parties = await Party.find({ type: 'customer' });
    if (parties.length < 3) {
      console.log("Creating dummy parties...");
      const newParties = await Party.insertMany([
        { name: "Tech Solutions Ltd", type: "customer", phone: "9988776655" },
        { name: "Global Traders", type: "customer", phone: "8877665544" },
        { name: "Alpha Industries", type: "customer", phone: "7766554433" }
      ]);
      parties = [...parties, ...newParties];
    }

    // 2. Ensure we have Items
    let items = await Item.find();
    if (items.length < 3) {
      console.log("Creating dummy items...");
      // Clear items if needed to prevent code conflicts from previous runs
      // await Item.deleteMany({}); 
      
      const newItems = await Item.insertMany([
        { 
          name: "Industrial Motor 5HP", 
          salePrice: "15000", 
          unit: "pcs", 
          type: "product", 
          code: "IM-5HP" 
        },
        { 
          name: "Control Panel Box", 
          salePrice: "4500", 
          unit: "pcs", 
          type: "product", 
          code: "CPB-001" 
        },
        { 
          name: "Wiring Harness 10m", 
          salePrice: "800", 
          unit: "meters", 
          type: "product", 
          code: "WH-10M" 
        }
      ]);
      items = [...items, ...newItems];
    }

    // 3. Clear existing orders to ensure a fresh start without conflicts
    console.log("Clearing old orders...");
    await Order.deleteMany({});

    // 4. Generate Orders across stages
    const stages = ['New', 'Verified', 'Manufacturing', 'Quality_Check', 'Documentation', 'Dispatch', 'Completed', 'Deleted'];
    const ordersToCreate = [];

    // Create ~25 orders distributed across stages
    for (let i = 1; i <= 25; i++) {
      const randomStage = stages[Math.floor(Math.random() * stages.length)];
      const randomParty = parties[Math.floor(Math.random() * parties.length)];
      const randomItem = items[Math.floor(Math.random() * items.length)];
      const qty = Math.floor(Math.random() * 50) + 1;
      const rate = parseFloat(randomItem.salePrice) || 0;
      const isHighPriority = Math.random() > 0.8; 

      ordersToCreate.push({
        party: randomParty._id,
        poNumber: `PO-${2024000 + i}`,
        poDate: new Date(Date.now() - Math.floor(Math.random() * 1000000000)),
        estimatedDeliveryDate: new Date(Date.now() + Math.floor(Math.random() * 1000000000)),
        status: randomStage,
        priority: isHighPriority ? 'High' : 'Normal',
        items: [{
          item: randomItem._id,
          itemName: randomItem.name,
          quantity: qty,
          unit: randomItem.unit,
          rate: rate,
          amount: qty * rate
        }],
        totalAmount: qty * rate,
        notes: `Auto-generated order #${i} for testing flow.`
      });
    }

    await Order.insertMany(ordersToCreate);
    console.log(`✅ Successfully seeded ${ordersToCreate.length} orders across all stages!`);
    
    process.exit();
  } catch (error) {
    console.error("❌ Seeding Error:", error);
    process.exit(1);
  }
};

seedData();