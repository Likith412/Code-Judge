import axios from "axios";

// Vite proxies /api to the backend, so the browser only talks to one origin.
const client = axios.create({
   baseURL: "/api",
   withCredentials: true,
});

export default client;
