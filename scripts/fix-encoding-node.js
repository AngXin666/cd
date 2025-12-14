/**
 * Fix file encoding using Node.js
 * Convert file to UTF-8 without BOM
 */

const fs = require('fs');
const path = require('path');

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node fix-encoding-node.js <file-path>');
  process.exit(1);
}

try {
  console.log(`Reading file: ${filePath}`);
  
  // Read file with UTF-8 encoding
  const content = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`File size: ${content.length} characters`);
  
  // Write back with UTF-8 without BOM
  fs.writeFileSync(filePath, content, { encoding: 'utf-8' });
  
  console.log('File encoding fixed successfully!');
} catch (error) {
  console.error(`Error: ${error.message}`);
  process.exit(1);
}
