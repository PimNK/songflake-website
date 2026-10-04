// Every user-visible UI string lives here (English). Song titles and stories are the author's.
export const strings = {
  siteTitle: 'Regularnik',
  overlay: {
    errors: (n: number) => `${n} content error${n === 1 ? '' : 's'} — these songs are left out`,
    warnings: (n: number) => `${n} content warning${n === 1 ? '' : 's'}`,
    hint: 'Shown in development only. Fix the files and the page reloads.',
    close: 'Close',
  },
} as const;
