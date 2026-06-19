// server/controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      avatar: "", // Defaults to empty string upon signup
      publicKey: "", // Starts blank until client registers its device keys
    });

    res.status(201).json({
      message: "User Registered Successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid password",
      });
    }

    // UPDATE LAST SEEN
    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        lastSeen: user.lastSeen,
        avatar: user.avatar, // Sends the saved avatar link to store in frontend state
        publicKey: user.publicKey, // Sends the active public key to the frontend context
      },
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET ALL USERS
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// UPDATE PROFILE AVATAR
const updateAvatar = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!req.file) {
      return res.status(400).json({ message: "No image file uploaded" });
    }

    const avatarUrl = "/uploads/" + req.file.filename;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarUrl },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the fresh image string URL path back to the client UI
    res.status(200).json({
      message: "Avatar updated successfully",
      avatar: updatedUser.avatar,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// UPDATE PUBLIC KEY FOR END-TO-END ENCRYPTION (E2EE)
const updatePublicKey = async (req, res) => {
  try {
    const { userId, publicKey } = req.body;

    if (!userId || !publicKey) {
      return res.status(400).json({ message: "Missing required identity or cryptographic parameters" });
    }

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { publicKey: publicKey },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User account not discovered" });
    }

    res.status(200).json({
      message: "Security parameters propagated successfully",
      publicKey: updatedUser.publicKey,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUsers,
  updateAvatar,
  updatePublicKey, // Exporting the newly introduced function
};