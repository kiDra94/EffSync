/**
 * Reads `token`, `refreshToken` and `challenge` from the URL fragment
 * (`#token=…&refreshToken=…`, decision Q9, M12) and removes the fragment
 * through the router. Going through vue-router matters: a plain
 * history.replaceState keeps the token in the router's own history state,
 * and the next push writes it back into the browser history.
 * Waits for the replace, so a following push can't cancel it.
 */
export async function takeTokensFromHash(route, router) {
  const params = new URLSearchParams((route.hash || '').replace(/^#/, ''))
  if (route.hash) {
    await router.replace({ path: route.path, query: route.query, hash: '' })
  }
  return {
    token: params.get('token'),
    refreshToken: params.get('refreshToken'),
    // M32: a 2FA user's Google sign-in sends a challenge instead of tokens
    challenge: params.get('challenge'),
  }
}

/** Only the access token, e.g. for the Google reset-password callback. */
export async function takeTokenFromHash(route, router) {
  return (await takeTokensFromHash(route, router)).token
}
