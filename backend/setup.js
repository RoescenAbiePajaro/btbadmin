const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Check if models directory exists and create if needed
const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
  console.log('Created models directory');
}

// Check required models
const requiredModels = [
  'Activity.js',
  'User.js', 
  'File.js',
  'Class.js'
];

console.log('Checking for required models...');

for (const model of requiredModels) {
  const modelPath = path.join(modelsDir, model);
  if (!fs.existsSync(modelPath)) {
    console.log(`⚠️  Missing: ${model}`);
  } else {
    console.log(`✓ Found: ${model}`);
  }
}

// Connect to MongoDB to test
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('\n✅ MongoDB connected successfully');
  console.log('\nSetup completed! Next steps:');
  console.log('1. Run: npm install');
  console.log('2. Create a .env file with:');
  console.log('   MONGODB_URI=your_mongodb_connection_string');
  console.log('   JWT_SECRET=your_jwt_secret');
  console.log('   SUPABASE_URL=your_supabase_url');
  console.log('   SUPABASE_SERVICE_ROLE=your_service_role_key');
  console.log('3. Run: npm run dev');
  process.exit(0);
})
.catch(err => {
  console.error('\n❌ MongoDB connection failed:', err.message);
  console.log('\nPlease check your MONGODB_URI in .env file');
  process.exit(1);
});