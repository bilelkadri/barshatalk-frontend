// server.js - Modifications
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const path = require("path");
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator'); // Pour validation future si API HTTP ajoutée
const Redis = require("ioredis");
const winston = require('winston');

// --- Configuration --- 
const VERCEL_FRONTEND_URL = process.env.FRONTEND_URL || "https://barshatalk-frontend.vercel.app"; // Utiliser variable d'environnement
const REDIS_URL = process.env.REDIS_URL; // Nécessite une variable d'environnement sur Render

// --- Logger --- 
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({ format: winston.format.simple() }),
    // Ajoutez ici des transports vers des fichiers ou services de log si besoin
    // new winston.transports.File({ filename: 'error.log', level: 'error' }),
    // new winston.transports.File({ filename: 'combined.log' })
  ],
});

// --- Redis Client --- 
let redisClient;
if (REDIS_URL) {
  try {
    redisClient = new Redis(REDIS_URL);
    redisClient.on('connect', () => logger.info('Connected to Redis'));
    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
  } catch (error) {
    logger.error('Failed to connect to Redis:', error);
    redisClient = null; // Fallback si la connexion échoue
  }
} else {
  logger.warn('REDIS_URL not defined. State will be in-memory and not persistent.');
  redisClient = null;
}

// --- Rate Limiter (pour futures routes API) ---
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Limite chaque IP à 100 requêtes par fenêtre
	standardHeaders: true, 
	legacyHeaders: false, 
});
app.use('/api/', apiLimiter); // Appliquer aux routes API si vous en ajoutez

// --- Socket.IO Server --- 
const io = new Server(http, {
  cors: {
    origin: VERCEL_FRONTEND_URL, // Utiliser variable d'environnement (Point 3 & 7)
    methods: ["GET", "POST"]
  }
});

app.use(express.static("public")); // Serve static files from /public

// --- Remplacement de la gestion d'état en mémoire par Redis (Point 6) ---
const WAITING_USERS_KEY = "textchat:waiting";
const PARTNERS_KEY_PREFIX = "textchat:partner:";

async function pairUsers(socket1, socket2) {
  if (!redisClient) {
      logger.error("Cannot pair users: Redis client not available.");
      // Optionally emit an error or fallback behavior
      return;
  } 
  try {
    const partner1Key = `${PARTNERS_KEY_PREFIX}${socket1.id}`;
    const partner2Key = `${PARTNERS_KEY_PREFIX}${socket2.id}`;
    // Utiliser une transaction pour assurer l'atomicité
    await redisClient.multi()
      .set(partner1Key, socket2.id)
      .set(partner2Key, socket1.id)
      .exec();
    
    socket1.emit("matched");
    socket2.emit("matched");
    logger.info(`Paired users (Redis): ${socket1.id} <-> ${socket2.id}`);
  } catch (error) {
    logger.error('Error pairing users in Redis:', { error: error.message, socket1: socket1.id, socket2: socket2.id });
  }
}

async function findPartner(socket) {
  if (!redisClient) {
     socket.emit("waiting"); // Comportement par défaut si pas de Redis
     logger.warn(`No Redis client, user ${socket.id} set to waiting (in-memory simulation)`);
     return;
  }
  try {
    // Essayer de trouver un partenaire dans la liste d'attente Redis
    const partnerId = await redisClient.spop(WAITING_USERS_KEY);

    if (partnerId && partnerId !== socket.id) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      if (partnerSocket && partnerSocket.connected) {
        await pairUsers(socket, partnerSocket);
      } else {
        // Le partenaire trouvé s'est déconnecté entre temps, réessayer
        logger.warn(`Partner ${partnerId} disconnected before pairing with ${socket.id}. Retrying.`);
        await findPartner(socket); // Recursively try again
      }
    } else {
      // Personne en attente, ajouter l'utilisateur actuel
      await redisClient.sadd(WAITING_USERS_KEY, socket.id);
      socket.emit("waiting");
      logger.info(`User ${socket.id} added to waiting list (Redis)`);
    }
  } catch (error) {
    logger.error('Error finding partner in Redis:', { error: error.message, socketId: socket.id });
    socket.emit("waiting"); // Fallback en cas d'erreur Redis
  }
}

