const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 5000;

// Matchmaking Queues & Active Rooms
const videoQueue = [];
const textQueue = [];
const activeRooms = new Map(); // socketId -> roomId

// Random presets for fallback info
const COUNTRIES = ["🇺🇸 USA", "🇬🇧 UK", "🇨🇦 Canada", "🇯🇵 Japan", "🇩🇪 Germany", "🇮🇳 India", "🇦🇺 Australia", "🇪🇸 Spain"];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

io.on("connection", (socket) => {
  console.log(`⚡ User connected: ${socket.id}`);

  // Helper to remove socket from queues
  const removeFromQueues = (sockId) => {
    const vIndex = videoQueue.findIndex((item) => item.socket.id === sockId);
    if (vIndex !== -1) videoQueue.splice(vIndex, 1);

    const tIndex = textQueue.findIndex((item) => item.socket.id === sockId);
    if (tIndex !== -1) textQueue.splice(tIndex, 1);
  };

  // Helper to leave active room and notify partner
  const leaveActiveRoom = (sockId) => {
    const roomId = activeRooms.get(sockId);
    if (roomId) {
      socket.to(roomId).emit("partner_disconnected", {
        message: "Your partner has left the chat.",
      });
      activeRooms.delete(sockId);
      socket.leave(roomId);
    }
  };

  // 1. JOIN MATCHMAKING QUEUE (Video or Text)
  socket.on("join_queue", ({ mode, interests = [] }) => {
    // Clean up prior state
    leaveActiveRoom(socket.id);
    removeFromQueues(socket.id);

    const targetQueue = mode === "video" ? videoQueue : textQueue;

    // Check if there is someone waiting in queue
    if (targetQueue.length > 0) {
      // Pair with waiting user!
      const partnerData = targetQueue.shift();
      const partnerSocket = partnerData.socket;

      // Verify partner is still connected
      if (!partnerSocket.connected) {
        // Retry joining queue
        socket.emit("queue_status", { status: "searching" });
        targetQueue.push({ socket, interests });
        return;
      }

      const roomId = `room_${socket.id}_${partnerSocket.id}`;
      activeRooms.set(socket.id, roomId);
      activeRooms.set(partnerSocket.id, roomId);

      socket.join(roomId);
      partnerSocket.join(roomId);

      console.log(`🤝 Match Found! ${socket.id} <-> ${partnerSocket.id} in ${roomId}`);

      const user1Country = getRandomItem(COUNTRIES);
      const user2Country = getRandomItem(COUNTRIES);

      // Notify Initiator (User 1)
      socket.emit("match_found", {
        roomId,
        partnerId: partnerSocket.id,
        isInitiator: true,
        partnerInfo: {
          name: `User_${partnerSocket.id.substring(0, 4)}`,
          country: user2Country,
          interests: partnerData.interests || ["Chatting"],
        },
      });

      // Notify Receiver (User 2)
      partnerSocket.emit("match_found", {
        roomId,
        partnerId: socket.id,
        isInitiator: false,
        partnerInfo: {
          name: `User_${socket.id.substring(0, 4)}`,
          country: user1Country,
          interests: interests || ["Chatting"],
        },
      });

    } else {
      // Queue is empty, add to waiting
      targetQueue.push({ socket, interests });
      socket.emit("queue_status", { status: "searching" });
      console.log(`🔍 User ${socket.id} added to ${mode} queue. Queue size: ${targetQueue.length}`);
    }
  });

  // 2. NEXT STRANGER / LEAVE QUEUE
  socket.on("next_stranger", ({ mode, interests }) => {
    leaveActiveRoom(socket.id);
    removeFromQueues(socket.id);
    socket.emit("join_queue", { mode, interests });
  });

  // 3. WebRTC SIGNALING EVENTS
  socket.on("webrtc_offer", ({ roomId, offer }) => {
    socket.to(roomId).emit("webrtc_offer", { offer, senderId: socket.id });
  });

  socket.on("webrtc_answer", ({ roomId, answer }) => {
    socket.to(roomId).emit("webrtc_answer", { answer, senderId: socket.id });
  });

  socket.on("ice_candidate", ({ roomId, candidate }) => {
    socket.to(roomId).emit("ice_candidate", { candidate, senderId: socket.id });
  });

  // 4. REAL-TIME TEXT MESSAGING
  socket.on("send_message", ({ roomId, text }) => {
    socket.to(roomId).emit("receive_message", {
      senderId: socket.id,
      text,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    });
  });

  // 5. DISCONNECT
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${socket.id}`);
    leaveActiveRoom(socket.id);
    removeFromQueues(socket.id);
  });
});

app.get("/", (req, res) => {
  res.send("🚀 Chatgle Signaling & Matchmaking Server is Running!");
});

server.listen(PORT, () => {
  console.log(`🌐 Chatgle Backend Server running on http://localhost:${PORT}`);
});
