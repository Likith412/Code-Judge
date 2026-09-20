import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
   plugins: [react()],
   server: {
      // The browser only ever talks to the Vite origin, so cookies stay
      // first party and there is no CORS in development.
      proxy: {
         "/api": {
            target: "http://localhost:3000",
            changeOrigin: true,
         },
      },
   },
});
