import asyncio
from playwright.async_api import async_playwright
OUT='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1440,'height':900})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=f'{OUT}/c0-start.png')
        await pg.click('#s-new'); await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/c1-basic.png')
        await pg.click('[data-step="3"]'); await pg.click('.pp-spot[data-spot="RCB"]'); await pg.screenshot(path=f'{OUT}/c2-pos.png')
        await pg.click('#c-rec'); await pg.click('[data-step="4"]'); await pg.screenshot(path=f'{OUT}/c3-role.png')
        await pg.click('[data-step="7"]'); await pg.screenshot(path=f'{OUT}/c4-confirm.png')
        await pg.click('#c-go'); await pg.wait_for_timeout(200); await pg.screenshot(path=f'{OUT}/c5-tut.png')
        for i in range(5):
            bt = pg.locator('#act button.main')
            if await bt.count() and await pg.locator('#modal').is_visible(): await bt.click()
        await pg.click('#t-menu'); await pg.click('#m-home'); await pg.wait_for_timeout(100); await pg.screenshot(path=f'{OUT}/c6-start2.png')
        print('errors', errs)
        await b.close()
asyncio.run(main())
