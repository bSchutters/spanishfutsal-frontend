import coreWebVitals from 'eslint-config-next/core-web-vitals'
import typescript from 'eslint-config-next/typescript'

// Next 16 removed `next lint`; we run `eslint .` directly, so the build output and
// deps must be ignored explicitly (next lint used to do this automatically).
const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'build/**', 'next-env.d.ts'],
  },
  ...coreWebVitals,
  ...typescript,
]

export default eslintConfig
