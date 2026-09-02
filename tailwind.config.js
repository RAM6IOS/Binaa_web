/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
	],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground, var(--success)))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground, var(--warning)))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground, var(--info)))",
        },
        present: {
          DEFAULT: "hsl(var(--present))",
          foreground: "hsl(var(--present-foreground, var(--present)))",
        },
        shift: {
          DEFAULT: "hsl(var(--shift))",
          foreground: "hsl(var(--shift-foreground, var(--shift)))",
        },
        absent: {
          DEFAULT: "hsl(var(--absent))",
          foreground: "hsl(var(--absent-foreground, var(--absent)))",
        },
        "type-road": {
          DEFAULT: "hsl(var(--type-road))",
          foreground: "hsl(var(--type-road-foreground, var(--type-road)))",
        },
        "type-bridge": {
          DEFAULT: "hsl(var(--type-bridge))",
          foreground: "hsl(var(--type-bridge-foreground, var(--type-bridge)))",
        },
        "type-housing": {
          DEFAULT: "hsl(var(--type-housing))",
          foreground: "hsl(var(--type-housing-foreground, var(--type-housing)))",
        },
        "type-school": {
          DEFAULT: "hsl(var(--type-school))",
          foreground: "hsl(var(--type-school-foreground, var(--type-school)))",
        },
        "type-hospital": {
          DEFAULT: "hsl(var(--type-hospital))",
          foreground: "hsl(var(--type-hospital-foreground, var(--type-hospital)))",
        },
        "type-infrastructure": {
          DEFAULT: "hsl(var(--type-infrastructure))",
          foreground: "hsl(var(--type-infrastructure-foreground, var(--type-infrastructure)))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        inverse: {
          DEFAULT: "hsl(var(--inverse))",
          foreground: "hsl(var(--inverse-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in-up": {
          from: { opacity: 0, transform: "translateY(20px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in-right": {
          from: { opacity: 0, transform: "translateX(50px)" },
          to: { opacity: 1, transform: "translateX(0)" },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "scale-in": {
          from: { opacity: 0, transform: "scale(0.95)" },
          to: { opacity: 1, transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out both",
        "fade-in-right": "fade-in-right 0.8s ease-out 0.2s both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.5s ease-out 0.1s both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
