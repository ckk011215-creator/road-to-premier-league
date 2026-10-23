# 門將比賽：半場指示、賽事進程、連鎖撲救、戰報入球列表；歐聯比賽、合約談判
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
        random.seed(5); titles=[]
        async def handle(limit=400, prefer=None, shots=None):
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return 'end'
                if await pg.locator('#modal').is_hidden(): return 'closed'
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                if not await btn.count(): btn = pg.locator('#act button:not(.locked)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(50); continue
                texts = [await btn.nth(j).inner_text() for j in range(n)]
                if shots is not None:
                    t = await pg.evaluate("[...document.querySelectorAll('#modal .card h4, #modal .card h3, #modal .card .ct')].map(e=>e.innerText).slice(-3).join('|')")
                    titles.append(t)
                    if any('下半場' in x or '更衣室' in x or '防線' in x for x in texts) and 'ht' not in shots: shots.add('ht'); await pg.screenshot(path=f'{OUT}/gk-ht-{W}.png')
                k = next((j for j,t in enumerate(texts) if prefer and prefer in t), None)
                if k is None: k = random.randrange(n)
                await btn.nth(k).click(); await pg.wait_for_timeout(15)
            return 'limit'
        await pg.evaluate("SET.match='sim'")
        for step in range(40):
            if await pg.evaluate("S.stage==='PRO' && !S.pro.semi"): break
            if await pg.evaluate("S.done"): break
            await pg.click('#b-year'); await pg.wait_for_timeout(30)
            if await handle() == 'end': break
        await pg.evaluate("if(!S.pro){ startPro('ARS'); } S.pro.semi=false; S.pos='GK'; setAttrSet(true); S.ab && Object.keys(S.ab).forEach(k=>S.ab[k]=Math.max(S.ab[k],74)); SET.match='play'; Object.assign(S.season||(S.season={}), { r:0 }); UI.newPage('門將測試'); playMatch({ tag:'英超・測試', hc:'ARS', oc:'TOT', home:'阿仙奴', opp:'熱刺', lvl:72, diff:-2, stake:2, youth:false, n:3, league:false, friendly:false }, () => UI.idle())")
        shots=set()
        await handle(200, shots=shots)
        await pg.wait_for_timeout(200)
        await pg.screenshot(path=f'{OUT}/gk-report-{W}.png', full_page=True)
        txt = await pg.inner_text('#modal') if await pg.locator('#modal').is_visible() else await pg.inner_text('body')
        print('ticker', '賽事進程' in txt or '🧤' in txt, 'goals list', '入球' in txt)
        # 合約談判
        await pg.evaluate("S.pos='CM'; setAttrSet(false); CT_OPTS=[]; contractNext = () => UI.idle(); UI.newPage('談判'); const o = offerOpt(club('CHE'), 4, 'x'); CT_OPTS=[o]; o.f()")
        await pg.wait_for_timeout(150); await pg.screenshot(path=f'{OUT}/nego-{W}.png')
        await handle(30, prefer='加薪')
        print('terms', await pg.evaluate("JSON.stringify({club:S.pro.club, wage:S.pro.wage, terms:S.pro.terms})"))
        # 歐聯
        await pg.evaluate("S.euQ = null; S.pro.club='MCI'; S.pro.loan=null; euroInit(); JSON.stringify(S.eu && {comp:S.eu.comp, opps:S.eu.opps})")
        print('eu', await pg.evaluate("JSON.stringify(S.eu && {comp:S.eu.comp, n:S.eu.opps.length, opp:anyClub(S.eu.opps[0]).n})"))
        await pg.evaluate("SET.match='sim'; UI.newPage('歐聯'); euroRun({k:'euro', ph:'lg', i:0}, () => UI.idle())")
        await handle(60)
        print('eu after', await pg.evaluate("JSON.stringify({md:S.eu.md, pts:S.eu.pts})"))
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
