/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MediaPipe model + WASM are loaded at runtime from CDN only inside /workout routes.
  // No camera frame ever leaves the browser; nothing to configure server-side.
  experimental: {
    optimizePackageImports: ["@mediapipe/tasks-vision"],
  },
};

export default nextConfig;
