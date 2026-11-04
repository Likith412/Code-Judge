import axios from "axios";

import { getAccessToken, setAccessToken, sessionLost } from "./tokenStore";

const client = axios.create({ baseURL: "/api", withCredentials: true });

client.interceptors.request.use((config) => {
   const token = getAccessToken();

   if (token) config.headers.Authorization = `Bearer ${token}`;

   return config;
});

// Only one token refresh runs at a time; all failed 401 requests wait for the same promise.
let inFlight = null;

function refreshSession() {
   // Uses plain Axios instead of client to prevent a failed refresh from triggering the interceptor again and causing a loop.
   inFlight ??= axios
      .post("/api/auth/refresh", null, { withCredentials: true })
      .then((response) => {
         setAccessToken(response.data.accessToken);

         return response.data;
      })
      .finally(() => {
         inFlight = null;
      });

   return inFlight;
}

client.interceptors.response.use(null, async (error) => {
   const { config, response } = error;

   if (!response || response.status !== 401 || config._retried) throw error;

   // A 401 from these two means the session is over. Retrying changes nothing.
   if (
      config.url?.includes("/auth/refresh") ||
      config.url?.includes("/auth/login")
   ) {
      throw error;
   }

   config._retried = true;

   try {
      await refreshSession();
   } catch (refreshError) {
      sessionLost(refreshError.response?.data?.error?.code);

      throw error;
   }

   return client(config);
});

function apiError(error) {
   const body = error?.response?.data?.error;

   return {
      status: error?.response?.status ?? 0,
      code: body?.code || "NETWORK",
      message:
         body?.message || "Could not reach the server. Check your connection.",
      details: body?.details,
   };
}

// Turns the details list into { field: message } for a form.
function fieldErrors(error) {
   const { details } = apiError(error);

   if (!Array.isArray(details)) return {};

   return Object.fromEntries(
      details.map((detail) => [detail.field, detail.issue]),
   );
}

export { client, refreshSession, apiError, fieldErrors };

export default client;
