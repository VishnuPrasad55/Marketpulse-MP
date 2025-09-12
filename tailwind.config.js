/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Custom colors for the application
        primary: {
          DEFAULT: '#0A1929',
          50: '#E6EEF5',
          100: '#C0D6E8',
          200: '#7AA6D0',
          300: '#3376B7',
          400: '#0F5490',
          500: '#0A1929',
          600: '#091623',
          700: '#07121D',
          800: '#050D16',
          900: '#030910',
        },
        success: {
          DEFAULT: '#10B981',
          50: '#E7FBF4',
          100: '#C3F6E4',
          200: '#7EECCC',
          300: '#39E2B3',
          400: '#10B981',
          500: '#0A9E6F',
          600: '#08835D',
          700: '#07684A',
          800: '#054E38',
          900: '#033425',
        },
        danger: {
          DEFAULT: '#DC2626',
          50: '#FCE8E8',
          100: '#F8C4C4',
          200: '#F17979',
          300: '#EA2F2F',
          400: '#DC2626',
          500: '#BC2121',
          600: '#9B1B1B',
          700: '#7A1616',
          800: '#591010',
          900: '#390A0A',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      boxShadow: {
        'soft': '0 0 20px 0 rgba(0, 0, 0, 0.05)',
        'card': '0 4px 12px 0 rgba(0, 0, 0, 0.08)',
      },
    },
  },
  plugins: [],
};