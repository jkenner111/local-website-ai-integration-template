import type { MDXComponents } from "mdx/types";

// Default MDX component overrides. Page templates will extend this
// when we build them in the next phase.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...components };
}
