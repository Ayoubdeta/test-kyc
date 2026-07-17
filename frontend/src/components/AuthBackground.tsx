// Fondo dinámico y animado para las pantallas de acceso (login / activación).
// Temática Decal: terminal de almacenamiento portuaria — tanques, buque,
// oleaje, tuberías con flujo de producto, moléculas (químicos/biocombustibles)
// y gotas ascendentes. Todo autocontenido (SVG + CSS), sin imágenes externas,
// en tonos de marca y con baja opacidad para que la tarjeta siga destacando.
// Respeta `prefers-reduced-motion` (definido globalmente en index.css).

// Un clúster de "molécula": nodos unidos por enlaces (evoca metanol, MTBE/ETBE,
// bioetanol, aditivos…).
function Molecule({ className, delay = 0 }: { className?: string; delay?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`absolute h-24 w-24 animate-float text-brand-400/40 ${className ?? ''}`}
      style={{ animationDelay: `${delay}s` }}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <line x1="50" y1="50" x2="20" y2="28" />
      <line x1="50" y1="50" x2="82" y2="30" />
      <line x1="50" y1="50" x2="35" y2="82" />
      <line x1="50" y1="50" x2="78" y2="72" />
      <circle cx="50" cy="50" r="7" fill="currentColor" />
      <circle cx="20" cy="28" r="5" fill="currentColor" />
      <circle cx="82" cy="30" r="4" fill="currentColor" />
      <circle cx="35" cy="82" r="4" fill="currentColor" />
      <circle cx="78" cy="72" r="5" fill="currentColor" />
    </svg>
  );
}

// Un tanque de almacenamiento cilíndrico con nivel de producto.
function Tank({ x, w, h, fill }: { x: number; w: number; h: number; fill: string }) {
  const y = 300 - h;
  const level = h * 0.55;
  return (
    <g>
      {/* cuerpo */}
      <rect x={x} y={y} width={w} height={h} rx={4} className="fill-white/50 stroke-slate-400/50" strokeWidth={1.5} />
      {/* producto dentro */}
      <rect x={x + 1.5} y={300 - level} width={w - 3} height={level - 1.5} rx={3} fill={fill} opacity={0.35} />
      {/* aros del tanque */}
      <line x1={x} y1={y + h * 0.33} x2={x + w} y2={y + h * 0.33} className="stroke-slate-400/40" strokeWidth={1} />
      <line x1={x} y1={y + h * 0.66} x2={x + w} y2={y + h * 0.66} className="stroke-slate-400/40" strokeWidth={1} />
      {/* techo */}
      <ellipse cx={x + w / 2} cy={y} rx={w / 2} ry={5} className="fill-white/60 stroke-slate-400/50" strokeWidth={1.5} />
    </g>
  );
}

