<template>
    <div class="rule-builder">
        <div class="builder-header">
            <h3>Abschlussbedingung definieren</h3>
            <p class="description">
                Erstelle eine logische Bedingung, wann dieser Task automatisch als abgeschlossen gilt.
            </p>
        </div>
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
</template>