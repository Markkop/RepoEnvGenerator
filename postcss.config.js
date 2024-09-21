module.exports = {
  plugins: ['tailwindcss', 'autoprefixer'],
  // This is just a sample field to have the env key detected
  extra: {
    env: {
      OPENAI_APIKEY: process.env.OPENAI_APIKEY
    }
  }
}
