require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");

const PORT = process.env.PORT || 5001;
const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1:27017/chat-app";
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_key_123";

const allowedOrigins = [
  "http://localhost:3000", "http://localhost:3001",
  "http://localhost:5173", "http://localhost:5174",
  "http://127.0.0.1:3000", "http://127.0.0.1:3001",
  "http://127.0.0.1:5173", "http://127.0.0.1:5174",
];

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

// --- Message Schema (Phase 2: added 'edited' flag) ---
const messageSchema = new mongoose.Schema({
  room: { type: String, required: true, index: true },
  username: { type: String, required: true },
  message: { type: String, required: true },
  time: { type: String, required: true },
  seen: { type: Boolean, default: false },
  status: { type: String, enum: ["sent", "delivered", "seen"], default: "sent" },
  edited: { type: Boolean, default: false },
}, { timestamps: true });

messageSchema.index({ room: 1, createdAt: -1 });
messageSchema.index({ message: "text" }); // Phase 3: text search index

const Message = mongoose.model("Message", messageSchema);

// --- User Schema (Phase 4: added bio, privacy fields) ---
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  lastSeen: { type: Date, default: Date.now },
  bio: { type: String, default: "" },
  showLastSeen: { type: Boolean, default: true },
  allowReadReceipts: { type: Boolean, default: true },
});

const User = mongoose.model("User", userSchema);

// --- Room Schema (Phase 1: persistent rooms) ---
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ["dm", "group"], default: "group" },
  participants: [{ type: String }], // storing usernames for simplicity
  createdBy: { type: String },
  icon: { type: String, default: "tag" },
  color: { type: String, default: "#303992" },
}, { timestamps: true });

roomSchema.index({ participants: 1 });

const Room = mongoose.model("Room", roomSchema);

// --- Unread Count Schema ---
const unreadSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  room: { type: String, required: true, index: true },
  count: { type: Number, default: 0 },
}, { timestamps: true });

unreadSchema.index({ username: 1, room: 1 }, { unique: true });

const Unread = mongoose.model("Unread", unreadSchema);


// ═══════════════════════════════════════════════════════════════════════════════
// DB CONNECTION + SEED DEFAULT ROOMS
// ═══════════════════════════════════════════════════════════════════════════════

mongoose.connect(MONGO_URL)
  .then(async () => {
    // console.log("MongoDB connected");

    // Pre-populate lastSeenMap from DB
    const users = await User.find({}, "username lastSeen");
    users.forEach(u => {
      if (u.lastSeen) lastSeenMap.set(u.username, u.lastSeen);
    });

    // Seed default group rooms if missing
    const defaults = [
      { name: "General", type: "group", participants: [], createdBy: "system", icon: "tag", color: "#303992" },
      { name: "Design Team", type: "group", participants: [], createdBy: "system", icon: "palette", color: "#8B5CF6" },
      { name: "Engineering", type: "group", participants: [], createdBy: "system", icon: "code", color: "#10B981" },
    ];
    for (const def of defaults) {
      await Room.findOneAndUpdate(
        { name: def.name, type: "group" },
        { $setOnInsert: def },
        { upsert: true }
      );
    }
    // console.log("Default rooms ensured");
  })
  .catch((error) => {
    // console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  });


// ═══════════════════════════════════════════════════════════════════════════════
// EXPRESS APP + AUTH ENDPOINTS
// ═══════════════════════════════════════════════════════════════════════════════

const app = express();
app.use(express.json());
app.use(cors({ origin: allowedOrigins }));

// -- JWT middleware for REST routes --
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ msg: "No token" });
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ msg: "Invalid token" });
  }
};

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const existing = await User.findOne({ username });
    if (existing) return res.status(400).json({ msg: "Username already exists" });

    // Password requirements: 8+ chars, at least one special character
    const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
    if (password.length < 8) {
      return res.status(400).json({ msg: "Password must be at least 8 characters long" });
    }
    if (!specialCharRegex.test(password)) {
      return res.status(400).json({ msg: "Password must contain at least one special character" });
    }

    const hashed = await bcrypt.hash(password, 10);
    await new User({ username, password: hashed }).save();
    res.json({ message: "User registered" });
  } catch (error) {
    res.status(500).json({ msg: "Registration failed", error: error.message });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ msg: "User not found" });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Wrong password" });
    const token = jwt.sign({ username: user.username }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ msg: "Login failed", error: error.message });
  }
});

