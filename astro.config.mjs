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
        sections: [
          {
            title: "Browse Categories",
            description: "Curated, hand-picked design resources grouped by type.",
            links: [
              { title: "All Tools", href: "https://designindex.xyz/tools", description: "Every design tool in the index" },
              { title: "Mockups", href: "https://designindex.xyz/mockups", description: "Device, print and packaging mockups" },
              { title: "Icons", href: "https://designindex.xyz/icons", description: "Icon sets and libraries" },
              { title: "Fonts", href: "https://designindex.xyz/fonts", description: "Web fonts and typefaces" },
              { title: "Colours", href: "https://designindex.xyz/colours", description: "Color palettes and generators" },
              { title: "Illustrations", href: "https://designindex.xyz/illustrations", description: "Illustration packs and generators" },
              { title: "UI Components", href: "https://designindex.xyz/ui", description: "UI kits and component libraries" },
              { title: "Design Inspiration", href: "https://designindex.xyz/design-inspo", description: "Galleries and inspiration sources" },
            ],
          },
          {
            title: "Agent Resources",
            links: [
              { title: "Search API", href: "https://designindex.xyz/api/search?keywords=minimal,portfolio", description: "GET with comma-separated keywords; returns ranked tools as JSON" },
              { title: "Agent Skill", href: "https://designindex.xyz/SKILL.md", description: "design-search skill instructions" },
              { title: "Sitemap", href: "https://designindex.xyz/sitemap-index.xml" },
            ],
          },
          {
            title: "About",
            links: [
              { title: "About Design Index", href: "https://designindex.xyz/about" },
              { title: "Submit a Tool", href: "https://designindex.xyz/submit-tool" },
            ],
          },
        ],
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