async function disconnectUser(socket) {
  if (!redisClient) {
      logger.warn(`Cannot disconnect user ${socket.id}: Redis client not available.`);
      return;
  }
  const partnerKey = `${PARTNERS_KEY_PREFIX}${socket.id}`;
  try {
    const partnerId = await redisClient.get(partnerKey);
    if (partnerId) {
      const partnerSocket = io.sockets.sockets.get(partnerId);
      const partnerPartnerKey = `${PARTNERS_KEY_PREFIX}${partnerId}`;
      // Notifier le partenaire et le remettre en attente
      if (partnerSocket && partnerSocket.connected) {
        partnerSocket.emit("partnerDisconnected");
        // Remettre le partenaire restant en attente
        await redisClient.sadd(WAITING_USERS_KEY, partnerId);
        logger.info(`Partner ${partnerId} put back into waiting list after ${socket.id} disconnected.`);
      }
      // Supprimer les associations de partenariat dans Redis
      await redisClient.del(partnerKey, partnerPartnerKey);
      logger.info(`Disconnected partner link (Redis): ${socket.id} <-> ${partnerId}`);
    }
    // Supprimer l'utilisateur de la liste d'attente s'il y était
    await redisClient.srem(WAITING_USERS_KEY, socket.id);
  } catch (error) {
    logger.error('Error disconnecting user in Redis:', { error: error.message, socketId: socket.id });
  }
}

io.on("connection", (socket) => {
  logger.info(`User connected: ${socket.id}`);
  
  // --- Rate Limiting pour Socket.IO (Point 2) --- 
  let messageCounter = 0;
  const messageLimit = 10; // Max 10 messages
  const messageTimeframe = 10 * 1000; // par 10 secondes

  const messageLimiterInterval = setInterval(() => {
      messageCounter = 0;
  }, messageTimeframe);

  findPartner(socket);
  
  socket.on("message", async (msg) => {
    // Validation simple (Point 2)
    if (typeof msg !== 'string' || msg.length === 0 || msg.length > 500) {
        logger.warn(`Invalid message received from ${socket.id}`, { messageLength: msg?.length, type: typeof msg });
        // Optionnel: notifier l'utilisateur d'un message invalide
        // socket.emit('system_error', 'Invalid message format or length.');
        return; 
    }

    // Rate Limiting (Point 2)
    messageCounter++;
    if (messageCounter > messageLimit) {
        logger.warn(`Rate limit exceeded for messages from ${socket.id}`);
        // Optionnel: notifier l'utilisateur
        // socket.emit('system_error', 'You are sending messages too quickly.');
        return;
    }

    // Utilisation de try...catch pour l'émission (Point 4)
    if (!redisClient) {
        logger.error(`Cannot send message from ${socket.id}: Redis client not available.`);
        return;
    }
    try {
      const partnerId = await redisClient.get(`${PARTNERS_KEY_PREFIX}${socket.id}`); // Récupérer partenaire depuis Redis
      if (partnerId) {
        const partner = io.sockets.sockets.get(partnerId);
        if (partner && partner.connected) {
          partner.emit("message", msg); // Envoyer le message original validé
        }
      }
    } catch (error) {
        logger.error(`Error sending message from ${socket.id}:`, { error: error.message });
    }
  });
    
  socket.on("next", async () => {
    logger.info(`User requested next: ${socket.id}`);
    await disconnectUser(socket);
    // Le partenaire restant est remis en attente dans disconnectUser
    // Le client qui a cliqué "next" doit être mis en attente
    await findPartner(socket);
  });
  
  socket.on("disconnect", async (reason) => {
    logger.info(`User disconnected: ${socket.id}`, { reason });
    clearInterval(messageLimiterInterval); // Nettoyer l'intervalle du rate limiter
    await disconnectUser(socket);
  });

  // Gestion Erreurs Socket (Point 4)
  socket.on('error', (err) => {
    logger.error(`Socket Error from ${socket.id}:`, { error: err.message });
  });
});

// Utiliser process.env.PORT fourni par Render (Point 7)
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  logger.info(`Text chat server running on port ${PORT}`);
});

