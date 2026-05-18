/**
 * NEURION OS - Image generation via OpenAI GPT Image.
 * Uses the highest quality settings for professional creative output.
 */
import { generateOpenAIImage } from './openai';
import { recordUsage } from './usage';

function sizeFromAspectRatio(aspectRatio: '1:1' | '16:9' | '9:16') {
  if (aspectRatio === '16:9') return '1536x1024';
  if (aspectRatio === '9:16') return '1024x1536';
  return '1024x1024';
}

export async function generateImage(
  prompt: string,
  aspectRatio: '1:1' | '16:9' | '9:16' = '1:1',
  apiKey?: string,
  highQuality: boolean = false
): Promise<string | null> {
  try {
    const image = await generateOpenAIImage({
      prompt,
      size: sizeFromAspectRatio(aspectRatio),
      quality: highQuality ? 'high' : 'medium',
    }, apiKey);
    if (image) recordUsage('image', 1);
    return image;
  } catch (err) {
    console.error('generateImage error:', err);
    return null;
  }
}
