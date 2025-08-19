// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/16782/GitPull/arbitrage-console-UImain/arbitrage-console-main/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/16782/GitPull/arbitrage-console-UImain/arbitrage-console-main/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { componentTagger } from "file:///C:/Users/16782/GitPull/arbitrage-console-UImain/arbitrage-console-main/node_modules/lovable-tagger/dist/index.js";
var __vite_injected_original_dirname = "C:\\Users\\16782\\GitPull\\arbitrage-console-UImain\\arbitrage-console-main";
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
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
          ws: true
        }
      }
    },
    plugins: [
      react(),
      mode === "development" && componentTagger()
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-react": ["react", "react-dom"],
            "vendor-recharts": ["recharts"],
            "vendor-axios": ["axios"],
            "vendor-icons": ["lucide-react"],
            "vendor-query": ["@tanstack/react-query"]
          }
        }
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFwxNjc4MlxcXFxHaXRQdWxsXFxcXGFyYml0cmFnZS1jb25zb2xlLVVJbWFpblxcXFxhcmJpdHJhZ2UtY29uc29sZS1tYWluXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFwxNjc4MlxcXFxHaXRQdWxsXFxcXGFyYml0cmFnZS1jb25zb2xlLVVJbWFpblxcXFxhcmJpdHJhZ2UtY29uc29sZS1tYWluXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy8xNjc4Mi9HaXRQdWxsL2FyYml0cmFnZS1jb25zb2xlLVVJbWFpbi9hcmJpdHJhZ2UtY29uc29sZS1tYWluL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcbmltcG9ydCByZWFjdCBmcm9tIFwiQHZpdGVqcy9wbHVnaW4tcmVhY3Qtc3djXCI7XG5pbXBvcnQgcGF0aCBmcm9tIFwicGF0aFwiO1xuaW1wb3J0IHsgY29tcG9uZW50VGFnZ2VyIH0gZnJvbSBcImxvdmFibGUtdGFnZ2VyXCI7XG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgcHJvY2Vzcy5jd2QoKSwgXCJcIik7XG4gIC8vIEFsbG93IG92ZXJyaWRpbmcgYmFja2VuZCBvcmlnaW4gdmlhIFZJVEVfQVBJX1VSTCwgZS5nLiBodHRwOi8vbG9jYWxob3N0OjgwMDAgb3IgaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb21cbiAgLy8gSWYgYSAnL2FwaScgc3VmZml4IGlzIHByZXNlbnQsIHN0cmlwIGl0IGZvciB0aGUgcHJveHkgJ3RhcmdldCcgb3JpZ2luXG4gIGNvbnN0IHJhd0FwaSA9IGVudi5WSVRFX0FQSV9VUkwgfHwgXCJodHRwOi8vbG9jYWxob3N0OjMwMDBcIjtcbiAgY29uc3QgdGFyZ2V0ID0gcmF3QXBpLnJlcGxhY2UoL1xcLyQvLCBcIlwiKS5yZXBsYWNlKC9cXC9hcGlcXC8/JC8sIFwiXCIpO1xuXG4gIHJldHVybiB7XG4gICAgc2VydmVyOiB7XG4gICAgICBob3N0OiBcIjo6XCIsXG4gICAgICBwb3J0OiA1MTczLFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgXCIvYXBpXCI6IHtcbiAgICAgICAgICB0YXJnZXQsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgd3M6IHRydWUsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3QoKSxcbiAgICAgIG1vZGUgPT09ICdkZXZlbG9wbWVudCcgJiYgY29tcG9uZW50VGFnZ2VyKCksXG4gICAgXS5maWx0ZXIoQm9vbGVhbiksXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXG4gICAgICB9LFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgbWFudWFsQ2h1bmtzOiB7XG4gICAgICAgICAgICAndmVuZG9yLXJlYWN0JzogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgICAgICAgICd2ZW5kb3ItcmVjaGFydHMnOiBbJ3JlY2hhcnRzJ10sXG4gICAgICAgICAgICAndmVuZG9yLWF4aW9zJzogWydheGlvcyddLFxuICAgICAgICAgICAgJ3ZlbmRvci1pY29ucyc6IFsnbHVjaWRlLXJlYWN0J10sXG4gICAgICAgICAgICAndmVuZG9yLXF1ZXJ5JzogWydAdGFuc3RhY2svcmVhY3QtcXVlcnknXSxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9O1xufSk7XG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdaLFNBQVMsY0FBYyxlQUFlO0FBQ3RiLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsU0FBUyx1QkFBdUI7QUFIaEMsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBRzNDLFFBQU0sU0FBUyxJQUFJLGdCQUFnQjtBQUNuQyxRQUFNLFNBQVMsT0FBTyxRQUFRLE9BQU8sRUFBRSxFQUFFLFFBQVEsYUFBYSxFQUFFO0FBRWhFLFNBQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE9BQU87QUFBQSxRQUNMLFFBQVE7QUFBQSxVQUNOO0FBQUEsVUFDQSxjQUFjO0FBQUEsVUFDZCxRQUFRO0FBQUEsVUFDUixJQUFJO0FBQUEsUUFDTjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixTQUFTLGlCQUFpQixnQkFBZ0I7QUFBQSxJQUM1QyxFQUFFLE9BQU8sT0FBTztBQUFBLElBQ2hCLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUN0QztBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLGVBQWU7QUFBQSxRQUNiLFFBQVE7QUFBQSxVQUNOLGNBQWM7QUFBQSxZQUNaLGdCQUFnQixDQUFDLFNBQVMsV0FBVztBQUFBLFlBQ3JDLG1CQUFtQixDQUFDLFVBQVU7QUFBQSxZQUM5QixnQkFBZ0IsQ0FBQyxPQUFPO0FBQUEsWUFDeEIsZ0JBQWdCLENBQUMsY0FBYztBQUFBLFlBQy9CLGdCQUFnQixDQUFDLHVCQUF1QjtBQUFBLFVBQzFDO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
