const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const Redis = require("ioredis");
const winston = require('winston');

console.log("--- Text Chat Server Starting ---");

// 1. Fixed Redis connection
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let redisClient;

if (REDIS_URL) {
  try {
    if (REDIS_URL.includes('rediss://')) {
      redisClient = new Redis(REDIS_URL, {
        tls: { rejectUnauthorized: false }
      });
    } else {
      redisClient = new Redis(REDIS_URL);
    }
    redisClient.on('connect', () => console.log('✅ Redis connected'));
    redisClient.on('error', (err) => console.error('Redis error:', err));
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    redisClient = null;
  }
} else {
  console.warn('REDIS_URL not defined. Using in-memory state');
  redisClient = null;
}

// 2. Fixed Socket.IO setup
const io = new Server(http, {
  cors: {
    origin: process.env.FRONTEND_URL || "https://barshatalk-frontend.vercel.app",
    methods: ["GET", "POST"]
  }
});

// --- Redis-based pairing ---
const WAITING_USERS_KEY = "textchat:waiting";
const PARTNERS_KEY_PREFIX = "textchat:partner:";

async function pairUsers(socket1, socket2) {
  if (!redisClient) return;
  
  try {
    const partner1Key = `${PARTNERS_KEY_PREFIX}${socket1.id}`;
    const partner2Key = `${PARTNERS_KEY_PREFIX}${socket2.id}`;
    
    await redisClient.multi()
      .set(partner1Key, socket2.id)
      .set(partner2Key, socket1.id)
      .exec();
    
    socket1.emit("matched");
    socket2.emit("matched");
    console.log(`Paired users: ${socket1.id} <-> ${socket2.id}`);
  } catch (error) {
    console.error('Error pairing users:', error);
  }
}

async function findPartner(socket) {
  if (!redisClient) {
    socket.emit("waiting");
    return;
  }
  
  try {
    const partnerId = await redisClient.spop(WAITING_USERS_KEY);
    
    if (partnerId && partnerId !== socket.id) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        await pairUsers(socket, partnerSocket);
      } else {
        await findPartner(socket);
      }
    } else {
      await redisClient.sadd(WAITING_USERS_KEY, socket.id);
      socket.emit("waiting");
    }
  } catch (error) {
    console.error('Error finding partner:', error);
    socket.emit("waiting");
  }
}

async function disconnectUser(socket) {
  if (!redisClient) return;
  
  try {
    const partnerKey = `${PARTNERS_KEY_PREFIX}${socket.id}`;
    const partnerId = await redisClient.get(partnerKey);
    
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket) {
        partnerSocket.emit("partnerDisconnected");
      }
      
      await redisClient.del(partnerKey);
      await redisClient.del(`${PARTNERS_KEY_PREFIX}${partnerId}`);
    }
    
    await redisClient.srem(WAITING_USERS_KEY, socket.id);
  } catch (error) {
    console.error('Error disconnecting user:', error);
  }
}

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Message rate limiting
  let messageCounter = 0;
  const messageLimit = 10;
  const resetInterval = setInterval(() => {
    messageCounter = 0;
  }, 10000);
  
  findPartner(socket);
  
  socket.on("message", async (msg) => {
    // Validate message
    if (typeof msg !== 'string' || msg.length === 0 || msg.length > 500) return;
    
    // Rate limiting
    messageCounter++;
    if (messageCounter > messageLimit) return;
    
    try {
      if (!redisClient) return;
      
      const partnerId = await redisClient.get(`${PARTNERS_KEY_PREFIX}${socket.id}`);
      if (partnerId) {
        const partner = io.sockets.sockets.get(partnerId);
        if (partner) {
          partner.emit("message", msg);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  });
    
  socket.on("next", async () => {
    await disconnectUser(socket);
    await findPartner(socket);
  });
  
  socket.on("disconnect", async () => {
    clearInterval(resetInterval);
    await disconnectUser(socket);
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`✅ Text chat server running on port ${PORT}`);
});
