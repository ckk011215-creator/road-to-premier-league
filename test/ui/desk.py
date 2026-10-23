# 電腦版測試：建立球員 → 主頁 → 推進 → 比賽（親自上陣）→ 戰報 → 各分頁；之後用「模擬至學期末」跑多年，檢查錯誤
import asyncio, random, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1440,'height':900}, color_scheme=sys.argv[1] if len(sys.argv)>1 else 'light')
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load' not in m.text else None)
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1')"); await pg.wait_for_timeout(300)
        await pg.click('#s-new'); await pg.click('[data-step="7"]'); await pg.click('#c-go'); await pg.wait_for_timeout(200)
        await pg.screenshot(path=f'{OUT}/d1-home.png')
        shots=set(); random.seed(2)
        async def handle(tag, limit=60):
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return 'end'
                if await pg.locator('#modal').is_hidden(): return 'closed'
                if 'pre' not in shots and await pg.locator('#feed .card.prematch').count():
                    await pg.screenshot(path=f'{OUT}/d2-prematch.png'); shots.add('pre')
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                if not await btn.count(): btn = pg.locator('#act button:not(.locked)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(100); continue
                texts = [await btn.nth(j).inner_text() for j in range(n)]
                if 'moment' not in shots and await pg.locator('#feed .card.moment').count():
                    await pg.screenshot(path=f'{OUT}/d3-moment.png'); shots.add('moment')
                if 'report' not in shots and await pg.locator('#feed .card.mreport').count() and any('完成' in t for t in texts):
                    await pg.locator('#feed .card.mreport').last.scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/d4-report.png'); shots.add('report')
                k = next((j for j,t in enumerate(texts) if '親自上陣' in t), None)
                if k is None: k = random.randrange(n)
                await btn.nth(k).click(); await pg.wait_for_timeout(30)
            return 'limit'
        for step in range(8):
            await pg.click('#b-adv'); await pg.wait_for_timeout(50)
            r = await handle('adv')
        await pg.screenshot(path=f'{OUT}/d5-home2.png')
        for t in ['me','plan','mates','career']:
            await pg.click(f'.snav button[data-t={t}]'); await pg.wait_for_timeout(80); await pg.screenshot(path=f'{OUT}/d6-{t}.png', full_page=True)
        await pg.click('.snav button[data-t=home]')
        # 模擬多年
        for step in range(300):
            if await pg.locator('#end').is_visible(): break
            await pg.click('#b-auto'); await pg.wait_for_timeout(30)
            r = await handle('auto', 200)
            if r=='end': break
            if step==40: await pg.screenshot(path=f'{OUT}/d7-pro.png')
        age = await pg.locator('.pc-pos small').inner_text() if await pg.locator('#game').is_visible() else 'ended'
        print('age/status', age, 'errors', errs[:5])
        await pg.screenshot(path=f'{OUT}/d8-last.png')
        await b.close()
asyncio.run(main())
