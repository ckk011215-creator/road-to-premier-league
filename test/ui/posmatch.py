# 位置專屬場面：中堅、後腰、翼鋒各踢一場，統計位置專屬場面、定位球及組織攻勢連鎖
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
        random.seed(7)
        async def handle(limit=300, seen=None, pos=''):
            for i in range(limit):
                if await pg.locator('#modal').is_hidden(): return 'closed'
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                if not await btn.count(): btn = pg.locator('#act button:not(.locked)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(50); continue
                head = await pg.evaluate("(() => { const c = [...document.querySelectorAll('#modal .card')].pop(); return c ? c.innerText.slice(0, 160) : ''; })()")
                if seen is not None and '專屬' in head:
                    seen.append(head.split('\n')[0])
                    if len(seen) == 1: await pg.screenshot(path=f'{OUT}/pos-{pos}-{W}.png')
                await btn.nth(random.randrange(n)).click(); await pg.wait_for_timeout(15)
            return 'limit'
        await pg.evaluate("startPro('ARS'); S.pro.semi=false; S.ab && Object.keys(S.ab).forEach(k=>S.ab[k]=Math.max(S.ab[k],72)); SET.match='play'")
        for pos in ['CB','DM','W','ST']:
            seen=[]
            for k in range(3):
                await pg.evaluate(f"S.pos='{pos}'; setAttrSet(false); Object.assign(S.season||(S.season={{}}), {{ r:0 }}); S.inj={{w:0,n:''}}; UI.newPage('{pos}'); playMatch({{ tag:'英超・測試', hc:'ARS', oc:'TOT', home:'阿仙奴', opp:'熱刺', lvl:72, diff:-2, stake:2, youth:false, n:5, league:false, friendly:false }}, () => UI.idle())")
                await handle(300, seen, pos)
            log = await pg.evaluate("JSON.stringify((S.recent||[]).slice(0,3).map(r => r.rt))")
            print(pos, '專屬場面', len(seen), seen[:4], '評分', log)
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
