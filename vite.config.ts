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
          includeAssets: [
            'icons/favicon.svg',
            'icons/favicon-32.png',
            'icons/favicon-16.png',
            'icons/apple-touch-icon.png'
          ],
          manifest: {
            id: 'life-manager',
            name: 'مدیر زندگی',
            short_name: 'مدیر زندگی',
            description: 'مدیر زندگی - ابزارهای مفید برای مدیریت روزمره',
            start_url: '/',
            scope: '/',
            display: 'standalone',
            display_override: ['standalone', 'minimal-ui'],
            background_color: '#0a0c16',
            theme_color: '#0a0c16',
            lang: 'fa',
            dir: 'rtl',
            orientation: 'portrait',
            categories: ['finance', 'productivity', 'utilities'],
            // Separate `any` and `maskable` icons (a single icon can't serve both
            // well: maskable needs a ~20% safe-zone, `any` should fill the canvas).
            icons: [
              { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
              { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
              { src: 'icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
              { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
              { src: 'icons/icon-512.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }
            ],
            // App shortcuts (Android long-press / desktop jump list). Each opens a
            // module via the `?go=` launch intent handled in App.tsx.
            shortcuts: [
              {
                name: 'حسابدار هوشمند',
                short_name: 'حسابدار',
                description: 'تراکنش‌ها، اقساط و چک‌ها',
                url: '/?go=smart-accountant',
                icons: [{ src: 'icons/sc-accountant.png', sizes: '96x96', type: 'image/png' }]
              },
              {
                name: 'دارایی و طلا',
                short_name: 'دارایی',
                description: 'دارایی‌ها و موجودی طلا',
                url: '/?go=assets',
                icons: [{ src: 'icons/sc-assets.png', sizes: '96x96', type: 'image/png' }]
              },
              {
                name: 'کارهای روزانه',
                short_name: 'کارها',
                description: 'فهرست کارهای روزانه',
                url: '/?go=daily-tasks',
                icons: [{ src: 'icons/sc-tasks.png', sizes: '96x96', type: 'image/png' }]
              },
              {
                name: 'خودروی من',
                short_name: 'خودرو',
                description: 'هزینه‌ها و سوابق خودرو',
                url: '/?go=my-car',
                icons: [{ src: 'icons/sc-car.png', sizes: '96x96', type: 'image/png' }]
              }
            ]
          },
          workbox: {
            globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
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
