// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // backend/ co tsconfig + package.json rieng, kiem tra bang `cd backend && npm run typecheck`
    ignores: ['dist/*', 'backend/**'],
  },
]);
