/**
 * Shared Paraglide compiler configuration for the web project.
 * Used by both the Vite plugin and the package-script compiler.
 */
import type { CompilerOptions } from '@inlang/paraglide-js'

export const paraglideOptions = {
  project: './project.inlang',
  outdir: './src/paraglide',
  // A localized public URL always identifies one language, which keeps SSR,
  // shared links, and CDN cache keys deterministic.
  strategy: ['url', 'cookie', 'preferredLanguage', 'baseLocale'],
  urlPatterns: [
    {
      pattern: ':protocol://:domain(.*)::port?/:path(.*)?',
      localized: [
        ['zh-CN', ':protocol://:domain(.*)::port?/zh-CN/:path(.*)?'],
        ['en', ':protocol://:domain(.*)::port?/en/:path(.*)?'],
      ],
    },
  ],
} satisfies CompilerOptions
