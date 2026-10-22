// @ts-check
import { defineConfig, envField } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  // Project Pages site. A custom domain later changes only these two values.
  site: 'https://sahandilshan.github.io',
  base: '/agent-identity-patterns',
  trailingSlash: 'always',
  integrations: [mdx()],
  env: {
    schema: {
      // LAUNCH=true turns on the launch gate: no Unverified status, draft page,
      // placeholder section, synthetic trace or scene without a recorded trace.
      LAUNCH: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
  },
});
