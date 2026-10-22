declare namespace App {
  interface Locals {
    /** The pattern being rendered; set by src/pages/patterns/[slug].astro for the template components. */
    pattern?: import('astro:content').CollectionEntry<'patterns'>;
  }
}
