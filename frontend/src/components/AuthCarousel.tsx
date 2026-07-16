import { useEffect, useState } from 'react';

// Diapositivas del carrusel de la pantalla de acceso (login/registro).
const SLIDES = [
  {
    title: 'Verificación de identidad, simple y segura',
    text: 'Gestiona clientes, documentos y cumplimiento desde un único panel.',
  },
  {
    title: 'Documentación cifrada',
    text: 'Tus documentos se transmiten y almacenan de forma segura.',
  },
  {
    title: 'Revisión ágil de compliance',
    text: 'Aprueba o rechaza documentos con trazabilidad completa.',
  },
  {
    title: 'Control de acceso por roles',
    text: 'Permisos diferenciados para clientes, compliance y administradores.',
  },
];

const INTERVAL_MS = 5000;

// Carrusel automático con animación de entrada e indicadores (puntos)
// clicables. Da dinamismo/personalidad a la pantalla de acceso.
export function AuthCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  const slide = SLIDES[index];

  return (
    <div>
      {/* key={index} relanza la animación en cada cambio de slide */}
      <div key={index} className="animate-slide-in min-h-[7rem]">
        <h2 className="text-2xl font-bold leading-snug">{slide.title}</h2>
        <p className="mt-3 max-w-xs text-sm text-white/80">{slide.text}</p>
      </div>

      <div className="mt-6 flex gap-2" role="tablist" aria-label="Diapositivas">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            type="button"
            role="tab"
            aria-selected={idx === index}
            aria-label={`Ir a la diapositiva ${idx + 1}`}
            onClick={() => setIndex(idx)}
            className={`h-2 rounded-full transition-all duration-300 ${
              idx === index ? 'w-6 bg-white' : 'w-2 bg-white/40 hover:bg-white/70'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
