const mongoose = require('mongoose');
require('dotenv').config();

async function createIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('Connected to MongoDB');
    
    // Get models
    const Click = require('../models/Click');
    const FileActivity = require('../models/FileActivity');
    const User = require('../models/User');
    const File = require('../models/File');
    
    console.log('Creating indexes...');
    
    // Click indexes
    await Click.collection.createIndex({ type: 1, createdAt: -1 });
    await Click.collection.createIndex({ userId: 1, createdAt: -1 });
    await Click.collection.createIndex({ location: 1 });
    console.log('✓ Click indexes created');
    
    // FileActivity indexes
    await FileActivity.collection.createIndex({ fileId: 1, activityType: 1 });
    await FileActivity.collection.createIndex({ studentId: 1, createdAt: -1 });
    await FileActivity.collection.createIndex({ classCode: 1, createdAt: -1 });
    await FileActivity.collection.createIndex({ educatorId: 1, createdAt: -1 });
    await FileActivity.collection.createIndex({ createdAt: -1 });
    console.log('✓ FileActivity indexes created');
    
    // User indexes
    await User.collection.createIndex({ role: 1, createdAt: -1 });
    await User.collection.createIndex({ lastLogin: -1 });
    await User.collection.createIndex({ enrolledClass: 1 });
    console.log('✓ User indexes created');
    
    // File indexes
    await File.collection.createIndex({ classCode: 1, uploadedAt: -1 });
    await File.collection.createIndex({ type: 1, uploadedAt: -1 });
    console.log('✓ File indexes created');
    
    console.log('✅ All indexes created successfully!');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating indexes:', error);
    process.exit(1);
  }
}

createIndexes();