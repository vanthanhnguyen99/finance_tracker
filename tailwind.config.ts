import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Be Vietnam Pro", "sans-serif"]
      },
      colors: {
        ink: "#171A1F",
        mist: "#F8F9FB",
        primary: {
          50: "#EEF5FF",
          100: "#D9E8FF",
          200: "#B9D4FF",
          300: "#8DB8FF",
          400: "#5E93FF",
          500: "#3B6FF5",
          600: "#2F56D8",
          700: "#2945AF",
          800: "#273C8A",
          900: "#26366D"
        },
        success: {
          light: "#EAF8F0",
          DEFAULT: "#2E9D62",
          dark: "#217548"
        },
        danger: {
          light: "#FDECEC",
          DEFAULT: "#DC4C4C",
          dark: "#A93434"
        },
        warning: {
          light: "#FFF6E1",
          DEFAULT: "#E59A24",
          dark: "#A86B11"
        }
      },
      borderRadius: {
        card: "1rem",
        control: "0.75rem"
      },
      boxShadow: {
        soft: "0 1px 2px rgba(17, 24, 39, 0.06)",
        card: "0 1px 2px rgba(17, 24, 39, 0.06)",
        sheet: "0 12px 32px rgba(17, 24, 39, 0.16)"
      }
    }
  },
  plugins: []
};

export default config;
