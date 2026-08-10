import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import netlify from "@netlify/vite-plugin-tanstack-start";

export default defineConfig({
  plugins: [
    tanstackStart({
      server: { entry: "server" },
    }),
    netlify(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  server: {
    port: 8080,
  }
});
