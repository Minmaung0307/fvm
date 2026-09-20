export const config = {
  firebase: {
    apiKey: 'AIzaSyCzBnMGTRxQFY0-NtcW4jatiM5oupLhyo0',
    authDomain: 'fvm-26.firebaseapp.com',
    projectId: 'fvm-26',
    appId: '1:664171086120:web:4cefb5089f956d202c101d'
  },
  // Apps Script → Deploy → Manage deployments → Web app URL (/exec).
  apiUrl: 'https://script.google.com/macros/s/AKfycbx_bsOI7gf8vZ6GYVANbdoEgvSOj6GkGF_whD35ckHtxdEOcIJmLCTl0_sFbbywjVr_/exec',
  currency: 'USD',
  idleMinutes: 5,
  formIdleMinutes: 15,
  maxDocumentBytes: 3 * 1024 * 1024,
  supportPaymentLinks: [
    { label: 'Coffee Me', url: 'https://buy.stripe.com/5kQ28r5fCa9E8pj9VE1B601' },
    { label: 'Burger Me', url: 'https://buy.stripe.com/14AcN57nKgy2cFzd7Q1B606' },
    { label: 'Big Meal', url: 'https://buy.stripe.com/5kQ6oHdM85To0WR3xg1B607' }
  ]
};
