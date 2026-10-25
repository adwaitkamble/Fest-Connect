/**
 * Environment & Demo Mode Helper
 *
 * Ensures one-click demo credentials and rapid role switchers are strictly
 * enabled in development and testing environments only, and completely disabled
 * in production builds to prevent unauthorized role switching or impersonation.
 */
export const isDemoMode: boolean = Boolean(
  import.meta.env.DEV ||
  import.meta.env.MODE === 'development' ||
  import.meta.env.MODE === 'test'
);
