import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: [
      '@cometchat/chat-sdk-javascript',
      '@cometchat/calls-sdk-javascript',
      '@cometchat/chat-uikit-react',
    ],
  },
  server: {
    hmr: {
      overlay: false,
    },
  },
})
