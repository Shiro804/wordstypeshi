/**
 * Background storage utilities.
 * Manages custom background images per game stored in localStorage.
 */

const BACKGROUND_KEY_PREFIX = "puzzlehub.background";

/**
 * Get the storage key for a specific game.
 * If no gameId provided, returns global key for backwards compatibility.
 */
function getStorageKey(gameId?: string): string {
  if (gameId) {
    return `${BACKGROUND_KEY_PREFIX}.${gameId}`;
  }
  return BACKGROUND_KEY_PREFIX;
}

/**
 * Get the custom background URL for a specific game (or global fallback).
 * @param gameId - Optional game identifier (e.g., 'wordle', 'mastermind', 'wordsearch')
 */
export function getCustomBackground(gameId?: string): string | null {
  if (typeof window === "undefined") return null;
  
  // First try game-specific background
  if (gameId) {
    const gameSpecific = localStorage.getItem(getStorageKey(gameId));
    if (gameSpecific) return gameSpecific;
  }
  
  // Fallback to global background (legacy compatibility)
  return localStorage.getItem(BACKGROUND_KEY_PREFIX);
}

/**
 * Set custom background from a File for a specific game.
 * Converts to base64 data URL for localStorage storage.
 * Max size: ~2MB (will be compressed if needed).
 * @param file - The image file to set as background
 * @param gameId - Optional game identifier for game-specific background
 */
export async function setCustomBackground(file: File, gameId?: string): Promise<string> {
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
          localStorage.setItem(getStorageKey(gameId), compressed);
          resolve(compressed);
        } catch {
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
 * Clear custom background for a specific game (or global).
 * @param gameId - Optional game identifier. If not provided, clears global background.
 */
export function clearCustomBackground(gameId?: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(getStorageKey(gameId));
}

/**
 * Check if a game has a custom background set.
 */
export function hasCustomBackground(gameId?: string): boolean {
  return getCustomBackground(gameId) !== null;
}