export function AuthBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      {/* 1 · Wash de color de marca, muy sutil y en movimiento lento */}
      <div
        className="absolute inset-0 animate-gradient-pan bg-[length:200%_200%]"
        style={{
          backgroundImage:
            'linear-gradient(120deg, #fef2f3 0%, #f8f7f8 38%, #eef2f6 66%, #fde3e5 100%)',
        }}
      />

      {/* Halos difusos que flotan */}
      <div className="absolute -left-24 top-8 h-80 w-80 animate-float rounded-full bg-brand-200/30 blur-3xl" />
      <div
        className="absolute -right-20 top-1/3 h-72 w-72 animate-float rounded-full bg-sky-200/30 blur-3xl"
        style={{ animationDelay: '2.5s' }}
      />

      {/* 2 · Moléculas (químicos / biocombustibles) */}
      <Molecule className="left-[6%] top-[14%]" delay={0} />
      <Molecule className="right-[10%] top-[10%] h-16 w-16" delay={1.5} />
      <Molecule className="left-[16%] bottom-[34%] h-20 w-20 text-slate-400/40" delay={3} />

      {/* 3 · Tuberías con flujo de producto (transferencias) */}
      <svg className="absolute inset-x-0 top-[30%] h-24 w-full" preserveAspectRatio="none" viewBox="0 0 1440 100">
        <line x1="0" y1="30" x2="1440" y2="30" className="stroke-slate-300/50" strokeWidth="3" />
        <line
          x1="0"
          y1="30"
          x2="1440"
          y2="30"
          className="animate-flow-dash stroke-brand-400/60"
          strokeWidth="3"
          strokeDasharray="18 26"
          strokeLinecap="round"
        />
        <line x1="0" y1="70" x2="1440" y2="70" className="stroke-slate-300/40" strokeWidth="3" />
        <line
          x1="0"
          y1="70"
          x2="1440"
          y2="70"
          className="animate-flow-dash stroke-sky-400/50"
          strokeWidth="3"
          strokeDasharray="14 30"
          strokeLinecap="round"
          style={{ animationDelay: '1.2s' }}
        />
        {/* válvulas */}
        <circle cx="380" cy="30" r="5" className="fill-white stroke-slate-400/60" strokeWidth="2" />
        <circle cx="1040" cy="70" r="5" className="fill-white stroke-slate-400/60" strokeWidth="2" />
      </svg>

      {/* 4·5·6 · Escena de terminal portuaria anclada abajo */}
      <div className="absolute inset-x-0 bottom-0 h-[46%] min-h-[280px]">
        {/* Buque petrolero navegando */}
        <div className="absolute bottom-[42%] left-0 animate-sail">
          <div className="animate-float">
            <svg viewBox="0 0 220 90" className="h-14 w-56 text-slate-500/45" fill="none">
              {/* casco */}
              <path
                d="M10 55 L210 55 L192 78 L28 78 Z"
                className="fill-slate-500/25 stroke-slate-500/50"
                strokeWidth="2"
              />
              {/* cubierta / superestructura */}
              <rect x="150" y="34" width="34" height="21" className="fill-white/50 stroke-slate-500/50" strokeWidth="2" />
              <rect x="158" y="20" width="14" height="14" className="fill-white/50 stroke-slate-500/50" strokeWidth="2" />
              {/* tuberías de cubierta (buque tanque) */}
              <line x1="24" y1="50" x2="146" y2="50" className="stroke-brand-400/50" strokeWidth="2" />
              <circle cx="60" cy="50" r="4" className="fill-white stroke-slate-500/50" strokeWidth="1.5" />
              <circle cx="110" cy="50" r="4" className="fill-white stroke-slate-500/50" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Tanques de almacenamiento (skyline de la terminal) */}
        <svg
          className="absolute inset-x-0 bottom-[26%] h-40 w-full"
          preserveAspectRatio="xMidYMax slice"
          viewBox="0 0 1440 300"
        >
          <Tank x={90} w={150} h={150} fill="#d7001b" />
          <Tank x={280} w={190} h={210} fill="#0ea5e9" />
          <Tank x={520} w={130} h={120} fill="#f59e0b" />
          <Tank x={980} w={170} h={185} fill="#22c55e" />
          <Tank x={1200} w={150} h={140} fill="#d7001b" />
          {/* pasarela/tubería que conecta los tanques */}
          <line x1="90" y1="185" x2="1350" y2="185" className="stroke-slate-400/30" strokeWidth="2" strokeDasharray="6 8" />
        </svg>

        {/* Oleaje del puerto (dos capas con vaivén) */}
        <svg
          className="absolute inset-x-0 bottom-0 h-28 w-full animate-wave"
          preserveAspectRatio="none"
          viewBox="0 0 1440 120"
          style={{ animationDelay: '0.5s' }}
        >
          <path d="M0 60 C 240 20 480 100 720 60 C 960 20 1200 100 1440 60 L1440 120 L0 120 Z" className="fill-sky-300/25" />
        </svg>
        <svg
          className="absolute inset-x-0 bottom-0 h-24 w-full animate-wave"
          preserveAspectRatio="none"
          viewBox="0 0 1440 120"
        >
          <path d="M0 70 C 260 40 520 110 780 74 C 1020 40 1240 104 1440 74 L1440 120 L0 120 Z" className="fill-sky-400/30" />
        </svg>
      </div>

      {/* 7 · Gotas/burbujas de producto que ascienden */}
      {[
        { left: '22%', bottom: '30%', delay: 0, size: 8 },
        { left: '45%', bottom: '34%', delay: 2.2, size: 6 },
        { left: '63%', bottom: '31%', delay: 4, size: 10 },
        { left: '80%', bottom: '35%', delay: 1.2, size: 7 },
      ].map((d, i) => (
        <span
          key={i}
          className="absolute animate-rise rounded-full bg-brand-400/40"
          style={{ left: d.left, bottom: d.bottom, width: d.size, height: d.size, animationDelay: `${d.delay}s` }}
        />
      ))}
    </div>
  );
}
