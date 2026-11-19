const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

let indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

const initialParams = {
  page: '',
  kode: '',
  id: '',
  appUrl: ''
};

indexHtml = indexHtml.replace(
  /<\?!=\s*JSON\.stringify\([\s\S]*?\)\s*\?>/,
  JSON.stringify(initialParams)
);

indexHtml = indexHtml.replace(/<\?!=\s*include\(['"]([a-zA-Z0-9_]+)['"]\);\s*\?>/g, (_, name) => {
  const partialPath = path.join(rootDir, `${name}.html`);
  if (fs.existsSync(partialPath)) {
    return fs.readFileSync(partialPath, 'utf8');
  }
  return `<!-- missing partial: ${name} -->`;
});

fs.writeFileSync(path.join(distDir, 'index.html'), indexHtml, 'utf8');

// Copy static assets (OG image, favicon, CNAME) to dist
['og-image.png', 'favicon.png', 'CNAME'].forEach(file => {
  const src = path.join(rootDir, file);
  const dest = path.join(distDir, file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
  }
});

console.log('GitHub Pages standalone index.html built successfully in dist/index.html');
