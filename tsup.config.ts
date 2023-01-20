import { defineConfig } from 'tsup-preset-solid'

export default defineConfig(
  {
    entry: 'src/index.ts',
    serverEntry: 'src/server.ts',
    devEntry: true,
  },
  {
    // writePackageJson: true,
    dropConsole: true,
    cjs: true,
  },
)
