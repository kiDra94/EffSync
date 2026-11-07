/**
 * Reads `token` from the URL fragment (`#token=…`, decision Q9) and removes the
 * fragment through the router. Going through vue-router matters: a plain
 * history.replaceState keeps the token in the router's own history state,
 * and the next push writes it back into the browser history.
 * Waits for the replace, so a following push can't cancel it.
 */
export async function takeTokenFromHash(route, router) {
  const token = new URLSearchParams((route.hash || '').replace(/^#/, '')).get('token')
  if (route.hash) {
    await router.replace({ path: route.path, query: route.query, hash: '' })
  }
  return token
}
