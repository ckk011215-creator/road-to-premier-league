# 用「模擬至學期末」推進到職業期中段，截取主頁積分榜與一場職業比賽
import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1440,'height':900})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1')"); await pg.wait_for_timeout(200)
        await pg.click('#s-new'); await pg.click('[data-step="3"]'); await pg.click('.pp-spot[data-spot="AM"]'); await pg.click('[data-step="7"]'); await pg.click('#c-go')
        async def drain():
            for j in range(300):
                if await pg.locator('#end').is_visible() or await pg.locator('#modal').is_hidden(): return
                bt = pg.locator('#act button:not(.locked):not(.warn)')
                if await bt.count(): await bt.first.click()
                await pg.wait_for_timeout(15)
        for i in range(200):
            if await pg.locator('#end').is_visible(): break
            if await pg.evaluate('S.stage==="PRO" && !S.pro.semi && S.term===1'): break
            await pg.click('#b-auto'); await drain()
        for k in range(3):
            await pg.click('#b-adv'); await drain()
        await pg.screenshot(path=f'{OUT}/p1-prohome.png')
        await pg.click('#b-adv'); await pg.wait_for_timeout(100)
        bt = pg.locator('#act button', has_text='親自上陣')
        if await bt.count(): await bt.click(); await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/p2-promoment.png')
        print('stage', await pg.evaluate('S.stage+" "+S.age+" "+cName(curClub())'), 'errors', errs)
        await b.close()
asyncio.run(main())
