const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  machineName: {
    type: String,
    required: true,
    unique: true
  },
  machine_task_types: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskType'
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Machine', machineSchema);