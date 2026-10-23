# 職業期新功能：賽季目標、生活頁（經紀人、商店）、戰報分頁與回放、存檔改名
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
        random.seed(5)
        async def handle(manual=False, limit=300, shot=None):
            for i in range(limit):
                if await pg.locator('#end').is_visible(): return 'end'
                if await pg.locator('#modal').is_hidden(): return 'closed'
                btn = pg.locator('#act button:not(.locked):not(.warn)')
                if not await btn.count(): btn = pg.locator('#act button:not(.locked)')
                n = await btn.count()
                if not n: await pg.wait_for_timeout(60); continue
                texts = [await btn.nth(j).inner_text() for j in range(n)]
                if shot and await pg.locator('#feed .card.mreport').count() and any('完成' in t for t in texts):
                    await shot(); shot = None
                k = next((j for j,t in enumerate(texts) if ('親自上陣' if manual else '模擬比賽') in t), None)
                if k is None: k = next((j for j,t in enumerate(texts) if '簽' in t or '接受' in t), None)
                if k is None: k = random.randrange(n)
                await btn.nth(k).click(); await pg.wait_for_timeout(20)
            return 'limit'
        for step in range(40):
            st = await pg.evaluate("S.stage + '|' + S.term + '|' + (S.season&&S.season.obj?1:0)")
            if st.startswith('PRO') and st.endswith('|1'): break
            await pg.click('#b-year'); await pg.wait_for_timeout(30)
            if await handle() == 'end': print('ended early'); break
        print('stage', await pg.evaluate("S.stage+' age '+S.age+' obj '+JSON.stringify(S.season&&S.season.obj)"))
        await pg.evaluate("S.money = 600000; renderView()")
        await pg.screenshot(path=f'{OUT}/p1-home-{W}.png', full_page=True)
        await pg.click('.snav button[data-t=life]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/p2-life-{W}.png', full_page=True)
        if await pg.locator('[data-ag="big"]').count(): await pg.click('[data-ag="big"]')
        await pg.click('[data-agask]'); await pg.click('[data-life="nutri"]'); await pg.click('[data-life="car"]'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/p3-life2-{W}.png', full_page=True)
        print('life', await pg.evaluate("JSON.stringify({a:S.agent, l:S.life, m:S.money, ask:S.pro.agentAsk})"))
        await pg.click('.snav button[data-t=home]')
        async def rep():
            card = pg.locator('#feed .card.mreport').last
            await card.scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/p4-rep-{W}.png')
            if await card.locator('[data-rp]').count():
                await card.locator('[data-rp]').first.click(); await pg.wait_for_timeout(1500)
                await card.locator('.mr-replay').scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/p5-replay-{W}.png')
            await card.locator('[data-mtab="1"]').click(); await pg.wait_for_timeout(80); await card.scroll_into_view_if_needed(); await card.screenshot(path=f'{OUT}/p6-stats-{W}.png')
            await card.locator('[data-mtab="2"]').click(); await pg.wait_for_timeout(80); await card.screenshot(path=f'{OUT}/p7-lineup-{W}.png')
        done = False
        for step in range(12):
            await pg.click('#b-adv'); await pg.wait_for_timeout(40)
            async def sh(): 
                nonlocal done; await rep(); done = True
            await handle(True, 80, None if done else sh)
            if done: break
        # 季尾結算
        await pg.click('#b-year'); await handle(); 
        print('flog', await pg.evaluate("S.flog.filter(f=>/目標|經紀/.test(f.t)).map(f=>f.t+':'+f.x).slice(0,4).join(' || ')"))
        # 存檔改名
        await pg.click('#t-menu'); await pg.wait_for_timeout(100)
        menu = await pg.locator('#menu button').all_inner_texts(); print('menu', menu)
        btn = pg.locator('#menu button', has_text='返回主畫面')
        if await btn.count(): await btn.first.click(); await pg.wait_for_timeout(200)
        await pg.click('[data-ren="0"]'); await pg.fill('.ren-in', '我的英超夢'); await pg.keyboard.press('Enter'); await pg.wait_for_timeout(100)
        await pg.screenshot(path=f'{OUT}/p8-slots-{W}.png')
        print('label', await pg.evaluate("JSON.parse(localStorage.getItem('g2p-slot-0')).S.label"))
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
