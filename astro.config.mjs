// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import react from '@astrojs/react';

import vercel from '@astrojs/vercel';

import sitemap from '@astrojs/sitemap';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
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
    }
  ],
  integrations: [react(), sitemap()],
  adapter: vercel(),

  vite: {
    plugins: [tailwindcss()]
  }
});