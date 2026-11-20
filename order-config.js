// Public checkout endpoint only. The service-role key stays in Supabase Edge Function secrets.
// If this function or the checkout migration is not deployed yet, the page shows an error
// and does not pretend the order was saved.
window.EVIE_ORDER_API_URL = 'https://cmjhecwwjoeqpcownkol.supabase.co/functions/v1/evie-order-request';

// Custom Stripe page (pay.html). Empty uses same-origin /api, which is correct
// when server/ also serves the site. On the Render static site, set this to the
// companion web service origin with no trailing slash:
// window.EVIE_PAY_API_BASE = 'https://kissedbyevie-pay.onrender.com';
window.EVIE_PAY_API_BASE = '';
