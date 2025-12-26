// backend/scripts/migrateToMultiClass.js
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config();

async function migrateStudents() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all students
    const students = await User.find({ role: 'student' });
    
    console.log(`Found ${students.length} students to migrate`);
    
    let migratedCount = 0;
    
    for (const student of students) {
      // If student has enrolledClass but not in classes array
      if (student.enrolledClass && (!student.classes || student.classes.length === 0)) {
        console.log(`Migrating student: ${student.fullName} (${student._id})`);
        
        // Initialize arrays
        student.classes = [student.enrolledClass];
        
        // Try to get class code if available
        if (!student.classCodes || student.classCodes.length === 0) {
          // You might need to populate this from the Class model
          student.classCodes = ['MIGRATED']; // Placeholder
        }
        
        await student.save();
        migratedCount++;
        console.log(`✓ Migrated student ${student.fullName}`);
      }
    }
    
    console.log(`Migration completed! Migrated ${migratedCount} students`);
    process.exit(0);
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

migrateStudents();