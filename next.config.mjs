import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

// The admin portal is a separate app on Railway. Its address stays www.fluxgo.in/admin-portal.
const adminOrigin = (process.env.ADMIN_PORTAL_ORIGIN || '').replace(/\/+$/, '');

const nextConfig = {
  outputFileTracingRoot: projectRoot,
  turbopack: {
    root: projectRoot
  },
  async rewrites() {
    if (!adminOrigin) return [];
    return ['/admin-portal', '/admin-portal-assets/:path*', '/admin/:path*', '/admin-sw.js'].map((source) => ({
      source,
      destination: `${adminOrigin}${source}`
    }));
  }
};

export default nextConfig;
