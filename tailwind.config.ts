import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#FDFBF5",
          100: "#F8F3E8",
          200: "#F1E9D6",
          300: "#E8DCC0",
        },
        ink: "#1A1712",
        gold: {
          400: "#C9A227",
          500: "#B8935A",
          600: "#9C7A3F",
        },
      },
      fontFamily: {
        display: ["var(--font-fraunces)", "serif"],
        body: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
