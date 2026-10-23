import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width':1440,'height':900})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('file:///home/claude/grassroots/dist/grassroots.html'); await pg.evaluate("localStorage.setItem('g2p-tut','1')"); await pg.wait_for_timeout(200)
        await pg.click('#s-new'); await pg.click('[data-step="7"]'); await pg.click('#c-go')
        for i in range(3):
            await pg.click('#b-auto')
            for j in range(80):
                if await pg.locator('#modal').is_hidden(): break
                bt = pg.locator('#act button:not(.locked):not(.warn)')
                if await bt.count(): await bt.first.click()
                await pg.wait_for_timeout(20)
        d1 = await pg.locator('#g-date').inner_text()
        await pg.click('#t-menu'); await pg.click('#m-home'); await pg.wait_for_timeout(100)
        await pg.click('[data-cont]'); await pg.wait_for_timeout(100)
        d2 = await pg.locator('#g-date').inner_text()
        print('resume same date', d1==d2, d1)
        await pg.reload(); await pg.wait_for_timeout(200); await pg.click('[data-cont]'); print('after reload', await pg.locator('#g-date').inner_text())
        await pg.click('#b-adv'); await pg.wait_for_timeout(100); print('modal open', await pg.locator('#modal').is_visible())
        await b.close(); print('errors', errs)
asyncio.run(main())
