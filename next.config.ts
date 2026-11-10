import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  async redirects() {
    return [
      {
        source: "/blog-posts",
        destination: "/blogs",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
