import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Article and card images are served as plain files from holes/snapshots/images
  // (and copied into the build), never imported, so none end up inside the JS.
  publicDir: 'holes/snapshots/images',
  build: {
    rollupOptions: {
      output: {
        // The sign-in library loads only for readers who sign in; give it its own name.
        manualChunks: (id) => (id.includes('node_modules/@supabase/') ? 'supabase' : undefined),
      },
    },
  },
})
