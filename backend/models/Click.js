// Click.js
import mongoose from "mongoose";

const clickSchema = new mongoose.Schema({
  button: String,
  page: String,
  timestamp: { type: Date, default: Date.now },
  // Add new fields for device and location info
  userAgent: String,
  deviceType: String,
  operatingSystem: String,
  browser: String,
  ipAddress: String,
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  },
  isMobile: Boolean,
  isTablet: Boolean,
  isDesktop: Boolean,
  isLaptop: Boolean
});

export default mongoose.model("Click", clickSchema);