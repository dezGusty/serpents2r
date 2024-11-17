import { defineConfig, loadEnv } from 'vite';

export default ({ mode }) => {
  // Load app-level env vars to node-level env vars.
  process.env = { ...process.env, ...loadEnv(mode, process.cwd()) };
  return defineConfig({
    base: process.env.VITE_BASE,
    build: {
      target: 'esnext' //browsers can handle the latest ES features
    }
  });

}