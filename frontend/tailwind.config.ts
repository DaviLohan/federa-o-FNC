import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base Imperium (Black/Carbon)
        bg: "rgb(var(--bg) / <alpha-value>)",
        surface1: "rgb(var(--surface1) / <alpha-value>)",
        surface2: "rgb(var(--surface2) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        text: "rgb(var(--text) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        
        // Gold (Imperium Brand)
        gold: "rgb(var(--gold) / <alpha-value>)",
        gold2: 'var(--gold2)',
        gold3: 'var(--gold3)',
        
        // Mapped colors (neon → Imperium for compatibility)
        cyan: "rgb(var(--cyan) / <alpha-value>)",     // Mapped to gold
        cyan2: "rgb(var(--cyan2) / <alpha-value>)",   // Mapped to gold3
        teal: "rgb(var(--teal) / <alpha-value>)",     // Mapped to gold
        teal2: "rgb(var(--teal2) / <alpha-value>)",   // Mapped to gold3
        lime: "rgb(var(--lime) / <alpha-value>)",     // Mapped to gold2
        lime2: "rgb(var(--lime2) / <alpha-value>)",   // Mapped to gold
        green: "rgb(var(--green) / <alpha-value>)",   // Mapped to success
        green2: "rgb(var(--green2) / <alpha-value>)", // Keep for success
        ice: "rgb(var(--ice) / <alpha-value>)",       // Mapped to white
        
        // Legacy colors (compatibility)
        bg0: 'var(--bg0)',
        bg1: 'var(--bg1)',
        panel: 'var(--panel)',
        panel2: 'var(--panel2)',
        stroke: 'var(--stroke)',
        muted2: 'var(--muted2)',
        brand: 'var(--brand)',      // Gold
        brand2: 'var(--brand2)',    // Gold2
        success: 'var(--success)',
        warning: 'var(--warning)',
        error: 'var(--error)',
        danger: 'var(--danger)',
        info: 'var(--info)',
        silver: 'var(--silver)',
        'accent-red': 'var(--accent-red)',
      },
      fontFamily: {
        heading: ["Space Grotesk", "Sora", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        floaty: { 
          "0%,100%": { transform: "translateY(0)" }, 
          "50%": { transform: "translateY(-6px)" } 
        },
        glow: { 
          "0%,100%": { opacity: "0.45" }, 
          "50%": { opacity: "0.9" } 
        },
        sweep: { 
          "0%": { backgroundPosition: "0% 50%" }, 
          "100%": { backgroundPosition: "100% 50%" } 
        },
        reveal: { 
          "0%": { opacity: "0", transform: "translateY(10px)" }, 
          "100%": { opacity: "1", transform: "translateY(0)" } 
        },
      },
      animation: {
        floaty: "floaty 4s ease-in-out infinite",
        glow: "glow 2.2s ease-in-out infinite",
        sweep: "sweep 2.5s ease-in-out infinite",
        reveal: "reveal 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
