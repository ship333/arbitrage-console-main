import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  // Allow overriding backend origin via VITE_API_URL, e.g. http://localhost:8000 or https://api.example.com
  // If a '/api' suffix is present, strip it for the proxy 'target' origin
  const rawApi = env.VITE_API_URL || "http://localhost:3000";
  const target = rawApi.replace(/\/$/, "").replace(/\/api\/?$/, "");

  return {
    server: {
      host: "::",
      port: 5173,
      proxy: {
        "/api": {
          target,
          changeOrigin: true,
          secure: false,
          ws: true,
          // Ensure frontend '/api/*' hits FastAPI '/api/v1/*'
          rewrite: (path) => {
            // Do NOT rewrite WebSocket endpoint which exists at '/api/ws' only
            if (path.startsWith('/api/ws')) return path;
            // Health endpoint exists only at '/api/health'
            if (path === '/api/health') return path;
            return path.replace(/^\/api(\/|$)/, '/api/v1$1');
          },
        },
      },
    },
    plugins: [
      react(),
      mode === 'development' && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom'],
            'vendor-recharts': ['recharts'],
            'vendor-axios': ['axios'],
            'vendor-icons': ['lucide-react'],
            'vendor-query': ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
