//models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['student','lecturer'], default: 'student' },
  points: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  badges: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Badge' }],
  mastery: { type: Map, of: Number, default: {} },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
