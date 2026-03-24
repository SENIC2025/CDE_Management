/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // ── SENIC Brand Palette ─────────────────────────
        // Source: senic.space design system
        senic: {
          primary:    '#1BAE70',  // Vibrant green — buttons, CTAs, highlights
          secondary:  '#06752E',  // Deep green — hover states, secondary accents
          accent:     '#14261C',  // Near-black green — hero, dark panels, headings
          bg:         '#F4F6F4',  // Soft off-white with green tint — page backgrounds
          text:       '#4E5652',  // Warm dark grey — body copy
        },

        // Override Tailwind's blue with SENIC green palette
        // This re-themes all bg-blue-*, text-blue-*, border-blue-* etc. globally
        blue: {
          50:  '#f2faf6',   // Lightest green tint (backgrounds)
          100: '#d9f2e6',   // Very light green
          200: '#b0e5ca',   // Light green
          300: '#7dd4a8',   // Medium-light green
          400: '#42c183',   // Approaching primary
          500: '#1BAE70',   // ← SENIC Primary
          600: '#159a5f',   // Slightly darker primary
          700: '#06752E',   // ← SENIC Secondary
          800: '#0a5a24',   // Dark green
          900: '#14261C',   // ← SENIC Accent (near-black green)
          950: '#0d1a12',   // Deepest dark
        },

        // Override indigo with SENIC green range for gradients
        indigo: {
          50:  '#f0faf4',
          100: '#d5f5e3',
          200: '#a8ebc4',
          300: '#6fdb9e',
          400: '#36c87a',
          500: '#1BAE70',   // ← matches primary
          600: '#159a5f',
          700: '#06752E',   // ← matches secondary
          800: '#0a5a24',
          900: '#14261C',   // ← matches accent
          950: '#0d1a12',
        },
      },
    },
  },
  plugins: [],
};
