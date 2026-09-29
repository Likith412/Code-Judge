let accessToken = null;

const listeners = new Set();

const getAccessToken = () => accessToken;

const setAccessToken = (token) => {
   accessToken = token;
};

// How the axios interceptor, which is outside React, reports a lost session.
const onSessionLost = (listener) => {
   listeners.add(listener);

   return () => listeners.delete(listener);
};

const sessionLost = (reason) => {
   accessToken = null;
   listeners.forEach((listener) => listener(reason));
};

export { getAccessToken, setAccessToken, onSessionLost, sessionLost };
