/**
 * The router's navigation guard (moved from router/index.js in M29, so it
 * can be tested; T70, 08_…:39-43: route guards ≥ 75 %).
 *
 * 1. Without a token, a route that needs authentication goes to the login.
 * 2. With a token, the login and register pages go to the dashboard.
 * 3. With a token but no user (a reload), the user is loaded first; an
 *    invalid token goes to the login.
 * 4. A route with `meta.roles` needs one of them, else the dashboard.
 */
export async function authGuard(to, authStore) {
    const hasToken = authStore.isAuthenticated
    const routeRequiresAuth = to.matched.some((record) => record.meta.requiresAuth)

    if (!hasToken && routeRequiresAuth) {
        return { name: 'Login' }
    }

    if (hasToken && (to.name === 'Login' || to.name === 'Register')) {
        return { name: 'Dashboard' }
    }

    if (hasToken && !authStore.userDetails) {
        try {
            await authStore.loadUser()
        } catch (error) {
            console.error('Fehler beim Laden der Benutzerdaten:', error)
            return { name: 'Login' }
        }
    }

    if (hasToken && to.meta.roles && !to.meta.roles.includes(authStore.userRole)) {
        console.warn('Zugriff verweigert: Fehlende Rolle', authStore.userRole, 'benötigt:', to.meta.roles)
        return { name: 'Dashboard' }
    }

    return true
}
