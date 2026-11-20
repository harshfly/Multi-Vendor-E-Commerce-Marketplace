/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Neutral scale
        ink: "#0F172A",   // slate-900
        muted: "#64748B",   // slate-500
        subtle: "#94A3B8",   // slate-400
        paper: "#F8FAFC",   // slate-50
        surface: "#FFFFFF",
        line: "#E2E8F0",   // slate-200
        lineHover: "#CBD5E1", // slate-300

        // Brand — deep teal-green (premium artisan feel)
        brand: {
          DEFAULT: "#0D7377",
          hover: "#0A5D61",
          light: "#E0F4F4",
          subtle: "#F0FAFA",
          ink: "#064446",
        },

        // Accent — saffron (Indian market warmth)
        amber: {
          DEFAULT: "#D97706",
          light: "#FEF3C7",
          subtle: "#FFFBEB",
        },

        // Semantic
        danger: {
          DEFAULT: "#DC2626",
          light: "#FEE2E2",
          subtle: "#FFF5F5",
        },
        success: {
          DEFAULT: "#059669",
          light: "#D1FAE5",
        },
        warning: {
          DEFAULT: "#D97706",
          light:   "#FEF3C7",
        },
      },
      scale: {
        '106': '1.06',
      },
      fontFamily: {
        heading: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      fontSize: {
        "2xs": ["0.625rem", { lineHeight: "0.875rem" }],
      },
      borderRadius: {
        input: "8px",
        card: "12px",
        xl2: "16px",
        "3xl": "24px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)",
        "card-hover": "0 4px 16px rgba(15,23,42,0.10), 0 2px 4px rgba(15,23,42,0.06)",
        nav: "0 1px 0 rgba(15,23,42,0.08)",
        btn: "0 1px 2px rgba(15,23,42,0.08)",
        modal: "0 20px 60px rgba(15,23,42,0.18), 0 8px 24px rgba(15,23,42,0.10)",
      },
      animation: {
        "fade-up": "fadeUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in-right": "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        "shimmer": "shimmer 1.6s infinite linear",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        slideInRight: {
          from: { opacity: "0", transform: "translateX(100%)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-700px 0" },
          "100%": { backgroundPosition: "700px 0" },
        },
      },
    },
  },
  plugins: [],
};
