export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'ui-cream': '#F9F8F3',
        'ui-beige': '#F1E8DB',
        'ui-sand': '#E5D2BB',
        'ui-brown': '#8B6E58',
        'ui-gray': '#8C9095',
        'ui-charcoal': '#1A1A1A',
        'ui-white': '#FFFFFF',
        'ui-gold': '#B18A5A',
        'ui-shadow': '#B7B1A8',
        'wh-cream': '#F9F8F3',
        'wh-black': '#1A1A1A',
        'wh-tan': '#DCC6AE',
        'wh-slate': '#8C9095',
        'wh-light-gray': '#EDEBE6',
        'wh-hover': '#e6e2dc',
        'coffee-bg': '#F1E8DB',
        'coffee-dark': '#1A1A1A',
        'coffee-accent': '#B18A5A'
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
        sans: ['"Inter"', 'sans-serif']
      },
      backgroundImage: {
        'hero-pattern': "url('https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=2000&auto=format&fit=crop')"
      }
    }
  },
  plugins: []
};
