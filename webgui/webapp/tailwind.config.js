/** @type {import('tailwindcss').Config} */
module.exports = {
  corePlugins: {
    preflight: false,
  },
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        "primary-10": "#E1FBFA",
        "primary-50": "#16B3AC",
        "primary-60": "#128F8A",
        "warning-10": "#FFA705",
        // Add your custom color here
      },
      spacing: {
        '1.5': '5px',
        '2.5': '10px',
      },
      flexGrow: {
        '2': '2',
      }
    },
  },
  plugins: [],
};
