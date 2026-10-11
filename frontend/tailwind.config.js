/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          900: "#1B2B44",
          950: "#14243A",
        },
        brand: {
          50: "#EFF5FF",
          100: "#DCE8FF",
          500: "#4C86F2",
          600: "#2F6FED",
          700: "#1F57C8",
        },
        ink: {
          DEFAULT: "#192638",
          muted: "#667085",
        },
        line: "#E2E8F0",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20, 36, 58, 0.06), 0 8px 24px rgba(20, 36, 58, 0.04)",
      },
      fontFamily: {
        sans: ["Inter", "Segoe UI", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
