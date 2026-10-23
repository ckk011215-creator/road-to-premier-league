# 傷患：輕傷可帶傷上陣（橫額、選擇、賽前標示）；重傷不能比賽並出現養傷事件
import asyncio, random, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
W = int(sys.argv[1]) if len(sys.argv)>1 else 1440
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':W,'height':900 if W>500 else 844})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load' not in m.text else None)
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1')"); await pg.wait_for_timeout(300)
        await pg.click('#s-new'); await pg.click('[data-step="7"]'); await pg.click('#c-go'); await pg.wait_for_timeout(200)
        random.seed(2)
        async def handle(limit=300, prefer=None):
            seen=[]
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return seen
                if await pg.locator('#modal').is_hidden(): return seen
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                if not await btn.count(): btn = pg.locator('#act button:not(.locked)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(50); continue
                texts = [await btn.nth(j).inner_text() for j in range(n)]
                seen += texts
                k = next((j for j,t in enumerate(texts) if prefer and prefer in t), None)
                if k is None: k = random.randrange(n)
                await btn.nth(k).click(); await pg.wait_for_timeout(15)
            return seen
        await pg.evaluate("SET.match='sim'")
        # 輕傷：主頁橫額
        await pg.evaluate("S.inj = { w:5, n:'大腿撞傷', sev:'minor' }; renderView()")
        await pg.wait_for_timeout(150)
        banner = await pg.inner_text('.nb') if await pg.locator('.nb').count() else ''
        side = await pg.inner_text('#side-m')
        print('minor banner', '帶傷' in banner, 'side', '輕傷' in side)
        await pg.screenshot(path=f'{OUT}/inj-minor-{W}.png')
        seen = await handle(prefer='帶傷上陣') if False else None
        await pg.click('#b-year'); await pg.wait_for_timeout(30)
        seen = await handle(prefer='帶傷上陣')
        print('minor choice offered', any('帶傷上陣' in t for t in seen))
        # 重傷：不能比賽
        await pg.evaluate("S.inj = { w:12, n:'腳踝韌帶受傷', sev:'major' }; renderView()")
        await pg.wait_for_timeout(150)
        banner = await pg.inner_text('.nb') if await pg.locator('.nb').count() else ''
        print('major banner', '傷停' in banner)
        await pg.screenshot(path=f'{OUT}/inj-major-{W}.png')
        await pg.click('#b-year'); await pg.wait_for_timeout(30)
        seen = await handle()
        body = await pg.inner_text('#feed') if await pg.locator('#feed').count() else await pg.inner_text('body')
        print('rested shown', '傷停' in body or '養傷' in body)
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
