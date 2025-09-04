import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import electron from 'vite-plugin-electron/simple';

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
        electron({
          main: {
            entry: 'electron/main.ts',
            onstart({ startup }) {
              // Auto start Electron when Vite dev server is ready
              startup();
            },
            vite: {
              build: {
                outDir: 'dist-electron',
                rollupOptions: {
                  output: {
                    entryFileNames: 'main.cjs',
                    format: 'cjs',
                  }
                }
              }
            }
          },
          preload: {
            input: 'electron/preload.ts',
            vite: {
              build: {
                outDir: 'dist-electron',
                rollupOptions: {
                  output: {
                    entryFileNames: 'preload.mjs',
                    format: 'es',
                  }
                }
              }
            }
          },
        })
      ]
    };
});
