# 海外生涯：加盟意甲、家人安排、生活頁語言與適應、轉會頁回流按鈕、意甲積分榜
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
        random.seed(3)
        async def handle(limit=400, prefer=None):
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return 'end'
                if await pg.locator('#modal').is_hidden(): return 'closed'
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                if not await btn.count(): btn = pg.locator('#act button:not(.locked)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(50); continue
                texts = [await btn.nth(j).inner_text() for j in range(n)]
                k = next((j for j,t in enumerate(texts) if prefer and prefer in t), None)
                if k is None: k = next((j for j,t in enumerate(texts) if '簽' in t or '接受' in t), None)
                if k is None: k = random.randrange(n)
                await btn.nth(k).click(); await pg.wait_for_timeout(15)
            return 'limit'
        await pg.evaluate("SET.match='sim'")
        for step in range(40):
            if await pg.evaluate("S.stage==='PRO' && !S.pro.semi"): break
            if await pg.evaluate("S.done"): break
            await pg.click('#b-year'); await pg.wait_for_timeout(30)
            if await handle() == 'end': break
        if await pg.evaluate("S.done || S.stage!=='PRO'"):
            # 未能成為職業球員：直接建立職業合約
            print('forcing pro')
        await pg.evaluate("S.ab && Object.keys(S.ab).forEach(k=>S.ab[k]=Math.max(S.ab[k],78)); if(!S.pro){ startPro('ARS'); } S.pro.semi=false; contractNext = () => { UI.idle(); }; sign(club('IINT'), 3, 30000)")
        await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/ab1-move-{W}.png')
        await handle(20, prefer='一起搬過去')
        print('abroad', await pg.evaluate("JSON.stringify({ab:S.abroad, langs:S.langs, club:S.pro.club})"))
        await pg.click('#b-year'); await pg.wait_for_timeout(30); await handle(800, prefer='語言班')
        print('after season', await pg.evaluate("JSON.stringify({ab:S.abroad, langs:S.langs, hist:S.hist.slice(-1)[0]})"))
        await pg.click('.snav button[data-t=life]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/ab2-life-{W}.png', full_page=True)
        life = await pg.inner_text('#g-view')
        print('life has abroad', '海外生活' in life or '語言' in life)
        await pg.click('.snav button[data-t=mates]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/ab3-market-{W}.png', full_page=True)
        mk = await pg.inner_text('#g-view'); print('market buttons', '回流英格蘭' in mk or '海外發展' in mk)
        await pg.click('.snav button[data-t=home]'); await pg.wait_for_timeout(100)
        home = await pg.inner_text('#g-view'); print('table', '意甲積分榜' in home or '意乙' in home or '英' in home)
        await pg.screenshot(path=f'{OUT}/ab4-home-{W}.png', full_page=True)
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
