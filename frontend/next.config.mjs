/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // socket.io-client ships a Node.js WebSocket transport that imports `ws`.
      // Browsers don't have `ws` — they use the native WebSocket API.
      // Tell webpack to treat these Node-only modules as empty stubs in the
      // browser bundle, which is correct: socket.io-client detects the browser
      // and never actually calls the Node transport at runtime.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        ws: false,
        net: false,
        tls: false,
        bufferutil: false,
        "utf-8-validate": false,
      };
    }
    return config;
  },
};

export default nextConfig;
