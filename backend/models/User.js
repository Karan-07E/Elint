const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'product team'], default: 'user' },
  profilePhoto: {
    type: String,
    default: ''
  },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
