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
      {
        source: "/admin/add-project",
        destination: "/admin/projects",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
