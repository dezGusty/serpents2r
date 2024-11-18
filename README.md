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

## Building for gh-pages

## Building and deploying for firebase

Ideally, there should be some configuring that allows passing a single different argument, but the solution for that failed to materialize after spending the allocated time to identify it.
Yes, I tried passing the mode argument to vite, different config files, but nothing worked

```sh
npm run build -- -c ./vite.config.firebase.ts
npm run build -- --mode firebase --base .
```

Therefore, the current solution is the following:

When building for the github release (which will be the default, as it's built by the CI pipeline), replace the contents of the `.env` file with those of `.env.gh.local`.
When building for the firebase release, replace the contents of the `.env` file with those of `env.firebase.local`

The `.env` file is used as input in `vite.config.ts`.

```sh
cp .env.firebase.local .env
npm run build
cp .env.gh.local .env
npm run preview
firebase deploy
```
