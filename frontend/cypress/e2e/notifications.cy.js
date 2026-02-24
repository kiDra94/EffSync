// Hilfsfunktion: Mock localStorage mit Test-Daten
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

// Hilfsfunktion: Mock Auth Session
const mockAuthSession = () => {
  cy.window().then((win) => {
    // Mock localStorage für Auth
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
    // Cy Visit mit Fallback
    cy.visit('http://localhost:5173', {
      onBeforeLoad: (win) => {
        mockAuthSession();
      },
      onLoad: (win) => {
        // Stelle sicher dass Auth Store die Daten hat
        win.localStorage.getItem('effsync_auth');
      }
    });
    
    // Warte bis Dashboard da ist
    cy.get('.app-container', { timeout: 10000 }).should('exist');
    cy.wait(500);
  });

  describe('Notifications Tab in Profile', () => {
    it('sollte zum Profil navigieren und Benachrichtigungen-Tab öffnen', () => {
      // Zum Profil navigieren über Avatar-Menu
      cy.get('.avatar', { timeout: 5000 }).should('be.visible').click();
      cy.wait(300);
      
      // "Mein Profil" Link klicken
      cy.contains('👤 Mein Profil').should('be.visible').click();
      cy.wait(500);
      
      // URL sollte /profile enthalten
      cy.url().should('include', '/profile');
      
      // Notifications-Tab muss angezeigt sein (klickbar)
      cy.contains('📬 Benachrichtigungen').should('be.visible');
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Notifications Container sollte aktiv sein
      cy.get('.notifications-container', { timeout: 3000 }).should('be.visible');
    });

    it('sollte Filter-Tabs anzeigen und funktionieren', () => {
      // Zum Profil navigieren
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      // Benachrichtigungen-Tab öffnen
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Filter-Tabs sollten existieren
      cy.get('.filter-tab').should('have.length', 4);
      
      // Tab-Label überprüfen
      cy.contains('button', 'Alle').should('be.visible');
      cy.contains('button', 'Änderungen').should('be.visible');
      cy.contains('button', 'Kommentare').should('be.visible');
      cy.contains('button', 'Fällig').should('be.visible');
      
      // "Alle" sollte aktiv sein
      cy.get('.filter-tab.active').first().should('contain', 'Alle');
      
      // Auf "Änderungen" klicken
      cy.contains('button.filter-tab', 'Änderungen').click();
      cy.wait(200);
      
      // "Änderungen" sollte jetzt aktiv sein
      cy.get('.filter-tab.active').should('contain', 'Änderungen');
    });

    it('sollte "Alle lesen" Button anzeigen wenn unread Notifications existieren', () => {
      // Direkt zum Profil via URL
      cy.visit('http://localhost:5173/profile/1', {
        onBeforeLoad: (win) => {
          mockAuthSession();
        }
      });
      
      cy.wait(500);
      
      // Benachrichtigungen-Tab klicken
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // "Alle lesen" Button sollte sichtbar sein (mind. 2 unread notifications)
      cy.contains('button', '✓ Alle lesen').should('be.visible');
    });

    it('sollte Notifications-Badge mit unread Count anzeigen', () => {
      // Badge wird im Profil-Tab angezeigt
      cy.get('.avatar', { timeout: 5000 }).should('be.visible');
      cy.get('.avatar').click();
      cy.wait(300);
      
      // "Mein Profil" öffnen
      cy.contains('👤 Mein Profil').click();
      cy.wait(500);
      
      // Tab Badge sollte angezeigt werden mit unread count (3 unread notifications)
      cy.get('.tab-badge', { timeout: 5000 }).should('be.visible');
      cy.get('.tab-badge').should('have.text', '3');
    });

    it('sollte Notifications-Reihen mit Daten anzeigen', () => {
      // Zum Profil navigieren
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      // Benachrichtigungen-Tab
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Notification-Reihen sollten existieren
      cy.get('.notification-row').should('have.length.greaterThan', 0);
      
      // Erste Notification sollte die erwartete Struktur haben
      cy.get('.notification-row').first().should('be.visible');
      cy.contains('Aufgabe aktualisiert').should('be.visible');
    });

    it('sollte unread Notification als gelesen markieren beim Klick', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Notification-Reihen mit unread Klasse
      cy.get('.notification-row.unread').should('have.length', 3);
      
      // Auf erste Notification klicken
      cy.get('.notification-row.unread').first().click();
      cy.wait(200);
      
      // Nach Klick sollte ein unread weniger sein
      cy.get('.notification-row.unread').should('have.length.lessThan', 3);
    });

    it('sollte Notification via Close-Button löschen können', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Initial sollten Notifications existieren
      const initialCount = cy.get('.notification-row').then(el => el.length);
      
      // Close-Button klicken (X-Button)
      cy.get('.notification-row-close').first().click();
      cy.wait(200);
      
      // Eine weniger sollte angezeigt werden
      cy.get('.notification-row').should('have.length', 3);
    });

    it('sollte "Alle löschen" Button funktionieren', () => {
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Initial sollten 4 Notifications da sein
      cy.get('.notification-row').should('have.length', 4);
      
      // "Löschen" Button klicken
      cy.contains('button', '🗑️ Löschen').click();
      cy.wait(300);
      
      // Empty state sollte angezeigt werden
      cy.get('.empty-state').should('be.visible');
      cy.contains('✨ Keine Benachrichtigungen').should('exist');
    });
  });

  describe('Dark Mode Styling', () => {
    it('sollte im Dark Mode richtig ausgeben', () => {
      // Dark Mode Toggle finden und aktivieren
      cy.get('.checkbox').first().check({ force: true });
      cy.wait(500);
      
      // Zur Profil-Seite navigieren
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(300);
      
      // Benachrichtigungen-Tab
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Überprüfe dass CSS angewendet ist (Dark Mode Klasse)
      cy.get('body').should('have.class', 'dark-mode');
      
      // Filter-Tabs sollten dennoch lesbar sein
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
      
      // Alle sollten angezeigt werden (4 Notifications total)
      cy.get('.notification-row').should('have.length', 4);
      
      // Filter auf "Änderungen" (change type)
      cy.contains('button.filter-tab', 'Änderungen').click();
      cy.wait(200);
      cy.get('.notification-row').should('have.length', 1);
      cy.contains('Aufgabe aktualisiert').should('be.visible');
      
      // Filter auf "Kommentare"
      cy.contains('button.filter-tab', 'Kommentare').click();
      cy.wait(200);
      cy.get('.notification-row').should('have.length', 1);
      cy.contains('Neuer Kommentar').should('be.visible');
      
      // Filter auf "Fällig"
      cy.contains('button.filter-tab', 'Fällig').click();
      cy.wait(200);
      cy.get('.notification-row').should('have.length', 1);
      
      // Zurück zu "Alle"
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
      
      // Filter-Counts überprüfen
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
      
      // Unread Notifications sollten existieren (3 unread von setupTestData)
      cy.get('.notification-row.unread').should('have.length', 3);
      
      // "Alle lesen" klicken
      cy.contains('button', '✓ Alle lesen').click();
      cy.wait(300);
      
      // Keine unread mehr
      cy.get('.notification-row.unread').should('have.length', 0);
    });
  });

  describe('Empty State', () => {
    it('sollte Empty State anzeigen wenn keine Notifications existieren', () => {
      // Leere Notifications setzen
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
      
      // Benachrichtigungen-Tab
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(300);
      
      // Empty State sollte angezeigt werden
      cy.get('.empty-state').should('be.visible');
      cy.contains('✨ Keine Benachrichtigungen').should('exist');
      
      // Buttons sollten nicht existieren
      cy.contains('✓ Alle lesen').should('not.exist');
      cy.contains('🗑️ Löschen').should('not.exist');
    });
  });

  describe('Notification Types Behavior', () => {
    it('sollte verschiedene Notification Typen korrekt anzeigen', () => {
      // Refresh page mit fresh data
      cy.visit('http://localhost:5173', {
        onBeforeLoad: (win) => {
          mockAuthSession();
        }
      });
      
      cy.wait(1000);
      
      cy.get('.avatar').click();
      cy.contains('👤 Mein Profil').click();
      cy.wait(500);
      
      cy.contains('📬 Benachrichtigungen').click();
      cy.wait(500);
      
      // Notifications Container sollte sichtbar sein
      cy.get('.notifications-container', { timeout: 5000 }).should('be.visible');
      
      // Überprüf dass die notification rows da sind
      cy.get('.notification-row', { timeout: 5000 }).should('have.length', 4);
      
      // Einzelne Notifications überprüfen via die Texte in den Headers/Rows
      cy.get('.notification-row').first().within(() => {
        cy.contains('Aufgabe aktualisiert').should('exist'); // change type
      });
      
      // Anzahl der verschiedenen Typen im Filter überprüfen
      cy.get('.filter-tab').contains('Änderungen').find('.filter-count').should('contain', '1');
      cy.get('.filter-tab').contains('Kommentare').find('.filter-count').should('contain', '1');
      cy.get('.filter-tab').contains('Fällig').find('.filter-count').should('contain', '1');
    });
  });
});