module.exports = {
  content: ['./src/components/**/*.{ts,tsx,js,jsx}', './src/pages/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0FF0FC',
        secondary: '#C6CEC5',
        tertiary: '#0FF0FC',
        accent: '#0FF0FC',
        background: '#0f0f0f',
        surface: '#1f1f1f',
        error: '#FF8A59'
      },
      fontSize: {
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
        '2xs': ['0.6875rem', { lineHeight: '0.9375rem' }]
      }
    }
  },
  variants: {},
  plugins: []
}
