
export async function compressImage(base64Str: string, maxWidth = 1200, quality = 0.7): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Clear canvas to ensure transparency is preserved
      ctx.clearRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Use image/webp if supported, as it handles transparency and compression well.
      // Fallback to image/png for full transparency support if webp is not ideal.
      // We avoid image/jpeg because it turns transparent areas black.
      const outputFormat = base64Str.includes('image/png') || base64Str.includes('image/svg') ? 'image/png' : 'image/webp';
      resolve(canvas.toDataURL(outputFormat, quality));
    };
    img.onerror = (err) => reject(err);
  });
}
