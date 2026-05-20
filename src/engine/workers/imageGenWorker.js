/**
 * imageGenWorker.js — AI Image Generation Worker
 * Queue: marketing | Approval: STANDARD
 * 
 * Generates: Prompt engineering → API call to free image gen APIs
 * Supported providers: Pollinations.AI (free), Stability AI, Hugging Face
 */

import { BaseWorker } from './baseWorker.js';
import { getDb, getSetting } from '../../data/db.js';

export class ImageGenWorker extends BaseWorker {
  constructor(config = {}) {
    super({
      name: 'Image Generator',
      queue: 'marketing',
      requires_approval: true,
      approval_severity: 'standard',
      ...config
    });
  }

  /**
   * Input params:
   * - prompt: string — what to generate
   * - style: 'photorealistic' | 'illustration' | 'minimal' | 'glassmorphism' | 'logo' | 'banner'
   * - aspect: '1:1' | '16:9' | '9:16' | '4:3'
   * - use_case: 'social_post' | 'thumbnail' | 'hero_banner' | 'logo' | 'product_mockup'
   * - project_id: optional SQLite project reference
   * - count: number of variations (1-4)
   */
  async execute(input, hooks) {
    const {
      prompt = '',
      style = 'photorealistic',
      aspect = '1:1',
      use_case = 'social_post',
      project_id = null,
      count = 1,
      negative_prompt = 'blurry, low quality, watermark, text overlay, distorted'
    } = input;

    if (!prompt.trim()) {
      throw new Error('[ImageGenWorker] Prompt is required.');
    }

    if (hooks?.onStatus) hooks.onStatus('Image Gen: Building optimized prompt...');

    const db = await getDb();

    // Style modifiers map
    const styleModifiers = {
      photorealistic: 'hyperrealistic, 8K resolution, professional photography, sharp details, golden hour lighting',
      illustration: 'digital illustration, flat design, vibrant colors, clean lines, professional vector art',
      minimal: 'minimalist design, white background, clean aesthetic, modern, sophisticated',
      glassmorphism: 'glassmorphism UI, frosted glass effect, dark background, neon glow, premium modern design',
      logo: 'professional logo design, vector style, clean, memorable, brand identity, white background',
      banner: 'wide banner design, professional, marketing material, high contrast, readable, premium quality'
    };

    // Aspect ratio to pixel dimensions
    const dimensions = {
      '1:1':  { width: 1024, height: 1024 },
      '16:9': { width: 1280, height: 720 },
      '9:16': { width: 720,  height: 1280 },
      '4:3':  { width: 1024, height: 768 }
    };

    const { width, height } = dimensions[aspect] || dimensions['1:1'];
    const enhancedPrompt = `${prompt}, ${styleModifiers[style] || styleModifiers.photorealistic}`;

    if (hooks?.onStatus) hooks.onStatus(`Image Gen: Calling Pollinations.AI (free tier)...`);

    // Ensure SQLite table
    await db.execute(`
      CREATE TABLE IF NOT EXISTS generated_images (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        prompt TEXT NOT NULL,
        enhanced_prompt TEXT,
        style TEXT,
        aspect TEXT,
        use_case TEXT,
        width INTEGER,
        height INTEGER,
        image_url TEXT,
        provider TEXT DEFAULT 'pollinations',
        approval_status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT (datetime('now'))
      )
    `);

    const results = [];
    const actualCount = Math.min(Math.max(1, count), 4);

    for (let i = 0; i < actualCount; i++) {
      if (hooks?.onStatus) hooks.onStatus(`Image Gen: Generating variation ${i + 1}/${actualCount}...`);

      let imageUrl = null;
      let provider = 'pollinations';

      try {
        // Try Pollinations.AI first — completely free, no key needed
        const seed = Math.floor(Math.random() * 999999);
        const encodedPrompt = encodeURIComponent(enhancedPrompt);
        const encodedNeg = encodeURIComponent(negative_prompt);

        imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&nologo=true&negative=${encodedNeg}&model=flux`;

        // Verify the URL is reachable
        const testFetch = await fetch(imageUrl, { method: 'HEAD' });
        if (!testFetch.ok) throw new Error('Pollinations HEAD check failed');

        provider = 'pollinations_flux';

      } catch (pollinationErr) {
        console.warn('[ImageGenWorker] Pollinations failed, trying Hugging Face...', pollinationErr);

        try {
          // Try Hugging Face Inference API (free tier)
          const hfKey = await getSetting('huggingface_api_key');
          if (hfKey && !hfKey.includes('PASTE_YOUR')) {
            const hfRes = await fetch(
              'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
              {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${hfKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  inputs: enhancedPrompt,
                  parameters: {
                    negative_prompt,
                    width,
                    height,
                    guidance_scale: 7.5,
                    num_inference_steps: 30
                  }
                })
              }
            );

            if (hfRes.ok) {
              const blob = await hfRes.blob();
              imageUrl = URL.createObjectURL(blob);
              provider = 'huggingface_sdxl';
            } else {
              throw new Error(`HF API error: ${hfRes.status}`);
            }
          } else {
            throw new Error('No Hugging Face key configured');
          }
        } catch (hfErr) {
          console.warn('[ImageGenWorker] HuggingFace also failed:', hfErr);
          // Final fallback: return a placeholder SVG URL
          imageUrl = `https://placehold.co/${width}x${height}/1E293B/6366F1?text=${encodeURIComponent(prompt.slice(0, 30))}`;
          provider = 'placeholder';
        }
      }

      const imageId = crypto.randomUUID();
      await db.execute(
        `INSERT INTO generated_images (id, project_id, prompt, enhanced_prompt, style, aspect, use_case, width, height, image_url, provider)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [imageId, project_id, prompt, enhancedPrompt, style, aspect, use_case, width, height, imageUrl, provider]
      );

      results.push({
        id: imageId,
        image_url: imageUrl,
        provider,
        width,
        height,
        variation: i + 1
      });

      // Small delay between requests to be polite to free APIs
      if (i < actualCount - 1) await new Promise(r => setTimeout(r, 1000));
    }

    if (hooks?.onStatus) hooks.onStatus(`Image Gen: ${results.length} image(s) generated. Approval needed.`);

    return {
      generated_count: results.length,
      images: results,
      prompt,
      enhanced_prompt: enhancedPrompt,
      style,
      aspect,
      use_case,
      dimensions: { width, height },
      primary_provider: results[0]?.provider || 'unknown',
      requires_approval: true,
      approval_severity: 'standard'
    };
  }
}
