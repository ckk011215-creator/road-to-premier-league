# 存檔相容與匯出／匯入：舊版建立存檔 → 新版讀取；匯出 → 另一個瀏覽器匯入
import asyncio, random, sys
from playwright.async_api import async_playwright
SP='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad'
OLD=f'file://{SP}/old-v040.html'; NEW='file:///home/claude/grassroots/dist/grassroots.html'; OUT=f'{SP}/shots'
W = int(sys.argv[1]) if len(sys.argv)>1 else 1280
async def handle(pg, limit=300):
    for i in range(limit):
        if await pg.locator('#modal').is_hidden(): return
        btn = pg.locator('#act button:not(.locked):not(.warn)')
        n = await btn.count()
        if not n: await pg.wait_for_timeout(40); continue
        texts = [await btn.nth(j).inner_text() for j in range(n)]
        k = next((j for j,t in enumerate(texts) if '模擬比賽' in t), random.randrange(n))
        await btn.nth(k).click(); await pg.wait_for_timeout(15)
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        errs=[]
        ctx = await b.new_context(viewport={'width':W,'height':900}, permissions=['clipboard-read','clipboard-write'])
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append('A:'+str(e)))
        await pg.goto(OLD); await pg.evaluate("localStorage.setItem('g2p-tut','1')"); await pg.reload(); await pg.wait_for_timeout(200)
        await pg.click('#s-new'); await pg.click('[data-step="6"]'); await pg.click('#c-go'); await pg.wait_for_timeout(200)
        random.seed(3)
        for _ in range(6):
            await pg.click('#b-year'); await pg.wait_for_timeout(30); await handle(pg)
        old = await pg.evaluate("JSON.stringify({v:S.v, ver:S.ver, age:S.age, st:S.stage})"); print('old save', old)
        # 新版讀取
        await pg.goto(NEW); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/s1-start-{W}.png')
        await pg.click('[data-cont="0"]'); await pg.wait_for_timeout(200)
        for _ in range(3):
            await pg.click('#b-year'); await pg.wait_for_timeout(30); await handle(pg)
        print('migrated', await pg.evaluate("JSON.stringify({v:S.v, ver:S.ver, age:S.age, st:S.stage, mates:S.m.mates, life:!!S.life})"))
        # 遊戲內匯出
        await pg.click('#t-menu'); await pg.click('#m-exp'); await pg.wait_for_selector('#x-code'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/s2-export-{W}.png')
        code = await pg.input_value('#x-code'); print('code len', len(code), code[:24])
        await pg.click('#x-copy'); await pg.wait_for_timeout(200); print('copy btn', await pg.inner_text('#x-copy'))
        async with pg.expect_download() as dl: await pg.click('#x-dl')
        d = await dl.value; await d.save_as(f'{SP}/save.txt'); print('download', d.suggested_filename)
        state = await pg.evaluate("JSON.stringify({age:S.age, y:S.year, money:S.money, seed:S.seed})")
        # 另一部「裝置」：全新瀏覽器環境
        ctx2 = await b.new_context(viewport={'width':390,'height':844})
        p2 = await ctx2.new_page(); p2.on('pageerror', lambda e: errs.append('B:'+str(e)))
        await p2.goto(NEW); await p2.evaluate("localStorage.setItem('g2p-tut','1')"); await p2.reload(); await p2.wait_for_timeout(200)
        await p2.click('#s-imp'); await p2.fill('#i-code', code[:-30]); await p2.click('#i-go'); await p2.wait_for_timeout(200)
        print('bad code msg', await p2.inner_text('#i-msg'))
        await p2.set_input_files('#i-file', f'{SP}/save.txt'); await p2.wait_for_timeout(300)
        await p2.screenshot(path=f'{OUT}/s3-import-390.png')
        await p2.click('#i-go'); await p2.wait_for_timeout(300)
        await p2.screenshot(path=f'{OUT}/s4-imported-390.png')
        print('msg', await p2.inner_text('#s-msg') if await p2.locator('#s-msg').count() else '-')
        await p2.click('[data-cont="0"]'); await p2.wait_for_timeout(200)
        st2 = await p2.evaluate("JSON.stringify({age:S.age, y:S.year, money:S.money, seed:S.seed})"); print('same state', st2==state, st2)
        await p2.click('#b-year'); await p2.wait_for_timeout(30); await handle(p2)
        # 更新日誌
        await p2.click('#t-menu'); await p2.click('#m-home'); await p2.wait_for_timeout(200); await p2.click('#s-log'); await p2.wait_for_timeout(100)
        await p2.screenshot(path=f'{OUT}/s5-log-390.png')
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
