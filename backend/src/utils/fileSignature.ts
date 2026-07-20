// Verifica la "firma" (magic bytes) real del contenido de un fichero, no solo
// el MIME que declara el cliente (que es falsificable). Como los ficheros se
// suben en memoria (multer memoryStorage), tenemos el buffer disponible para
// comprobar sus primeros bytes antes de guardarlo en Storage.

function startsWith(buffer: Buffer, bytes: number[]): boolean {
  if (buffer.length < bytes.length) return false;
  return bytes.every((b, i) => buffer[i] === b);
}

const SIGNATURES: Record<string, (buf: Buffer) => boolean> = {
  // %PDF-
  'application/pdf': (b) => startsWith(b, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  // \x89PNG\r\n\x1a\n
  'image/png': (b) => startsWith(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  // JFIF/EXIF: FF D8 FF
  'image/jpeg': (b) => startsWith(b, [0xff, 0xd8, 0xff]),
  // RIFF....WEBP (bytes 0-3 "RIFF" y 8-11 "WEBP")
  'image/webp': (b) =>
    b.length >= 12 &&
    startsWith(b, [0x52, 0x49, 0x46, 0x46]) &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50,
};

/**
 * Devuelve true si el contenido del buffer coincide con la firma esperada para
 * ese MIME. Si el MIME no está contemplado, devuelve false (rechaza por defecto).
 */
export function hasValidSignature(buffer: Buffer, mimetype: string): boolean {
  const check = SIGNATURES[mimetype];
  return check ? check(buffer) : false;
}
