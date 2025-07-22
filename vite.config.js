import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup.html'),
        contentScript: resolve(__dirname, 'src/contentScript.js'),
        popupScript: resolve(__dirname, 'src/popup.js'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    },
    emptyOutDir: true
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'public/pdf.js',
          dest: '' // Copies to dist/
        },
        {
          src: 'public/pdf.worker.js',
          dest: '' // Copies to dist/
        },
        { src: 'public/icons/*', dest: 'dist/icons' }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
});
