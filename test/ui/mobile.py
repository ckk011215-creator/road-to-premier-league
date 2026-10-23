# 手機版截圖：390×844
import asyncio, random, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':390,'height':844}, device_scale_factor=2, color_scheme=sys.argv[1] if len(sys.argv)>1 else 'light', has_touch=True, is_mobile=True)
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1')"); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/m0-start.png', full_page=True)
        await pg.click('#s-new'); await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/m1-basic.png')
        await pg.click('[data-step="3"]'); await pg.click('.pp-spot[data-spot="LW"]'); await pg.screenshot(path=f'{OUT}/m2-pos.png')
        await pg.click('[data-step="4"]'); await pg.screenshot(path=f'{OUT}/m3-role.png')
        await pg.click('[data-step="7"]'); await pg.screenshot(path=f'{OUT}/m4-confirm.png')
        await pg.click('#c-go'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'{OUT}/m5-home.png')
        await pg.screenshot(path=f'{OUT}/m5-homefull.png', full_page=True)
        shots=set(); random.seed(4)
        for step in range(6):
            await pg.click('#b-adv'); await pg.wait_for_timeout(60)
            for i in range(40):
                if await pg.locator('#modal').is_hidden(): break
                if 'pre' not in shots and await pg.locator('#feed .card.prematch').count(): await pg.screenshot(path=f'{OUT}/m6-pre.png'); shots.add('pre')
                btn = pg.locator('#act button:not(.locked):not(.warn)'); n = await btn.count()
                if not n: await pg.wait_for_timeout(80); continue
                texts = [await btn.nth(j).inner_text() for j in range(n)]
                if 'mom' not in shots and await pg.locator('#feed .card.moment').count() and any('成功率' in t for t in texts): await pg.screenshot(path=f'{OUT}/m7-moment.png'); shots.add('mom')
                if 'rep' not in shots and await pg.locator('#feed .card.mreport').count() and any('完成' in t for t in texts):
                    await pg.locator('#feed .card.mreport').last.scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/m8-report.png'); shots.add('rep')
                k = next((j for j,t in enumerate(texts) if '親自上陣' in t), random.randrange(n))
                await btn.nth(k).click(); await pg.wait_for_timeout(30)
        await pg.screenshot(path=f'{OUT}/m9-home2.png')
        for t in ['me','plan','career']:
            await pg.click(f'.snav button[data-t={t}]'); await pg.wait_for_timeout(80); await pg.screenshot(path=f'{OUT}/m10-{t}.png', full_page=True)
        w = await pg.evaluate('document.documentElement.scrollWidth')
        print('scrollWidth', w, 'errors', errs)
        await b.close()
asyncio.run(main())
