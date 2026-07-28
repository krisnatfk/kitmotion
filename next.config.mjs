/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Keep production, Webpack dev, and Turbopack dev artifacts isolated. Their
  // manifests and runtime chunks are not interchangeable and must never share
  // an output directory.
  distDir:
    process.env.NODE_ENV === "development"
      ? process.env.TURBOPACK
        ? ".next-dev-turbo"
        : ".next-dev-webpack"
      : ".next",
  // MediaPipe model + WASM are loaded at runtime from CDN only inside /workout routes.
  // No camera frame ever leaves the browser; nothing to configure server-side.
  experimental: {
    optimizePackageImports: ["@mediapipe/tasks-vision"],
  },
};

export default nextConfig;
