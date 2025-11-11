import mongoose from "mongoose";

const clickSchema = new mongoose.Schema({
  button: String,
  page: String,
  timestamp: { type: Date, default: Date.now },
});

export default mongoose.model("Click", clickSchema);

