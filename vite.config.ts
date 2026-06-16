import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Shared proxy configuration for API and files
const proxyConfig = {
  target: 'https://pulse.gopocket.in',
  changeOrigin: true,
  cookieDomainRewrite: "localhost",
  configure: (proxy: any, _options: any) => {
    proxy.on('error', (err: any, _req: any, _res: any) => {
      console.log('proxy error', err);
    });
    proxy.on('proxyReq', (proxyReq: any, req: any, _res: any) => {
      console.log('Sending Request to the Target:', req.method, req.url);
      // Remove Expect header to prevent 417 Expectation Failed errors
      proxyReq.removeHeader('Expect');
    });
    proxy.on('proxyRes', (proxyRes: any, req: any, _res: any) => {
      console.log('Received Response from the Target:', proxyRes.statusCode, req.url);

      if (proxyRes.headers['set-cookie']) {
        proxyRes.headers['set-cookie'] = proxyRes.headers['set-cookie'].map(
          (cookie: string) => cookie.replace(/; secure/gi, '').replace(/; samesite=[^;]+/gi, '')
        );
      }
    });
  },
};

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    proxy: {
      '/api': proxyConfig,
      '/files': proxyConfig,
      '/private': proxyConfig,
      '/socket.io': {
        target: 'https://pulse.gopocket.in',
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
