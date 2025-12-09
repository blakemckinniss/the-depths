import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Faster dev experience - see full fetch URLs in console
  logging: {
    fetches: {
      fullUrl: true,
    },
  },

  // Partial Prerendering - faster initial loads
  cacheComponents: true,

  // Typed routes - better autocomplete for AI coding
  typedRoutes: true,

  experimental: {
    // Tree-shake these heavy packages (you have 20+ Radix imports)
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "date-fns",
      "@radix-ui/react-accordion",
      "@radix-ui/react-alert-dialog",
      "@radix-ui/react-dialog",
      "@radix-ui/react-dropdown-menu",
      "@radix-ui/react-popover",
      "@radix-ui/react-scroll-area",
      "@radix-ui/react-select",
      "@radix-ui/react-tabs",
      "@radix-ui/react-tooltip",
    ],
  },

  // No images to optimize in a text dungeon crawler
  images: {
    unoptimized: true,
  },

  // Games benefit from looser hydration (browser extensions, dev tools)
  reactStrictMode: false,

  // Faster HMR - don't type-check on every save (IDE does this)
  typescript: {
    ignoreBuildErrors: false,
  },

  // Better error overlay
  devIndicators: false,
};

export default nextConfig;
