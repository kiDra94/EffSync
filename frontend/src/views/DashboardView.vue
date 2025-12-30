<template>
  <div class="dashboard-container">
    <h1>Dashboard</h1>
    <p>Willkommen zurück!</p>
    
    <div class="stats-grid">
      <div class="card">
        <h3>Aufgaben offen</h3>
        <p class="number">12</p>
      </div>
      <div class="card">
        <h3>Dokumente</h3>
        <p class="number">34</p>
      </div>
      <div class="card">
        <h3>Nachrichten</h3>
        <p class="number">5</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-top: 20px;
}

.card {
    background: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.05);
    border-left: 5px solid #23234c;
    transition: background-color 0.3s; /* Weicher Übergang */
}

/* --- WICHTIG: Karten im Dark Mode umfärben --- */
:global(body.dark-mode) .card {
    background-color: #2c2c3e;
    color: #ddd;
    box-shadow: none;
    border-left: 5px solid #7c7cff; /* Optional: Hellerer Akzent im Darkmode */
}

.number {
    font-size: 2rem;
    font-weight: bold;
    color: #23234c;
}

:global(body.dark-mode) .number {
    color: #fff;
}
</style>