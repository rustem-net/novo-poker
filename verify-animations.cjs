const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');

(async()=>{
 const browser=await chromium.launch({headless:true,channel:process.env.LAYOUT_BROWSER||'chrome'});
 try{
  for(const count of [1,3]){
   const page=await browser.newPage({viewport:{width:390,height:740},reducedMotion:'no-preference'});
   await page.addInitScript(()=>{
    window.cardAnimations=[];
    const original=Element.prototype.animate;
    Element.prototype.animate=function(frames,options){
     const animation=original.call(this,frames,options);
     if(this.classList.contains('card')){
      const event={id:this.dataset.cardId,duration:options.duration,start:performance.now()};
      window.cardAnimations.push(event);
      animation.finished.then(()=>event.end=performance.now()).catch(()=>{});
     }
     return animation;
    };
   });
   await page.goto(pathToFileURL(path.resolve('index.html')).href);
   await page.locator(`[data-count="${count}"]`).click();await page.locator('#startGame').click();
   await page.locator('#dealBtn').click();
   await page.waitForFunction(()=>!document.getElementById('betBtn').disabled);
   await page.evaluate(()=>window.cardAnimations=[]);
   const cards=page.locator('.box-row').first().locator('.card');
   await cards.nth(0).click();await cards.nth(1).click();await page.locator('#drawBtn').click();
   if(count===3){
    assert.equal(await page.locator('.exchange-pending').count(),2);
    assert.equal(await page.evaluate(()=>window.cardAnimations.length),0);
    await page.locator('#foldBtn').click();await page.locator('#foldBtn').click();
   }
   await page.waitForFunction(()=>window.cardAnimations.some(a=>a.duration===360));
   assert(await page.locator('#betAfterBtn').isDisabled(),'Bet must stay locked during dealing');
   await page.waitForFunction(()=>!document.getElementById('betAfterBtn').disabled);
   const events=await page.evaluate(()=>window.cardAnimations);
   const draws=events.filter(a=>a.duration===360);
   assert.equal(draws.length,2);assert(draws[1].start>=draws[0].end-5,'Replacement cards must arrive sequentially');
   const sorts=events.filter(a=>a.duration===620);
   // A random hand can already be sorted; whenever cards move, they must wait for dealing.
   assert(sorts.every(a=>a.start>=draws[1].end+180),'Sorting must follow the last replacement with a pause');
   assert.equal(await page.locator('.exchange-pending').count(),0);
   assert.equal(await page.locator('.card[style*="opacity: 0"]').count(),0);
   await page.close();
  }
  console.log('Passed: sequential replacement animations, delayed sorting, multi-box reveal barrier, and locked controls.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
