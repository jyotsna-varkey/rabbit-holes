// Image compression for everything bundled in holes/snapshots/images.
// Rasters become WebP (animated GIFs stay animated); SVGs are left alone.

import sharp from 'sharp';

export const WEBP_QUALITY = 70;
/** Card (infobox) images: about twice the widest they're shown (240 CSS px). */
export const LEAD_MAX_WIDTH = 480;

/** Returns the bytes to save and their extension. */
export async function compressImage(bytes, ext, { maxWidth } = {}) {
  ext = ext.toLowerCase();
  if (ext === 'svg') return { bytes, ext };
  let img = sharp(bytes, { animated: ext === 'gif' || ext === 'webp' });
  if (maxWidth) img = img.resize({ width: maxWidth, withoutEnlargement: true });
  return { bytes: await img.webp({ quality: WEBP_QUALITY, effort: 5 }).toBuffer(), ext: 'webp' };
}
