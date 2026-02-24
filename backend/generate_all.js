const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 1. Setup
const schemaPath = 'prisma/schema.prisma';
const modulesDir = 'src/modules'; 

if (!fs.existsSync(schemaPath)) {
  console.error('❌ FEHLER: prisma/schema.prisma nicht gefunden!');
  process.exit(1);
}

const schema = fs.readFileSync(schemaPath, 'utf8');

// 2. Models finden
const modelRegex = /model\s+(\w+)\s+{/g;
let match;
const models = [];

while ((match = modelRegex.exec(schema)) !== null) {
  models.push(match[1]);
}

console.log(`\n🔍 Gefundene Models im Schema: ${models.length}`);

// 3. Generierung
models.forEach((modelName) => {
  const folderName = modelName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/_/g, '-')
    .toLowerCase();

  const targetPath = path.join(modulesDir, folderName);

  if (fs.existsSync(targetPath)) {
    console.log(`Skipping:  "${folderName}" (existiert bereits)`);
  } else {
    console.log(`\n⚡ GENERIERE: "${folderName}" (Module, Controller, Service)...`);
    
    try {
      // Schritt 1: Modul erstellen (Der Container)
      execSync(`npx nest g module modules/${folderName}`, { stdio: 'inherit' });

      // Schritt 2: Controller erstellen (bindet sich automatisch ins Modul ein)
      // --no-spec: Keine Testdatei
      execSync(`npx nest g controller modules/${folderName} --no-spec`, { stdio: 'inherit' });

      // Schritt 3: Service erstellen (bindet sich automatisch ins Modul ein)
      execSync(`npx nest g service modules/${folderName} --no-spec`, { stdio: 'inherit' });

      console.log(`   ✅ "${folderName}" vollständig erstellt.`);
    } catch (e) {
      console.log(`   ❌ FEHLER bei "${folderName}".`);
    }
  }
});

console.log('\n🏁 Fertig.');