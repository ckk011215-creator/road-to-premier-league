# 盃賽、球隊陣容、聯賽紀錄
import asyncio, random, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
W = int(sys.argv[1]) if len(sys.argv)>1 else 1440
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':W,'height':900 if W>500 else 844})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1'); localStorage.setItem('g2p-set', JSON.stringify({match:'sim'}))"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('#s-new'); await pg.click('[data-step="7"]'); await pg.click('#c-go'); await pg.wait_for_timeout(200)
        random.seed(8)
        async def handle(limit=500):
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return 'end'
                if await pg.locator('#modal').is_hidden(): return 'closed'
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(30); continue
                await btn.nth(random.randrange(n)).click(); await pg.wait_for_timeout(10)
            return 'limit'
        for step in range(40):
            if await pg.evaluate("S.stage==='PRO' && S.hist.length>=1 && S.term===0 && S.ci>0"): break
            await pg.click('#b-year'); await pg.wait_for_timeout(30)
            if await handle() == 'end': print('ended'); break
        await pg.evaluate("S.ab && Object.keys(S.ab).forEach(k=>S.ab[k]=Math.max(S.ab[k],60))")
        # 推進直到盃賽
        shot = False
        for i in range(30):
            sl = await pg.evaluate("JSON.stringify(nextSlot())")
            if '"cup"' in sl and not shot:
                await pg.click('.snav button[data-t=home]'); await pg.wait_for_timeout(80); await pg.screenshot(path=f'{OUT}/c1-banner-{W}.png'); shot = True
                await pg.click('#b-adv'); await pg.wait_for_timeout(50)
                await handle(); await pg.wait_for_timeout(50); break
            await pg.click('#b-adv'); await pg.wait_for_timeout(30); await handle()
        print('cup', await pg.evaluate("JSON.stringify({fa:S.cup&&S.cup.fa, lc:S.cup&&S.cup.lc})"))
        await pg.click('.snav button[data-t=mates]'); await pg.wait_for_timeout(100)
        await pg.locator('table.sq').scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/c2-squad-{W}.png')
        await pg.click('.snav button[data-t=career]'); await pg.wait_for_timeout(100)
        if await pg.locator('text=歷史射手榜').count(): await pg.locator('text=歷史射手榜').scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/c3-records-{W}.png')
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
