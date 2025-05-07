const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: {
    type: String,
    enum: ['temperature', 'electrical', 'physical'],
    required: true
  },
  technicianId: { type: String }, // 可選
  machineId: { type: String },    // 可選
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'done'],
    default: 'pending'
  }
});

module.exports = mongoose.model('Task', taskSchema);