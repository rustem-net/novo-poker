const assert = require('node:assert/strict');
const {pathToFileURL} = require('node:url');
const path = require('node:path');
const {chromium} = require('playwright');

(async () => {
  const browser = await chromium.launch({headless:true,channel:process.env.LAYOUT_BROWSER||'chrome'});
  try {
    for (const [width,height] of [[390,844],[390,740],[390,664],[375,600],[844,390]]) {
      for (const count of [1,2,3]) {
        const page = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
        await page.goto(pathToFileURL(path.resolve('index.html')).href);
        await page.locator(`[data-count="${count}"]`).click();
        await page.locator('#startGame').click();
        async function check(phase) {
          const layout = await page.evaluate(() => {
            const bounds = selector => [...document.querySelectorAll(selector)].map(el => {
              const r=el.getBoundingClientRect();
              return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,scroll:el.scrollHeight,client:el.clientHeight};
            });
            return {height:innerHeight,width:innerWidth,body:document.documentElement.scrollHeight,wide:document.documentElement.scrollWidth,rows:bounds('.box-row'),cards:bounds('.box-row .card'),dock:bounds('.action-dock'),dealer:bounds('.dealer')};
          });
          const label=`${width}×${height}, ${count} boxes, ${phase}`;
          assert(layout.body<=height+1,`${label}: page scrolls`);
          assert(layout.wide<=width,`${label}: horizontal overflow`);
          assert.equal(layout.rows.length,count);
          for(const r of [...layout.rows,...layout.dock,...layout.dealer]) {
            assert(r.top>=0&&r.bottom<=height+1,`${label}: region outside viewport`);
            assert(r.scroll<=r.client+1,`${label}: region content overflows`);
          }
          for(const c of layout.cards) assert(c.height>0&&c.width>0,`${label}: card collapsed`);
          assert(Math.max(...layout.rows.map(r=>r.height))-Math.min(...layout.rows.map(r=>r.height))<1,`${label}: unequal box heights`);
        }
        await check('betting');
        await page.locator('#dealBtn').click();
        await check('decision');
        await page.locator('#sixthBtn').click();
        await check('sixth card');
        await page.locator('#rulesBtn').click();
        assert(await page.locator('#rulesDialog').evaluate(el=>el.open));
        await page.locator('#closeRulesBtn').click();
        if(count===3&&height===740) await page.screenshot({path:path.join(require('node:os').tmpdir(),'novo-layout.png')});
        await page.close();
      }
    }
    console.log('Passed: viewport fit, equal box heights, visible cards, and rules popup for 1–3 boxes at five viewport sizes.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
