// Utilidad para preparar una imagen de avatar en el navegador antes de
// enviarla: la redimensiona a un cuadrado máximo y la comprime a JPEG. Así
// evitamos subir imágenes enormes a la base de datos (se guardan como data URL).

const MAX_SIZE = 256; // píxeles (lado máximo)
const JPEG_QUALITY = 0.82;
const MAX_INPUT_BYTES = 8 * 1024 * 1024; // 8 MB de entrada como cota razonable

export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export interface ProcessedImage {
  dataUrl: string;
}

export async function fileToCompressedDataUrl(file: File): Promise<ProcessedImage> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Formato no admitido. Usa PNG, JPG o WEBP.');
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('La imagen es demasiado grande (máx. 8 MB).');
  }

  const bitmap = await loadImage(file);

  // Recorte cuadrado centrado + escalado al lado máximo.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  const target = Math.min(side, MAX_SIZE);

  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('No se pudo procesar la imagen.');
  }
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, target, target);

  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  return { dataUrl };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}
