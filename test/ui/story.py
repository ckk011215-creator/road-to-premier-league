# 難度、主帥風格、記者會、報紙頭版、退役後章節
import asyncio, random, sys, base64
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
W = int(sys.argv[1]) if len(sys.argv)>1 else 1440
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':W,'height':900 if W>500 else 844})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load' not in m.text else None)
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1'); localStorage.setItem('g2p-set', JSON.stringify({match:'sim'}))"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('#s-new'); await pg.click('[data-step="7"]'); await pg.click('[data-k=diff][data-v=hard]'); await pg.wait_for_timeout(100)
        await pg.locator('.cf-diff').scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/t0-diff-{W}.png')
        await pg.click('#c-go'); await pg.wait_for_timeout(200)
        print('diff', await pg.evaluate("S.diff"))
        random.seed(4)
        async def handle(limit=400):
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return 'end'
                if await pg.locator('#modal').is_hidden(): return 'closed'
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                if not await btn.count(): btn = pg.locator('#act button:not(.locked)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(40); continue
                await btn.nth(random.randrange(n)).click(); await pg.wait_for_timeout(15)
            return 'limit'
        for step in range(40):
            if await pg.evaluate("S.stage==='PRO' && S.hist.length>=1"): break
            await pg.click('#b-year'); await pg.wait_for_timeout(30)
            if await handle() == 'end': print('ended'); break
        print('stage', await pg.evaluate("S.stage+' '+S.age+' mgr '+JSON.stringify(club(curClub()).mgr)+' num '+S.pro.num"))
        await pg.click('.snav button[data-t=plan]'); await pg.wait_for_timeout(80); await pg.screenshot(path=f'{OUT}/t1-plan-{W}.png', full_page=True)
        await pg.click('.snav button[data-t=mates]'); await pg.wait_for_timeout(80); await pg.screenshot(path=f'{OUT}/t2-market-{W}.png')
        await pg.evaluate("UI.newPage('測試'); const c = club(curClub()); seasonPaper({ row:S.hist.at(-1), pos:2, mv:null, aw:['英超年度最佳陣容'], champ:c, lgKey:c.lg, c }); S.season.press=0; pressConf({rt:8.1,g:2,a:0,gf:3,ga:1}, {rv:false}, () => UI.idle());")
        await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/t3-paper-{W}.png')
        await handle(20)
        # 退役後章節
        await pg.evaluate("S.hist.push({ y:S.year, age:S.age, club:S.pro.club, lg:'CH', loan:false, role:'正選', r:0, app:120, g:30, a:20, cs:0, rt:7.2 }); S.pro.clubYrs[S.pro.club]=10; S.m.fans=80; S.pro.num = S.pro.num||9; UI.newPage('測試'); endGame('測試：宣布退役。')")
        await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/t4-after-{W}.png')
        r = await handle(30); print('after', r)
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=f'{OUT}/t5-end-{W}.png', full_page=True)
        print('after text', await pg.evaluate("S.after && S.after.t"), await pg.evaluate("S.honours.map(h=>h.t).join(' / ')"))
        await pg.click('#end-card'); await pg.wait_for_selector('.sharecard'); await pg.wait_for_timeout(300)
        src = await pg.get_attribute('.sharecard','src'); open(f'{OUT}/t6-card.png','wb').write(base64.b64decode(src.split(',')[1]))
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
