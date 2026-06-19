const Message = require("../models/Message");

// GET MESSAGES
const getMessages = async (req, res) => {
  try {
    const { sender, receiver } = req.query;
    let messages;

    if (sender && receiver) {
      messages = await Message.find({
        $or: [
          { sender: sender, receiver: receiver },
          { sender: receiver, receiver: sender },
        ],
      })
        .populate("replyTo")
        .sort({ createdAt: 1 });
    } else {
      messages = await Message.find()
        .populate("replyTo")
        .sort({ createdAt: 1 });
    }

    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE MESSAGE (FOR EVERYONE)
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({ message: "Not found" });
    }

    await Message.findByIdAndDelete(req.params.id);

    const io = req.app.get("io");
    if (io) {
      io.emit("message_deleted", { id: req.params.id, forEveryone: true });
    }

    res.status(200).json({ message: "Deleted for everyone" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE FOR ME
const deleteForMe = async (req, res) => {
  try {
    const { username } = req.body;
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Not found" });
    }

    if (!message.deletedFor.includes(username)) {
      message.deletedFor.push(username);
      await message.save();
    }

    res.status(200).json({ message: "Deleted for me" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// MARK SEEN
const markSeen = async (req, res) => {
  try {
    const { sender, receiver } = req.body;

    await Message.updateMany(
      { sender, receiver, seen: false },
      { seen: true }
    );

    const io = req.app.get("io");
    if (io) {
      io.emit("messages_marked-seen", { sender, receiver });
    }

    res.status(200).json({ message: "Marked as seen" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// UPLOAD MEDIA (UPDATED FOR AUDIO/VOICE NOTES)
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const mediaUrl = "/uploads/" + req.file.filename;
    const mime = req.file.mimetype;
    let mediaType = "file";

    // Dynamically parsing out the exact media categorization
    if (mime.startsWith("image/")) {
      mediaType = "image";
    } else if (mime.startsWith("video/")) {
      mediaType = "video";
    } else if (mime.startsWith("audio/") || req.file.originalname.endsWith(".webm")) {
      mediaType = "audio"; // Properly tags incoming voice recorder assets
    }

    res.status(200).json({ mediaUrl, mediaType });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// EDIT MESSAGE (REAL-TIME POPULATED)
const editMessage = async (req, res) => {
  try {
    const { text } = req.body;
    let message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    message.text = text;
    message.edited = true;
    await message.save();

    // Populate reply references for fallback UI updates
    message = await Message.findById(message._id).populate("replyTo");

    const io = req.app.get("io");
    if (io) {
      io.emit("message_edited", message);
    }

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// REACT TO MESSAGE (REAL-TIME POPULATED)
const reactToMessage = async (req, res) => {
  try {
    const { username, emoji } = req.body;
    let message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    const existingReactionIndex = message.reactions.findIndex((r) => r.user === username);

    if (existingReactionIndex > -1) {
      if (message.reactions[existingReactionIndex].emoji === emoji) {
        // Remove reaction if clicked twice
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // Swap out emoji type
        message.reactions[existingReactionIndex].emoji = emoji;
      }
    } else {
      // Create new interaction entry
      message.reactions.push({ user: username, emoji });
    }

    await message.save();
    
    // Repopulate reference layers safely before transmission
    message = await Message.findById(message._id).populate("replyTo");

    const io = req.app.get("io");
    if (io) {
      io.emit("message_reaction_updated", message);
    }

    res.status(200).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMessages,
  deleteMessage,
  deleteForMe,
  markSeen,
  uploadMedia,
  editMessage,
  reactToMessage,
};