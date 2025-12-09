const dotenv = require('dotenv');
const path = require('path');

// Load .env file
const result = dotenv.config({ path: path.join(__dirname, '.env') });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error.message);
  console.log('📁 Current directory:', __dirname);
  console.log('📄 Looking for file:', path.join(__dirname, '.env'));
  process.exit(1);
}

console.log('✅ .env file loaded successfully');

// Check required environment variables
const requiredEnvVars = ['ADMIN_EMAIL', 'ADMIN_PASSWORD', 'JWT_SECRET', 'MONGODB_URI'];
let allValid = true;

console.log('\n🔑 Environment Variables Check:');
requiredEnvVars.forEach(envVar => {
  const exists = !!process.env[envVar];
  console.log(`   ${envVar}: ${exists ? '✅' : '❌'}`);
  if (!exists) allValid = false;
});

if (!allValid) {
  console.error('\n❌ Missing required environment variables!');
  process.exit(1);
}

// Show admin credentials (mask password)
console.log('\n👑 Admin Credentials:');
console.log(`   Email: ${process.env.ADMIN_EMAIL}`);
console.log(`   Password: ${'*'.repeat(process.env.ADMIN_PASSWORD.length)} (${process.env.ADMIN_PASSWORD.length} characters)`);

// Show other config
console.log('\n⚙️  Configuration:');
console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`   MongoDB URI: ${process.env.MONGODB_URI}`);
console.log(`   Port: ${process.env.PORT || 5000}`);

console.log('\n✅ Environment check completed successfully!');