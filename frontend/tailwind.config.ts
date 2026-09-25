import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        surface: "var(--surface)",
        "surface-secondary": "var(--surface-secondary)",
        canvas: "var(--surface)",
        card: "var(--background)",
        border: "var(--border)",
        navy: "var(--navy)",
        primary: {
          DEFAULT: "var(--text-primary)",
          text: "var(--text-primary)",
        },
        secondary: {
          DEFAULT: "var(--text-secondary)",
          text: "var(--text-secondary)",
        },
        muted: "var(--text-muted)",
        accent: {
          DEFAULT: "var(--accent-orange)",
          hover: "var(--accent-orange-dark)",
          light: "#FFF7ED",
          border: "#FDBA74",
        },
        orange: {
          DEFAULT: "var(--accent-orange)",
          hover: "var(--accent-orange-dark)",
          light: "#FFF7ED",
          border: "#FDBA74",
        },
        success: "var(--success)",
        danger: "var(--danger)",
        positive: {
          DEFAULT: "var(--success)",
          light: "#F0FDF4",
          border: "#BBF7D0",
        },
        negative: {
          DEFAULT: "var(--danger)",
          light: "#FEF2F2",
          border: "#FECACA",
        },
        slate: {
          25: "#FCFCFD",
          50: "#F9FAFB",
          100: "#F3F4F6",
          200: "#E5E7EB",
          300: "#D1D5DB",
          400: "#9CA3AF",
          500: "#6B7280",
          600: "#4B5563",
          700: "#374151",
          800: "#1F2937",
          900: "#111827",
          950: "#030712",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        financial: ["var(--font-financial)", "Plus Jakarta Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "14px",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        sm: "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.04)",
        card: "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        cardHover: "0 2px 4px -1px rgba(0, 0, 0, 0.04)",
        dropdown: "0 4px 12px -2px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
