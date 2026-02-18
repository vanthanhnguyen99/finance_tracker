import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        mist: "#f6f7fb",
        accent: "#0ea5e9",
        lime: "#84cc16",
        coral: "#fb7185"
      },
      boxShadow: {
        card: "0 8px 24px rgba(15, 23, 42, 0.12)"
      }
    }
  },
  plugins: []
};

export default config;
