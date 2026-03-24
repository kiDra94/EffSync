<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const calendarSettings = ref({
    showTasks: true,
    showTaskStatuses: {     // ✅ Aus Schema: task_status enum
        TODO: true,
        IN_PROGRESS: true,
        IN_REVIEW: true,
        ON_HOLD: true,
        COMPLETED: true
    },
    showTaskPriorities: {   // ✅ 1-4 aus priorities table
        1: true,    // low
        2: true,    // medium
        3: true,    // high
        4: true     // urgent
    },
    showNotes: true,
    showEvents: true,
    showLessons: true,

    dayStartHour: 6,
    dayEndHour: 22,

    onlyMyTasks: false,
    hideCompleted: false
})

// ✅ Active Status Filter
const activeStatuses = computed(() =>
    Object.keys(calendarSettings.value.showTaskStatuses)
        .filter(status => calendarSettings.value.showTaskStatuses[status])
)

// ✅ Active Priority Filter  
const activePriorities = computed(() =>
    Object.keys(calendarSettings.value.showTaskPriorities)
        .filter(p => calendarSettings.value.showTaskPriorities[p])
        .map(Number)
)

const timeSlots = computed(() => {
    const slots = []
    for (let h = calendarSettings.value.dayStartHour; h <= calendarSettings.value.dayEndHour; h++) {
        slots.push(`${h.toString().padStart(2, '0')}:00`)
        slots.push(`${h.toString().padStart(2, '0')}:30`)
    }
    return slots
})

const saveSettings = () => {
    localStorage.setItem('calendarSettings', JSON.stringify(calendarSettings.value))
}

const loadSettings = () => {
    const saved = localStorage.getItem('calendarSettings')
    if (saved) {
        calendarSettings.value = {
            ...calendarSettings.value,
            ...JSON.parse(saved)
        }
    }
}

onMounted(loadSettings)
watch(calendarSettings, saveSettings, { deep: true })
</script>

<template>
    <div class="calendar-settings">
        <h3 class="settings-title">Kalender Einstellungen</h3>

        <!-- Anzeige Toggle -->
        <div class="settings-group">
            <h4>Anzeigen</h4>
            <div class="toggle-list">
                <label class="toggle-item">
                    <input type="checkbox" v-model="calendarSettings.showTasks" />
                    <span>Aufgaben</span>
                </label>
                <label class="toggle-item">
                    <input type="checkbox" v-model="calendarSettings.showNotes" />
                    <span>Notizen</span>
                </label>
                <label class="toggle-item">
                    <input type="checkbox" v-model="calendarSettings.showEvents" />
                    <span>Events</span>
                </label>
                <label class="toggle-item">
                    <input type="checkbox" v-model="calendarSettings.showLessons" />
                    <span>Stundenplan</span>
                </label>
            </div>
        </div>

        <!-- Task Status Filter -->
        <div class="settings-group" v-if="calendarSettings.showTasks">
            <h4>Task Status</h4>
            <div class="chip-grid">
                <label class="chip" :class="{ active: calendarSettings.showTaskStatuses.TODO }"
                    style="--active-color: #10b981">
                    <input type="checkbox" v-model="calendarSettings.showTaskStatuses.TODO" />
                    <span>To Do</span>
                </label>
                <label class="chip" :class="{ active: calendarSettings.showTaskStatuses.IN_PROGRESS }"
                    style="--active-color: #f59e0b">
                    <input type="checkbox" v-model="calendarSettings.showTaskStatuses.IN_PROGRESS" />
                    <span>In Bearbeitung</span>
                </label>
                <label class="chip" :class="{ active: calendarSettings.showTaskStatuses.IN_REVIEW }"
                    style="--active-color: #3b82f6">
                    <input type="checkbox" v-model="calendarSettings.showTaskStatuses.IN_REVIEW" />
                    <span>In Review</span>
                </label>
                <label class="chip" :class="{ active: calendarSettings.showTaskStatuses.ON_HOLD }"
                    style="--active-color: #6b7280">
                    <input type="checkbox" v-model="calendarSettings.showTaskStatuses.ON_HOLD" />
                    <span>Auf Eis</span>
                </label>
                <label class="chip" :class="{ active: calendarSettings.showTaskStatuses.COMPLETED }"
                    style="--active-color: #4f46e5">
                    <input type="checkbox" v-model="calendarSettings.showTaskStatuses.COMPLETED" />
                    <span>Erledigt</span>
                </label>
            </div>
        </div>

        <!-- Prioritäten Filter -->
        <div class="settings-group" v-if="calendarSettings.showTasks">
            <h4>Priorität</h4>
            <div class="chip-grid">
                <label class="chip" :class="{ active: calendarSettings.showTaskPriorities[1] }"
                    style="--active-color: #10b981">
                    <input type="checkbox" v-model="calendarSettings.showTaskPriorities[1]" />
                    <span>Niedrig</span>
                </label>
                <label class="chip" :class="{ active: calendarSettings.showTaskPriorities[2] }"
                    style="--active-color: #f59e0b">
                    <input type="checkbox" v-model="calendarSettings.showTaskPriorities[2]" />
                    <span>Mittel</span>
                </label>
                <label class="chip" :class="{ active: calendarSettings.showTaskPriorities[3] }"
                    style="--active-color: #ef4444">
                    <input type="checkbox" v-model="calendarSettings.showTaskPriorities[3]" />
                    <span>Hoch</span>
                </label>
                <label class="chip" :class="{ active: calendarSettings.showTaskPriorities[4] }"
                    style="--active-color: #7c3aed">
                    <input type="checkbox" v-model="calendarSettings.showTaskPriorities[4]" />
                    <span>Dringend</span>
                </label>
            </div>
        </div>

        <!-- Zeitbereich -->
        <div class="settings-group">
            <h4>Uhrzeitbereich</h4>
            <div class="time-range">
                <div class="time-input-group">
                    <label>Beginn</label>
                    <div class="time-input-wrap">
                        <input type="number" v-model.number="calendarSettings.dayStartHour" min="0" max="23" />
                        <span>:00</span>
                    </div>
                </div>
                <div class="time-divider">–</div>
                <div class="time-input-group">
                    <label>Ende</label>
                    <div class="time-input-wrap">
                        <input type="number" v-model.number="calendarSettings.dayEndHour" min="0" max="23" />
                        <span>:30</span>
                    </div>
                </div>
            </div>
            <small>{{ timeSlots.length }} Slots ({{ calendarSettings.dayStartHour }}:00 – {{ calendarSettings.dayEndHour
                }}:30)</small>
        </div>

        <!-- Filter -->
        <div class="settings-group">
            <h4>Filter</h4>
            <div class="toggle-list">
                <label class="toggle-item">
                    <input type="checkbox" v-model="calendarSettings.onlyMyTasks" />
                    <span>Nur meine Aufgaben</span>
                </label>
            </div>
        </div>
    </div>
