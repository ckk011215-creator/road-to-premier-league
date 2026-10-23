# 排行榜：本機紀錄、全球排行榜（模擬 Supabase 回應）、上載
import asyncio, json, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
W = int(sys.argv[1]) if len(sys.argv)>1 else 1440
ROWS = [{"name":"大衛・史密夫","score":2310,"tier":"英超傳奇","pos":"中鋒","diff":"hard","pl_apps":420,"goals":260,"caps":63,"honours":"英超冠軍、英超金靴","created_at":"2026-10-22"},
        {"name":"Jason","score":980,"tier":"英超巨星","pos":"進攻中場","diff":"normal","pl_apps":250,"goals":70,"caps":12,"honours":"FA Cup 冠軍","created_at":"2026-10-22"}]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':W,'height':900 if W>500 else 844})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e))); posted=[]
        async def route(r):
            if r.request.method=='POST': posted.append(r.request.post_data); await r.fulfill(status=201, body='')
            else: await r.fulfill(status=200, content_type='application/json', body=json.dumps(ROWS))
        await pg.route('https://lbtest.supabase.co/**', route)
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1')"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('#s-lb'); await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/b0-off-{W}.png')
        await pg.click('#lb-close')
        await pg.evaluate("LB_CFG.url='https://lbtest.supabase.co'; LB_CFG.key='anon-test'")
        await pg.click('#s-new'); await pg.click('[data-step="7"]'); await pg.click('#c-go'); await pg.wait_for_timeout(200)
        await pg.evaluate("S.stage='PRO'; S.hist.push({ y:S.year, age:S.age, club:Object.keys(S.W.clubs)[0], lg:'PL', loan:false, role:'正選', r:0, app:30, g:12, a:5, cs:0, rt:7.4 }); addHonour('英超冠軍', {role:0}); UI.newPage('t'); S.after={path:'family', t:'測試'}; endGame('測試退役')")
        await pg.wait_for_timeout(300)
        await pg.locator('.lb-end').scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/b1-end-{W}.png')
        await pg.fill('#lb-name', '測試玩家'); await pg.click('#lb-send'); await pg.wait_for_timeout(300)
        print('posted', posted[:1], await pg.inner_text('#lb-msg'))
        await pg.click('#lb-open'); await pg.wait_for_timeout(400); await pg.screenshot(path=f'{OUT}/b2-global-{W}.png')
        await pg.click('[data-bt=local]'); await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/b3-local-{W}.png')
        print('local', await pg.evaluate("recAll().length"))
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
