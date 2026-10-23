# 雲端存檔：A 裝置建立同步碼並上載；B 裝置輸入同步碼下載（模擬 Supabase RPC）
import asyncio, json, random
from playwright.async_api import async_playwright
STORE = {}
async def route(r):
    body = json.loads(r.request.post_data or '{}'); url = r.request.url
    if url.endswith('/rpc/cloud_put'): STORE[body['p_key']] = body['p_data']; await r.fulfill(status=200, content_type='application/json', body='"2026-10-22T16:00:00+00:00"')
    elif url.endswith('/rpc/cloud_get'): d = STORE.get(body['p_key']); await r.fulfill(status=200, content_type='application/json', body=json.dumps([{ 'data':d, 'updated_at':'2026-10-22T16:00:00+00:00' }] if d else []))
    else: await r.fulfill(status=200, content_type='application/json', body='[]')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        A = await (await b.new_context(viewport={'width':1280,'height':900}, permissions=['clipboard-read','clipboard-write'])).new_page(); A.on('pageerror', lambda e: errs.append('A '+str(e)))
        await A.route('https://mukstblfcejgxwhkiajo.supabase.co/**', route)
        await A.goto('file:///home/claude/grassroots/dist/grassroots.html'); await A.evaluate("localStorage.setItem('g2p-tut','1')"); await A.reload(); await A.wait_for_timeout(300)
        await A.click('#s-new'); await A.click('[data-step="7"]'); await A.click('#c-go'); await A.wait_for_timeout(200)
        await A.click('#b-adv'); await A.wait_for_timeout(200)
        for i in range(40):
            if await A.locator('#modal').is_hidden(): break
            btn = A.locator('#act button:not(.locked):not(.warn)')
            if await btn.count(): await btn.first.click()
            await A.wait_for_timeout(30)
        state = await A.evaluate("JSON.stringify({ seed:S.seed, age:S.age, ci:S.ci })")
        await A.click('#t-menu'); await A.click('#m-home'); await A.wait_for_timeout(200)
        await A.click('#s-cloud'); await A.click('#cl-new'); await A.wait_for_timeout(500)
        await A.screenshot(path='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots/cl1.png')
        code = await A.evaluate("syncCfg().code"); print('code', len(code), 'stored', len(STORE))
        B = await (await b.new_context(viewport={'width':390,'height':844})).new_page(); B.on('pageerror', lambda e: errs.append('B '+str(e)))
        await B.route('https://mukstblfcejgxwhkiajo.supabase.co/**', route)
        await B.goto('file:///home/claude/grassroots/dist/grassroots.html'); await B.evaluate("localStorage.setItem('g2p-tut','1')"); await B.reload(); await B.wait_for_timeout(300)
        await B.click('#s-cloud'); await B.fill('#cl-code', code.lower().replace('-', ' ')); await B.click('#cl-use'); await B.wait_for_timeout(500)
        await B.screenshot(path='/tmp/claude-0/-home-claude/ee78c29d-338b-5574-994f-9d452f98def4/scratchpad/shots/cl2.png')
        await B.click('#cr-go'); await B.click('#cr-go'); await B.wait_for_timeout(300)
        await B.click('[data-cont="0"]'); await B.wait_for_timeout(200)
        print('same', await B.evaluate("JSON.stringify({ seed:S.seed, age:S.age, ci:S.ci })") == state, 'errors', errs[:3])
        await b.close()
asyncio.run(main())
