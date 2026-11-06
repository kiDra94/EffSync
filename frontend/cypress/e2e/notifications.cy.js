// Helper: mock localStorage with test data
const setupTestData = () => {
  const testNotifications = [
    {
      id: 1,
      type: 'change',
      title: 'Aufgabe aktualisiert',
      message: 'Die Aufgabe "Test" wurde aktualisiert',
      read: false,
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      relatedId: 1,
      relatedType: 'task',
      actionUrl: '/tasks?taskId=1'
    },
    {
      id: 2,
      type: 'comment',
      title: 'Neuer Kommentar',
      message: 'Du hast einen neuen Kommentar erhalten',
      read: false,
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      relatedId: 2,
      relatedType: 'task',
      actionUrl: '/tasks?taskId=2'
    },
    {
      id: 3,
      type: 'urgency',
      title: 'Fällige Aufgabe',
      message: 'Aufgabe ist bald fällig',
      read: false,
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      relatedId: 3,
      relatedType: 'task'
    },
    {
      id: 4,
      type: 'info',
      title: 'Systembenachrichtigung',
      message: 'System wurde aktualisiert',
      read: true,
      timestamp: new Date(Date.now() - 172800000).toISOString()
    }
  ];
  
  return testNotifications;
};

// Helper: mock the auth session
const mockAuthSession = () => {
  cy.window().then((win) => {
    // Mock localStorage for auth
    win.localStorage.setItem('effsync_auth', JSON.stringify({
      accessToken: 'test-token-12345',
      userId: 1,
      username: 'testuser',
      userRole: 'Lehrer',
      userDetails: {
        username: 'testuser',
        firstname: 'Test',
        lastname: 'User',
        email: 'test@test.com'
      }
    }));
    
    // Notification Store Setup
    const notifications = setupTestData();
    win.localStorage.setItem('effsync_notifications', JSON.stringify(notifications));
  });
};

