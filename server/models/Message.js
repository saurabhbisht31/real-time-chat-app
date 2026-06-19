// server/models/Message.js
const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      required: true,
    },
    receiver: {
      type: String,
      required: true,
    },
    text: {
      type: String,
      default: "", // Plain text data layer
    },
    mediaUrl: {
      type: String,
      default: "",
    },
    mediaType: {
      type: String,
      default: "",
    },
    deletedFor: [
      {
        type: String,
      },
    ],
    seen: {
      type: Boolean,
      default: false,
    },
    // Reply Feature
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // Edit Feature
    edited: {
      type: Boolean,
      default: false,
    },
    // Message Reactions
    reactions: [
      {
        user: String,
        emoji: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Message", messageSchema);