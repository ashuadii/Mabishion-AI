const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const regexes = [
  { re: /glow:\s*['"]gold['"]/g, val: "glow: 'warning'" },
  { re: /glow:\s*['"]cyan['"]/g, val: "glow: 'info'" },
  { re: /glow:\s*['"]violet['"]/g, val: "glow: 'primary'" },
  { re: /tone\s*===\s*['"]gold['"]/g, val: "tone === 'warning'" },
  { re: /tone\s*===\s*['"]cyan['"]/g, val: "tone === 'info'" },
  { re: /tone\s*===\s*['"]violet['"]/g, val: "tone === 'primary'" },
  { re: /tone:\s*['"]gold['"]/g, val: "tone: 'warning'" },
  { re: /tone:\s*['"]cyan['"]/g, val: "tone: 'info'" },
  { re: /tone:\s*['"]violet['"]/g, val: "tone: 'primary'" }
];

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
  
  regexes.forEach(({re, val}) => {
    newContent = newContent.replace(re, val);
  });
  
  if (newContent !== content) {
    fs.writeFileSync(file, newContent, 'utf8');
    changedFiles++;
    console.log(`Updated: ${file.replace(__dirname, '')}`);
  }
});

console.log(`\nFinished! Updated ${changedFiles} files.`);
