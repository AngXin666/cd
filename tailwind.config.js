/* eslint-disable */
const colors = require('tailwindcss/colors')
const {iconsPlugin, getIconCollections} = require('@egoist/tailwindcss-icons')

delete colors.lightBlue
delete colors.warmGray
delete colors.trueGray
delete colors.coolGray
delete colors.blueGray

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./public/index.html', './src/**/*.{html,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ...colors,
        // 语义化颜色定义
        primary: {
          DEFAULT: colors.blue[600],
          foreground: colors.white,
          glow: colors.blue[400]
        },
        secondary: {
          DEFAULT: colors.orange[500],
          foreground: colors.white
        },
        success: {
          DEFAULT: colors.green[500],
          foreground: colors.white
        },
        warning: {
          DEFAULT: colors.orange[500],
          foreground: colors.white
        },
        destructive: {
          DEFAULT: colors.red[500],
          foreground: colors.white
        },
        muted: {
          DEFAULT: colors.gray[100],
          foreground: colors.gray[600]
        },
        accent: {
          DEFAULT: colors.blue[100],
          foreground: colors.blue[900]
        },
        card: {
          DEFAULT: colors.white,
          foreground: colors.gray[900]
        },
        background: colors.gray[50],
        foreground: colors.gray[900],
        border: colors.gray[200],
        input: colors.gray[100]
      }
    }
  },
  plugins: [
    iconsPlugin({
      collections: getIconCollections(['mdi', 'lucide'])
    }),
    function ({ addUtilities }) {
      addUtilities(
        {
          '.border-t-solid': { 'border-top-style': 'solid' },
          '.border-r-solid': { 'border-right-style': 'solid' },
          '.border-b-solid': { 'border-bottom-style': 'solid' },
          '.border-l-solid': { 'border-left-style': 'solid' },
          '.border-t-dashed': { 'border-top-style': 'dashed' },
          '.border-r-dashed': { 'border-right-style': 'dashed' },
          '.border-b-dashed': { 'border-bottom-style': 'dashed' },
          '.border-l-dashed': { 'border-left-style': 'dashed' },
          '.border-t-dotted': { 'border-top-style': 'dotted' },
          '.border-r-dotted': { 'border-right-style': 'dotted' },
          '.border-b-dotted': { 'border-bottom-style': 'dotted' },
          '.border-l-dotted': { 'border-left-style': 'dotted' },
        },
        ['responsive']
      );
    }
  ]
}
