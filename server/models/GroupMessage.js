const mongoose = require("mongoose");

const groupMessageSchema = new mongoose.Schema({
  groupId: { type: String, required: true },
  sender: { type: String, required: true },
  // Remove "required: true" so users can send standalone voice notes/media
  text: { type: String, default: "" }, 
  mediaUrl: { type: String, default: "" },
  mediaType: { type: String, default: "" },
  deletedFor: [{ type: String }],
  readBy: [{ type: String }],
}, { timestamps: true });

module.exports = mongoose.model("GroupMessage", groupMessageSchema);