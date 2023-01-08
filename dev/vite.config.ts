import unocss from 'unocss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
// import civetPlugin from "vite-plugin-civet"

export default defineConfig({
  server: {
    port: 3000,
  },
  plugins: [
    // civetPlugin({
    //   stripTypes: false,
    //   outputExtension: "tsx",
    //   outputTransformerPlugin: "solid",
    // }),
    solid(),
    unocss({
      shortcuts: {
        'center-child': 'flex justify-center items-center',
        caption: 'text-sm font-mono leading-tight',
        btn: 'bg-teal-600 border-1 border-teal-500 hover:bg-teal-500 rounded cursor-pointer center-child select-none text-white font-semibold p-4 py-3 m-2',
        'wrapper-h':
          'p-6 flex justify-center items-center space-x-4 space-y-0 bg-gray-700 rounded-2xl',
        'wrapper-v': 'wrapper-h flex-col space-x-0 space-y-4',
        node: 'p-4 bg-orange-600 rounded m-2',
        input: 'bg-gray-800 rounded border border-gray-600 px-3 py-2 text-white',
        ball: 'w-8 h-8 fixed -top-4 -left-4 opacity-50 rounded-full pointer-events-none',
      },
    }),
    {
      name: 'process.env variables',
      transform(code, id) {
        if (id.includes('node_modules')) {
          return code
        }
        return code
          .replace(/process\.env\.DEV/g, '"1"')
          .replace(/process\.env\.PROD/g, '""')
          .replace(/process\.env\.NODE_ENV/g, '"development"')
      },
    },
  ],
  build: {
    target: 'esnext',
  },
  define: {
    'process.env': {
      NODE_ENV: 'development',
      DEV: '1',
      PROD: '',
    },
  },
})
