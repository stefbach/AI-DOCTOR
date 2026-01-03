/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  
  // ============================================
  // TIBOK IFRAME INTEGRATION
  // ============================================
  // Configure headers to allow AI Doctor to be embedded in TIBOK iframe
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            // Allow iframe from TIBOK domains
            value: "frame-ancestors 'self' https://www.tibok.mu https://staging.tibok.mu https://v0-tibokmain2.vercel.app http://localhost:3000 http://localhost:3001"
          },
          {
            key: 'X-Frame-Options',
            // Allow TIBOK to embed AI Doctor in iframe
            value: 'ALLOW-FROM https://www.tibok.mu'
          },
          {
            key: 'Access-Control-Allow-Origin',
            // Allow CORS from TIBOK domains
            value: 'https://www.tibok.mu'
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS'
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization, X-Requested-With'
          }
        ]
      }
    ]
  }
}

export default nextConfig
