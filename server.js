const express = require("express");
const app = express();
const http = require("http" ).createServer(app);
// Corrected Socket.IO initialization with CORS configuration
const { Server } = require("socket.io");
const io = new Server(http, {
  cors: {
    origin: "https://barshatalk-frontend.vercel.app", // ! Important: Replace with your Vercel app URL if different
    methods: ["GET", "POST"]
  }
});
const path = require("path");

app.use(express.static("public")); // Serve static files from /public

const waitingUsers = new Set();
const partners = new Map();

function pairUsers(socket1, socket2) {
  partners.set(socket1.id, socket2.id);
  partners.set(socket2.id, socket1.id);
  
  socket1.emit("matched");
  socket2.emit("matched");
}

function findPartner(socket) {
  if (waitingUsers.size > 0) {
    const partnerId = waitingUsers.values().next().value;
    const partner = io.sockets.sockets.get(partnerId);
    
    if (partner && partner.connected) {
      waitingUsers.delete(partnerId);
      pairUsers(socket, partner);
    } else {
      // Partner disconnected while waiting, remove them and try again
      waitingUsers.delete(partnerId);
      findPartner(socket); // Recursively try to find another partner
    }
  } else {
    waitingUsers.add(socket.id);
    socket.emit("waiting");
  }
}

function disconnectUser(socket) {
  const partnerId = partners.get(socket.id);
  if (partnerId) {
    const partner = io.sockets.sockets.get(partnerId);
    if (partner && partner.connected) {
      partner.emit("partnerDisconnected");
      partners.delete(partner.id);
      // Put the remaining partner back into the waiting pool
      findPartner(partner);
    }
  }
  
  partners.delete(socket.id);
  waitingUsers.delete(socket.id);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  // Find a partner for the new connection
  findPartner(socket);
  
  socket.on("message", (msg) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      const partner = io.sockets.sockets.get(partnerId);
      if (partner && partner.connected) {
        partner.emit("message", msg);
      }
    }
  });
  
  // Note: Removed video chat related events ('ready', 'offer', 'answer', 'candidate') 
  // as they should be handled by the dedicated video server.
  
  socket.on("next", () => {
    console.log("User requested next:", socket.id);
    disconnectUser(socket);
    findPartner(socket);
  });
  
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    disconnectUser(socket);
  });
});

// Ensure the server listens on the port provided by Render
const PORT = process.env.PORT || 3000;
http.listen(PORT, ( ) => {
  console.log(`Server running on port ${PORT}`);
});
