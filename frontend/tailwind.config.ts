import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "Segoe UI",
          "sans-serif",
        ],
      },
      boxShadow: {
        app: "0 18px 50px rgba(12, 23, 37, 0.12)",
      },
    },
  },
  plugins: [],
} satisfies Config;
