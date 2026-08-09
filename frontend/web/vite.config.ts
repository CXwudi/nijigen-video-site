import { defineConfig } from 'vite'
import { paraglideVitePlugin } from '@inlang/paraglide-js'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import viteReact from '@vitejs/plugin-react'
import { nitro } from 'nitro/vite'

import { paraglideOptions } from './paraglide.config.ts'

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    paraglideVitePlugin(paraglideOptions),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    // Keep components.json "rsc" consistent with TanStack Start's RSC setting.
    tanstackStart(),
    viteReact(),
  ],
})

export default config
