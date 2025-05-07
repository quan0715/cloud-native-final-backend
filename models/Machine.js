const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['temperature', 'electrical', 'physical'],
    required: true
  },
  status: {
    type: String,
    enum: ['idle', 'busy'],
    default: 'idle'
  }
});

module.exports = mongoose.model('Machine', machineSchema);