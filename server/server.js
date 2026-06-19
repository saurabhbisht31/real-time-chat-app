// server/index.js
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const authRoutes = require("./routes/authRoutes");
const messageRoutes = require("./routes/messageRoutes");
const groupRoutes = require("./routes/groupRoutes");

const connectDB = require("./config/db");
const Message = require("./models/Message");
const User = require("./models/User");
const GroupMessage = require("./models/GroupMessage");

dotenv.config();
connectDB();

const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Serve static uploaded files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);

app.get("/", (req, res) => res.send("Backend Running"));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

// Maps usernames to socket IDs
const onlineUsers = {};
// Helper object to track ongoing calls to deduce if a call was answered or missed
const activeCalls = {};

// Helper function to dynamically insert and broadcast systemic call message logs
async function logCallMessage(sender, receiver, textMessage) {
  try {
    const savedMessage = await Message.create({
      sender: sender,
      receiver: receiver,
      text: textMessage,
      mediaUrl: "",
      mediaType: "system_call", // Custom type flag to help style this differently on the frontend if needed
      seen: false,
      replyTo: null,
      reactions: []
    });

    // Send back down live update loops to both endpoints if they are online
    const senderSocket = onlineUsers[sender];
    if (senderSocket) io.to(senderSocket).emit("receive_message", savedMessage);

    const receiverSocket = onlineUsers[receiver];
    if (receiverSocket) io.to(receiverSocket).emit("receive_message", savedMessage);
  } catch (err) {
    console.error("Failed to automatically generate and save systemic call status message:", err);
  }
}

