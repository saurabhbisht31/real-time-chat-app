// server/routes/authRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const User = require("../models/User"); // Imported model references directly for quick adjustments

const {
  registerUser,
  loginUser,
  getUsers,
  updateAvatar,
  updatePublicKey,
} = require("../controllers/authController");

const router = express.Router();

// Setup Multer Storage Engine configuration for Profile Avatars
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, `avatar_${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit avatar size to 5MB
  },
});

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/users", getUsers);
router.put("/update-avatar", upload.single("avatar"), updateAvatar);
router.put("/update-public-key", updatePublicKey);

// ================= CORED CUSTOM METADATA ROUTING ACTIONS =================

// Update user configurations profile properties
router.put("/update-profile", async (req, res) => {
  const { userId, name, bio, statusEmoji } = req.body;
  try {
    const updated = await User.findByIdAndUpdate(
      userId,
      { name, bio, statusEmoji },
      { new: true }
    ).select("-password");
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update target user profile schema properties." });
  }
});

// Flip active elements pinned listing conditions
router.put("/toggle-pin", async (req, res) => {
  const { userId, chatId } = req.body;
  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: "Operator trace invalid." });
    
    const index = targetUser.pinnedChats.includes(chatId);
    if (index) {
      targetUser.pinnedChats = targetUser.pinnedChats.filter(id => id !== chatId);
    } else {
      targetUser.pinnedChats.push(chatId);
    }
    await targetUser.save();
    res.json({ pinnedChats: targetUser.pinnedChats });
  } catch (err) {
    res.status(500).json({ error: "Failed structural toggle array update elements." });
  }
});

// Flip active elements muted status tracking parameters
router.put("/toggle-mute", async (req, res) => {
  const { userId, chatId } = req.body;
  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ error: "Operator trace invalid." });
    
    const index = targetUser.mutedChats.includes(chatId);
    if (index) {
      targetUser.mutedChats = targetUser.mutedChats.filter(id => id !== chatId);
    } else {
      targetUser.mutedChats.push(chatId);
    }
    await targetUser.save();
    res.json({ mutedChats: targetUser.mutedChats });
  } catch (err) {
    res.status(500).json({ error: "Failed structural toggle array update elements." });
  }
});

module.exports = router;