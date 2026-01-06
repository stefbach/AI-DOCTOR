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
            // Allow iframe from TIBOK domains and all Vercel preview deployments
            value: "frame-ancestors 'self' https://tibok.mu https://www.tibok.mu https://staging.tibok.mu https://*.vercel.app http://localhost:* https://localhost:*"
          },
          // Note: X-Frame-Options ALLOW-FROM is deprecated. CSP frame-ancestors is the modern standard.
          // Removing X-Frame-Options to avoid conflicts with CSP frame-ancestors directive.
          {
            key: 'Access-Control-Allow-Origin',
            // Allow CORS from all origins for iframe embedding
            value: '*'
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
