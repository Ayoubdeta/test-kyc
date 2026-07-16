import decalLogo from '../assets/logo-decal.svg';
import kycLogo from '../assets/logo-kyc.svg';

// Logotipos de la aplicación (KYC) y de la empresa (Decal). Se importan como
// URL (Vite) y se pintan como <img> con su texto alternativo accesible.

export function AppLogo({ className = 'h-8 w-8' }: { className?: string }) {
  return <img src={kycLogo} alt="KYC" className={className} draggable={false} />;
}

export function DecalLogo({ className = 'h-5' }: { className?: string }) {
  return <img src={decalLogo} alt="Decal" className={className} draggable={false} />;
}

/** Sello "by Decal": el logo de la empresa con una etiqueta discreta. */
export function PoweredByDecal({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-slate-400 ${className}`}>
      <span>by</span>
      <DecalLogo className="h-4 w-auto" />
    </span>
  );
}
