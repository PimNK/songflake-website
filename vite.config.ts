import { defineConfig } from 'vitest/config';

// Relative base: the site uses hash routing, so it works from any sub-path
// (e.g. GitHub Pages at /<repo>/) without knowing the repository name.
export default defineConfig({
  base: './',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: true,
  },
});