// ================= SOCKET LOGIC =================
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Track online users
  socket.on("user_joined", (userName) => {
    if (!userName) return;
    onlineUsers[userName] = socket.id;
    io.emit("online_users", Object.keys(onlineUsers));
  });

  // Join group channel room
  socket.on("join_group", (groupId) => {
    if (groupId) socket.join(groupId);
  });

  // ================= WEBRTC CALLING HANDSHAKE SIGNALS =================
  socket.on("initiate_call", ({ to, from, offer, video }) => {
    const targetSocket = onlineUsers[to];
    const systemCallLabel = video ? "Video Call" : "Voice Call";

    // Track structural call state using the original caller's string username as the map key
    activeCalls[from] = { 
      to: to, 
      type: systemCallLabel, 
      answered: false 
    };

    // Auto-log: "Video Call started" / "Voice Call started"
    logCallMessage(from, to, `📞 ${systemCallLabel} started`);

    if (targetSocket) {
      io.to(targetSocket).emit("incoming_call", { from, offer, video });
    }
  });

  socket.on("answer_call", ({ to, from, answer }) => {
    // 'to' contains the original caller's name. Mark their active call as answered.
    if (activeCalls[to]) {
      activeCalls[to].answered = true; 
    }

    const targetSocket = onlineUsers[to];
    if (targetSocket) {
      io.to(targetSocket).emit("call_answered", { answer });
    }
  });

  socket.on("send_ice_candidate", ({ to, candidate }) => {
    const targetSocket = onlineUsers[to];
    if (targetSocket) {
      io.to(targetSocket).emit("receive_ice_candidate", { candidate });
    }
  });

  socket.on("hangup_call", ({ to, from }) => {
    // Identify the active tracker registry using from or to usernames
    const callerName = activeCalls[from] ? from : (activeCalls[to] ? to : null);
    const callData = activeCalls[callerName];

    if (callData) {
      if (callData.answered) {
        // SCENARIO 1: The call was picked up and has now naturally ended
        logCallMessage(callerName, callData.to, `🛑 ${callData.type} ended`);
      } else {
        // SCENARIO 2: The call was never picked up
        if (from === callerName) {
          // The person who hung up is the caller themselves -> They canceled it
          logCallMessage(callerName, callData.to, `❌ Canceled ${callData.type}`);
        } else {
          // The person who hung up is the receiver -> Missed / Declined
          logCallMessage(callerName, callData.to, `❌ Missed ${callData.type}`);
        }
      }
      // Evict record from server tracking memory
      delete activeCalls[callerName];
    }

    // Inform the target client endpoint to reset its structural layout overlays
    const targetSocket = onlineUsers[to];
    if (targetSocket) {
      io.to(targetSocket).emit("call_ended");
    }
  });

  // ================= NEW LIVE EDIT HANDSHAKE EVENTS PIPELINE =================
  socket.on("edit_message", async ({ messageId, newText, receiver, groupId }) => {
    try {
      if (groupId) {
        await GroupMessage.findByIdAndUpdate(messageId, { text: newText, isEdited: true });
        io.to(groupId).emit("group_message_edited", { messageId, newText });
      } else {
        await Message.findByIdAndUpdate(messageId, { text: newText, isEdited: true });
        
        socket.emit("message_edited", { messageId, newText });
        const receiverSocket = onlineUsers[receiver];
        if (receiverSocket) {
          io.to(receiverSocket).emit("message_edited", { messageId, newText });
        }
      }
    } catch (err) {
      console.error("Failed to alter stored database entry text strings:", err);
    }
  });

  // Typing indicators (Direct Message)
  socket.on("typing", (data) => {
    if (!data || !data.receiver) return;
    const receiverSocket = onlineUsers[data.receiver];
    if (receiverSocket) {
      io.to(receiverSocket).emit("show_typing", data.sender);
    }
  });

  socket.on("stop_typing", (data) => {
    if (!data || !data.receiver) return;
    const receiverSocket = onlineUsers[data.receiver];
    if (receiverSocket) {
      io.to(receiverSocket).emit("hide_typing");
    }
  });

  // Typing indicators (Group Chat)
  socket.on("group_typing", (data) => {
    if (!data || !data.groupId) return;
    socket.to(data.groupId).emit("show_group_typing", data.sender);
  });

  socket.on("group_stop_typing", (data) => {
    if (!data || !data.groupId) return;
    socket.to(data.groupId).emit("hide_group_typing");
  });

  // Send Direct Message
  socket.on("send_message", async (data) => {
    try {
      if (!data.sender || !data.receiver) return;

      const savedMessage = await Message.create({
        sender: data.sender,
        receiver: data.receiver,
        text: data.text || "",
        mediaUrl: data.mediaUrl || "",
        mediaType: data.mediaType || "",
        seen: false,
        replyTo: data.replyTo || null,
        reactions: []
      });

      let populatedMessage;
      if (savedMessage.replyTo) {
        populatedMessage = await Message.findById(savedMessage._id).populate("replyTo");
      } else {
        populatedMessage = await Message.findById(savedMessage._id);
      }

      socket.emit("receive_message", populatedMessage);

      const receiverSocket = onlineUsers[data.receiver];
      if (receiverSocket) {
        io.to(receiverSocket).emit("receive_message", populatedMessage);
      }
    } catch (error) {
      console.error("Socket send_message error:", error);
    }
  });

  // Handle Real-time Message Reactions
  socket.on("react_message", async (data) => {
    try {
      const { messageId, user, emoji, receiver } = data;
      if (!messageId || !user || !emoji) return;
      
      const message = await Message.findById(messageId);
      if (!message) return;

      if (!message.reactions) {
        message.reactions = [];
      }

      const existingReactionIndex = message.reactions.findIndex(
        (r) => r.user === user && r.emoji === emoji
      );

      if (existingReactionIndex > -1) {
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        const userOldReactionIndex = message.reactions.findIndex((r) => r.user === user);
        if (userOldReactionIndex > -1) {
          message.reactions[userOldReactionIndex].emoji = emoji;
        } else {
          message.reactions.push({ user, emoji });
        }
      }

      await message.save();

      let updatedMessage;
      if (message.replyTo) {
        updatedMessage = await Message.findById(messageId).populate("replyTo");
      } else {
        updatedMessage = await Message.findById(messageId);
      }

      socket.emit("message_reaction_updated", updatedMessage);
      
      const targetUser = message.sender === user ? message.receiver : message.sender;
      const destinationName = targetUser || receiver;
      const receiverSocket = onlineUsers[destinationName];
      
      if (receiverSocket) {
        io.to(receiverSocket).emit("message_reaction_updated", updatedMessage);
      }
    } catch (error) {
      console.error("Socket reaction error:", error);
    }
  });

  // Handle message seen states
  socket.on("message_seen", async (data) => {
    try {
      if (!data.sender || !data.receiver) return;

      await Message.updateMany(
        { sender: data.sender, receiver: data.receiver, seen: false },
        { seen: true }
      );

      const senderSocket = onlineUsers[data.sender];
      if (senderSocket) {
        io.to(senderSocket).emit("messages_seen", { by: data.receiver });
      }
    } catch (error) {
      console.error("Socket message_seen error:", error);
    }
  });

  // Group Messages
  socket.on("send_group_message", async (data) => {
    try {
      if (!data.groupId || !data.sender) return;

      const savedMessage = await GroupMessage.create({
        groupId: data.groupId,
        sender: data.sender,
        text: data.text || "",
        mediaUrl: data.mediaUrl || "",
        mediaType: data.mediaType || "",
        readBy: [data.sender],
      });
      io.to(data.groupId).emit("receive_group_message", savedMessage);
    } catch (error) {
      console.error("Socket send_group_message error:", error);
    }
  });

  // Handle Delete Message -> FOR EVERYONE
  socket.on("delete_message", async (data) => {
    try {
      const id = data && data.id ? data.id : data; 
      if (!id) return;

      const msg = await Message.findById(id);
      if (!msg) return;

      const msgSender = msg.sender;
      const msgReceiver = msg.receiver;

      await Message.findByIdAndDelete(id);
      
      const senderSocket = onlineUsers[msgSender];
      if (senderSocket) {
        io.to(senderSocket).emit("message_deleted", { id, forEveryone: true });
      }
      
      const receiverSocket = onlineUsers[msgReceiver];
      if (receiverSocket) {
        io.to(receiverSocket).emit("message_deleted", { id, forEveryone: true });
      }

      console.log(`Message ${id} successfully deleted for everyone.`);
    } catch (error) {
      console.error("Socket delete_message error:", error);
    }
  });

  // Disconnect logic
  socket.on("disconnect", async () => {
    let disconnectedUser = null;
    
    for (const user in onlineUsers) {
      if (onlineUsers[user] === socket.id) {
        disconnectedUser = user;
        break;
      }
    }

    if (disconnectedUser) {
      delete onlineUsers[disconnectedUser];
      try {
        const timestampMarker = new Date();
        await User.findOneAndUpdate(
          { $or: [{ name: disconnectedUser }, { username: disconnectedUser }] },
          { lastSeen: timestampMarker }
        );
        
        socket.broadcast.emit("user_logged_offline", { 
          username: disconnectedUser, 
          lastSeen: timestampMarker 
        });
      } catch (err) {
        console.error("Error updating user lastSeen on disconnect:", err);
      }
    }
    io.emit("online_users", Object.keys(onlineUsers));
    console.log("User disconnected:", socket.id);
  });
});

// ================= START SERVER =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));