# 轉會頁、設定、國際大賽（十二碼）
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
        await pg.click('#s-set'); await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/w0-set-{W}.png')
        await pg.click('[data-sk=match][data-sv=play]'); await pg.click('#set-back')
        await pg.click('#s-new'); await pg.click('[data-step="7"]'); await pg.click('#c-go'); await pg.wait_for_timeout(200)
        random.seed(7)
        async def handle(limit=400, prefer=None, shot=None):
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return 'end'
                if await pg.locator('#modal').is_hidden(): return 'closed'
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                if not await btn.count(): btn = pg.locator('#act button:not(.locked)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(50); continue
                texts = [await btn.nth(j).inner_text() for j in range(n)]
                if shot and any(('射向' in t or '撲向' in t) for t in texts): await shot('pen')
                k = next((j for j,t in enumerate(texts) if prefer and prefer in t), None)
                if k is None: k = next((j for j,t in enumerate(texts) if '簽' in t or '接受' in t), None)
                if k is None: k = random.randrange(n)
                await btn.nth(k).click(); await pg.wait_for_timeout(15)
            return 'limit'
        await pg.evaluate("SET.match='sim'")
        for step in range(40):
            st = await pg.evaluate("S.stage")
            if st=='PRO': break
            await pg.click('#b-year'); await pg.wait_for_timeout(30)
            if await handle() == 'end': print('ended'); break
        print("stage", await pg.evaluate("S.stage+' '+S.age+' '+(S.done?'done':'')"))
        await pg.evaluate("S.ab && Object.keys(S.ab).forEach(k=>S.ab[k]=Math.max(S.ab[k],80)); renderView()")
        await pg.click('.snav button[data-t=mates]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/w1-market-{W}.png', full_page=True)
        if await pg.locator('[data-mk=renew]:not([disabled])').count(): await pg.click('[data-mk=renew]'); await pg.wait_for_timeout(80)
        if await pg.locator('[data-mk=list]:not([disabled])').count(): await pg.click('[data-mk=list]'); await pg.click('[data-mk=list]'); await pg.wait_for_timeout(80)
        await pg.screenshot(path=f'{OUT}/w2-market2-{W}.png', full_page=True)
        print('pro', await pg.evaluate("JSON.stringify({lst:S.pro.listed, y:S.year, renew:S.pro.renewAsk, cy:S.pro.cyrs, w:S.pro.wage})"))
        # 設定：大字、深色、只顯示把握程度
        await pg.click('#t-menu'); await pg.click('#m-set')
        for sel in ['[data-sk=fz][data-sv="1.12"]','[data-sk=theme][data-sv=dark]','[data-sk=odds][data-sv="0"]']: await pg.click(sel)
        await pg.screenshot(path=f'{OUT}/w3-set2-{W}.png'); await pg.click('#set-back'); await pg.click('#m-close')
        # 國際大賽
        await pg.evaluate("SET.match='play'; S.year = S.year%2 ? S.year : S.year+1; S.pos!=='GK' && (S.m.conf=60); UI.newPage('測試'); tourney('英格蘭', 0, () => UI.idle())")
        shots = {}
        async def sh(k):
            if k in shots: return
            shots[k]=1; await pg.locator('#feed .card').last.scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/w4-pen-{W}.png')
        for _ in range(4):
            r = await handle(600, '親自上陣', sh)
            if r!='limit': break
        await pg.screenshot(path=f'{OUT}/w5-tourney-{W}.png')
        print('honours', await pg.evaluate("S.honours.filter(h=>h.intl).map(h=>h.t).join(', ')"), 'fz', await pg.evaluate("getComputedStyle(document.body).zoom"))
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
