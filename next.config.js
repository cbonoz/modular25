/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
    },
    // Remove custom distDir for Vercel compatibility
    // distDir: 'build',
}

module.exports = nextConfig
