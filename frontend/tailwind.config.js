/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Rojo corporativo (color primario de la app, alineado con Decal).
        brand: {
          50: '#fef2f3',
          100: '#fde3e5',
          200: '#fbccd0',
          300: '#f7a3ab',
          400: '#ef6b78',
          500: '#e5273c',
          600: '#d7001b', // rojo Decal — acciones primarias
          700: '#b80017',
          800: '#970013',
          900: '#7d0011',
        },
        // Alias del rojo de marca (para usos explícitos de "Decal").
        decal: {
          50: '#fef2f3',
          100: '#fde3e5',
          500: '#d7001b',
          600: '#b80017',
          700: '#970013',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.10)',
        elevated: '0 10px 30px -12px rgba(16,24,40,0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Entrada de cada slide del carrusel del acceso.
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Gradiente animado que se desplaza (fondo del hero del cliente).
        'gradient-pan': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '50%': { 'background-position': '100% 50%' },
        },
        // Flotación suave para elementos decorativos.
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        // Brillo diagonal que barre una superficie.
        shine: {
          '0%': { transform: 'translateX(-140%) skewX(-12deg)' },
          '60%, 100%': { transform: 'translateX(240%) skewX(-12deg)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-in-up': 'fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in': 'scale-in 0.22s ease-out both',
        'slide-in': 'slide-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'gradient-pan': 'gradient-pan 9s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shine: 'shine 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
