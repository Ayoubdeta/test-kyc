interface AvatarProps {
  src?: string | null;
  /** Texto para derivar la inicial cuando no hay imagen. */
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES: Record<NonNullable<AvatarProps['size']>, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-14 w-14 text-xl',
  lg: 'h-24 w-24 text-3xl',
};

// Muestra la foto de perfil si existe; si no, un círculo con la inicial.
export function Avatar({ src, name, size = 'md' }: AvatarProps) {
  const initial = name.charAt(0).toUpperCase() || '?';
  const classes = SIZE_CLASSES[size];

  if (src) {
    return (
      <img
        src={src}
        alt={`Foto de perfil de ${name}`}
        className={`${classes} rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  return (
    <div
      className={`${classes} flex items-center justify-center rounded-full bg-brand-600 font-bold text-white`}
      aria-hidden="true"
    >
      {initial}
    </div>
  );
}
