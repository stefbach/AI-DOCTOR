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

  // Without source maps a production stack trace reads "a.b is not a function"
  // with no file and no line — useless for diagnosing a crash in a doctor's
  // browser. Normally this trades readability against exposing the source, but
  // this repository is already public, so there is nothing to protect.
  productionBrowserSourceMaps: true,

  // So a black-box report says which build it came from. Vercel exposes the
  // SHA server-side only; NEXT_PUBLIC_ is what makes it readable in the
  // browser, where the crashes happen.
  env: {
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || 'local',
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
