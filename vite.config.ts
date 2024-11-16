import { defineConfig } from 'vite';

export default defineConfig({
  base: '/serpents2r/',
  build: {
    target: 'esnext' //browsers can handle the latest ES features
  }
})