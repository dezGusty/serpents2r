# serpents2r

Serpents 2 Remastered

for firebase hosting `vite.config.ts` should contain:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext' //browsers can handle the latest ES features
  }
})
```

for github pages hosting `vite.config.ts` should contain:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/serpents2r/',
  build: {
    target: 'esnext' //browsers can handle the latest ES features
  }
})
```
