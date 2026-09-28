/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        med: { 50: '#eef6ff', 100: '#d9eaff', 200: '#bcdcff', 300: '#8ec6ff', 400: '#59a5fb', 500: '#3384f3', 600: '#0b63ce', 700: '#084ea6', 800: '#0a4286', 900: '#0e3a6e' },
        pharm: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ce9b8', 400: '#31d698', 500: '#0e9f6e', 600: '#057e57', 700: '#046545', 800: '#06513a', 900: '#06422f' },
        ink: { 50: '#f6f8fb', 100: '#eef1f6', 800: '#1c2740', 900: '#111a30' },
      },
      fontFamily: { display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], body: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 10px 30px -12px rgba(11,99,206,.25)', pop: '0 24px 60px -20px rgba(8,78,166,.35)' },
      keyframes: { pulseLine: { '0%,100%': { strokeDashoffset: 0 }, '50%': { strokeDashoffset: 24 } }, floaty: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-14px)' } } },
      animation: { floaty: 'floaty 6s ease-in-out infinite' },
    },
  },
  plugins: [],
};
