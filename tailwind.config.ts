import type { Config } from "tailwindcss";

/**
 * Design tokens translated from design.md (Nike-style editorial system),
 * adapted for a fitness/CV application:
 *  - ink / canvas / soft-cloud carry ~95% of chrome surface
 *  - pill geometry (rounded.lg = 30px) for every CTA
 *  - flat elevation (no drop shadows)
 *  - Bebas Neue (display) + Inter (UI) as open-source font substitutes
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand & surface
        ink: "#111111",
        "sport-black": "#0a0b0a",
        "sport-charcoal": "#171916",
        "sport-lime": "#c8ff2e",
        "sport-lime-deep": "#9ed900",
        canvas: "#ffffff",
        "soft-cloud": "#f5f5f5",
        hairline: "#cacacb",
        "hairline-soft": "#e5e5e5",
        // Text
        charcoal: "#39393b",
        ash: "#4b4b4d",
        mute: "#707072",
        stone: "#9e9ea0",
        "on-primary": "#ffffff",
        // Semantic
        sale: "#d30005",
        "sale-deep": "#780700",
        success: "#007d48",
        "success-bright": "#1eaa52",
        info: "#1151ff",
        "info-deep": "#0034e3",
        danger: "#d30005",
        // Category accents (sparingly — chips / editorial moments only)
        "accent-pink": "#ed1aa0",
        "accent-teal": "#0a7281",
        "accent-purple-soft": "#beaffd",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Helvetica Neue", "Arial", "sans-serif"],
        display: ["var(--font-bebas)", "Impact", "sans-serif"],
      },
      fontSize: {
        "display-campaign": ["6rem", { lineHeight: "0.9", fontWeight: "500" }],
        "heading-xl": ["2rem", { lineHeight: "1.2", fontWeight: "500" }],
        "heading-lg": ["1.5rem", { lineHeight: "1.2", fontWeight: "500" }],
        "heading-md": ["1rem", { lineHeight: "1.75", fontWeight: "500" }],
        "body-md": ["1rem", { lineHeight: "1.5", fontWeight: "400" }],
        "body-strong": ["1rem", { lineHeight: "1.5", fontWeight: "500" }],
        "button-lg": ["1.5rem", { lineHeight: "1.2", fontWeight: "500" }],
        "button-md": ["1rem", { lineHeight: "1.5", fontWeight: "500" }],
        "button-sm": ["0.875rem", { lineHeight: "1.5", fontWeight: "500" }],
        "link-md": ["1rem", { lineHeight: "1.75", fontWeight: "500" }],
        "caption-md": ["0.875rem", { lineHeight: "1.5", fontWeight: "500" }],
        "caption-sm": ["0.75rem", { lineHeight: "1.5", fontWeight: "500" }],
        "utility-xs": ["0.5625rem", { lineHeight: "1.75", fontWeight: "500" }],
      },
      spacing: {
        xxs: "2px",
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "18px",
        xl: "24px",
        xxl: "30px",
        section: "48px",
        "section-lg": "80px",
      },
      borderRadius: {
        none: "0px",
        sm: "18px",
        md: "24px",
        lg: "30px",
        full: "9999px",
      },
      screens: {
        "mobile-landscape": "600px",
        "tablet-narrow": "640px",
        tablet: "1023px",
        "desktop-small": "1024px",
        desktop: "1200px",
        "desktop-large": "1440px",
        ultrawide: "1920px",
      },
    },
  },
  plugins: [],
};

export default config;
