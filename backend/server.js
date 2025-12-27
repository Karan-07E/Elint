// server.js
require('dotenv').config(); // MUST be first
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns').promises;
const path = require('path');

const app = express();

// Middleware - increased limit for base64 images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

/**
 * Helper: pre-check SRV & TXT for mongodb+srv URIs so we can give clearer errors
 * - If MONGO_URI starts with "mongodb+srv://" we attempt resolveSrv and resolveTxt.
 * - If resolveSrv fails with EREFUSED or other DNS errors, we recommend actions.
 * - If you cannot fix DNS, set MONGO_URI_STANDARD in .env with the non-SRV standard connection string.
 */
async function checkAndConnect() {
  const rawUri = process.env.MONGO_URI;
  const fallbackUri = process.env.MONGO_URI_STANDARD; // optional non-SRV fallback

  console.log('Loaded MONGO_URI?', !!rawUri);
  if (!rawUri) {
    console.error('❌ MONGO_URI is not set. Please create backend/.env with MONGO_URI or set the environment variable.');
    process.exit(1);
  }

  // If URI is SRV, try DNS pre-checks
  if (rawUri.startsWith('mongodb+srv://')) {
    try {
      // extract host portion of the SRV URI: mongodb+srv://<user>:<pass>@<host>/...
      const host = rawUri.split('@').pop().split('/')[0].split('?')[0];
      const srvName = `_mongodb._tcp.${host}`;

      console.log(`Checking SRV records for ${srvName} ...`);
      const srvRecords = await dns.resolveSrv(srvName);
      if (!srvRecords || srvRecords.length === 0) {
        throw new Error('No SRV records returned');
      }
      console.log(`✔ SRV records found (${srvRecords.length})`);

      console.log(`Checking TXT records for ${host} ...`);
      const txt = await dns.resolveTxt(host);
      if (!txt || txt.length === 0) {
        console.warn('⚠️ No TXT records found — SRV may still work but TXT typically contains replicaSet/auth info.');
      } else {
        console.log('✔ TXT record found');
      }

      // All checks passed — proceed to connect using rawUri
      await connectWithMongoose(rawUri);
    } catch (err) {
      console.error('❌ DNS SRV/TXT check failed for mongodb+srv URL. Error:', err && err.code ? `${err.code} - ${err.message}` : err.message);
      console.error('Possible causes: your local DNS resolver blocks SRV/TXT lookups, you are behind a VPN/corporate proxy, or transient network issues.');

      if (fallbackUri) {
        console.warn('Using fallback MONGO_URI_STANDARD from environment (non-SRV) as automatic fallback.');
        await connectWithMongoose(fallbackUri);
      } else {
        console.error('Actions you can take (pick one):');
        console.error('  1) Change system DNS to a public DNS (e.g., 8.8.8.8 or 1.1.1.1) and retry.');
        console.error('     - Windows GUI: Control Panel → Network → Adapter → IPv4 Properties → DNS server addresses.');
        console.error('  2) Use Atlas "Standard connection string (mongodb://)" (non-SRV) and set it as MONGO_URI_STANDARD in backend/.env.');
        console.error('  3) Test DNS from PowerShell: Resolve-DnsName -Name _mongodb._tcp.<host> -Type SRV');
        console.error('After fixing DNS or setting MONGO_URI_STANDARD, restart the server.');
        process.exit(1);
      }
    }
  } else {
    // Not SRV — connect directly using the provided URI
    await connectWithMongoose(rawUri);
  }
}

async function connectWithMongoose(uri) {
  try {
    await mongoose.connect(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB Connected');
    
    // Start server only after successful DB connection
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    // If you get querySrv EREFUSED here, see the console messages in checkAndConnect
    process.exit(1);
  }
}

// API Routes
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const partyRoutes = require('./routes/partyRoutes');
const saleRoutes = require('./routes/saleRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const orderRoutes = require('./routes/orderRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const exportRoutes = require('./routes/exportRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const reportRoutes = require('./routes/reportRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/parties', partyRoutes);
app.use('/api/sales', saleRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/accounts', require('./routes/accountsRoutes'));
app.use('/api/users', userRoutes);
app.use('/api/mappings', require('./routes/mappingRoutes'));
app.use('/api/export', exportRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);

if (process.env.NODE_ENV === 'production' || true) { // Force true for cPanel
  // Set static folder
  app.use(express.static('public'));

  // Any route that is NOT /api... goes to index.html
  app.get('*', (req, res) => {
    // Exclude API routes explicitly just in case
    if (req.url.startsWith('/api')) return res.status(404).send("API Not Found");
    
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
  });
}

// Kick off connection + server start
checkAndConnect();