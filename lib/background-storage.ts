/**
 * Background storage utilities.
 * Manages custom background image stored in localStorage.
 */

const BACKGROUND_KEY = "batas-wordle-custom-background";

/**
 * Get the custom background URL (base64 data URL or null).
 */
export function getCustomBackground(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BACKGROUND_KEY);
}

/**
 * Set custom background from a File.
 * Converts to base64 data URL for localStorage storage.
 * Max size: ~2MB (will be compressed if needed).
 */
export async function setCustomBackground(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    // Check file size (max 5MB raw, will be resized)
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("Image too large. Max 5MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      
      // Create image to resize if needed
      const img = new Image();
      img.onload = () => {
        // Resize to max 1920px width for reasonable storage
        const maxWidth = 1920;
        const maxHeight = 1080;
        
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to create canvas context"));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG for smaller size
        const compressed = canvas.toDataURL("image/jpeg", 0.8);
        
        try {
          localStorage.setItem(BACKGROUND_KEY, compressed);
          resolve(compressed);
        } catch (e) {
          reject(new Error("Image too large for storage. Try a smaller image."));
        }
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = dataUrl;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Clear custom background (revert to default).
 */
export function clearCustomBackground(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(BACKGROUND_KEY);
}
