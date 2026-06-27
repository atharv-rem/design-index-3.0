// @ts-check
import { defineConfig,memoryCache } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: "server",
  site:"https://designindex.xyz",
  integrations: [react()],
  adapter: vercel(),
  build: {
    inlineStylesheets: 'always'
  },
  cache: {
    provider: memoryCache(),
  },
  vite: {
    plugins: [tailwindcss()]
  }
});