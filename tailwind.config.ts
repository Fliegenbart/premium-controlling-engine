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
        'apple-sm': '0 1px 3px rgba(0, 0, 0, 0.04), 0 4px 12px rgba(0, 0, 0, 0.03)',
        'apple-md': '0 1px 3px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.05)',
        'apple-lg': '0 2px 6px rgba(0, 0, 0, 0.06), 0 16px 40px rgba(0, 0, 0, 0.07)',
        'apple-xl': '0 4px 12px rgba(0, 0, 0, 0.06), 0 24px 64px rgba(0, 0, 0, 0.08)',
        'glow-sm': 'inset 0 0.5px 0 rgba(255, 255, 255, 0.04)',
        'glow-md': 'inset 0 0.5px 0 rgba(255, 255, 255, 0.04), 0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.05)',
        'glow-lg': 'inset 0 0.5px 0 rgba(255, 255, 255, 0.05), 0 2px 4px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.06)',
        'glow-blue': '0 0 16px rgba(0, 122, 255, 0.10), 0 0 32px rgba(0, 122, 255, 0.04)',
        'glow-cyan': '0 0 16px rgba(6, 182, 212, 0.10), 0 0 32px rgba(6, 182, 212, 0.04)',
      },
      animation: {
        "gradient": "gradient 8s linear infinite",
        "shimmer-slide": "shimmer-slide var(--speed) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed) * 2) infinite linear",
        "border-beam": "border-beam calc(var(--duration)*1s) infinite linear",
        "image-glow": "image-glow 4100ms 600ms ease-out forwards",
        "fade-in": "fade-in 800ms var(--animation-delay, 0ms) ease forwards",
        "fade-up": "fade-up 800ms var(--animation-delay, 0ms) ease forwards",
        "shimmer": "shimmer 8s infinite",
        "marquee": "marquee var(--duration) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration) linear infinite",
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
            transform: "translateY(-8px)",
          },
          to: {
            opacity: "1",
            transform: "none",
          },
        },
        "fade-up": {
          from: {
            opacity: "0",
            transform: "translateY(16px)",
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
      },
    },
  },
  plugins: [],
}
export default config
