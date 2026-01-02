#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MODULES_DIR = path.join(__dirname, 'src', 'modules');
const PAGES_DIR = path.join(__dirname, 'src', 'pages');

console.log('🚀 Déploiement des modules...');

if (!fs.existsSync(MODULES_DIR)) {
  console.log('⚠️  Aucun dossier src/modules/ trouvé - aucun module à déployer');
  process.exit(0);
}

const modules = fs.readdirSync(MODULES_DIR, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

if (modules.length === 0) {
  console.log('⚠️  Aucun module trouvé dans src/modules/');
  process.exit(0);
}

console.log(`📦 ${modules.length} module(s) trouvé(s): ${modules.join(', ')}`);

let deployedCount = 0;

modules.forEach(moduleName => {
  const modulePagesDir = path.join(MODULES_DIR, moduleName, 'pages');

  if (!fs.existsSync(modulePagesDir)) {
    console.log(`⚠️  Module ${moduleName}: pas de dossier pages/`);
    return;
  }

  const lockFile = path.join(MODULES_DIR, moduleName, `.module-${moduleName}.lock`);
  if (!fs.existsSync(lockFile)) {
    console.log(`⚠️  Module ${moduleName}: pas de fichier .lock - IGNORÉ`);
    return;
  }

  console.log(`\n📄 Déploiement module: ${moduleName}`);

  copyDir(modulePagesDir, PAGES_DIR, moduleName, 0);
  deployedCount++;
});

console.log(`\n✅ ${deployedCount} module(s) déployé(s) avec succès`);

function copyDir(src, dest, moduleName, depth) {
  const entries = fs.readdirSync(src, { withFileTypes: true });

  entries.forEach(entry => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (!fs.existsSync(destPath)) {
        fs.mkdirSync(destPath, { recursive: true });
      }
      copyDir(srcPath, destPath, moduleName, depth + 1);
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      let content = fs.readFileSync(srcPath, 'utf8');
      content = adjustImports(content, moduleName, depth);
      fs.writeFileSync(destPath, content, 'utf8');
      console.log(`  ✓ ${entry.name} → ${path.relative(PAGES_DIR, destPath)}`);
    }
  });
}

function adjustImports(content, moduleName, depth) {
  // depth = 0 : pages/file.tsx → ../
  // depth = 1 : pages/folder/file.tsx → ../../
  // depth = 2 : pages/folder/subfolder/file.tsx → ../../../
  const levels = depth + 1;
  const newPath = '../'.repeat(levels);

  // Remplacer tous les chemins relatifs par le bon nombre de niveaux
  // Capture n'importe quel nombre de ../ au début d'un import
  content = content.replace(/from ['"]((\.\.\/)+)/g, `from '${newPath}`);

  return content;
}
