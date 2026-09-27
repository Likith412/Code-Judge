let accessToken = null;

const listeners = new Set();

const getAccessToken = () => accessToken;

const setAccessToken = (token) => {
   accessToken = token;
};

// The axios interceptor runs outside React. This is how it tells the app that
// the session is gone, and why.
const onSessionLost = (listener) => {
   listeners.add(listener);

   return () => listeners.delete(listener);
};

const sessionLost = (reason) => {
   accessToken = null;
   listeners.forEach((listener) => listener(reason));
};

export { getAccessToken, setAccessToken, onSessionLost, sessionLost };
