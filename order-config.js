// Public checkout endpoint only. The service-role key stays in Supabase Edge Function secrets.
// If this function or the checkout migration is not deployed yet, the page shows an error
// and does not pretend the order was saved.
window.EVIE_ORDER_API_URL = 'https://cmjhecwwjoeqpcownkol.supabase.co/functions/v1/evie-order-request';
