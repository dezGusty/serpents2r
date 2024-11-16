// import { Application } from "pixi.js";

import { Application } from "pixi.js";
import { SerpentsApp } from "./app";

export const app = new Application();


const sapp = new SerpentsApp(app);
// Ideally, we should simply call `await sapp.initialize();` here, but it seems there are some issues
// with Vite's support of top-level await.

(async () => {
  await sapp.initialize();
})();