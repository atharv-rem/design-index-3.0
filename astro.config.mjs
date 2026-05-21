// @ts-check
import { defineConfig, fontProviders,memoryCache } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const site = process.env.SITE_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

// https://astro.build/config
export default defineConfig({
  output: "server",
  site,
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Kalamayka',
      cssVariable: '--font-kalamayka',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/KalamaykaVF.woff2'],
            weight: '100 900',
            style: 'normal'
          }
        ]
      }
    },
    {
      provider: fontProviders.local(),
      name: 'Departure Mono',
      cssVariable: '--departure',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/DepartureMono-Regular.woff2'],
            weight: '400',
            style: 'normal'
          }
        ]
      }
    },
    {
      provider: fontProviders.local(),
      name: 'Open Sans',
      cssVariable: '--open',
      options: {
        variants: [
          {
            src: ['./src/assets/fonts/OpenSauce.otf'],
            weight: '400',
            style: 'normal'
          }
        ]
      }
    }
  ],
  integrations: [react(), sitemap()],
  adapter: vercel(),
  build: {
    inlineStylesheets: 'always'
  },
  experimental: {
    cache: {
      provider: memoryCache(),
    },
  },
  vite: {
    plugins: [tailwindcss()]
  }
});