describe('Notifications Feature E2E Tests', () => {
  beforeEach(() => {
    // cy.visit with a fallback
    cy.visit('http://localhost:5173', {
      onBeforeLoad: () => {
        mockAuthSession();
      },
      onLoad: (win) => {
        // Make sure the auth store has the data
        win.localStorage.getItem('effsync_auth');
      }
    });
    
    // Wait until the dashboard is there
    cy.get('.app-container', { timeout: 10000 }).should('exist');
    cy.wait(500);
  });

  describe('Notifications Tab in Profile', () => {
    it('sollte zum Profil navigieren und Benachrichtigungen-Tab öffnen', () => {
      // Navigate to the profile through the avatar menu
      cy.get('.avatar', { timeout: 5000 }).should('be.visible').click();
      cy.wait(300);
      
      // Click the "Mein Profil" link
      cy.contains('👤 Mein Profil').should('be.visible').click();
      cy.wait(500);
      
      // The URL should contain /profile
      cy.url().should('include', '/profile');
      
      // The notifications tab must be shown (clickable)
      cy.contains('📬 Benachrichtigungen').should('be.visible');
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // The notifications container should be active
      cy.get('.notifications-container', { timeout: 3000 }).should('be.visible');
    });

    it('sollte Filter-Tabs anzeigen und funktionieren', () => {
      // Navigate to the profile
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      // Open the notifications tab
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // The filter tabs should exist
      cy.get('.filter-tab').should('have.length', 4);
      
      // Check the tab labels
      cy.contains('button', 'Alle').should('be.visible');
      cy.contains('button', 'Änderungen').should('be.visible');
      cy.contains('button', 'Kommentare').should('be.visible');
      cy.contains('button', 'Fällig').should('be.visible');
      
      // "Alle" should be active
      cy.get('.filter-tab.active').first().should('contain', 'Alle');
      
      // Click "Änderungen"
      cy.contains('button.filter-tab', 'Änderungen').click();
      cy.wait(200);
      
      // "Änderungen" should be active now
      cy.get('.filter-tab.active').should('contain', 'Änderungen');
    });

    it('sollte "Alle lesen" Button anzeigen wenn unread Notifications existieren', () => {
      // Go to the profile directly by URL
      cy.visit('http://localhost:5173/profile/1', {
        onBeforeLoad: () => {
          mockAuthSession();
        }
      });
      
      cy.wait(500);
      
      // Click the notifications tab
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // The "Alle lesen" button should be visible (at least 2 unread notifications)
      cy.contains('button', '✓ Alle lesen').should('be.visible');
    });

    it('sollte Notifications-Badge mit unread Count anzeigen', () => {
      // The badge is shown in the profile tab
      cy.get('.avatar', { timeout: 5000 }).should('be.visible');
      cy.get('.avatar').click();
      cy.wait(300);
      
      // Open "Mein Profil"
      cy.contains('👤 Mein Profil').click();
      cy.wait(500);
      
      // The tab badge should show the unread count (3 unread notifications)
      cy.get('.tab-badge', { timeout: 5000 }).should('be.visible');
      cy.get('.tab-badge').should('have.text', '3');
    });

    it('sollte Notifications-Reihen mit Daten anzeigen', () => {
      // Navigate to the profile
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      // Notifications tab
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // The notification rows should exist
      cy.get('.notification-row').should('have.length.greaterThan', 0);
      
      // The first notification should have the expected structure
      cy.get('.notification-row').first().should('be.visible');
      cy.contains('Aufgabe aktualisiert').should('be.visible');
    });

    it('sollte unread Notification als gelesen markieren beim Klick', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Notification rows with the unread class
      cy.get('.notification-row.unread').should('have.length', 3);
      
      // Click the first notification
      cy.get('.notification-row.unread').first().click();
      cy.wait(200);
      
      // After the click there should be one unread less
      cy.get('.notification-row.unread').should('have.length.lessThan', 3);
    });

    it('sollte Notification via Close-Button löschen können', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Initially there should be 4 notifications
      cy.get('.notification-row').should('have.length', 4);
      
      // Click the close button (X button)
      cy.get('.notification-row-close').first().click();
      cy.wait(200);
      
      // One less should be shown
      cy.get('.notification-row').should('have.length', 3);
    });

    it('sollte "Alle löschen" Button funktionieren', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Initially there should be 4 notifications
      cy.get('.notification-row').should('have.length', 4);
      
      // Click the "Löschen" button
      cy.contains('button', '🗑️ Löschen').click();
      cy.wait(300);
      
      // The empty state should be shown
      cy.get('.empty-state').should('be.visible');
      cy.contains('✨ Keine Benachrichtigungen').should('exist');
    });
  });

  describe('Dark Mode Styling', () => {
    it('sollte im Dark Mode richtig ausgeben', () => {
      // Find and switch on the dark mode toggle
      cy.get('.checkbox').first().check({ force: true });
      cy.wait(500);
      
      // Navigate to the profile page
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      // Notifications tab
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Check that the CSS is applied (dark mode class)
      cy.get('body').should('have.class', 'dark-mode');
      
      // The filter tabs should still be readable
      cy.get('.filter-tab').should('be.visible');
    });
  });

  describe('Filter Functionality', () => {
    it('sollte Notifications nach Typ filtern können', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // All should be shown (4 notifications in total)
      cy.get('.notification-row').should('have.length', 4);
      
      // Filter on "Änderungen" (change type)
      cy.contains('button.filter-tab', 'Änderungen').click();
      cy.wait(200);
      cy.get('.notification-row').should('have.length', 1);
      cy.contains('Aufgabe aktualisiert').should('be.visible');
      
      // Filter on "Kommentare"
      cy.contains('button.filter-tab', 'Kommentare').click();
      cy.wait(200);
      cy.get('.notification-row').should('have.length', 1);
      cy.contains('Neuer Kommentar').should('be.visible');
      
      // Filter on "Fällig"
      cy.contains('button.filter-tab', 'Fällig').click();
      cy.wait(200);
      cy.get('.notification-row').should('have.length', 1);
      
      // Back to "Alle"
      cy.contains('button.filter-tab', 'Alle').click();
      cy.wait(200);
      cy.get('.notification-row').should('have.length', 4);
    });

    it('sollte Filter-Count korrekt anzeigen', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Check the filter counts
      // "Alle" = 4, "Änderungen" = 1, "Kommentare" = 1, "Fällig" = 1, (info = 1)
      cy.get('.filter-tab').contains('Alle').find('.filter-count').should('contain', '4');
      cy.get('.filter-tab').contains('Änderungen').find('.filter-count').should('contain', '1');
      cy.get('.filter-tab').contains('Kommentare').find('.filter-count').should('contain', '1');
      cy.get('.filter-tab').contains('Fällig').find('.filter-count').should('contain', '1');
    });
  });

  describe('Mark as Read Functionality', () => {
    it('sollte "Alle lesen" Button funktionieren', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Unread notifications should exist (3 unread from setupTestData)
      cy.get('.notification-row.unread').should('have.length', 3);
      
      // Click "Alle lesen"
      cy.contains('button', '✓ Alle lesen').click();
      cy.wait(300);
      
      // No unread ones left
      cy.get('.notification-row.unread').should('have.length', 0);
    });
  });

  describe('Empty State', () => {
    it('sollte Empty State anzeigen wenn keine Notifications existieren', () => {
      // Set empty notifications
      cy.window().then((win) => {
        const emptyAuth = {
          accessToken: 'test-token-12345',
          userId: 1,
          username: 'testuser',
          userRole: 'Lehrer',
          userDetails: {
            username: 'testuser',
            firstname: 'Test',
            lastname: 'User',
            email: 'test@test.com'
          }
        };
        win.localStorage.setItem('effsync_auth', JSON.stringify(emptyAuth));
        win.localStorage.setItem('effsync_notifications', JSON.stringify([]));
      });
      
      cy.visit('http://localhost:5173/profile/1');
      cy.wait(500);
      
      // Notifications tab
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // The empty state should be shown
      cy.get('.empty-state').should('be.visible');
      cy.contains('✨ Keine Benachrichtigungen').should('exist');
      
      // The buttons should not exist
      cy.contains('✓ Alle lesen').should('not.exist');
      cy.contains('🗑️ Löschen').should('not.exist');
    });
  });

  describe('Notification Types Behavior', () => {
    it('sollte verschiedene Notification Typen korrekt anzeigen', () => {
      // Refresh the page with fresh data
      cy.visit('http://localhost:5173', {
        onBeforeLoad: () => {
          mockAuthSession();
        }
      });
      
      cy.wait(1000);
      
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(500);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(500);
      
      // The notifications container should be visible
      cy.get('.notifications-container', { timeout: 5000 }).should('be.visible');
      
      // Check that the notification rows are there
      cy.get('.notification-row', { timeout: 5000 }).should('have.length', 4);
      
      // Check single notifications through the texts in the headers/rows
      cy.get('.notification-row').first().within(() => {
        cy.contains('Aufgabe aktualisiert').should('exist'); // change type
      });
      
      // Check the number of the different types in the filter
      cy.get('.filter-tab').contains('Änderungen').find('.filter-count').should('contain', '1');
      cy.get('.filter-tab').contains('Kommentare').find('.filter-count').should('contain', '1');
      cy.get('.filter-tab').contains('Fällig').find('.filter-count').should('contain', '1');
    });
  });
});