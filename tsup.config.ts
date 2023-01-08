import { defineConfig, Options } from 'tsup'

export default defineConfig(config => {
  const common: Options = {
    watch: !!config.watch,
    target: 'esnext',
    format: !!config.watch ? 'esm' : ['cjs', 'esm'],
  }

  const getEsbuildOption = (isDev: boolean): Options => ({
    treeshake: !config.watch,
    replaceNodeEnv: true,
    esbuildOptions(options) {
      options.define = {
        ...options.define,
        'process.env.NODE_ENV': isDev ? `"development"` : `"production"`,
        'process.env.PROD': isDev ? '""' : '"1"',
        'process.env.DEV': isDev ? '"1"' : '""',
      }
      return options
    },
  })

  return [
    {
      ...common,
      clean: true,
      dts: 'src/index.ts',
      entry: ['src/index.ts'],
      ...getEsbuildOption(false),
    },
    {
      ...common,
      entry: { dev: 'src/index.ts' },
      ...getEsbuildOption(true),
    },
    {
      ...common,
      entry: { server: 'src/server.ts' },
    },
  ]
})
