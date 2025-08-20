module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  plugins: ['next-on-pages'],
  rules: {
    'next-on-pages/no-top-level-getrequestcontext': 'error'
  }
};
