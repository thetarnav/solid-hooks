import { defineConfig } from "tsup"
import { solidPlugin } from "esbuild-plugin-solid"
// @ts-ignore
import civetPlugin from "@danielx/civet/esbuild-plugin"

export default defineConfig(config => ({
  watch: config.watch,
  clean: true,
  treeshake: config.watch ? false : true,
  dts: "src/index.ts",
  target: "esnext",
  format: config.watch ? "esm" : ["cjs", "esm"],
  entry: ["src/index.civet"],
  esbuildPlugins: [civetPlugin, solidPlugin()],
}))
