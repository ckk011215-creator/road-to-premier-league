# 英超之路｜Road to Premier League

一段英格蘭足球員的人生模擬：由 6 歲星期日草根聯賽開始，經歷學院試訓、16 歲 Scholarship、17 歲職業合約、外借、升降級與轉會，目標是稱霸英超。

**立即遊玩：** https://ckk011215-creator.github.io/road-to-premier-league/

- 純網頁遊戲，手機及電腦均可遊玩，無需安裝。
- 進度儲存在瀏覽器；可在遊戲內「匯出存檔」備份或轉到另一部裝置。

## 開發

需要 Node.js 22。

```
npm install          # 安裝開發工具（ESLint）
npm run build        # 打包 src/ → dist/grassroots.html 及 site/index.html
npm test             # 程式檢查、單元測試、文字檢查、平衡測試
npm run sim -- 300   # 模擬 300 段生涯，輸出各項統計
```

- `src/manifest.json` 決定檔案載入次序；所有檔案在瀏覽器中共用全域變數。
- `test/ui/` 是本機用的 Playwright 介面測試（需要 Python 及 Playwright）。
- 推送到 `main` 後，GitHub Actions 會自動執行 `npm test`，通過後打包並部署到 GitHub Pages。
- 全球排行榜使用 Supabase，資料表設定見 `setup/leaderboard.sql`。

## 免責聲明

本遊戲為非官方、非牟利的同人作品，與英格蘭超級聯賽（Premier League）、英格蘭足球總會、PFA 及任何球會均無關係，亦未獲其授權或認可。遊戲內所有球員、教練及人物均為虛構。
