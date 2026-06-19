const express = require("express");
const multer = require("multer");
const path = require("path");

const {
  getMessages,
  deleteMessage,
  deleteForMe,
  markSeen,
  uploadMedia,
  editMessage,
  reactToMessage,
} = require("../controllers/messageController");

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.get("/", getMessages);

router.delete("/:id", deleteMessage);

router.put("/:id/delete-for-me", deleteForMe);

router.put("/mark-seen", markSeen);

router.post("/upload", upload.single("file"), uploadMedia);

// EDIT MESSAGE
router.put("/:id/edit", editMessage);

// REACT TO MESSAGE
router.put("/:id/react", reactToMessage);

module.exports = router;