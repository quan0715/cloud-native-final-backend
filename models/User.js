const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  permissions: {
    type: String,
    enum: ['admin', 'leader', 'worker'],
    required: true
  }
});

module.exports = mongoose.model('User', userSchema);