// @ts-check
import { defineConfig, fontProviders, svgoOptimizer, passthroughImageService } from 'astro/config';
import react from '@astrojs/react';
import vercel from '@astrojs/vercel';
import { cacheVercel } from '@astrojs/vercel/cache';
import tailwindcss from '@tailwindcss/vite';
import dualmark from '@dualmark/astro';

export default defineConfig({
  output: "server",
  prefetch:true,
  site:"https://designindex.xyz",
  integrations: [
    react(),
    dualmark({
      siteUrl: "https://designindex.xyz",
      llmsTxt: {
        enabled: true,
        brandName: "Design Index",
        description: "Curated design tools, mockups, icons, fonts, color resources, and inspiration.",
      },
    }),
  ],
  adapter: vercel(),
  build: {
    inlineStylesheets: 'always'
  },
  cache: {
    provider: cacheVercel(),
  },
  image: {
    service: passthroughImageService(),
  },
  routeRules: {
    '/[id]/[slug]': { maxAge: 60 * 60 * 24, swr: 60 }, // Cache tool pages for 1 day, stale-while-revalidate after 60s
  },
  fonts: [{
    provider: fontProviders.google(),
    name: "Rethink Sans",
    cssVariable: "--font-rethink-sans",
  }],
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
  vite: {
    plugins: [tailwindcss()]
  }
});