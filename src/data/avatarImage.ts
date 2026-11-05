// Foto de perfil enviada pelo usuário: recorta em quadrado (centro) e reduz para um JPEG leve.
// Fotos de celular têm vários MB; salvas inteiras estouravam o armazenamento do navegador
// (limite ~5 MB) e travavam o carregamento/salvamento do perfil e a sincronização na nuvem.

export const AVATAR_SIZE = 320;
/** acima disso (em caracteres do data URL) uma foto antiga é reduzida automaticamente */
export const AVATAR_MAX_DATAURL = 120_000;

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('decode'));
    img.src = src;
  });

const drawSquare = (img: HTMLImageElement, size = AVATAR_SIZE, quality = 0.85): string => {
  const side = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - side) / 2;
  const sy = (img.naturalHeight - side) / 2;
  const target = Math.min(size, side) || size;
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.fillStyle = '#ffffff'; // PNG com transparência não fica preto no JPEG
  ctx.fillRect(0, 0, target, target);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, side, side, 0, 0, target, target);
  return canvas.toDataURL('image/jpeg', quality);
};

/** Lê o arquivo escolhido e devolve um data URL JPEG quadrado de até 320px. */
export const fileToAvatarDataUrl = async (file: File): Promise<string> => {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    return drawSquare(img);
  } finally {
    URL.revokeObjectURL(url);
  }
};

/** Reduz um data URL já salvo (fotos antigas, em tamanho original). */
export const shrinkAvatarDataUrl = async (dataUrl: string): Promise<string> => {
  const img = await loadImage(dataUrl);
  return drawSquare(img);
};

export const avatarErrorMessage =
  'Não foi possível abrir essa imagem. Envie uma foto em JPG, PNG ou WEBP (fotos HEIC do iPhone: exporte como JPG).';
