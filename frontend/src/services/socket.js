import { io } from "socket.io-client";

import { getAccessToken, onTokenChange } from "./api/tokenStore";

// One socket for the whole app, opened the first time something is watched.
let socket = null;

function openSocket() {
   socket ??= io({
      path: "/api/socket.io",
      transports: ["websocket"],
      autoConnect: false,
      // Read on every connect, so a reconnect sends the newest token.
      auth: (send) => send({ token: getAccessToken() }),
   });

   // Not connected and not retrying, e.g. the token was refused. Try again.
   if (!socket.active) socket.connect();

   return socket;
}

// Signed out, so stop listening for that user.
onTokenChange((token) => {
   if (!token) socket?.disconnect();
});

// Calls onChange(status) when this submission's status changes, and
// onConnect() each time the socket connects. Returns a stop function.
function watchSubmission(id, onChange, onConnect) {
   const live = openSocket();
   const handler = (event) => {
      if (event.id === id) onChange(event.status);
   };

   live.on("submission:status", handler);
   live.on("connect", onConnect);

   return () => {
      live.off("submission:status", handler);
      live.off("connect", onConnect);
   };
}

export { watchSubmission };
