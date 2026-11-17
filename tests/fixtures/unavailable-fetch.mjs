// Loaded only by the isolated collection-failure subprocess test.
globalThis.fetch = async () => new Response('<noscript>Please enable JavaScript</noscript>', {
  status: 200,
  headers: { 'content-type': 'text/html' },
});
