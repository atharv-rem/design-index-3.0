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
  redirects: {
    "/sponsors/[slug]": "/",
  },
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
    '/[id]/[slug]': { maxAge: 60 * 60 * 24, swr: 60 * 60 }, 
  },
  fonts: [{
    provider: fontProviders.local(),
    name: "Gatuzo",
    cssVariable: "--font-gatuzo-local",
    options: {
      variants: [{
        weight: 400,
        style: "normal",
        src: ["./src/assets/fonts/gatuzo_font.ttf"],
      }],
    },
  },
  {
    provider: fontProviders.google(),
    name: "Google Sans",
    cssVariable: "--font-google-sans",
    weights: ["400", "500", "600", "700"],
  },
  {
    provider: fontProviders.google(),
    name: "Inter",
    cssVariable: "--font-inter",
    weights: ["400", "500", "600", "700"],
  }
  ],
  experimental: {
    svgOptimizer: svgoOptimizer(),
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["wink-nlp", "wink-eng-lite-web-model", "motion/react", "@base-ui/react/accordion"],
    },
  }
});