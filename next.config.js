/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/the-feed",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
