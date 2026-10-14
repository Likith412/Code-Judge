let accessToken = null;

const listeners = new Set();
const tokenListeners = new Set();

const getAccessToken = () => accessToken;

const setAccessToken = (token) => {
   accessToken = token;
   tokenListeners.forEach((listener) => listener(token));
};

// For code outside React that must follow the token, like the socket.
const onTokenChange = (listener) => {
   tokenListeners.add(listener);

   return () => tokenListeners.delete(listener);
};

// How the axios interceptor, which is outside React, reports a lost session.
const onSessionLost = (listener) => {
   listeners.add(listener);

   return () => listeners.delete(listener);
};

const sessionLost = (reason) => {
   setAccessToken(null);
   listeners.forEach((listener) => listener(reason));
};

export {
   getAccessToken,
   setAccessToken,
   onTokenChange,
   onSessionLost,
   sessionLost,
};
