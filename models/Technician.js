const mongoose = require('mongoose');

const technicianSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  skills: [{ type: String, required: true }]
});

module.exports = mongoose.model('Technician', technicianSchema);
