// import mongoose from "mongoose";

// const clickSchema = new mongoose.Schema({
//   button: String,
//   page: String,
//   timestamp: { type: Date, default: Date.now },
// });

// export default mongoose.model("Click", clickSchema);

// Click.js

// import mongoose from "mongoose";

// const clickSchema = new mongoose.Schema({
//   button: String,
//   page: String,
//   timestamp: { type: Date, default: Date.now },
// });

// export default mongoose.model("Click", clickSchema);
// backend/models/Click.js
const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  button: String,
  page: String,
  timestamp: { type: Date, default: Date.now },
  // Add device tracking fields
  deviceInfo: {
    userAgent: String,
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    device: String,
    deviceType: String, // 'desktop', 'mobile', 'tablet'
    screenResolution: String,
    language: String,
    timezone: String
  },
  ipAddress: String,
  country: String,
  region: String,
  city: String
});

module.exports = mongoose.model('Click', clickSchema);