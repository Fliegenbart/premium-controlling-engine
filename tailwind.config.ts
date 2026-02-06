import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        premium: {
          bg: 'rgb(var(--bg-primary))',
          elevated: 'rgb(var(--bg-elevated))',
          surface: 'rgb(var(--bg-surface))',
        },
      },
      boxShadow: {
        'glow-sm': 'inset 0 1px 0 rgba(255, 255, 255, 0.03)',
        'glow-md': 'inset 0 1px 0 rgba(255, 255, 255, 0.03), 0 1px 3px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
        'glow-lg': 'inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 2px 4px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.12)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15), 0 0 40px rgba(59, 130, 246, 0.05)',
        'glow-cyan': '0 0 20px rgba(6, 182, 212, 0.15), 0 0 40px rgba(6, 182, 212, 0.05)',
      },
      animation: {
        "gradient": "gradient 8s linear infinite",
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "meteor-effect": "meteor 5s linear infinite",
        "image-glow": "image-glow 4100ms 600ms ease-out forwards",
        "fade-in": "fade-in 1000ms var(--animation-delay, 0ms) ease forwards",
        "fade-up": "fade-up 1000ms var(--animation-delay, 0ms) ease forwards",
        "shimmer": "shimmer 8s infinite",
        "marquee": "marquee var(--duration) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
        "mesh-pulse": "mesh-pulse 8s ease-in-out infinite",
        "float-orb": "float-orb 20s ease-in-out infinite",
        "float-orb-2": "float-orb-2 25s ease-in-out infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
      },
      keyframes: {
        "gradient": {
          to: {
            backgroundPosition: "var(--bg-size) 0",
          },
        },
        "shimmer-slide": {
          to: {
            transform: "translate(calc(100cqw - 100%), 0)",
          },
        },
        "spin-around": {
          "0%": {
            transform: "translateZ(0) rotate(0)",
          },
          "15%, 35%": {
            transform: "translateZ(0) rotate(90deg)",
          },
          "65%, 85%": {
            transform: "translateZ(0) rotate(270deg)",
          },
          "100%": {
            transform: "translateZ(0) rotate(360deg)",
          },
        },
        "border-beam": {
          "100%": {
            "offset-distance": "100%",
          },
        },
        "meteor": {
          "0%": { transform: "rotate(215deg) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": {
            transform: "rotate(215deg) translateX(-500px)",
            opacity: "0",
          },
        },
        "image-glow": {
          "0%": {
            opacity: "0",
          },
          "10%": {
            opacity: "0.7",
          },
          "100%": {
            opacity: "0.4",
          },
        },
        "fade-in": {
          from: {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          to: {
            opacity: "1",
            transform: "none",
          },
        },
        "fade-up": {
          from: {
            opacity: "0",
            transform: "translateY(20px)",
          },
          to: {
            opacity: "1",
            transform: "none",
          },
        },
        "shimmer": {
          "0%, 90%, 100%": {
            "background-position": "calc(-100% - var(--shimmer-width)) 0",
          },
          "30%, 60%": {
            "background-position": "calc(100% + var(--shimmer-width)) 0",
          },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        "mesh-pulse": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
        "float-orb": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "25%": { transform: "translate(30px, -40px) scale(1.1)" },
          "50%": { transform: "translate(-20px, 20px) scale(0.95)" },
          "75%": { transform: "translate(40px, 10px) scale(1.05)" },
        },
        "float-orb-2": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)" },
          "33%": { transform: "translate(-40px, 30px) scale(1.08)" },
          "66%": { transform: "translate(20px, -30px) scale(0.92)" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.1), 0 0 40px rgba(99, 102, 241, 0.05)" },
          "50%": { boxShadow: "0 0 30px rgba(99, 102, 241, 0.2), 0 0 60px rgba(99, 102, 241, 0.1)" },
        },
      },
    },
  },
  plugins: [],
}
export default config
