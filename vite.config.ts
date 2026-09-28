import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, type Plugin } from "vite";

function routeApiRequestsThroughNitro(): Plugin {
  return {
    name: "route-api-requests-through-nitro",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith("/api/")) {
          req.headers["sec-fetch-dest"] = "empty";
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [
    routeApiRequestsThroughNitro(),
    tailwindcss(),
    tanstackStart({ server: { entry: "server" } }),
    nitro(),
    react(),
  ],
  css: { transformer: "lightningcss" },
  resolve: {
    tsconfigPaths: true,
    dedupe: [
      "react",
      "react-dom",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
});
