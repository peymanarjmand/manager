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
              if (id.includes('react') || id.includes('react-dom')) return 'react';
              if (id.includes('chart.js') || id.includes('react-chartjs-2')) return 'charts';
              if (id.includes('jspdf')) return 'pdf';
              if (id.includes('html2canvas')) return 'canvas';
              if (id.includes('@supabase')) return 'supabase';
              return 'vendor';
            }
          }
        }
      }
    };
});
