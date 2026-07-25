/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        base: {
          950: '#0A0B0D',   // near-black bg, matches logo background
          900: '#121317',
          800: '#1B1D23',
          700: '#2A2D35',
        },
        electric: {
          400: '#38BDF8',
          500: '#0EA5E9',   // matches the logo's blue
          600: '#0284C7',
        },
        runner: {
          400: '#FB923C',
          500: '#F97316',   // matches the logo's orange
          600: '#EA580C',
        },
        // Marketing surface: obsidian ground + a hotter, glowing ember accent
        // than the product's runner orange.
        // Warm obsidian, not pure black — a neutral #0B0C10 reads cold and
        // flat under warm accents.
        obsidian: {
          950: '#0F0E12',
          900: '#14131A',
          800: '#1B1922',
          700: '#24222D',
        },
        ember: {
          300: '#FF8A4C',
          400: '#FF6B23',
          500: '#FF5500',
          600: '#E64A00',
        },
        // Copper carries the handcrafted warmth. Ember is the hot signal colour
        // (CTAs, live); copper is the quieter artisan tone for rules, labels and
        // borders — warmth without tinting the obsidian ground brown.
        copper: {
          200: '#EBC49A',
          300: '#DCA86E',
          400: '#C8823C',
          500: '#A96A2C',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      backdropBlur: { xs: '2px' },
      keyframes: {
        pulseLive: {
          '0%, 100%': { opacity: 1, transform: 'scale(1)' },
          '50%': { opacity: 0.4, transform: 'scale(0.85)' },
        },
      },
      animation: {
        pulseLive: 'pulseLive 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
