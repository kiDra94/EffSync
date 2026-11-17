// decision Q9 (M9): the token arrives in the URL fragment and the user is
// loaded from GET /auth/profile
describe('OAuth Callback E2E', () => {
  const user = {
    userId: 20,
    id: 20,
    username: 'oauth.user@gmail.com',
    email: 'oauth.user@gmail.com',
    role: 'student',
    firstname: 'OAuth',
    lastname: 'User',
  };

  beforeEach(() => {
    cy.intercept('GET', '**/api/auth/profile', { statusCode: 200, body: user }).as('authProfile');

    cy.intercept('GET', '**/api/metrics/status-distribution', {
      statusCode: 200,
      body: { labels: ['Offen', 'In Bearbeitung', 'In Review', 'Abgeschlossen', 'In Wartestellung'], data: [0, 0, 0, 0, 0], total: 0 },
    }).as('metricsStatus');

    cy.intercept('GET', '**/api/metrics/task-progress', {
      statusCode: 200,
      body: {
        totalTasks: 0,
        completedTasks: 0,
        completionRate: 0,
        averageProgress: 0,
        overtasks: 0,
        percentageOverdue: 0,
      },
    }).as('metricsProgress');

    cy.intercept('GET', '**/api/metrics/tasks-by-status', {
      statusCode: 200,
      body: {
        TODO: [],
        IN_PROGRESS: [],
        IN_REVIEW: [],
        COMPLETED: [],
        ON_HOLD: [],
      },
    }).as('metricsTasksByStatus');
  });

  it('verarbeitet OAuth Callback und leitet auf Dashboard weiter', () => {
    cy.visit('/auth-callback#token=test.oauth.jwt');

    cy.wait('@authProfile');
    cy.url({ timeout: 10000 }).should('include', '/dashboard');
    cy.url().should('not.contain', 'test.oauth.jwt');

    cy.window().then((win) => {
      expect(win.localStorage.getItem('authToken')).to.eq('test.oauth.jwt');
      expect(win.localStorage.getItem('userId')).to.eq('20');
      expect(win.localStorage.getItem('userRole')).to.eq('student');
    });

    cy.contains('Willkommen zurück').should('be.visible');
  });

  it('leitet ohne Token auf Login um', () => {
    cy.visit('/auth-callback');
    cy.url({ timeout: 10000 }).should('include', '/login');
  });
});
