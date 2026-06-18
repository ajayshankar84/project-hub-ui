export const MAX_IMAGE_SIZE_MB = 5;
export const MAX_VIDEO_SIZE_MB = 200;
export const IMAGE_COMPRESSION_QUALITY = 0.75;
export const IMAGE_MAX_DIMENSION = 1920;

export function bytesToMB(bytes: number): number {
  return Number((bytes / (1024 * 1024)).toFixed(2));
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  if (!file.type.startsWith('image/')) {
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Please select an image (JPG, PNG, GIF, etc).`,
    };
  }
  if (bytesToMB(file.size) > MAX_IMAGE_SIZE_MB * 4) {
    return {
      valid: false,
      error: `Image too large (${formatFileSize(file.size)}). Maximum ${MAX_IMAGE_SIZE_MB * 4}MB allowed.`,
    };
  }
  return { valid: true };
}

export function validateVideoFile(file: File): FileValidationResult {
  if (!file.type.startsWith('video/')) {
    return {
      valid: false,
      error: `Invalid file type "${file.type}". Please select a video file (MP4, MOV, AVI, etc).`,
    };
  }
  if (bytesToMB(file.size) > MAX_VIDEO_SIZE_MB) {
    return {
      valid: false,
      error: `Video too large (${formatFileSize(file.size)}). Maximum allowed is ${MAX_VIDEO_SIZE_MB}MB.`,
    };
  }
  return { valid: true };
}

export function compressImage(
  file: File,
  maxDimension: number = IMAGE_MAX_DIMENSION,
  quality: number = IMAGE_COMPRESSION_QUALITY,
): Promise<File> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const outputType =
          file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }

            if (blob.size >= file.size) {
              resolve(file);
              return;
            }

            const compressedName =
              file.name.replace(/\.[^.]+$/, '') +
              (outputType === 'image/png' ? '.png' : '.jpg');

            const compressedFile = new File([blob], compressedName, {
              type: outputType,
              lastModified: Date.now(),
            });

            resolve(compressedFile);
          },
          outputType,
          quality,
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
