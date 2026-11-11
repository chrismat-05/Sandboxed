// Exact copy of attached dribble design generated, to redesign later.
// temporary fix so the UI doesn't clip during presentation
// tchr said this shouldn't be hardcoded but I'm tired
// please just work for the demo tomorrow
// absolute black magic, do not delete or the whole app crashes

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        burgundy: {
          950: '#12090e',
          900: '#160e14', // deep midnight burgundy backdrop
          850: '#1c1119', // sidebar & elevated panels
          800: '#241520', // card surfaces
          750: '#2c1927', // hover card surfaces
          700: '#3b202f', // fine-line hairline border
          650: '#542d43', // border highlight
          500: '#861c38', // primary velvet burgundy action
          400: '#9e2343', // hover action
          300: '#b93254',
          200: '#d95376',
        },
        beige: {
          50: '#fcfaf7',
          100: '#f7f2e8', // headline bright text
          200: '#ede5d8', // primary body text
          300: '#dfd2c0', // secondary labels
          400: '#baa892', // muted labels
          500: '#94816c', // faint labels
        },
        champagne: {
          300: '#f5e4c8',
          400: '#ebd1a7',
          500: '#d8b886', // warm English gold / champagne accent
          600: '#ba945b',
          700: '#8f6e3c',
        },
      },
      fontFamily: {
        serif: ['"TAN Meringue"', 'Fraunces', '"Cormorant Garamond"', 'Georgia', 'serif'],
        display: ['"TAN Meringue"', 'Fraunces', '"Cormorant Garamond"', 'serif'],
        sub: ['Biski', '"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        'velvet-glow': '0 0 25px -5px rgba(134, 28, 56, 0.35)',
        'champagne-glow': '0 0 20px -3px rgba(216, 184, 134, 0.25)',
      },
    },
  },
  plugins: [],
}
