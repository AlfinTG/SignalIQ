/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF4EC",
          100: "#DDE8DD",
          500: "#477B68",
          600: "#315D4C",
          700: "#264A3D",
        },
        ink: {
          DEFAULT: "#252B27",
          muted: "#626B63",
        },
        line: "#DEDCD2",
        canvas: "#F5F3EC",
        surface: "#FFFEFA",
      },
      boxShadow: {
        card: "0 1px 2px rgba(37, 43, 39, 0.04), 0 8px 24px rgba(37, 43, 39, 0.035)",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
