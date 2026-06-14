import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      plugins: [
        VitePWA({
          registerType: 'prompt',
          injectRegister: null,
          includeAssets: ['icons/icon-192.svg', 'icons/icon-512.svg'],
          manifest: {
            id: 'life-manager',
            name: 'مدیر زندگی',
            short_name: 'مدیر زندگی',
            description: 'مدیر زندگی - ابزارهای مفید برای مدیریت روزمره',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            background_color: '#0f172a',
            theme_color: '#0f172a',
            lang: 'fa',
            dir: 'rtl',
            orientation: 'portrait',
            icons: [
              { src: 'icons/icon-192.svg', sizes: '192x192', type: 'image/svg+xml', purpose: 'any maskable' },
              { src: 'icons/icon-512.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any maskable' }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,woff2}'],
            navigateFallback: '/index.html',
            runtimeCaching: [
              {
                urlPattern: ({ url }: { url: URL }) => url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in'),
                handler: 'NetworkOnly'
              }
            ]
          }
        })
      ],
      build: {
        rollupOptions: {
          output: {
            manualChunks: (id) => {
              if (!id.includes('node_modules')) return;
              // Charts first, so react-chartjs-2 is NOT swept into the eager react chunk.
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'charts';
              if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) return 'react';
              if (id.includes('@supabase')) return 'supabase';
              return 'vendor';
            }
          }
        }
      }
    };
});
