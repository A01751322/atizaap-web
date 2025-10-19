/* eslint-env browser */
window.tailwind = window.tailwind || {};
window.tailwind.config = {
  theme: {
    extend: {
      colors: {
        bjviolet: {
          50: "#f6f4fb",
          100: "#ede9f6",
          200: "#ddd3ee",
          300: "#c0aee0",
          400: "#9e80cf",
          500: "#7f58c1",
          600: "#6a43ad",
          700: "#5a3791",
          800: "#4a2e76",
          900: "#3b265f",
        },
        bjblue: "#79a8c7",
        bjrose: "#e69aa6",
      },
      fontFamily: {
        sans: ["Poppins", "Inter", "Nunito", "ui-sans-serif", "system-ui"],
      },
      backgroundImage: {
        paper:
          "url('https://images.unsplash.com/photo-1544989164-31dc3c645987?q=80&w=1200&auto=format&fit=crop')",
      },
    },
  },
};