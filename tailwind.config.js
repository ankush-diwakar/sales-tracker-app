/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Background colors
        'bg-dark': '#000000',
        'card-dark': '#16181C',

        // Text colors
        'text-main': '#FFFFFF',
        'text-muted': '#71767B',

        // Brand colors
        'primary': '#1D9BF0',
        'twitter-green': '#00BA7C',

        // Border colors
        'twitter-border': '#2F3336',
      },
    },
  },
  plugins: [],
}
