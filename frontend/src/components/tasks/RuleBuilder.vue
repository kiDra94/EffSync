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

</template>