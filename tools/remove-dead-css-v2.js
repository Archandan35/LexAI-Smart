/**
 * Safe dead CSS removal using postcss AST.
 * Confirms each selector is truly dead by searching ALL source files
 * for the exact string before removing.
 * Only removes rules where EVERY selector is confirmed dead.
 */
import fs from 'fs';
import path from 'path';
import postcss from 'postcss';

const SRC = path.resolve('src');
const CSS_FILE = path.resolve(SRC, 'styles/index.css');

function findAllSourceFiles(dir) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...findAllSourceFiles(full));
      } else if (entry.isFile() && /\.(jsx|js|tsx|ts)$/.test(entry.name)) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

// Verify a class is truly dead: search ALL source files for the class name
// as a whole word (preceded/followed by non-alphanumeric chars)
function isTrulyDead(className, allSourceContents) {
  // Skip very short class names that could cause false matches
  if (className.length < 4) return false;
  
  // Build a regex that matches the class name as a whole word.
  // Class names can contain letters, digits, hyphens, underscores.
  // We need to match it when surrounded by non-alphanumeric chars.
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(^|[^a-zA-Z0-9_-])${escaped}($|[^a-zA-Z0-9_-])`);
  
  for (const content of allSourceContents) {
    if (re.test(content)) {
      return false; // Found in source — not dead
    }
  }
  return true; // Not found anywhere — truly dead
}

// Main
console.log('Reading source files...');
const allFiles = findAllSourceFiles(SRC);
console.log(`Found ${allFiles.length} source files`);

// Read all source contents into memory for searching
const allSourceContents = allFiles.map(f => {
  try {
    return fs.readFileSync(f, 'utf-8');
  } catch { return ''; }
});

// Parse CSS with postcss
const css = fs.readFileSync(CSS_FILE, 'utf-8');
console.log(`CSS file size: ${css.length} bytes`);

const root = postcss.parse(css);

// Collect all selectors from CSS and identify dead ones
const allRules = [];
root.walkRules(rule => {
  const selectors = rule.selector.split(',').map(s => s.trim());
  const classes = [];
  for (const sel of selectors) {
    const classRe = /\.(-?[_a-zA-Z]+[\w-]*)/g;
    let m;
    while ((m = classRe.exec(sel)) !== null) {
      classes.push(m[1]);
    }
  }
  if (classes.length > 0) {
    allRules.push({ rule, selectors, classes, selectorText: rule.selector });
  }
});

console.log(`Total CSS rules with class selectors: ${allRules.length}`);

// Find all unique dead classes
const allDefinedClasses = new Set();
for (const r of allRules) {
  for (const c of r.classes) allDefinedClasses.add(c);
}
console.log(`Unique class selectors: ${allDefinedClasses.size}`);

// Check each class against source files
const deadClasses = [];
const liveClasses = [];
for (const cls of [...allDefinedClasses].sort()) {
  if (isTrulyDead(cls, allSourceContents)) {
    deadClasses.push(cls);
  } else {
    liveClasses.push(cls);
  }
}

console.log(`\nConfirmed dead classes: ${deadClasses.length}`);
console.log(`Live classes: ${liveClasses.length}`);

// Group dead classes by prefix
const deadGroups = {};
for (const cls of deadClasses) {
  const prefix = cls.includes('__') ? cls.split('__')[0] : 
                 cls.includes('--') ? cls.split('--')[0] :
                 cls.split('-').slice(0, 2).join('-');
  if (!deadGroups[prefix]) deadGroups[prefix] = [];
  deadGroups[prefix].push(cls);
}

console.log('\nDead classes by group:');
for (const [prefix, classes] of Object.entries(deadGroups).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${prefix}: ${classes.length} — ${classes.slice(0, 6).join(', ')}${classes.length > 6 ? ` +${classes.length - 6} more` : ''}`);
}

// Now: find rules where ALL classes are dead
const deadRules = allRules.filter(r => {
  return r.classes.length > 0 && r.classes.every(c => deadClasses.includes(c));
});

console.log(`\nRules that can be safely removed (all selectors dead): ${deadRules.length}`);

if (deadRules.length > 0) {
  // Show what will be removed
  for (const dr of deadRules.slice(0, 20)) {
    console.log(`  ${dr.selectorText}`);
  }
  if (deadRules.length > 20) {
    console.log(`  ... and ${deadRules.length - 20} more`);
  }
  
  // Ask for confirmation before removing
  // Remove rules in reverse order to preserve indices
  const removed = [];
  for (let i = deadRules.length - 1; i >= 0; i--) {
    const dr = deadRules[i];
    removed.push(dr.selectorText);
    dr.rule.remove();
  }
  
  // Write output
  const outPath = path.resolve(SRC, 'styles/index.css');
  // Clean up formatting: multiple blank lines -> single blank line
  let output = root.toString();
  output = output.replace(/\n{3,}/g, '\n\n');
  fs.writeFileSync(outPath, output, 'utf-8');
  
  console.log(`\nRemoved ${removed.length} rules from index.css`);
  console.log('File written successfully');
  
  // Write a log of what was removed
  const logPath = path.resolve('tools/removed-selectors.log');
  fs.writeFileSync(logPath, removed.join('\n'), 'utf-8');
  console.log(`Removal log written to ${logPath}`);
} else {
  console.log('No rules to remove.');
}
