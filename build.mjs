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
  /* Claude artifact 版本：保持片段格式 */
  mkdirSync(join(root, 'dist'), { recursive:true }); writeFileSync(join(root, 'dist', 'grassroots.html'), html);
  /* GitHub Pages 版本：完整 HTML 文件＋PWA（可安裝、離線遊玩） */
  const ver = (js.match(/GAME_VER = '([^']+)'/) || [])[1] || 'dev';
  const head = `<!doctype html>\n<html lang="zh-Hant-HK">\n<head>\n<meta charset="utf-8">\n<meta name="theme-color" content="#111A2E">\n<meta name="description" content="由 6 歲草根足球到稱霸英超的英格蘭足球員人生模擬（非官方同人網頁遊戲）">\n<link rel="manifest" href="manifest.webmanifest">\n<link rel="icon" href="icon-192.png">\n<link rel="apple-touch-icon" href="icon-192.png">\n<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n`;
  const page = html.replace(/(<title>[^<]*<\/title>)/, head + '$1') .replace('</style>', '</style>\n</head>\n<body>') + '\n</body>\n</html>\n';
  const site = join(root, 'site'); mkdirSync(site, { recursive:true });
  writeFileSync(join(site, 'index.html'), page);
  writeFileSync(join(site, 'sw.js'), readFileSync(join(root, 'pwa', 'sw.js'), 'utf8').replace('__VER__', ver));
  writeFileSync(join(site, 'manifest.webmanifest'), JSON.stringify({ name:'英超之路｜Road to Premier League', short_name:'英超之路', description:'英格蘭足球員人生模擬：由 6 歲草根足球到稱霸英超', lang:'zh-Hant-HK', start_url:'./', scope:'./', display:'standalone', orientation:'any', background_color:'#111A2E', theme_color:'#111A2E',
    icons:[{ src:'icon-192.png', sizes:'192x192', type:'image/png' }, { src:'icon-512.png', sizes:'512x512', type:'image/png' }, { src:'icon-maskable-512.png', sizes:'512x512', type:'image/png', purpose:'maskable' }] }, null, 2));
  const { iconPNG } = await import('./pwa/icons.mjs');
  writeFileSync(join(site, 'icon-192.png'), iconPNG(192)); writeFileSync(join(site, 'icon-512.png'), iconPNG(512)); writeFileSync(join(site, 'icon-maskable-512.png'), iconPNG(512, true));
  console.log('dist/grassroots.html', Buffer.byteLength(html), 'bytes；site/ 已輸出（PWA）');
}
