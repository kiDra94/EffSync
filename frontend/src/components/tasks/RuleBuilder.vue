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

const initRule = () => {
    localRule.value = {
        type: 'operator',
        operator: 'AND',
        operands: []
    };
};

const removeRule = () => {
    if (confirm('Möchtest du die gesamte Regel löschen?')) {
        localRule.value = null;
        localAutoComplete.value = false;
    }
};

const isRuleValid = computed(() => {
    if (!localRule.value) return false;

    const validateNode = (node) => {
        if (node.type === 'leaf') {
            return node.task_id != null;
        }
        if (node.type === 'operator') {
            if (!node.operands || node.operands.length === 0) return false;
            return node.operands.every(op => validateNode(op));
        }
        return false;
    };

    return validateNode(localRule.value);
});

const saveRule = () => {
    if (!isRuleValid.value) {
        alert('Bitte fülle alle Task-Felder aus!');
        return;
    }

    emit('save', {
        rule: localRule.value,
        autoComplete: localAutoComplete.value
    });
};
</script>
<style scoped>
.rule-builder {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    max-width: 800px;
    margin: 0 auto;
}

.builder-header {
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 2px solid #e5e7eb;
}

.builder-header h3 {
    margin: 0 0 0.5rem 0;
    color: #1f2937;
    font-size: 1.5rem;
}

.description {
    margin: 0;
    color: #6b7280;
    font-size: 0.9rem;
}

.empty-state {
    text-align: center;
    padding: 3rem 2rem;
    background: #f9fafb;
    border-radius: 8px;
    border: 2px dashed #d1d5db;
}

.empty-icon {
    font-size: 3rem;
    margin-bottom: 1rem;
}

.empty-state p {
    color: #6b7280;
    margin-bottom: 1.5rem;
}

.rule-editor {
    margin-bottom: 1.5rem;
}

.auto-complete-section {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    border-radius: 6px;
}

.checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-weight: 500;
    color: #1e40af;
    cursor: pointer;
}

.checkbox {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: #3b82f6;
}

.help-text {
    margin: 0.5rem 0 0 0;
    font-size: 0.85rem;
    color: #1e40af;
}

.builder-footer {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    padding-top: 1.5rem;
    border-top: 2px solid #e5e7eb;
}

.btn-primary,
.btn-secondary {
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
}

.btn-primary {
    background: #4f46e5;
    color: white;
}

.btn-primary:hover:not(.btn-disabled) {
    background: #4338ca;
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(79, 70, 229, 0.3);
}

.btn-primary.btn-disabled {
    background: #d1d5db;
    cursor: not-allowed;
}

.btn-secondary {
    background: #f3f4f6;
    color: #374151;
}

.btn-secondary:hover {
    background: #e5e7eb;
}

.help-section {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #fef3c7;
    border-radius: 8px;
}

.help-section summary {
    cursor: pointer;
    font-weight: 600;
    color: #92400e;
    user-select: none;
}

.help-section ul {
    margin: 0.5rem 0 0 0;
    padding-left: 1.5rem;
    color: #78350f;
}

.help-section li {
    margin: 0.5rem 0;
}

.help-section p {
    margin: 1rem 0 0 0;
    color: #78350f;
    font-size: 0.9rem;
}

.help-section code {
    background: #fef9c3;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-size: 0.85rem;
    font-family: 'Courier New', monospace;
}
</style>