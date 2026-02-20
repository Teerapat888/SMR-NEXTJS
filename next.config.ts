import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow LAN access
  serverExternalPackages: ['mysql2', 'bcryptjs'],
}

export default nextConfig
