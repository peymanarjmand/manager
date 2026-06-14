import path from 'path';
import { defineConfig, loadEnv } from 'vite';

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
