# 四項狀態的影響：熱誠高多一個選項、熱誠低冒險選項消失、自信與疲勞顯示在成功率、教練印象決定正選
import asyncio, sys
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
        async def opts():
            return await pg.evaluate("[...document.querySelectorAll('#act button')].map(b => b.innerText.replace(/\\n/g,' ').slice(0,110))")
        async def youth(love, conf, fat, coach, name):
            await pg.evaluate(f"S.stage='ACA'; S.age=13; S.aca=S.aca||{{club:'ARS',cat:1,since:13}}; S.m.love={love}; S.m.conf={conf}; S.m.fat={fat}; S.m.coach={coach}; S.inj={{w:0,n:''}}; SET.match='play'; refreshSide(); UI.newPage('測試'); playMatch({{ tag:'U14 聯賽', home:'阿仙奴 U14', opp:'車路士 U14', lvl:60, diff:0, stake:1, youth:true, n:2 }}, () => UI.idle())")
            for i in range(6):
                o = await opts()
                if any('成功率' in x for x in o): break
                await pg.locator('#act button:not(.locked)').first.click(); await pg.wait_for_timeout(60)
            await pg.wait_for_timeout(200); await pg.screenshot(path=f'{OUT}/meters-{name}-{W}.png')
            print(name, len(o), o)
        await youth(82, 80, 72, 70, 'hi')
        await youth(30, 40, 30, 40, 'lo')
        # 教練印象與正選機會
        r = await pg.evaluate("[20,40,60,80].map(c => { S.m.coach=c; return [c, startChance()]; })")
        print('start chance', r)
        print('side', await pg.inner_text('#side-m'))
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
