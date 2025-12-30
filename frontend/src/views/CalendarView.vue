<script setup>
import { ref, computed } from 'vue';

// 1. STATE
const currentDate = ref(new Date());
const weekDays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

// Mock Events (Später aus API)
const events = ref([
    { date: '2025-01-20', title: 'Mathe Test', color: '#e74c3c' },
    { date: '2025-01-22', title: 'Englisch Vokabeln', color: '#f39c12' },
    { date: '2025-02-05', title: 'Sportfest', color: '#2ecc71' }
]);

// 2. KALENDER LOGIK
const currentYear = computed(() => currentDate.value.getFullYear());
const currentMonth = computed(() => currentDate.value.getMonth());

const monthName = computed(() => {
    return currentDate.value.toLocaleString('de-DE', { month: 'long', year: 'numeric' });
});

// Berechnet alle Tage für das Gitter
const calendarDays = computed(() => {
    const year = currentYear.value;
    const month = currentMonth.value;

    // Erster Tag des Monats
    const firstDay = new Date(year, month, 1);
    // Wie viele Tage hat der Monat? (0ter Tag des nächsten Monats = letzter des aktuellen)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Wochentag-Offset berechnen (Sonntag ist 0 in JS, wir wollen Montag als Start)
    // Mo(1) -> 0, Di(2) -> 1 ... So(0) -> 6
    const startDayIndex = (firstDay.getDay() + 6) % 7;

    const days = [];

    // A) Leere Felder davor auffüllen
    for (let i = 0; i < startDayIndex; i++) {
        days.push({ day: '', fullDate: null, isPadding: true });
    }

    // B) Echte Tage auffüllen
    for (let i = 1; i <= daysInMonth; i++) {
        // Format YYYY-MM-DD für Vergleich bauen
        // Achtung: Monat ist 0-basiert, daher +1
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        days.push({
            day: i,
            fullDate: dateStr,
            isPadding: false,
            isToday: isSameDate(new Date(), year, month, i),
            events: events.value.filter(e => e.date === dateStr)
        });
    }

    return days;
});

// Helper: Ist das Datum heute?
function isSameDate(now, y, m, d) {
    return now.getFullYear() === y && now.getMonth() === m && now.getDate() === d;
}

// Navigation
const prevMonth = () => {
    currentDate.value = new Date(currentYear.value, currentMonth.value - 1, 1);
};

const nextMonth = () => {
    currentDate.value = new Date(currentYear.value, currentMonth.value + 1, 1);
};

const goToToday = () => {
    currentDate.value = new Date();
};
</script>

<template>
  <div class="page-container">
    <div class="header-row">
      <h1 class="page-title">Mein Kalender 🗓️</h1>
      <button @click="goToToday" class="btn-today">Heute</button>
    </div>

    <div class="calendar-card">
      <div class="cal-header">
        <button @click="prevMonth" class="nav-btn">&lt;</button>
        <h2>{{ monthName }}</h2>
        <button @click="nextMonth" class="nav-btn">&gt;</button>
      </div>

      <div class="weekdays-row">
        <div v-for="day in weekDays" :key="day" class="weekday">{{ day }}</div>
      </div>

      <div class="days-grid">
        <div 
            v-for="(dayObj, index) in calendarDays" 
            :key="index"
            class="day-cell"
            :class="{ 
                'is-padding': dayObj.isPadding, 
                'is-today': dayObj.isToday 
            }"
        >
            <span v-if="!dayObj.isPadding" class="day-number">{{ dayObj.day }}</span>
            
            <div class="events-container">
                <div 
                    v-for="(evt, i) in dayObj.events" 
                    :key="i" 
                    class="event-dot" 
                    :style="{ backgroundColor: evt.color }"
                    :title="evt.title"
                ></div>
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-container {
  max-width: 900px;
  margin: 0 auto;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  color: #23234c;
  margin: 0;
}

.btn-today {
  background: white;
  border: 1px solid #ddd;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  color: #555;
  font-weight: bold;
}
.btn-today:hover { background: #f0f0f0; }

/* Calendar Card */
.calendar-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.05);
}

.cal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.cal-header h2 {
  margin: 0;
  color: #23234c;
  text-transform: capitalize;
}

.nav-btn {
  background: #f4f4f9;
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  cursor: pointer;
  font-weight: bold;
  color: #555;
  transition: background 0.2s;
}
.nav-btn:hover { background: #e0e0e0; }

/* Grid System */
.weekdays-row, .days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr); /* 7 Tage Woche */
  gap: 10px;
}

.weekdays-row {
  margin-bottom: 10px;
}

.weekday {
  text-align: center;
  font-weight: bold;
  color: #888;
  font-size: 0.9rem;
}

.day-cell {
  height: 100px; /* Höhe eines Tages-Kästchens */
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 8px;
  position: relative;
  background-color: #fafafa;
  transition: 0.2s;
}

.day-cell:hover {
    background-color: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    border-color: #ddd;
}

.day-cell.is-padding {
  background-color: transparent;
  border: none;
  pointer-events: none;
}

.day-cell.is-today {
  border: 2px solid #3498db;
  background-color: #f0f8ff;
}

.day-number {
  font-weight: bold;
  color: #333;
}

.day-cell.is-today .day-number {
    color: #3498db;
}

/* Event Dots */
.events-container {
    display: flex;
    gap: 4px;
    margin-top: 6px;
    flex-wrap: wrap;
}

.event-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
}

/* ========================================= */
/* DARK MODE OVERRIDES                       */
/* ========================================= */

:global(body.dark-mode) .page-title,
:global(body.dark-mode) .cal-header h2 { 
    color: white !important; 
}

:global(body.dark-mode) .calendar-card {
    background-color: #2c2c3e !important;
    border: 1px solid #444;
}

:global(body.dark-mode) .btn-today {
    background-color: #3b3b54 !important;
    color: white !important;
    border: 1px solid #555 !important;
}

:global(body.dark-mode) .nav-btn {
    background-color: #3b3b54 !important;
    color: white !important;
}
:global(body.dark-mode) .nav-btn:hover { background-color: #4b4b6a !important; }

:global(body.dark-mode) .day-cell {
    background-color: #232330 !important;
    border: 1px solid #444 !important;
}
:global(body.dark-mode) .day-cell:hover {
    background-color: #2c2c3e !important;
}
:global(body.dark-mode) .day-cell.is-padding {
    background-color: transparent !important;
    border: none !important;
}

:global(body.dark-mode) .day-number { color: #ddd !important; }

:global(body.dark-mode) .day-cell.is-today {
    border: 2px solid #3498db !important;
    background-color: #233040 !important; /* Dunkles Blau */
}
</style>