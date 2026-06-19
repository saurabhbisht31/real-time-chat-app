const Group = require("../models/Group");
const GroupMessage = require("../models/GroupMessage");

const createGroup = async (req, res) => {
  try {
    const { name, members, createdBy } = req.body;
    const group = await Group.create({ name, members, createdBy });
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroups = async (req, res) => {
  try {
    const { username } = req.query;
    const groups = await Group.find({ members: username });
    res.status(200).json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getGroupMessages = async (req, res) => {
  try {
    const messages = await GroupMessage.find({ groupId: req.params.groupId }).sort({ createdAt: 1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createGroup, getGroups, getGroupMessages };
