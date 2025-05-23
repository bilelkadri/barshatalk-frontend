const express = require("express");
const app = express();
const http = require("http" ).createServer(app);
const io = require("socket.io")(http );
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
      waitingUsers.delete(partnerId);
      waitingUsers.add(socket.id);
      socket.emit("waiting");
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
    }
  }
  
  partners.delete(socket.id);
  waitingUsers.delete(socket.id);
}

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  
  // Événement pour le chat texte (existant)
  findPartner(socket);
  
  // Événement pour le chat texte (existant)
  socket.on("message", (msg) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      const partner = io.sockets.sockets.get(partnerId);
      if (partner && partner.connected) {
        partner.emit("message", msg);
      }
    }
  });
  
  // Événement pour le chat vidéo (nouveau)
  socket.on("ready", () => {
    findPartner(socket);
  });
  
  // Événements WebRTC pour le chat vidéo (nouveaux)
  socket.on("offer", (offer) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      const partner = io.sockets.sockets.get(partnerId);
      if (partner && partner.connected) {
        partner.emit("offer", offer);
      }
    }
  });
  
  socket.on("answer", (answer) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      const partner = io.sockets.sockets.get(partnerId);
      if (partner && partner.connected) {
        partner.emit("answer", answer);
      }
    }
  });
  
  socket.on("candidate", (candidate) => {
    const partnerId = partners.get(socket.id);
    if (partnerId) {
      const partner = io.sockets.sockets.get(partnerId);
      if (partner && partner.connected) {
        partner.emit("candidate", candidate);
      }
    }
  });
  
  // Événement pour passer au partenaire suivant (existant)
  socket.on("next", () => {
    disconnectUser(socket);
    findPartner(socket);
  });
  
  // Événement de déconnexion (existant)
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    disconnectUser(socket);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, ( ) => {
  console.log(`Server running on port ${PORT}`);
});
