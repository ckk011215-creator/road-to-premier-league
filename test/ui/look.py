# 自訂外貌：建立球員、側欄、生活頁、比賽動畫
import asyncio, sys
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
W = int(sys.argv[1]) if len(sys.argv)>1 else 1440
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':W,'height':900 if W>500 else 844})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1')"); await pg.reload(); await pg.wait_for_timeout(300)
        await pg.click('#s-new'); await pg.click('[data-step="6"]'); await pg.wait_for_timeout(100)
        for sel in ['[data-lk=s][data-lv="#5e3a24"]','[data-lk=st][data-lv=afro]','[data-lk=h][data-lv="#1b1b1b"]','[data-lk=f][data-lv=beard]','[data-lk=hb][data-lv="#f4f4ee"]','[data-lk=tat][data-lv=both]','[data-lk=bt][data-lv="#5ee36a"]']:
            await pg.click(sel); await pg.wait_for_timeout(40)
        await pg.screenshot(path=f'{OUT}/l1-create-{W}.png', full_page=True)
        await pg.click('[data-step="7"]'); await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/l2-confirm-{W}.png')
        await pg.click('#c-go'); await pg.wait_for_timeout(200)
        print('look', await pg.evaluate("JSON.stringify(S.look)"))
        await pg.click('#b-adv'); await pg.wait_for_timeout(100)
        for i in range(40):
            if await pg.locator('#feed .card.moment').count(): break
            btn = pg.locator('#act button:not(.locked):not(.warn)')
            if not await btn.count(): 
                if await pg.locator('#modal').is_hidden(): await pg.click('#b-adv')
                await pg.wait_for_timeout(50); continue
            t = [await btn.nth(j).inner_text() for j in range(await btn.count())]
            k = next((j for j,x in enumerate(t) if '親自上陣' in x), 0)
            await btn.nth(k).click(); await pg.wait_for_timeout(40)
        if await pg.locator('#feed .card.moment').count():
            await pg.locator('#feed .card.moment').last.scroll_into_view_if_needed(); await pg.wait_for_timeout(400); await pg.screenshot(path=f'{OUT}/l3-moment-{W}.png')
        await pg.evaluate("closeModal()"); await pg.click('.snav button[data-t=life]'); await pg.wait_for_timeout(100)
        await pg.click('[data-lk=st][data-lv=mohawk]'); await pg.wait_for_timeout(100)
        await pg.locator('.lookp').scroll_into_view_if_needed(); await pg.screenshot(path=f'{OUT}/l4-life-{W}.png')
        print('after', await pg.evaluate("JSON.stringify(S.look)"), 'skin swatches in life', await pg.locator('.lookp [data-lk=s]').count())
        print('errors', errs[:5])
        await b.close()
asyncio.run(main())