</template>

<style scoped>
.calendar-settings {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.settings-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 24px 0;
}

.settings-group {
    padding: 20px 0;
    border-bottom: 1px solid #e5e7eb;
}

.settings-group:last-child {
    border-bottom: none;
}

.settings-group h4 {
    margin: 0 0 14px 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

/* ✅ Toggle Rows */
.toggle-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.toggle-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
    font-size: 0.95rem;
    color: #374151;
}

.toggle-item:hover {
    background: #f9fafb;
}

.toggle-item input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: #4f46e5;
    cursor: pointer;
    flex-shrink: 0;
}

/* ✅ Chip Grid (Status + Priorität) */
.chip-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-radius: 20px;
    border: 1.5px solid #d1d5db;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    color: #374151;
    transition: all 0.2s;
    user-select: none;
}

.chip:hover {
    border-color: #9ca3af;
    background: #f9fafb;
}

.chip.active {
    background: var(--active-color);
    border-color: var(--active-color);
    color: white;
    font-weight: 600;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.chip input[type="checkbox"] {
    display: none;
}

/* ✅ Zeit Input */
.time-range {
    display: flex;
    align-items: flex-end;
    gap: 16px;
    margin-bottom: 12px;
}

.time-divider {
    font-size: 1.2rem;
    color: #9ca3af;
    padding-bottom: 8px;
}

.time-input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.time-input-group label {
    font-size: 0.8rem;
    color: #6b7280;
    font-weight: 500;
}

.time-input-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
}

.time-input-wrap input[type="number"] {
    width: 64px;
    padding: 8px 10px;
    border: 1.5px solid #d1d5db;
    border-radius: 8px;
    font-size: 1rem;
    color: #1e293b;
    text-align: center;
    transition: border-color 0.2s;
}

.time-input-wrap input[type="number"]:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.time-input-wrap span {
    color: #6b7280;
    font-size: 0.95rem;
}

small {
    font-size: 0.8rem;
    color: #9ca3af;
}
</style>