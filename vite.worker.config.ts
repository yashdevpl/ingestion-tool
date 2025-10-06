import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  resolve: {
    conditions: ['node'],
    mainFields: ['module', 'jsnext:main', 'jsnext'],
  },
  build: {
    rollupOptions: {
      external: [
        // Only externalize Node.js built-in modules and electron-related modules
        'electron',
        'electron-store',
        'fs',
        'path',
        'os',
        'crypto',
        'stream',
        'util',
        'url',
        'buffer',
        'querystring',
        'events',
        'http',
        'https',
        'net',
        'tls',
        'child_process',
        'worker_threads',
        'cluster',
        'zlib',
        'dns',
        'dgram',
        'readline',
        'repl',
        'tty',
        'vm',
        'v8',
        'perf_hooks'
        // Bundle npm dependencies like workerpool, axios, etc.
      ],
    },
  },
});