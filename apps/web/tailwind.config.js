/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0A68FF",
        "primary-dark": "#003EA1",
        text: "#27272A",
        "text-muted": "#808089",
        "text-dark": "#38383D",
        bg: "#F5F5FA",
        card: "#FFFFFF",
        border: "#EBEBF0",
        "border-input": "#DDDDE3",
      },
      "spacing": {
        "gutter": "24px",
        "header-height": "64px",
        "sidebar-width": "280px",
        "stack-md": "16px",
        "container-padding": "32px",
        "card-gap": "20px",
        "stack-sm": "8px"
      },
      "fontFamily": {
        "sans": ["Inter", "sans-serif"],
        "headline-lg": ["Inter", "sans-serif"],
        "display-lg": ["Inter", "sans-serif"],
        "body-sm": ["Inter", "sans-serif"],
        "title-md": ["Inter", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "label-caps": ["Inter", "sans-serif"]
      },
      "fontSize": {
        "headline-lg": ["32px", { "lineHeight": "40px", "letterSpacing": "-0.01em", "fontWeight": "600" }],
        "display-lg": ["48px", { "lineHeight": "60px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
        "body-sm": ["14px", { "lineHeight": "20px", "fontWeight": "400" }],
        "title-md": ["18px", { "lineHeight": "28px", "fontWeight": "600" }],
        "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
        "label-caps": ["12px", { "lineHeight": "16px", "letterSpacing": "0.05em", "fontWeight": "600" }]
      }
    },
  },
  plugins: [],
}
