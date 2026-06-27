# Design Index 
Design Index is a blazing-fast, curated index for discovering premium design tools, mockups, icons, fonts, illustrations, and inspiration. It combines natural language search capabilities with high-performance caching for a seamless discovery experience.

---

## 🚀 Tech Stack

The application is built using a modern, performant, and premium stack:

*   **Framework & Architecture**: [Astro v7](https://astro.build/) configured with Server-Side Rendering (SSR) using the [Vercel Adapter](https://docs.astro.build/en/guides/integrations-guide/vercel/).
*   **UI Library**: [React 19](https://react.dev/) for high-fidelity interactive components.
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) for a sleek, responsive design system.
*   **Primitive Components**: [Base UI](https://base-ui.com/) and [Radix UI](https://www.radix-ui.com/) for accessible, unstyled primitives.
*   **Animations**: [Motion](https://motion.dev/) (Framer Motion) for highly responsive micro-interactions and transitions.
*   **Database**: [Supabase](https://supabase.com/) (PostgreSQL client) for storing and retrieving tool information.
*   **Caching**: [Upstash Redis](https://upstash.com/) for ultra-fast API edge caching.
*   **Natural Language Processing**: [Wink NLP](https://winkjs.org/) (`wink-nlp` & `wink-eng-lite-web-model`) for local/edge search indexing and intelligence.
*   **SEO & Discovery**: `astro-seo` for meta tags, and `@astrojs/sitemap` for automated sitemap generation.
*   **Analytics**: `Data Buddy` for tracking and insights.

---

## ⚙️ Development & Deployment

### Commands

All operations are managed through `npm` from the root directory:

| Command | Description |
| :--- | :--- |
| `npm install` | Installs project dependencies |
| `npm run dev` | Starts the Astro development server at `localhost:4321` |
| `npm run build` | Builds the production bundle optimized for Vercel |
| `npm run preview` | Previews the built production site locally |

### Caching Setup (Upstash Redis)

API routes (`src/pages/api/tools.ts` and `src/pages/api/tools/[slug].ts`) support low-latency caching powered by Upstash Redis.

To enable caching, add the following to your `.env` file:

```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
```

> [!NOTE]
> If these variables are not provided, the API endpoints will fallback gracefully to fetching directly from the database without any disruption.
