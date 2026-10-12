/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#E4EBDD",
          100: "#D7E3CF",
          500: "#276148",
          600: "#174C38",
          700: "#103A2A",
        },
        ink: {
          DEFAULT: "#252923",
          muted: "#70756D",
        },
        line: "#DDD9CF",
        canvas: "#F7F3E8",
        surface: "#FFFEFA",
        stone: "#ECE8DE",
        citrus: "#D8F36A",
        terracotta: "#E8795B",
        amber: "#B98528",
      },
      boxShadow: {
        card: "0 1px 2px rgba(37, 41, 35, 0.05), 0 12px 30px rgba(37, 41, 35, 0.055)",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
