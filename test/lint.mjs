// 靜態檢查：所有 src 檔案在瀏覽器中共用全域變數，所以先合併再檢查，錯誤位置會換算回原本的檔案及行數
import { ESLint } from 'eslint';
import globals from 'globals';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = JSON.parse(readFileSync(join(root, 'src/manifest.json'), 'utf8'));
const files = [...M.engine, ...M.ui];
let code = '', map = [];
for(const f of files){ const t = readFileSync(join(root, 'src', f), 'utf8') + '\n'; const n = t.split('\n').length - 1; map.push({ f, start: code.split('\n').length, n }); code += t; }
const where = line => { const m = map.findLast(x => line >= x.start); return m ? `${m.f}:${line - m.start + 1}` : `?:${line}`; };
const eslint = new ESLint({ overrideConfigFile: true, overrideConfig: [{
  languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.browser } },
  rules: {
    'no-undef': 'error', 'no-redeclare': 'error', 'no-dupe-keys': 'error', 'no-unreachable': 'error', 'no-const-assign': 'error',
    'no-dupe-args': 'error', 'no-func-assign': 'error', 'no-self-assign': 'error', 'no-unsafe-negation': 'error', 'use-isnan': 'error',
    'valid-typeof': 'error', 'no-cond-assign': ['error', 'except-parens'], 'no-unused-vars': ['warn', { vars: 'local', args: 'none', caughtErrors: 'none' }]
  } }] });
const [res] = await eslint.lintText(code);
const errs = res.messages.filter(m => m.severity === 2), warns = res.messages.filter(m => m.severity === 1);
for(const m of [...errs, ...warns]) console.log(`${m.severity === 2 ? 'ERROR' : 'warn '} ${where(m.line)}  ${m.message}`);
console.log(`lint：${errs.length} 個錯誤，${warns.length} 個提示`);
process.exit(errs.length ? 1 : 0);
