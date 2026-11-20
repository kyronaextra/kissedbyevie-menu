/**
 * Accept only an origin we control. Redirect URLs are built from this value,
 * never from the request Origin header.
 */
export function normalizePublicBaseUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    const error = new Error('PUBLIC_BASE_URL is not configured.');
    error.code = 'public_base_url';
    throw error;
  }
  let url;
  try {
    url = new URL(value.trim());
  } catch {
    const error = new Error('PUBLIC_BASE_URL is not a valid URL.');
    error.code = 'public_base_url';
    throw error;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    const error = new Error('PUBLIC_BASE_URL must be http or https.');
    error.code = 'public_base_url';
    throw error;
  }
  if (url.username || url.password) {
    const error = new Error('PUBLIC_BASE_URL must not include credentials.');
    error.code = 'public_base_url';
    throw error;
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    const error = new Error('PUBLIC_BASE_URL must be an origin with no path, query, or hash.');
    error.code = 'public_base_url';
    throw error;
  }
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  if (url.protocol === 'http:' && !local) {
    const error = new Error('PUBLIC_BASE_URL must use https, except for localhost.');
    error.code = 'public_base_url';
    throw error;
  }
  return url.origin;
}
