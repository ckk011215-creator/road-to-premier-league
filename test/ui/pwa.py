# PWA：service worker 註冊、離線重新載入
import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); ctx = await b.new_context(); pg = await ctx.new_page()
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8765/'); await pg.wait_for_timeout(1500)
        print('sw', await pg.evaluate("navigator.serviceWorker.controller ? 'controlled' : 'not yet'"), await pg.evaluate("navigator.serviceWorker.getRegistration().then(r => !!r)"))
        await pg.reload(); await pg.wait_for_timeout(800)
        print('controlled after reload', await pg.evaluate("!!navigator.serviceWorker.controller"))
        await ctx.set_offline(True); await pg.reload(); await pg.wait_for_timeout(800)
        print('offline title', await pg.title(), 'start visible', await pg.locator('#start').is_visible())
        man = await pg.evaluate("fetch('manifest.webmanifest').then(r=>r.json()).then(j=>j.short_name)")
        print('manifest', man, 'errors', errs[:3])
        await b.close()
asyncio.run(main())
