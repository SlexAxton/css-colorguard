import { defineConfig } from 'tsup';

export default defineConfig([
  {
    clean: true,
    entry: ['./lib/*.ts'],
    format: ['cjs', 'esm'],
    minify: true,
    dts: true,
    esbuildOptions(options, context) {
      options.platform = 'node';
    },
  },
]);
