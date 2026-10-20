import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  // Colour classes built at runtime (`bg-${color}-50`) in GlobalSearch and booking field icons
  safelist: [
    {
      pattern: /^(bg|text)-(amber|blue|emerald|green|indigo|orange|purple|red|rose|slate|violet|yellow)-(50|500)$/,
      variants: ["group-hover"],
    },
  ],
  theme: {
    extend: {
      keyframes: {
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '14%': { transform: 'scale(1.2)', opacity: '0.8' },
          '28%': { transform: 'scale(1)', opacity: '1' },
          '42%': { transform: 'scale(1.2)', opacity: '0.8' },
          '70%': { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-down': {
          '0%': { opacity: '0', transform: 'translateY(-4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        heartbeat: 'heartbeat 1.5s ease-in-out infinite',
        shimmer: 'shimmer 1.5s infinite',
        'fade-in-up': 'fade-in-up 0.3s ease-out both',
        'slide-down': 'slide-down 0.2s ease-out both',
      },
      fontSize: {
        md: ['1rem', { lineHeight: '1.5rem' }],
      },
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
  plugins: [animate],
};
export default config;
