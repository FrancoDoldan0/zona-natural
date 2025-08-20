import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#2E7D32',
          light: '#A5D6A7',
          accent: '#FFC107',
          dark: '#1B5E20'
        }
      }
    }
  },
  plugins: []
} satisfies Config;
