import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ["nqajokbclpujrryttxxm.supabase.co"], // Replace with actual Supabase domain later
  },
};

export default withNextIntl(nextConfig);

