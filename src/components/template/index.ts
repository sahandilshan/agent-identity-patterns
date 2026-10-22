// The pattern page template, one component per section, in template order
// (src/schemas/patterns.ts, TEMPLATE_SECTIONS). The [slug] page passes these
// to <Content components={...} />, so MDX files use them without imports.
export { default as Failure } from './Failure.astro';
export { default as UseWhen } from './UseWhen.astro';
export { default as Flow } from './Flow.astro';
export { default as Token } from './Token.astro';
export { default as SeeItRun } from './SeeItRun.astro';
export { default as BuildIt } from './BuildIt.astro';
export { default as GetItWrong } from './GetItWrong.astro';
export { default as ForArchitects } from './ForArchitects.astro';
