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
        p1: "#4f8ef7",
        p2: "#e85c5c",
        p3: "#4cbe8a",
        p4: "#f0a030",
      },
      keyframes: {
        "cell-explode": {
          "0%":   { transform: "scale(1)",    backgroundColor: "transparent" },
          "35%":  { transform: "scale(1.25)", backgroundColor: "rgba(255,220,50,0.55)" },
          "100%": { transform: "scale(1)",    backgroundColor: "transparent" },
        },
        "orb-pop": {
          "0%":   { transform: "scale(0)",   opacity: "0" },
          "60%":  { transform: "scale(1.35)", opacity: "1" },
          "100%": { transform: "scale(1)",   opacity: "1" },
        },
        "pulse-ring": {
          "0%, 100%": { boxShadow: "0 0 0 0px rgba(255,220,50,0)" },
          "50%":      { boxShadow: "0 0 0 3px rgba(255,220,50,0.5)" },
        },
        "fade-in": {
          "0%":   { opacity: "0", transform: "scale(0.92)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-up": {
          "0%":   { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "cell-explode": "cell-explode 420ms ease-out",
        "orb-pop":      "orb-pop 200ms ease-out",
        "pulse-ring":   "pulse-ring 1.4s ease-in-out infinite",
        "fade-in":      "fade-in 300ms ease-out",
        "slide-up":     "slide-up 350ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
