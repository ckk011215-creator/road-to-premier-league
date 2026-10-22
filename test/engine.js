// 測試共用：把遊戲引擎（不含介面）載入 Node 的 vm 環境
const fs = require('fs'), path = require('path');
const M = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/manifest.json'), 'utf8'));
const engineSrc = (list = M.engine) => list.map(f => fs.readFileSync(path.join(__dirname, '../src', f), 'utf8')).join('\n');
module.exports = { engineSrc, M };
