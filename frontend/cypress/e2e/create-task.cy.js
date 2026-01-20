describe('Task Creation - Proof of Concept', () => {
    beforeEach(() => {
      cy.visit('http://localhost:5173/tasks');
    });
    it('creates a simple task successfully', () => {
      cy.contains('+ Neue Aufgabe').click();
  
      cy.get('input[id="title"]').type('E2E Proof Task');
      cy.get('textarea[id="description"]').type('Cypress test task');
      cy.get('select[id="priority_id"]').select('2');
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      cy.get('input[id="deadline"]').type(futureDate.toISOString().slice(0, 16));
  
      cy.contains('button', 'Erstellen').click();
  
      cy.get('.modal-overlay').should('not.exist');
  
      cy.get('.task-card').should('contain', 'E2E Proof Task');
    });
  });