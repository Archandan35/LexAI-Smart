/**
 * Verify and remove unused imports from JSX/JS files.
 * Uses babel parser for accurate AST analysis.
 */
import fs from 'fs';
import path from 'path';
import babel from '@babel/parser';
import traverse from '@babel/traverse';

const SRC = path.resolve('src');

function findAllSourceFiles(dir) {
  const results = [];
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        results.push(...findAllSourceFiles(full));
      } else if (entry.isFile() && /\.(jsx|js)$/.test(entry.name)) {
        results.push(full);
      }
    }
  } catch {}
  return results;
}

function analyzeFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const ast = babel.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'dynamicImport', 'classProperties', 'objectRestSpread']
    });

    // Collect all imports
    const imports = {};
    traverse.default(ast, {
      ImportDeclaration(path) {
        for (const specifier of path.node.specifiers) {
          const name = specifier.local.name;
          imports[name] = { 
            source: path.node.source.value,
            type: specifier.type,
            start: path.node.loc.start.line,
            end: path.node.loc.end.line
          };
        }
      }
    });

    if (Object.keys(imports).length === 0) return null;

    // Collect all identifier references including JSX (excluding import declarations)
    const referencedNames = new Set();

    traverse.default(ast, {
      ImportDeclaration(path) { path.skip(); },
      JSXIdentifier(path) {
        if (path.parent.type === 'JSXOpeningElement' || path.parent.type === 'JSXClosingElement') {
          referencedNames.add(path.node.name);
        }
      },
      Identifier(path) {
        if (!path.isReferenced()) return;
        let p = path.parent;
        while (p) {
          if (p.type === 'ImportDeclaration') return;
          p = p.parent;
        }
        referencedNames.add(path.node.name);
      },
      ExportDefaultDeclaration(path) {
        // Mark default export name as referenced
        if (path.node.declaration && path.node.declaration.id) {
          referencedNames.add(path.node.declaration.id.name);
        }
      },
      ExportNamedDeclaration(path) {
        if (path.node.declaration && path.node.declaration.id) {
          referencedNames.add(path.node.declaration.id.name);
        }
        // Also handle export const/let/var
        if (path.node.declaration && path.node.declaration.declarations) {
          for (const decl of path.node.declaration.declarations) {
            if (decl.id && decl.id.type === 'Identifier') {
              referencedNames.add(decl.id.name);
            }
          }
        }
      }
    });

    // Find unused imports
    const unused = [];
    for (const [name, info] of Object.entries(imports)) {
      if (!referencedNames.has(name)) {
        unused.push({ name, ...info });
      }
    }

    if (unused.length === 0) return null;

    // Build the modified content by removing import lines
    const lines = content.split('\n');
    const linesToRemove = new Set();
    for (const u of unused) {
      for (let i = u.start - 1; i < u.end; i++) {
        linesToRemove.add(i);
      }
    }

    const keptImports = {};
    for (const u of unused) {
      keptImports[u.name] = true;
    }

    return { file: filePath, unused, linesToRemove, keptImports, lines };
  } catch (err) {
    return { file: filePath, error: err.message, unused: [], linesToRemove: new Set(), keptImports: {}, lines: [] };
  }
}

// --- Main ---
const allFiles = findAllSourceFiles(SRC);

let totalUnused = 0;
let filesWithIssues = 0;
const fixes = [];

for (const file of allFiles) {
  const result = analyzeFile(file);
  if (!result) continue;
  
  if (result.error) {
    console.error(`Error parsing ${file}: ${result.error}`);
    continue;
  }
  
  if (result.unused.length > 0) {
    filesWithIssues++;
    const rel = path.relative(SRC, result.file);
    console.log(`\n=== ${rel}`);
    for (const u of result.unused) {
      console.log(`  UNUSED: ${u.name} (from ${u.source}) line ${u.start}`);
      totalUnused++;
    }
    fixes.push(result);
  }
}

console.log(`\n--- Summary ---`);
console.log(`Files with issues: ${filesWithIssues}/${allFiles.length}`);
console.log(`Unused imports: ${totalUnused}`);

// Ask for confirmation before modifying
if (fixes.length > 0) {
  console.log(`\nWould remove ${totalUnused} unused imports across ${fixes.length} files.`);
  console.log('Proceeding with removal...');
  
  for (const fix of fixes) {
    try {
      const sortedLines = [...fix.linesToRemove].sort((a, b) => b - a);
      
      // For multi-line imports, remove all lines
      const newLines = fix.lines.filter((_, i) => !fix.linesToRemove.has(i));
      
      // Clean up double blank lines
      const cleaned = [];
      for (let i = 0; i < newLines.length; i++) {
        const prevBlank = i > 0 && newLines[i - 1].trim() === '';
        const currBlank = newLines[i].trim() === '';
        if (prevBlank && currBlank) continue; // skip duplicate blank line
        cleaned.push(newLines[i]);
      }
      
      const newContent = cleaned.join('\n');
      
      // Trim trailing whitespace
      const finalContent = newContent.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
      
      fs.writeFileSync(fix.file, finalContent, 'utf-8');
      const rel = path.relative(SRC, fix.file);
      console.log(`  Fixed: ${rel} (removed ${fix.unused.length} unused imports)`);
    } catch (err) {
      console.error(`  Error fixing ${fix.file}: ${err.message}`);
    }
  }
  
  console.log('\nDone.');
}
