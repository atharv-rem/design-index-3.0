import type { APIRoute } from 'astro';
import { generateOpenGraphImage } from 'astro-og-canvas';

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const title = url.searchParams.get('title') || 'Design Index';
  const description = url.searchParams.get('description') || 'Curated Design Tools, Resources, and Inspiration';

  try {
    const imageBuffer = await generateOpenGraphImage({
      title,
      description,
      bgGradient: [[15, 23, 42], [9, 15, 30]], // Deep slate-900 to slate-950 gradient
      border: {
        color: [52, 211, 153], // Vibrant neon-emerald border accent
        width: 12,
        side: 'inline-start',
      },
      font: {
        title: {
          size: 72,
          color: [248, 250, 252], // slate-50 text
          families: ['Departure Mono'],
          weight: 'Normal',
        },
        description: {
          size: 36,
          color: [148, 163, 184], // slate-400 text
          families: ['Departure Mono'],
          weight: 'Normal',
          lineHeight: 1.5,
        },
      },
      fonts: [
        './src/assets/fonts/DepartureMono-Regular.woff2',
      ],
      padding: 60,
      cacheDir: false, // Turn off file-system caching to avoid serverless function read/write issues
    });

    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Failed to generate dynamic OG image:', error);
    return new Response('Failed to generate image', { status: 500 });
  }
};
