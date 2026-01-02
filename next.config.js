/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Variables d'environnement publiques
  env: {
    NEXT_PUBLIC_API_MODE: process.env.NEXT_PUBLIC_API_MODE || 'proxy',
    NEXT_PUBLIC_CLOUD_API_URL: process.env.NEXT_PUBLIC_CLOUD_API_URL || 'https://violent-karon-gestion3008-free-e7089456.koyeb.app/api',
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDLo9WiL2rZPgKY3l_1QsUxue4nuVX2o7s',
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'compta-3008.firebaseapp.com',
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'compta-3008',
  },
  // Proxy API vers le backend
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/api/:path*',
      },
    ];
  },
};

export default nextConfig;
