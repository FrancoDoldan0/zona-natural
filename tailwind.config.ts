import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { lg: "1024px", xl: "1200px" } },
    extend: {
      colors: {
        brand: {
          DEFAULT: "#2FA84F", // verde base (ajustable)
          dark: "#1E7A38",
          light: "#E9F7EE",
        },
        ink: { 900: "#0B1220", 700: "#1F2937", 500: "#6B7280" },
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,.06)" },
    },
  },
  plugins: [],
} satisfies Config;
