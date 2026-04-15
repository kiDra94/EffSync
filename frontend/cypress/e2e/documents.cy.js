const visitAs = ({ role = 'student', userId = 11 } = {}) => {
  cy.intercept('GET', '**/api/tasks', {
    statusCode: 200,
    body: {
      data: [
        { task_id: 77, title: 'Dokument-Abgabe Aufgabe', assigned_to: userId, created_by: 5, task_members: [] },
      ],
      meta: { total: 1, page: 1, limit: 10, totalPages: 1 },
    },
  }).as('getTasksForDocuments');

  cy.intercept('GET', '**/api/users/profile', {
    statusCode: 200,
    body: {
      user_id: userId,
      username: role === 'teacher' ? 'teacher.e2e' : 'student.e2e',
      firstname: role === 'teacher' ? 'Lea' : 'Susi',
      lastname: role === 'teacher' ? 'Teacher' : 'Student',
      role,
    },
  }).as('getProfile');

  cy.visit('http://localhost:5173/documents', {
    onBeforeLoad: (win) => {
      win.localStorage.setItem('authToken', 'e2e-token');
      win.localStorage.setItem('userId', String(userId));
      win.localStorage.setItem('userRole', role);
    },
  });

  cy.wait('@getProfile');
  cy.wait('@getTasksForDocuments');
};

describe('Documents workflow E2E', () => {
  it('Student: upload + rename + delete own document, but cannot grade', () => {
    const ownDocument = {
      document_id: 100,
      name: 'mein-dokument.pdf',
      file_size: 2048,
      mime_type: 'application/pdf',
      created_at: new Date().toISOString(),
      uploader: { full_name: 'Susi Student', role: 'student' },
      permissions: {
        can_view: true,
        can_download: true,
        can_edit: true,
        can_delete: true,
        can_grade: false,
      },
      is_gradeable: false,
    };

    const uploadedDocument = {
      ...ownDocument,
      document_id: 101,
      name: 'abgabe.pdf',
    };

    cy.intercept('GET', '**/api/documents', {
      statusCode: 200,
      body: [ownDocument],
    }).as('getDocuments');

    cy.intercept('POST', '**/api/documents/upload', {
      statusCode: 201,
      body: uploadedDocument,
    }).as('uploadDocument');

    cy.intercept('PATCH', '**/api/documents/101', (req) => {
      expect(req.body).to.deep.equal({ name: 'abgabe-renamed.pdf' });
      req.reply({
        statusCode: 200,
        body: {
          ...uploadedDocument,
          name: 'abgabe-renamed.pdf',
        },
      });
    }).as('renameDocument');

    cy.intercept('DELETE', '**/api/documents/101', {
      statusCode: 200,
      body: { message: 'Dokument erfolgreich gelöscht', document_id: 101 },
    }).as('deleteDocument');

    cy.intercept('GET', '**/api/documents/100/download', {
      statusCode: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': "attachment; filename*=UTF-8''mein-dokument.pdf",
      },
      body: Cypress.Buffer.from('%PDF-1.4 mock content', 'utf8'),
    }).as('openOwnDocument');

    visitAs({ role: 'student', userId: 11 });
    cy.wait('@getDocuments');

    cy.contains('button', '+ Dokument hochladen').should('be.visible');
    cy.contains('button[title="Bewerten"]', '📝').should('not.exist');

    cy.contains('tr', 'mein-dokument.pdf').within(() => {
      cy.get('button[title="Öffnen"]').should('be.visible').click();
    });
    cy.wait('@openOwnDocument');

    cy.get('input[type="file"]').selectFile(
      {
        contents: Cypress.Buffer.from('PDF mock content'),
        fileName: 'abgabe.pdf',
        mimeType: 'application/pdf',
      },
      { force: true },
    );

    cy.wait('@uploadDocument');
    cy.contains('Dokument erfolgreich hochgeladen.').should('be.visible');

    cy.contains('tr', 'abgabe.pdf').within(() => {
      cy.get('button[title="Umbenennen"]').click();
    });

    cy.get('.rename-input').clear().type('abgabe-renamed.pdf{enter}');
    cy.wait('@renameDocument');
    cy.contains('tr', 'abgabe-renamed.pdf').should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('tr', 'abgabe-renamed.pdf').within(() => {
      cy.get('button[title="Löschen"]').click();
    });

    cy.wait('@deleteDocument');
    cy.contains('abgabe-renamed.pdf').should('not.exist');
  });

  it('Teacher: can grade student document and cannot rename/delete it', () => {
    const studentDocument = {
      document_id: 200,
      name: 'mathe-hausuebung.pdf',
      file_size: 4096,
      mime_type: 'application/pdf',
      created_at: new Date().toISOString(),
      uploader: { full_name: 'Susi Student', role: 'student' },
      permissions: {
        can_view: true,
        can_download: true,
        can_edit: false,
        can_delete: false,
        can_grade: true,
      },
      is_gradeable: true,
      grade: null,
      feedback: null,
    };

    cy.intercept('GET', '**/api/documents', {
      statusCode: 200,
      body: [studentDocument],
    }).as('getDocumentsTeacher');

    cy.intercept('PATCH', '**/api/documents/200/grade', (req) => {
      expect(req.body).to.deep.equal({ grade: '1', feedback: 'Sehr gute Arbeit' });
      req.reply({
        statusCode: 200,
        body: {
          ...studentDocument,
          grade: '1',
          feedback: 'Sehr gute Arbeit',
        },
      });
    }).as('gradeDocument');

    cy.intercept('GET', '**/api/documents/200/download', {
      statusCode: 200,
      headers: {
        'content-type': 'application/pdf',
        'content-disposition': "attachment; filename*=UTF-8''mathe-hausuebung.pdf",
      },
      body: Cypress.Buffer.from('%PDF-1.4 teacher mock content', 'utf8'),
    }).as('openStudentDocument');

    visitAs({ role: 'teacher', userId: 5 });
    cy.wait('@getDocumentsTeacher');

    cy.contains('tr', 'mathe-hausuebung.pdf').within(() => {
      cy.get('button[title="Öffnen"]').should('be.visible').click();
    });
    cy.wait('@openStudentDocument');

    cy.contains('tr', 'mathe-hausuebung.pdf').within(() => {
      cy.get('button[title="Bewerten"]').should('be.visible').click();
      cy.get('button[title="Umbenennen"]').should('not.exist');
      cy.get('button[title="Löschen"]').should('not.exist');
    });

    cy.get('#document-grade').type('1');
    cy.get('#document-feedback').type('Sehr gute Arbeit');
    cy.contains('button', 'Bewertung speichern').click();

    cy.wait('@gradeDocument');
    cy.contains('Bewertung gespeichert. Der Schüler wurde benachrichtigt.').should('be.visible');
    cy.contains('tr', 'mathe-hausuebung.pdf').should('contain', 'Note: 1').and('contain', 'Sehr gute Arbeit');
  });
});
