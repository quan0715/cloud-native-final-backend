const mongoose = require('mongoose');

const machineSchema = new mongoose.Schema({
  machineName: {
    type: String,
    required: true,
    unique: true,
    minlength: 2,
    maxlength: 50,
  },
  machine_task_types: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskType',
      required: true,
      minlength: 2,
      maxlength: 50,
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('Machine', machineSchema);