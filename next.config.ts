import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // dd-trace ships native modules (profiling, APM security) that only work
  // loaded via plain Node `require`, not bundled — keep it (and its
  // sub-packages) external so Next doesn't try to pack it into the build.
  serverExternalPackages: ["dd-trace"],
};

export default nextConfig;
