import type { NextConfig } from "next";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  // Standalone output for self-hosted Docker deploys. The runtime image
  // copies content/ and public/ explicitly — see deploy/Dockerfile.
  output: "standalone",
};

// Page bodies are rendered via next-mdx-remote at request/build time (see
// components/PageRenderer.tsx — remark plugins are wired there). This
// createMDX wrapper only enables direct `.mdx` imports as modules, which
// we do not currently use but leave in place for future flexibility.
// Note: Turbopack requires plugins to be serializable, so remark plugins
// cannot be added here as imported functions — if we ever need them at
// build time we'd pass them as string names via the MDX-loader rules.
const withMDX = createMDX({
  extension: /\.(md|mdx)$/,
});

export default withMDX(nextConfig);
