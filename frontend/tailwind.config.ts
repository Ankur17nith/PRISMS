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
        surface: {
          canvas: "#f7f7f6",
          charcoal: "#171717",
          subtle: "#f2f2f0",
          paper: "#ffffff",
          goldTint: "#fbf3de",
        },
        text: {
          primary: "#303030",
          secondary: "#666666",
          muted: "#a3a3a3",
          strongSecondary: "#525252",
          tertiary: "#737373",
        },
        border: {
          strong: "#e2e2df",
        },
        brand: {
          gold: "#daa32f",
        },
        action: {
          primary: "#16a34a",
        },
        feedback: {
          successSurface: "#edf8ef",
          successText: "#166534",
          warningSurface: "#fff7e6",
          warningText: "#8a570d",
          error: "#b42318",
          errorSurface: "#fff1ef",
        },
      },
      fontFamily: {
        sans: ["Arimo", "Inter", "system-ui", "sans-serif"],
        arimo: ["Arimo", "sans-serif"],
        inter: ["Inter", "sans-serif"],
        adamina: ["Adamina", "serif"],
        devanagari: ["Noto Sans Devanagari", "sans-serif"],
      },
      borderRadius: {
        "3": "3px",
        "4": "4px",
        "5": "5px",
        "7": "7px",
        "8": "8px",
      },
    },
  },
  plugins: [],
};

export default config;
