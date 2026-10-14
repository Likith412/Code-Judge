// Live submission status. The worker publishes to Redis, this sends it on.
const { Server } = require("socket.io");

const logger = require("../config/logger");
const { redis } = require("../config/redis");
const { STATUS_CHANNEL } = require("../queue");
const { authenticate } = require("../utils/authenticate");

// Under /api, so the nginx and Vite proxies carry it with no new rule.
const PATH = "/api/socket.io";

const userRoom = (userId) => `user:${userId}`;

let io;
let subscriber;

// The same check as requireAuth, once, when the socket connects.
async function checkToken(socket, next) {
   try {
      const { user } = await authenticate(socket.handshake.auth?.token || "");

      socket.data.userId = String(user._id);
      next();
   } catch (err) {
      next(new Error(err.message || "Not signed in"));
   }
}

// A subscribed client can run nothing else, so it gets its own connection.
async function listenForStatus() {
   subscriber = redis.duplicate({ enableOfflineQueue: true });
   subscriber.on("error", (err) =>
      logger.warn({ err: err.message }, "redis subscriber error"),
   );

   subscriber.on("message", (_channel, text) => {
      try {
         const { id, userId, status } = JSON.parse(text);

         io.to(userRoom(userId)).emit("submission:status", { id, status });
      } catch (err) {
         logger.warn({ err: err.message }, "bad status message");
      }
   });

   await subscriber.subscribe(STATUS_CHANNEL);
}

async function attachSockets(server) {
   io = new Server(server, { path: PATH, serveClient: false });

   io.use(checkToken);

   // Every tab of one user joins the same room.
   io.on("connection", (socket) => socket.join(userRoom(socket.data.userId)));

   await listenForStatus();
}

// Drops every socket, then closes the http server too.
async function closeSockets() {
   if (subscriber) await subscriber.quit();
   if (io) await io.close();
}

module.exports = { attachSockets, closeSockets };
