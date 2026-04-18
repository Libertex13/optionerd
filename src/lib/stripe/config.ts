/**
 * Stripe configuration — picks DEV or PROD env vars based on environment.
 *
 * On Vercel: NEXT_PUBLIC_VERCEL_ENV is "production", "preview", or "development".
 * Locally: falls back to NODE_ENV.
 */

const isProd =
  process.env.NEXT_PUBLIC_VERCEL_ENV === "production" ||
  (process.env.NODE_ENV === "production" &&
    !process.env.NEXT_PUBLIC_VERCEL_ENV);

/** Server-side only */
export const STRIPE_SECRET_KEY = isProd
  ? process.env.STRIPE_SECRET_KEY_PROD!
  : process.env.STRIPE_SECRET_KEY_DEV!;

/** Server-side only */
export const STRIPE_WEBHOOK_SECRET = isProd
  ? process.env.STRIPE_WEBHOOK_SECRET_PROD!
  : process.env.STRIPE_WEBHOOK_SECRET_DEV!;

/** Client-safe */
export const STRIPE_NERD_MONTHLY_LINK = isProd
  ? process.env.NEXT_PUBLIC_STRIPE_NERD_MONTHLY_LINK_PROD!
  : process.env.NEXT_PUBLIC_STRIPE_NERD_MONTHLY_LINK_DEV!;

/** Client-safe */
export const STRIPE_NERD_YEARLY_LINK = isProd
  ? process.env.NEXT_PUBLIC_STRIPE_NERD_YEARLY_LINK_PROD!
  : process.env.NEXT_PUBLIC_STRIPE_NERD_YEARLY_LINK_DEV!;

/** Client-safe */
export const STRIPE_CUSTOMER_PORTAL_LINK = isProd
  ? process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_LINK_PROD!
  : process.env.NEXT_PUBLIC_STRIPE_CUSTOMER_PORTAL_LINK_DEV!;
