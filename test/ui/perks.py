# 特技、宿敵、分享卡、快捷鍵
import asyncio, random, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
W = int(sys.argv[1]) if len(sys.argv)>1 else 1440
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':W,'height':900 if W>500 else 844})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'Failed to load' not in m.text else None)
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1'); localStorage.setItem('g2p-set', JSON.stringify({match:'sim'}))"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('#s-new'); await pg.click('[data-step="7"]'); await pg.click('#c-go'); await pg.wait_for_timeout(200)
        random.seed(11)
        async def handle(limit=400, keys=False):
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return 'end'
                if await pg.locator('#modal').is_hidden(): return 'closed'
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(40); continue
                if keys: await pg.keyboard.press(str(random.randint(1, min(n,9)))); await pg.wait_for_timeout(20); continue
                await btn.nth(random.randrange(n)).click(); await pg.wait_for_timeout(15)
            return 'limit'
        # 用鍵盤玩頭幾步
        await pg.click('#b-adv'); await pg.wait_for_timeout(50); await pg.locator('#act button').first.wait_for()
        await pg.screenshot(path=f'{OUT}/k0-keys-{W}.png')
        r = await handle(60, True); print('keyboard run', r)
        for step in range(40):
            if await pg.evaluate("S.stage==='PRO' && S.age>=20"): break
            await pg.click('#b-year'); await pg.wait_for_timeout(30)
            if await handle() == 'end': print('ended'); break
        await pg.evaluate("S.perks = S.perks||{}; S.perks.clutch = S.year; S.perks.long = S.year; pst().bG = 9; pst().trail = 33; UI.newPage('測試'); ensureRival(); const n = rivalOf(); n.club = pick(clubsIn(club(curClub()).lg).filter(x=>x.id!==curClub())).id; rivalAfter({rt:7.6,gf:2,ga:1}); rivalAfter({rt:6.1,gf:0,ga:2}); rivalSeason(S.hist.at(-1)); UI.idle()")
        await pg.locator('#feed .card').last.scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/k1-rival-{W}.png')
        await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
        print('modal closed by Enter', await pg.locator('#modal').is_hidden())
        await pg.click('.snav button[data-t=me]'); await pg.wait_for_timeout(100)
        await pg.locator('.perks').scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/k2-perks-{W}.png')
        await pg.click('.snav button[data-t=career]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/k3-career-{W}.png', full_page=True)
        await pg.click('#pc-card'); await pg.wait_for_selector('.sharecard'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/k4-card-{W}.png')
        src = await pg.get_attribute('.sharecard', 'src')
        import base64; open(f'{OUT}/k5-card.png','wb').write(base64.b64decode(src.split(',')[1]))
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
