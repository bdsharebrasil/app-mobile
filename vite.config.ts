import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        // Disable Vite's dev overlay which can fail when serializing certain DOM nodes
        overlay: false,
      },
      proxy: {
        '/api': {
          target: env.VITE_BACKEND_URL || 'https://api-workers.sharebrasil.workers.dev',
          changeOrigin: true,
        },
        '/supabase': {
          target: env.VITE_SUPABASE_URL || 'https://jilmlmdgeyzubylncpjy.supabase.co',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/supabase/, ''),
        },
      },
    },
    plugins: [
      react(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
