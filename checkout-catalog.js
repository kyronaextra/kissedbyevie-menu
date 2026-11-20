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
      {id: 'bg', name: 'B/G Folder (3 vids)', price: 35, storefrontName: 'B/G Folder (3 vids)', storefrontPrice: 35},
      {id: 'dickrate', name: 'Dick Rating', price: 35, storefrontName: 'Dick Rating', storefrontPrice: 35},
      {id: 'custom1', name: 'Custom 1-min Video', price: 50, storefrontName: 'Custom 1-min Video', storefrontPrice: 50},
      {id: 'vip1', name: 'VIP 1 Month', price: 150, storefrontName: 'VIP 1 Month', storefrontPrice: 150, exclusive: 'membership'},
      {id: 'vip3', name: 'VIP 3 Months', price: 350, storefrontName: 'VIP 3 Months', storefrontPrice: 350, exclusive: 'membership'}
    ],
    aliases: {
      '10 pics/vids': 'bundle10',
      '10 Items \u00b7 This Month\u2019s Set': 'bundle10',
      '10 random photos/videos': 'bundle10',
      '10 pics/videos': 'bundle10',
      '20 pics/vids': 'bundle20',
      '20 Pics + Videos': 'bundle20',
      '20 surprise photos/videos': 'bundle20',
      '20 pics/videos': 'bundle20',
      '50 pics/vids': 'bundle50',
      '50 Items + Live Teasy Snaps': 'bundle50',
      '50 surprise photos/videos': 'bundle50',
      '50 pics/videos': 'bundle50',
      'Deluxe Dropbox (900+ vault)': 'deluxe',
      'The Dropbox \u00b7 800+ Pieces': 'deluxe',
      'Deluxe Dropbox (800+ items)': 'deluxe',
      'Deluxe Dropbox / Full Vault': 'deluxe',
      'Deluxe Dropbox Today Promo': 'deluxe55',
      'B/G Folder (3 vids)': 'bg',
      'B/G Dropbox': 'bg',
      'Dick Rating': 'dickrate',
      'Dick rating': 'dickrate',
      'Dick Rate \u00b7 Video': 'dickrate',
      'Custom 1-min Video': 'custom1',
      'Custom 1-minute video': 'custom1',
      'VIP 1 Month': 'vip1',
      'VIP \u00b7 1 Month GFE': 'vip1',
      'VIP 3 Months': 'vip3',
      'VIP \u00b7 3 Months GFE': 'vip3'
    },
    // Bag lines that are real menu buttons but not rows on this payment page.
    extras: [
      {name: 'GFE', price: 70, exclusive: 'membership', single: true},
      {name: 'Custom Photo Set \u00b7 5 Photos', price: 45},
      {name: 'Custom Video \u00b7 3 Minutes', price: 60},
      {name: 'Same Day Turnaround', price: 15},
      {name: 'Live Clips \u00b7 Sent to Your Chat', price: 10},
      {name: 'Moan Your Name', price: 10},
      {name: 'JOI Add-On', price: 20},
      {name: 'Voice Note', price: 10},
      {name: 'Sexting \u00b7 10 Minutes', price: 30},
      {name: 'Sexting \u00b7 15 Minutes', price: 40},
      {name: 'Sexting \u00b7 30 Minutes', price: 75},
      {name: 'Live Snap Show \u00b7 2 Minutes', price: 35},
      {name: 'Live Snap Show \u00b7 4 Minutes', price: 60}
    ]
  };
})(typeof window !== 'undefined' ? window : globalThis);
