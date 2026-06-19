// server/models/User.js
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    avatar: {
      type: String,
      default: "",
    },
    publicKey: {
      type: String,
      default: "",
    },
    // ================= NEW ADVANCED UX TRACKING FIELDS =================
    bio: {
      type: String,
      default: "Hello! I am using Chat App.",
    },
    statusEmoji: {
      type: String,
      default: "💬",
    },
    pinnedChats: {
      type: [String], // Array of targeted user strings or room IDs
      default: [],
    },
    mutedChats: {
      type: [String], // Array of targeted user strings or room IDs
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", userSchema);