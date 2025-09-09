/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  extends: ['next/core-web-vitals'],
  ignorePatterns: [
    'node_modules/**',
    '.next/**',
    '.vercel/**',
    '.wrangler/**',
    '__backup__/**',
    '**/*.bak',
    'scripts/**',
  ],
  rules: {
    // Tenemos <img> sueltas en varias páginas
    '@next/next/no-img-element': 'off',
  },
};
