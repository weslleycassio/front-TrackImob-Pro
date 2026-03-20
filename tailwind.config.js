/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        wbg: {
          primary: '#0078D4',
          secondary: '#31C877',
          dark: '#0A2E4A',
          neutral: '#A5A555',
        },
      },
    },
  },
  plugins: [],
};
