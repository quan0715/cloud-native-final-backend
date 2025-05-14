const mongoose = require('mongoose');

const taskDataSchema = new mongoose.Schema({
  state: {
    type: String,
    enum: ['draft', 'assigned', 'in-progress', 'success', 'fail'],
    required: true
  },
  assigner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  machine: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Machine'
  }],
  startTime: Date,
  endTime: Date,
  message: String
}, { _id: false });

const taskSchema = new mongoose.Schema({
  taskTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskType',
    required: true
  },
  taskName: {
    type: String,
    required: true
  },
  assigner_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  taskData: taskDataSchema
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);