const express = require("express");
const { createGroup, getGroups, getGroupMessages } = require("../controllers/groupController");
const router = express.Router();
router.post("/", createGroup);
router.get("/", getGroups);
router.get("/:groupId/messages", getGroupMessages);
module.exports = router;
