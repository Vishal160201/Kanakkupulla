import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "#e5e7eb",
        input: "#e5e7eb",
        ring: "#ff9f1c",
        background: "#f8fafc",
        foreground: "#1f2937",
        primary: {
          DEFAULT: "#ff9f1c",
          foreground: "white",
        },
        secondary: {
          DEFAULT: "#ffffff",
          foreground: "#6b7280",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "white",
        },
        muted: {
          DEFAULT: "#f1f5f9",
          foreground: "#6b7280",
        },
        accent: {
          DEFAULT: "#fff3e0",
          foreground: "#ff9f1c",
        },
        popover: {
          DEFAULT: "#ffffff",
          foreground: "#1f2937",
        },
        card: {
          DEFAULT: "#ffffff",
          foreground: "#1f2937",
        },
      },
    },
  },
  plugins: [],
};
export default config;
