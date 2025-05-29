const mongoose = require('mongoose');

const taskTypeSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
    unique: true
  },
  number_of_machine: {
    type: Number,
    required: true,
    min: 1 
  },
  color: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('TaskType', taskTypeSchema);