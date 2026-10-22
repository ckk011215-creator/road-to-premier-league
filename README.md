# 英超之路｜Road to Premier League

一段英格蘭足球員的人生模擬：由 6 歲星期日草根聯賽開始，經歷學院試訓、16 歲 Scholarship、17 歲職業合約、外借、升降級與轉會，目標是稱霸英超。

**立即遊玩：** 見本倉庫的 GitHub Pages 連結（Settings → Pages）。

- 純網頁遊戲，手機及電腦均可遊玩，無需安裝。
- 進度儲存在瀏覽器；可在遊戲內「匯出存檔」備份或轉到另一部裝置。

## 開發

```
python3 build.py        # 打包 src/ → dist/grassroots.html 及 docs/index.html
node test/sim.js 300    # 模擬 300 段生涯，檢查平衡與錯誤
node test/lang.js       # 檢查遊戲文字
```

## 免責聲明

本遊戲為非官方、非牟利的同人作品，與英格蘭超級聯賽（Premier League）、英格蘭足球總會、PFA 及任何球會均無關係，亦未獲其授權或認可。遊戲內所有球員、教練及人物均為虛構。
