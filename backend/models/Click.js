//backend/models/Click.js
import mongoose from "mongoose";

const clickSchema = new mongoose.Schema({
  button: String,
  page: String,
  timestamp: { type: Date, default: Date.now },
  // Device information
  device: {
    hostname: String,
    local_ip: String,
    public_ip: String,
    os: String,
    device_id: String,
    userAgent: String,
    deviceType: String,
    browser: String,
    isMobile: Boolean,
    isTablet: Boolean,
    isDesktop: Boolean
  },
  // Location information
  location: {
    country: String,
    region: String,
    city: String,
    timezone: String
  }
});

export default mongoose.model("Click", clickSchema);