app.get("/health", (_req, res) => res.json({ status: "ok" }));

// ── Phase 3: Search APIs ──────────────────────────────────────────────────────
app.get("/search/users", authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    const users = await User.find(
      { username: { $regex: query, $options: "i" } },
      "username bio lastSeen"
    ).limit(20).lean();
    res.json(users);
  } catch (err) {
    res.status(500).json({ msg: "Search failed", error: err.message });
  }
});

app.get("/search/messages", authMiddleware, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.json([]);
    const username = req.user.username;
    const accessibleRegex = new RegExp(`^(general|design-team|engineering|.*\\b${username}\\b.*)$`, "i");
    const messages = await Message.find({
      message: { $regex: query, $options: "i" },
      room: accessibleRegex,
    }).sort({ createdAt: -1 }).limit(20).lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ msg: "Search failed", error: err.message });
  }
});

// ── Phase 4: User Profile APIs ────────────────────────────────────────────────
app.get("/user/profile", authMiddleware, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username }, "-password").lean();
    if (!user) return res.status(404).json({ msg: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Failed to fetch profile", error: err.message });
  }
});

app.put("/user/profile", authMiddleware, async (req, res) => {
  try {
    const allowed = ["bio", "showLastSeen", "allowReadReceipts"];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    const user = await User.findOneAndUpdate(
      { username: req.user.username },
      updates,
      { new: true, select: "-password" }
    ).lean();
    res.json(user);
  } catch (err) {
    res.status(500).json({ msg: "Update failed", error: err.message });
  }
});

app.put("/user/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ msg: "User not found" });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Current password is wrong" });
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ msg: "Password updated" });
  } catch (err) {
    res.status(500).json({ msg: "Failed", error: err.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET.IO SERVER
// ═══════════════════════════════════════════════════════════════════════════════

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
});

// Socket auth middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Unauthorized: No token"));
  try {
    socket.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    next(new Error("Unauthorized: Invalid token"));
  }
});


// ── In-Memory State ───────────────────────────────────────────────────────────
let onlineUsers = new Map();      // socket.id -> username
let lastSeenMap = new Map();      // username -> Date
let activeUsers = {};             // room -> [socket.id]
let userActiveRoom = new Map();   // socket.id -> current chat room

// ── Helper: get room slug from Room doc ──
const roomSlug = (room) => room.name.toLowerCase().replace(/\s+/g, "-");

const broadcastOnlineList = () => {
  const onlineUsernames = new Set(onlineUsers.values());
  const list = [];
  lastSeenMap.forEach((time, u) => {
    list.push({ username: u, isOnline: onlineUsernames.has(u), lastSeen: time });
  });
  io.emit("online_users", list);
};

const sendUnreadCounts = async (username) => {
  try {
    const unreads = await Unread.find({ username, count: { $gt: 0 } }).lean();
    const countsMap = {};
    unreads.forEach(u => { countsMap[u.room] = u.count; });
    io.to(`user_${username}`).emit("unread_counts", countsMap);
  } catch (err) {
    // console.error(`Failed to send unread counts to ${username}:`, err.message);
  }
};

const isUserInRoom = (username, room) => {
  for (const [socketId, name] of onlineUsers.entries()) {
    if (name === username && userActiveRoom.get(socketId) === room) return true;
  }
  return false;
};


// ═══════════════════════════════════════════════════════════════════════════════
// SOCKET EVENT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════

