import sys,asyncio
from playwright.async_api import async_playwright
async def main(files):
    async with async_playwright() as p:
        b=await p.chromium.launch()
        for f in files:
            pg=await b.new_page(viewport={'width':1000,'height':980},device_scale_factor=1)
            await pg.goto('file:///workspace/work/diseno/direcciones/'+f); await pg.wait_for_load_state('networkidle'); await pg.evaluate('document.fonts.ready.then(()=>1)'); await pg.wait_for_timeout(800)
            await pg.screenshot(path=f.replace('.html','.png'),full_page=True)
            print('ok',f)
        await b.close()
asyncio.run(main(sys.argv[1:]))
