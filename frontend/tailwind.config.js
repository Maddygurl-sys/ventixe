/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#D946EF", // Ventixe Fuchsia/Magenta
        secondary: "#6B7280", // Slate grey
        surface: "#F8F7FC", // Very light lavender/grey background
        outline: "#F3E8FF", // Light violet outline
        background: "#FFFFFF",
        accent: "#8B5CF6", // Purple/indigo accent
        card: {
          green: "#ECFDF5",
          greenText: "#059669",
          pink: "#FDF2F8",
          pinkText: "#DB2777",
          purple: "#F5F3FF",
          purpleText: "#7C3AED",
          blue: "#EFF6FF",
          blueText: "#2563EB"
        }
      },
      spacing: {
        "unit-lg": "32px",
        "unit-xl": "64px",
        "margin-mobile": "20px",
        "container-max": "1440px"
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
