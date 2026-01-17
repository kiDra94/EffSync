<template>
    <div class="rule-builder">
        <div class="builder-header">
            <h3>Abschlussbedingung definieren</h3>
            <p class="description">
                Erstelle eine logische Bedingung, wann dieser Task automatisch als abgeschlossen gilt.
            </p>
        </div>
        <div v-if="!localRule" class="empty-state">
            <div class="empty-icon">🔗</div>
            <p>Keine Regel definiert</p>
            <button @click="initRule" class="btn-primary">
                Regel hinzufügen
            </button>
        </div>
        <div v-else class="rule-editor">
            <RuleNode :node="localRule" :subtasks="subtasks" @update="localRule = $event" @remove="removeRule" />

            <div class="auto-complete-section">
                <label class="checkbox-label">
                    <input type="checkbox" v-model="localAutoComplete" class="checkbox" />
                    <span>Task automatisch abschließen, wenn Bedingung erfüllt ist</span>
                </label>
                <p class="help-text">
                    Wenn aktiviert, wird der Task-Status automatisch auf "Fertig" gesetzt, sobald die Regel erfüllt ist.
                </p>
            </div>
        </div>
        <div class="builder-footer">
            <button @click="$emit('close')" class="btn-secondary">
                Abbrechen
            </button>
            <button @click="saveRule" :disabled="!isRuleValid" class="btn-primary"
                :class="{ 'btn-disabled': !isRuleValid }">
                Speichern
            </button>
        </div>
        <div class="help-section">
            <details>
                <summary>💡 Wie funktionieren die Operatoren?</summary>
                <ul>
                    <li><strong>UND (AND):</strong> Alle Bedingungen müssen erfüllt sein</li>
                    <li><strong>ODER (OR):</strong> Mindestens eine Bedingung muss erfüllt sein</li>
                    <li><strong>ENTWEDER-ODER (XOR):</strong> Genau eine Bedingung muss erfüllt sein (nicht beide)</li>
                    <li><strong>NICHT (NOT):</strong> Negiert die Bedingung</li>
                </ul>
                <p><strong>Beispiel:</strong> <code>(Linux UND Docker) ODER (Nginx UND SSL)</code> bedeutet: Der Task
                    ist
                    fertig, wenn entweder beide aus der ersten Gruppe ODER beide aus der zweiten Gruppe erledigt sind.
                </p>
            </details>
        </div>
    </div>
</template>
<script setup>
import { ref, computed } from 'vue';
import RuleNode from './RuleNode.vue';

const props = defineProps({
    taskId: { type: Number, required: true },
    initialRule: { type: [Object, String], default: null },
    initialAutoComplete: { type: Boolean, default: false },
    subtasks: { type: Array, required: true }
});

const emit = defineEmits(['save', 'close']);

const localRule = ref(null);
const localAutoComplete = ref(props.initialAutoComplete);

if (props.initialRule) {
    localRule.value = typeof props.initialRule === 'string'
        ? JSON.parse(props.initialRule)
        : { ...props.initialRule };
}


</script>