const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
// Expose state only in the test document so the new phase is deterministic.
const testHtml=fs.readFileSync('index.html','utf8').replace('renderCards();$(\'boxChoice\').querySelector(\'button\').focus();',
 'globalThis.layoutGame={state,BoxState,resolveRound};renderCards();$(\'boxChoice\').querySelector(\'button\').focus();');

(async () => {
  const browser = await chromium.launch({headless:true,channel:process.env.LAYOUT_BROWSER||'chrome'});
  try {
    for (const [width,height] of [[390,844],[390,740],[390,664],[375,600],[844,390]]) {
      for (const count of [1,2,3]) {
        const page = await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
        await page.setContent(testHtml);
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
        if(count>1){
          const original=await page.locator('.box-row').first().locator('.card').first().innerText();
          await page.locator('.box-row').first().locator('.card').first().click();
          await page.locator('#drawBtn').click();
          const pending=page.locator('.exchange-pending');
          assert.equal(await pending.count(),1);
          assert.equal(await pending.innerText(),original);
          await check('pending exchange');
        }
        await page.locator('#sixthBtn').click();
        await check('sixth card');
        await page.locator('#rulesBtn').click();
        assert(await page.locator('#rulesDialog').evaluate(el=>el.open));
        await page.locator('#closeRulesBtn').click();
        await page.evaluate(()=>{
          const {state,BoxState,resolveRound}=layoutGame;
          const card=(rank,suit)=>state.deck.cards.find(c=>c.rank===rank&&c.suit===suit);
          state.deck.reset();state.bankroll=1000;state.busy=false;state.phase='playing';state.active=0;
          state.dealer=[card(14,'S'),card(12,'D'),card(8,'H'),card(4,'C'),card(2,'D')];
          const hand=[card(9,'S'),card(8,'D'),card(7,'C'),card(6,'C'),card(5,'H')];
          state.boxes=Array.from({length:state.count},(_,i)=>{
            const b=new BoxState(i+1);b.ante=10;b.bet=20;b.status='bet';b.hand=hand.slice();return b;
          });
          state.deck.cards=[card(12,'H')];resolveRound();
        });
        await check('dealer purchase offer');
        assert(await page.locator('#dealerBuyBtn').isVisible());
        assert.equal(await page.locator('#dealerCards .face-down').count(),0);
        for(let i=0;i<count;i++) await page.locator('#dealerBuyBtn').click();
        await page.locator('#newHandBtn').waitFor({state:'visible'});
        await check('six-card dealer settlement');
        assert.equal(await page.locator('#dealerCards .card').count(),6);
        const dealerOverflow=await page.locator('#dealerCards').evaluate(el=>el.scrollWidth>el.clientWidth+1);
        assert(!dealerOverflow,'Six dealer cards overflow horizontally');
        if(count===3&&height===740) await page.screenshot({path:path.join(require('node:os').tmpdir(),'novo-layout.png')});
        await page.close();
      }
    }
    console.log('Passed: viewport fit, equal box heights, visible cards, rules popup, dealer purchase controls and six-card dealer for 1–3 boxes at five viewport sizes.');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
