import mongoose from 'mongoose';

// This function safely gets model references without recompiling them
export function getModels() {
  // Try to get existing models first
  const models = {};
  
  try {
    models.TaskType = mongoose.model('TaskType');
  } catch (e) {
    // Model doesn't exist yet, it will be imported by the app
  }
  
  try {
    models.Task = mongoose.model('Task');
  } catch (e) {
    // Model doesn't exist yet, it will be imported by the app
  }
  
  try {
    models.User = mongoose.model('User');
  } catch (e) {
    // Model doesn't exist yet, it will be imported by the app
  }
  
  try {
    models.Machine = mongoose.model('Machine');
  } catch (e) {
    // Model doesn't exist yet, it will be imported by the app
  }
  
  // Wait for app to import models
  setTimeout(() => {
    if (!models.TaskType) models.TaskType = mongoose.model('TaskType');
    if (!models.Task) models.Task = mongoose.model('Task');
    if (!models.User) models.User = mongoose.model('User');
    if (!models.Machine) models.Machine = mongoose.model('Machine');
  }, 100);
  
  return models;
}
