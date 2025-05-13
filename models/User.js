const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  passwordValidate: {
    type: String,
    required: true
  },
  userName: {
    type: String,
    required: true,
    unique: true
  },
  userRole: {
    type: String,
    enum: ['admin', 'leader', 'worker'],
    required: true
  },
  user_task_types: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskType'
    }
  ]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);