io.on("connection", async (socket) => {
  const username = socket.user.username;

  onlineUsers.set(socket.id, username);
  lastSeenMap.set(username, new Date());
  socket.join(`user_${username}`);

  // console.log(`✅ Connected: ${socket.id} (${username})`);
  broadcastOnlineList();
  await sendUnreadCounts(username);


  // ── Phase 1: ROOM MANAGEMENT ─────────────────────────────────────────────

  socket.on("create_room", async (data) => {
    try {
      const { name, participants, type } = data;
      if (!name || !participants || participants.length === 0) return;

      // Ensure creator is in participants
      const allParticipants = [...new Set([username, ...participants])];

      const room = await Room.create({
        name,
        type: type || "group",
        participants: allParticipants,
        createdBy: username,
        icon: data.icon || "group",
        color: data.color || "#303992",
      });

      const slug = roomSlug(room);

      // Notify all participants
      allParticipants.forEach(p => {
        io.to(`user_${p}`).emit("room_created", { ...room.toObject(), slug });
      });

      // console.log(`📁 Room created: ${room.name} by ${username}`);
    } catch (err) {
      // console.error("Failed to create room:", err.message);
      socket.emit("error_event", { msg: "Failed to create room" });
    }
  });

  socket.on("get_rooms", async () => {
    try {
      // Get all rooms user is part of (groups they joined + DMs)
      const rooms = await Room.find({
        $or: [
          { participants: username },
          { participants: { $size: 0 }, type: "group" }, // default global rooms
        ]
      }).lean();

      // Also get DM rooms from message history
      const dmRoomRegex = new RegExp(`\\b${username}\\b`);
      const dmMessages = await Message.aggregate([
        { $match: { room: { $regex: dmRoomRegex } } },
        { $group: { _id: "$room" } }
      ]);

      // Build a list of DM room IDs
      const dmRoomIds = dmMessages.map(d => d._id).filter(r => r.includes("-"));

      socket.emit("rooms_list", { rooms, dmRoomIds });
    } catch (err) {
      // console.error("Failed to get rooms:", err.message);
    }
  });

  socket.on("get_all_users", async () => {
    try {
      const users = await User.find({ username: { $ne: username } }, "username bio lastSeen").lean();
      socket.emit("all_users", users);
    } catch (err) {
      // console.error("Failed to get users:", err.message);
    }
  });


  // ── JOIN / LEAVE ROOM ────────────────────────────────────────────────────

  socket.on("join_room", (room) => {
    if (!room) return;
    const isPrivateRoom = room.startsWith("user_");

    socket.join(room);

    if (!isPrivateRoom) {
      userActiveRoom.set(socket.id, room);
      if (!activeUsers[room]) activeUsers[room] = [];
      if (!activeUsers[room].includes(socket.id)) activeUsers[room].push(socket.id);

      // Reset unread
      Unread.findOneAndUpdate({ username, room }, { count: 0 }, { upsert: true })
        .exec().then(() => sendUnreadCounts(username))
        .catch(err => {}); // console.error("Reset unread err:", err.message));

      // Bulk mark seen
      Message.updateMany(
        { room, username: { $ne: username }, seen: false },
        { seen: true, status: "seen" }
      ).exec().then(r => {
        if (r.modifiedCount > 0) io.to(room).emit("messages_bulk_seen", { room });
      }).catch(() => {});
    }

    // Load messages
    Message.find({ room }).sort({ createdAt: 1 }).lean()
      .then(msgs => socket.emit("load_messages", msgs))
      .catch(() => socket.emit("load_messages", []));
  });

  socket.on("leave_room", (room) => {
    if (!room) return;
    socket.leave(room);
    if (userActiveRoom.get(socket.id) === room) userActiveRoom.delete(socket.id);
    if (activeUsers[room]) activeUsers[room] = activeUsers[room].filter(id => id !== socket.id);
  });


  // ── TYPING ───────────────────────────────────────────────────────────────

  socket.on("typing", (data) => {
    socket.to(data.room).emit("typing", { username });
  });


  // ── SEND MESSAGE ─────────────────────────────────────────────────────────

  socket.on("send_message", async (data) => {
    if (!data.room || !data.message) return;

    const payload = {
      room: data.room,
      message: data.message,
      username,
      time: data.time || new Date().toLocaleTimeString(),
      status: "sent",
    };

    try {
      const saved = await Message.create(payload);
      io.to(data.room).emit("receive_message", saved);

      // ── UNREAD LOGIC ──
      if (data.room.includes("-")) {
        // DM
        const others = data.room.split("-").filter(u => u !== username);
        for (const other of others) {
          if (!isUserInRoom(other, data.room)) {
            await Unread.findOneAndUpdate({ username: other, room: data.room }, { $inc: { count: 1 } }, { upsert: true });
          } else {
            await Message.findByIdAndUpdate(saved._id, { seen: true, status: "seen" });
            io.to(data.room).emit("message_seen_update", { messageId: saved._id });
          }
          io.to(`user_${other}`).emit("new_message_notification", saved);
          await sendUnreadCounts(other);
        }
        io.to(`user_${username}`).emit("new_message_notification", saved);
      } else {
        // Group
        const allUsers = await User.find({}, "username").lean();
        for (const u of allUsers) {
          if (u.username === username) continue;
          if (!isUserInRoom(u.username, data.room)) {
            await Unread.findOneAndUpdate({ username: u.username, room: data.room }, { $inc: { count: 1 } }, { upsert: true });
          } else {
            await Message.findByIdAndUpdate(saved._id, { seen: true, status: "seen" });
            io.to(data.room).emit("message_seen_update", { messageId: saved._id });
          }
          await sendUnreadCounts(u.username);
        }
        io.emit("refresh_chat_history");
      }
    } catch (error) {
      // console.error("Failed to save message:", error.message);
    }
  });


  // ── Phase 2: EDIT MESSAGE ────────────────────────────────────────────────

  socket.on("edit_message", async ({ messageId, newText, room }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (msg.username !== username) {
        // console.log(`❌ Edit blocked: ${username} tried to edit ${msg.username}'s message`);
        return;
      }
      const updated = await Message.findByIdAndUpdate(
        messageId,
        { message: newText, edited: true },
        { new: true }
      ).lean();
      io.to(room).emit("message_edited", updated);
      // console.log(`✏️ Message edited by ${username} in ${room}`);
    } catch (err) {
      // console.error("Edit message error:", err.message);
    }
  });


  // ── Phase 2: DELETE MESSAGE ──────────────────────────────────────────────

  socket.on("delete_message", async ({ messageId, room }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;
      if (msg.username !== username) {
        // console.log(`❌ Delete blocked: ${username} tried to delete ${msg.username}'s message`);
        return;
      }
      await Message.findByIdAndDelete(messageId);
      io.to(room).emit("message_deleted", { messageId });
      // console.log(`🗑️ Message deleted by ${username} in ${room}`);
    } catch (err) {
      // console.error("Delete message error:", err.message);
    }
  });


  // ── READ RECEIPT ─────────────────────────────────────────────────────────

  socket.on("message_seen", async ({ messageId, room }) => {
    try {
      if (!activeUsers[room]?.includes(socket.id)) return;
      await Message.findByIdAndUpdate(messageId, { seen: true, status: "seen" });
      io.to(room).emit("message_seen_update", { messageId });
    } catch (err) {
      // console.error("Seen error:", err.message);
    }
  });


  // ── GET UNREAD COUNTS ────────────────────────────────────────────────────

  socket.on("get_unread_counts", async () => {
    await sendUnreadCounts(username);
  });


  // ── DISCONNECT ───────────────────────────────────────────────────────────

  socket.on("disconnect", async () => {
    const disconnectedUser = onlineUsers.get(socket.id);
    onlineUsers.delete(socket.id);
    userActiveRoom.delete(socket.id);

    if (disconnectedUser) {
      const stillOnline = Array.from(onlineUsers.values()).includes(disconnectedUser);
      if (!stillOnline) {
        const now = new Date();
        lastSeenMap.set(disconnectedUser, now);
        await User.findOneAndUpdate({ username: disconnectedUser }, { lastSeen: now });
      }
    }

    Object.keys(activeUsers).forEach(room => {
      activeUsers[room] = activeUsers[room].filter(id => id !== socket.id);
    });

    broadcastOnlineList();
  });


  // ── ONLINE USERS ─────────────────────────────────────────────────────────

  socket.on("get_online_users", () => broadcastOnlineList());


  // ── CHAT HISTORY ─────────────────────────────────────────────────────────

  socket.on("get_chat_history", async () => {
    try {
      const accessibleRoomsRegex = new RegExp(`^(general|design-team|engineering|.*\\b${username}\\b.*)$`);
      const recentMessages = await Message.aggregate([
        { $match: { room: accessibleRoomsRegex } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$room",
            lastMessageAt: { $first: "$createdAt" },
            lastMessageText: { $first: "$message" },
            lastMessageUser: { $first: "$username" },
          }
        },
        { $sort: { lastMessageAt: -1 } }
      ]);
      socket.emit("chat_history", recentMessages);
    } catch (err) {
      // console.error("Failed to fetch history:", err);
    }
  });
});


// ═══════════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════════

server.listen(PORT, () => {
  // console.log(`🚀 Server running on port ${PORT}`);
});
