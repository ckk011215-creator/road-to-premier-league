// 將 src/ 打包成單一 HTML：dist/grassroots.html 及 site/index.html（GitHub Pages）
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url)), src = join(root, 'src');
const M = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
export const files = [...M.engine, ...M.ui];
export function bundle(list = files){ return list.map(f => `/* ==== ${f} ==== */\n` + readFileSync(join(src, f), 'utf8')).join('\n'); }
if(process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]){
  const js = bundle(), css = readFileSync(join(src, 'style.css'), 'utf8');
  const html = readFileSync(join(src, 'shell.html'), 'utf8').replace('/*CSS*/', () => css).replace('/*JS*/', () => js);
  for(const out of [join(root, 'dist', 'grassroots.html'), join(root, 'site', 'index.html')]){ mkdirSync(dirname(out), { recursive:true }); writeFileSync(out, html); }
  console.log('dist/grassroots.html', Buffer.byteLength(html), 'bytes');
}
