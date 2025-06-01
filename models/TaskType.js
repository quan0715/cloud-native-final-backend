const mongoose = require('mongoose');

const taskTypeSchema = new mongoose.Schema({
  taskName: {
    type: String,
    required: true,
    unique: true,
    minlength: 2, // 假設任務名稱最小長度為2
    maxlength: 50 // 假設任務名稱最大長度為50
  },
  number_of_machine: {
    type: Number,
    required: true,
    min: 1,
    max: 20
  },
  color: {
    type: String,
  }
}, { timestamps: true });

module.exports = mongoose.model('TaskType', taskTypeSchema);