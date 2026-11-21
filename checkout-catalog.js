// Payment-page catalog. Menu cards in menu-catalog.js stay the storefront display.
// Checkout charges the prices below. Where a menu price differs, the page says so.
// The Edge Function repeats these amounts and ignores prices sent by the browser.
(function (root) {
  'use strict';
  root.EVIE_CHECKOUT_CATALOG = {
    memo: 'for barfie\u2019s vet bill, cat food or care',
    venmoHandle: '@Barfiesfunds',
    venmoRecipient: 'Barfiesfunds',
    venmoWeb: 'https://venmo.com/Barfiesfunds',
    cashAppHandle: '$taylorgann90',
    cashAppSlug: 'taylorgann90',
    paypalUrl: 'https://www.paypal.com/qrcodes/p2pqrc/DTBWZFQXN6494',
    amazonUrl: 'https://www.amazon.com/dp/B07PCMWTSG',
    amazonEmail: 'elviramack7@gmail.com',
    amazonFeeCents: function (subtotalCents, method) {
      if (method !== 'amazon_egift') return 0;
      var cents = Math.round(Number(subtotalCents) || 0);
      if (cents > 0 && cents < 3500) return 1000;
      return 0;
    },
    xUser: 'kissedbyevie',
    xWeb: 'https://x.com/kissedbyevie?s=11',
    telegramUser: 'kissedbyevie',
    telegramWeb: 'https://t.me/kissedbyevie',
    telegramChannelUser: 'eviesquirts',
    telegramChannelWeb: 'https://t.me/eviesquirts',
    maxQty: 20,
    maxTip: 500,
    items: [
      {id: 'bundle10', name: '10 pics/vids', price: 10, storefrontName: '10 pics/vids', storefrontPrice: 10},
      {id: 'bundle20', name: '20 pics/vids', price: 20, storefrontName: '20 pics/vids', storefrontPrice: 20},
      {id: 'bundle50', name: '50 pics/vids', price: 50, storefrontName: '50 pics/vids', storefrontPrice: 50},
      {id: 'deluxe', name: 'Deluxe Dropbox (900+ vault)', price: 75, storefrontName: 'Deluxe Dropbox (900+ vault)', storefrontPrice: 75, exclusive: 'vault'},
      {id: 'deluxe55', name: 'Deluxe Dropbox Today Promo', price: 55, storefrontName: 'Deluxe Dropbox Today Promo', storefrontPrice: 55, exclusive: 'vault'},
      {id: 'bg', name: 'B/G Dropbox', price: 35, storefrontName: 'B/G Dropbox', storefrontPrice: 35},
      {id: 'picks', name: 'EVIE\u2019s Picks', price: 35, storefrontName: 'EVIE\u2019s Picks', storefrontPrice: 35},
      {id: 'dickrate', name: 'Video Dick Rate', price: 35, storefrontName: 'Video Dick Rate', storefrontPrice: 35},
      {id: 'custom1', name: 'Custom 1-min Video', price: 85, storefrontName: 'Custom 1-min Video', storefrontPrice: 85},
      {id: 'vip1', name: 'VIP 1 Month', price: 150, storefrontName: 'VIP 1 Month', storefrontPrice: 150, exclusive: 'membership'},
      {id: 'vip3', name: 'VIP 3 Months', price: 300, storefrontName: 'VIP 3 Months', storefrontPrice: 300, exclusive: 'membership'}
    ],
    aliases: {
      '10 pics/vids': 'bundle10',
      '20 pics/vids': 'bundle20',
      '50 pics/vids': 'bundle50',
      'Deluxe Dropbox (900+ vault)': 'deluxe',
      'Deluxe Dropbox Today Promo': 'deluxe55',
      'B/G Dropbox': 'bg',
      'EVIE\u2019s Picks': 'picks',
      'Video Dick Rate': 'dickrate',
      'Custom 1-min Video': 'custom1',
      'VIP 1 Month': 'vip1',
      'VIP 3 Months': 'vip3'
    },
    extras: [
      {name: '1 Month GFE', price: 70, exclusive: 'membership', single: true},
      {name: 'FaceTimes', price: 55},
      {name: 'Sexting \u00b7 10 Minutes', price: 55}
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
