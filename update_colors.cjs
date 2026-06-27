const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = {
  'C\\.gold': 'C.warning',
  'C\\.softGold': 'C.warning',
  'C\\.cyanBright': 'C.info',
  'C\\.cyan': 'C.info',
  'C\\.violetBright': 'C.primary',
  'C\\.violet': 'C.primary',
  'C\\.mutedLow': 'C.textMuted',
  'C\\.muted': 'C.textMuted',
  'C\\.navy2': 'C.surface',
  'C\\.navy': 'C.surface',
  'C\\.bg': 'C.background'
};

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk(srcDir);
let changedFiles = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content;
  
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(key, 'g');
    newContent = newContent.replace(regex, value);
  }
  
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles++;
    console.log(`Updated: ${file.replace(__dirname, '')}`);
  }
});

console.log(`\nFinished! Updated ${changedFiles} files.`);
