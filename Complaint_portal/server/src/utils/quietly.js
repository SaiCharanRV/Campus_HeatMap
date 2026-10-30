/** Runs a side-effect promise (e.g. an email) without letting its failure break the request. */
export const quietly = (promise) =>
  Promise.resolve(promise).catch((err) => console.error('[background] failed:', err.message));
