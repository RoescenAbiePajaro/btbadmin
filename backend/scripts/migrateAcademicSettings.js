// backend/scripts/migrateAcademicSettings.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const AcademicSetting = require('./models/AcademicSetting');

dotenv.config();

async function migrateSettings() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Find all academic settings without educator field
    const settings = await AcademicSetting.find({ educator: { $exists: false } });
    
    console.log(`Found ${settings.length} settings to migrate`);
    
    // Update each setting to set educator = createdBy
    for (const setting of settings) {
      setting.educator = setting.createdBy;
      await setting.save();
      console.log(`Migrated setting: ${setting.name} (${setting.type})`);
    }
    
    console.log('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateSettings();