module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  safelist: ['bg-white', 'bg-red-500', 'bg-blue-500'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#2563eb",
        },
      },
    },
  },
  plugins: [],
};
