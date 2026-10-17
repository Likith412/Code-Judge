import { io } from "socket.io-client";

import { refreshSession } from "./api/client";
import { getAccessToken, onTokenChange } from "./api/tokenStore";

// One socket for the whole app, opened the first time something is watched.
let socket = null;

// One renewal per refusal, so it cannot loop.
let renewed = false;

// A refused handshake is not retried, so renew the token and try once more.
async function onRefused() {
   if (renewed) return;
   renewed = true;

   try {
      await refreshSession();
      socket.connect();
   } catch {
      // The session is over. The page shows that itself.
   }
}

function openSocket() {
   if (!socket) {
      socket = io({
         path: "/api/socket.io",
         transports: ["websocket"],
         autoConnect: false,
         // Read on every connect, so a reconnect sends the newest token.
         auth: (send) => send({ token: getAccessToken() }),
      });

      socket.on("connect", () => {
         renewed = false;
      });
      socket.on("connect_error", onRefused);
   }

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
