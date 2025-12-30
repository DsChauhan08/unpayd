import { NhostClient } from '@nhost/nextjs';

// Use placeholder values for build time, actual values will be used at runtime
const subdomain = process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || 'placeholder';
const region = process.env.NEXT_PUBLIC_NHOST_REGION || 'placeholder';

export const nhost = new NhostClient({
    subdomain,
    region,
});
