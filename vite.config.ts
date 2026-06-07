import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    proxy: {
      '/api': {
        target: 'https://web.codenetic.online',
        changeOrigin: true,
        cookieDomainRewrite: "localhost",
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
            // Remove Expect header to prevent 417 Expectation Failed errors
            proxyReq.removeHeader('Expect');
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);

            // Rewrite Location header redirects to prevent CORS redirect loop
            // if (proxyRes.headers.location) {
            //   const originalLocation = proxyRes.headers.location;
            //   const localHost = req.headers.host || 'localhost:8081';
            //   const isHttps = req.headers.referer?.startsWith('https') || false;
            //   const localTarget = `${isHttps ? 'https' : 'http'}://${localHost}`;

            //   proxyRes.headers.location = originalLocation
            //     .replace(/^https?:\/\/web\.codenetic\.online/i, localTarget);
            //   console.log('Rewrote Location header from:', originalLocation, 'to:', proxyRes.headers.location);
            // }

            if (proxyRes.headers['set-cookie']) {
              proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(
                (cookie) => cookie.replace(/; secure/gi, '').replace(/; samesite=[^;]+/gi, '')
              );
            }
          });
        },
      },
      '/socket.io': {
        target: 'https://web.codenetic.online',
        ws: true,
        changeOrigin: true,
      }
    },
    host: "::",
    port: 8081,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
