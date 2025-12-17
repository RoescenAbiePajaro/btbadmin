// backend/scripts/migrateClassAcademicFields.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Class = require('../models/Class');

dotenv.config();

async function migrateClassAcademicFields() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const classes = await Class.find({});
    
    console.log(`Found ${classes.length} classes to check`);
    
    for (const cls of classes) {
      // Set default empty strings for academic fields if they don't exist
      if (!cls.school) cls.school = '';
      if (!cls.course) cls.course = '';
      if (!cls.year) cls.year = '';
      if (!cls.block) cls.block = '';
      
      await cls.save();
      console.log(`Updated class: ${cls.className} (${cls.classCode})`);
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateClassAcademicFields();