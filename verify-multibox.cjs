const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
script=script.replace(/\}\)\(\);\s*$/, 'globalThis.game={state,BoxState,deal,modify,decide,resolveRound,newHand,renderCards,bestHand,playerHand,compareEval,dealerQualifies,sortHand,insuranceMax,chooseDealerCard};})();');
const node=()=>({children:[],style:{setProperty(){}},dataset:{},classList:{toggle(){},remove(){}},setAttribute(){},focus(){},scrollIntoView(){},showModal(){this.open=true;},close(){this.open=false;},addEventListener(){},querySelector(){return node();},querySelectorAll(){return [];}});
const pageIds=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]));
const elements={};const document={getElementById(id){assert(pageIds.has(id),'Missing HTML element: '+id);return elements[id]??=node();}};
const cards=()=>Array.from({length:6},node);
document.getElementById('boxStack').querySelectorAll=()=>Array.from({length:3},()=>({children:cards()}));
document.getElementById('boxStack').querySelector=()=>({querySelector:()=>({children:cards()}),scrollIntoView(){}});
document.getElementById('dealerCards').children=cards();
const context=vm.createContext({document,window:{matchMedia:()=>({matches:true})},setTimeout:callback=>{callback();return 0;},console});
vm.runInContext(script,context);
const {state,BoxState,deal,modify,decide,resolveRound,newHand,bestHand,dealerQualifies,sortHand}=context.game;
const card=code=>({id:code,rank:({A:14,K:13,Q:12,J:11}[code.slice(0,-1)]||Number(code.slice(0,-1))),suit:code.slice(-1),label:code.slice(0,-1),symbol:code.slice(-1)});
const assertSorted=b=>{
 const expected=Array.from(b.hand).sort((a,b)=>b.rank-a.rank||a.suit.localeCompare(b.suit));
 const best=bestHand(b.hand);
 if(['straight','straightFlush'].includes(best.key)&&best.tiebreak[0]===5){while(expected[0].rank===14)expected.push(expected.shift());}
 assert.deepEqual(Array.from(b.hand,c=>c.id),expected.map(c=>c.id));
};
async function main(){
 const declineDealer=async()=>{while(state.phase==='dealerOffer')await elements.dealerSkipBtn.onclick();};
 for(const [codes,expected] of [
  [['AS','2H','3D','4C','5S'],[5,4,3,2,14]],
  [['AS','KS','QS','JS','10S'],[14,13,12,11,10]],
  [['AS','2S','3S','4S','5S'],[5,4,3,2,14]],
  [['AS','2H','3D','4C','5S','KH'],[13,5,4,3,2,14]],
  [['AS','2H','3D','4C','5S','6H'],[14,6,5,4,3,2]],
  [['AS','2H','3D','4C','9S'],[14,9,4,3,2]]
 ]){const b=new BoxState(1);b.hand=codes.map(card);b.selected.add(0);sortHand(b);assert.deepEqual(Array.from(b.hand,c=>c.rank),expected);assert.equal(b.selected.size,0);}
 assert.equal(state.phase,'startup');
 state.count=3;document.getElementById('startGame').onclick();
 assert.equal(state.phase,'betting');assert.equal(state.boxes.length,3);
 assert.equal(document.getElementById('startup').hidden,true);
 assert.equal(document.getElementById('app').inert,false);
 assert.equal(document.getElementById('dealBtn').disabled,false);
 await document.getElementById('dealBtn').onclick();
 assert.equal(state.phase,'playing');assert.equal(state.busy,false);
 assert(state.boxes.every(b=>b.hand.length===5));
 for(const count of [1,2,3]){
  state.count=count;state.phase='betting';state.bankroll=1000;state.boxes=Array.from({length:count},(_,i)=>new BoxState(i+1));state.active=0;
  await deal();assert.equal(state.bankroll,1000-count*10);assert.equal(state.dealer.length,5);
  state.boxes.forEach(assertSorted);
  const ids=[...state.dealer,...state.boxes.flatMap(b=>b.hand)].map(c=>c.id);assert.equal(new Set(ids).size,5*(count+1));
  if(count===3){const other=state.boxes[1].hand.map(c=>c.id).join();state.boxes[0].selected.add(0);await modify();assert.equal(state.boxes[0].fee,10);assert.equal(state.boxes[1].hand.map(c=>c.id).join(),other);assert.equal(state.boxes[0].pending.size,1);assert.equal(state.active,1);assert(elements.boxStack.innerHTML.includes('exchange-pending'));state.active=0;const bank=state.bankroll;await modify(true);await decide(false);assert.equal(state.bankroll,bank);assert.equal(state.boxes[0].status,'postDraw');state.active=1;await modify(true);assert.equal(state.boxes[1].pending.size,1);assert.equal(state.boxes[0].pending.size,1);await decide(true);assert(state.boxes.every(b=>b.pending.size===0));assert.equal(state.active,0);}
  await decide(true);if(count>1)assert.equal(state.phase,'playing');while(state.phase==='playing')await decide(true);
  assert.equal(state.phase,'round');newHand();assert.equal(state.boxes.length,count);assert.equal(state.phase,'betting');
 }
 // Use a known low-card replacement to ensure pending cards are not sorted early.
 state.count=2;state.phase='betting';state.bankroll=1000;await deal();
 const first=state.boxes[0];first.hand=['AS','KH','9D','6C','3S'].map(card);first.selected.add(0);state.deck.cards.push(card('2H'));
 await modify();assert.equal(first.hand[0].id,'2H');assert(first.pending.has(0));
 assert.equal(first.originals.get(0).id,'AS');
 const pendingRow=elements.boxStack.innerHTML.split('</section>')[0];
 assert(pendingRow.includes('AS awaiting replacement'));
 assert(!pendingRow.includes('Select 2H')&&!pendingRow.includes('2H awaiting replacement'));
 assert(pendingRow.includes('exchange-pending'));
 state.active=0;document.getElementById('sortAfterBtn').onclick();assert.equal(first.hand[0].id,'2H');state.active=1;
 await decide(true);assert.equal(first.pending.size,0);assert.equal(first.originals.size,0);assertSorted(first);assert.equal(first.hand[4].id,'2H');assert.equal(first.selected.size,0);
 state.count=1;state.phase='betting';state.bankroll=1000;await deal();state.deck.cards.push(card('AS'));await modify(true);assertSorted(state.boxes[0]);assert.equal(state.boxes[0].hand.length,6);assert.equal(state.boxes[0].pending.size,0);
 state.count=3;state.phase='betting';state.bankroll=20;await deal();assert.equal(state.phase,'betting');assert.equal(state.bankroll,20);
 const ak=bestHand(['AS','KD','8C','6H','2D'].map(card));assert.equal(ak.key,'aceKing');assert.equal(ak.payout,1);assert(dealerQualifies(ak));assert(!dealerQualifies(bestHand(['AS','QD','8C','6H','2D'].map(card))));assert.equal(bestHand(['AS','KD','8C','6H','2D','2C'].map(card)).key,'pair');
 state.boxes=Array.from({length:3},(_,i)=>new BoxState(i+1));state.active=0;state.phase='playing';state.bankroll=100;state.roundStart=200;
 state.dealer=['2D','6H','AS','8C','KD'].map(card);
 const hands=[['2S','2C','9D','7H','4S'],['9S','8D','7C','6C','5H'],['AH','KC','8H','6D','2H']];
 state.boxes.forEach((b,i)=>{b.ante=10;b.bet=i===0?0:20;b.fee=i===1?10:0;b.status=i===0?'folded':'bet';b.hand=hands[i].map(card);});
 resolveRound();assertSorted({hand:state.dealer});assert.equal(state.bankroll,240);assert.deepEqual(Array.from(state.boxes,b=>b.net),[-10,70,0]);resolveRound();assert.equal(state.bankroll,240);
 state.phase='playing';state.boxes[0].status='decision';state.active=0;state.bankroll=19;await decide(false);assert.equal(state.boxes[0].status,'decision');assert.equal(state.bankroll,19);
 // Insurance eligibility, popup edits, commitment, settlement and reset.
 const straight=['9S','8D','7C','6C','5H'].map(card);
 const setups=()=>{state.count=1;state.active=0;state.phase='playing';state.busy=false;state.bankroll=990;state.roundStart=1000;state.dealer=['AS','KD','8H','4C','2D'].map(card);state.boxes=[new BoxState(1)];const b=state.boxes[0];b.ante=10;b.status='decision';b.hand=straight.slice();return b;};
 for(const [dealerCodes,net,label] of [
  [['QS','JD','8H','4C','2D'],30,'WON'],
  [['AS','KD','8H','4C','2D'],60,'LOST'],
  [['AS','AD','AH','KC','KD'],-30,'RETURNED'],
  [['9H','8C','7D','6S','5C'],0,'RETURNED']
 ]){
  const b=setups();assert.equal(context.game.insuranceMax(b),40);
  elements.insuranceBtn.onclick();assert.equal(elements.insuranceDialog.open,true);
  elements.insuranceSlider.value=20;elements.insuranceOk.onclick();assert.equal(b.insurance,20);assert.equal(state.bankroll,990);
  state.dealer=dealerCodes.map(card);await decide(false);
  await declineDealer();
  assert.equal(b.insurancePaid,20);assert.equal(b.net,net);assert.equal(state.bankroll,1000+net);assert(b.result.includes('INS '+label));
  resolveRound();assert.equal(state.bankroll,1000+net);newHand();assert.equal(state.boxes[0].insurance,0);
 }
 let insured=setups();state.bankroll=39;assert.equal(context.game.insuranceMax(insured),10);state.bankroll=29;assert.equal(context.game.insuranceMax(insured),0);
 state.bankroll=990;insured.pending.add(0);assert.equal(context.game.insuranceMax(insured),0);insured.pending.clear();insured.hand=['AS','AD','9H','4C','2D'].map(card);assert.equal(context.game.insuranceMax(insured),0);
 insured=setups();elements.insuranceBtn.onclick();elements.insuranceSlider.value=20;elements.insuranceCancel.onclick();assert.equal(insured.insurance,0);
 elements.insuranceBtn.onclick();elements.insuranceSlider.value=20;elements.insuranceOk.onclick();assert.equal(insured.insurance,20);elements.insuranceOff.onclick();assert.equal(insured.insurance,0);
 insured.insurance=20;insured.selected.add(0);await modify();assert.equal(insured.insurance,0);
 insured=setups();insured.insurance=20;state.bankroll=39;await decide(false);assert.equal(insured.status,'decision');assert.equal(state.bankroll,39);
 insured=setups();insured.insurance=20;await decide(true);assert.equal(insured.insurancePaid,0);assert.equal(insured.net,-10);
 // Ace–King adds a payout without promoting the primary hand or reusing only its cards.
 for(const [codes,key,payout] of [
  [['AS','KD','2H','2C','4D'],'pair',2],
  [['AS','KD','3H','3C','3D'],'trips',4],
  [['AS','AH','2H','2C','KD'],'twoPair',3],
  [['AS','KS','KH','KC','KD'],'quads',21],
  [['AS','KD','8H','4C','2D'],'aceKing',1],
  [['AS','KD','QH','JC','10D'],'straight',4],
  [['AS','KS','9S','6S','2S'],'flush',5],
  [['AS','KS','QS','JS','10S'],'royal',100],
  [['AS','AH','AD','KC','KD'],'fullHouse',7],
  [['AS','KD','2H','2C','4D','7S'],'pair',2],
  [['AS','2D','3H','4C','5D','KS'],'straight',5],
  [['AS','AH','2H','2C','2D','KD'],'fullHouse',8],
  [['AS','KS','9S','6S','2S','KD'],'flush',6],
  [['AS','KS','QS','JS','10S','KD'],'royal',101],
  [['AS','KS','9S','6S','2S','4D'],'flush',5]
 ]){
  const cards=codes.map(card),hand=context.game.playerHand(cards),primary=bestHand(cards);
  assert.equal(hand.key,key);assert.equal(hand.payout,payout,codes.join(' '));
  assert.equal(context.game.compareEval(hand,primary),0);
  assert.equal(hand.name.includes('+ Ace–King'),payout>primary.payout);
 }
 for(const [dealerCodes,net,result] of [
  [['QS','QD','8H','4C','5D'],80,'WON'],
  [['4S','5D','6H','7C','8D'],-30,'LOST'],
  [['AH','KC','3S','3D','3C'],0,'PUSH'],
  [['QS','JD','8H','4C','2D'],10,'NO GAME']
 ]){
  const b=setups();b.hand=['AS','KD','3H','3C','3D'].map(card);state.dealer=dealerCodes.map(card);
  assert.equal(context.game.insuranceMax(b),40);
  context.game.renderCards();assert(elements.boxStack.innerHTML.includes('Three of a Kind + Ace–King'));
  await decide(false);await declineDealer();assert.equal(b.net,net);assert(b.result.startsWith(result));
  assert.equal(state.bankroll,1000+b.net);
 }
 // A pair + Ace–King still loses to two pair and cannot be insured.
 insured=setups();insured.hand=['AS','KD','2H','2C','4D'].map(card);
 assert.equal(context.game.insuranceMax(insured),0);
 state.dealer=['5S','5D','6H','6C','8D'].map(card);await decide(false);assert.equal(insured.net,-30);
 insured=setups();insured.hand=['AS','KD','3H','3C','3D'].map(card);insured.insurance=40;
 state.dealer=['QS','QD','8H','4C','5D'].map(card);await decide(false);
 assert.equal(insured.insurancePaid,40);assert.equal(insured.net,40);assert.equal(state.bankroll,1040);
 // Dealer purchase: retains five original cards and uses best five of six, once per round.
 const dealerSetup=(count=1,playerCodes=['9S','8D','7C','6C','5H'])=>{
  state.count=count;state.active=0;state.phase='playing';state.busy=false;state.roundStart=1000;state.bankroll=1000-count*30;
  state.dealer=['AS','QD','8H','4C','2D'].map(card);state.deck.cards=['7H','QH'].map(card);
  state.boxes=Array.from({length:count},(_,i)=>{const b=new BoxState(i+1);b.ante=10;b.bet=20;b.status='bet';b.hand=playerCodes.map(card);return b;});
  resolveRound();assert.equal(state.phase,'dealerOffer');assert.equal(elements.dealerControls.hidden,false);
  assert(!elements.dealerCards.innerHTML.includes('face-down'));return state.boxes;
 };
 for(const [codes,draw,net,label] of [
  [['9S','8D','7C','6C','5H'],'QH',70,'WON'],
  [['3S','3D','7C','6C','5H'],'QH',-40,'LOST'],
  [['AH','QC','8S','4D','2C'],'KH',-40,'LOST'],
  [['AH','QC','8S','4D','2C'],'AD',-40,'LOST'],
  [['AH','QH','8S','4D','2C'],'3H',0,'NO GAME'],
  [['9S','8D','7C','6C','5H'],'KS',-40,'LOST'],
  [['3S','4D','6C','7C','9S'],'8D',-40,'LOST']
 ]){
  const [b]=dealerSetup(1,codes);if(draw==='KS')state.dealer=['QS','10S','7S','4S','2D'].map(card);
  state.deck.cards=[card(draw)];const original=state.dealer.map(c=>c.id);
  await elements.dealerBuyBtn.onclick();assert.equal(state.phase,'round');assert.equal(state.dealer.length,6);
  assert(original.every(id=>state.dealer.some(c=>c.id===id)));assert.equal(new Set(state.dealer.map(c=>c.id)).size,6);
  assert.equal(b.dealerFee,10);assert.equal(b.net,net);assert.equal(state.bankroll,1000+net);assert(b.result.startsWith(label));
  assert.equal(elements.message.textContent,net>0?'+'+net:String(net));
  assert.equal(elements.message.className,'message '+(net>0?'win':net<0?'loss':'push')+' round-total');
  const balance=state.bankroll;await elements.dealerBuyBtn.onclick();resolveRound();assert.equal(state.bankroll,balance);
 }
 // A six-card straight ties the player's straight; the purchase fee remains lost.
 let [buyer]=dealerSetup(1,['9S','8D','7C','6C','5H']);state.dealer=['9H','8C','7D','6S','2H'].map(card);state.deck.cards=[card('5C')];
 await elements.dealerBuyBtn.onclick();assert.equal(buyer.net,-10);assert(buyer.result.startsWith('PUSH'));
 // Different boxes choose independently before one shared card is drawn.
 let boxes=dealerSetup(3);const before=state.deck.cards.length;
 await elements.dealerBuyBtn.onclick();assert.equal(state.active,1);assert.equal(state.dealer.length,5);
 await elements.dealerSkipBtn.onclick();assert.equal(state.active,2);assert.equal(state.dealer.length,5);
 await elements.dealerBuyBtn.onclick();assert.equal(state.deck.cards.length,before-1);
 assert.deepEqual(boxes.map(b=>b.net),[70,10,70]);assert.equal(state.bankroll,1150);
 newHand();assert(state.boxes.every(b=>b.dealerChoice===null&&b.dealerFee===0));
 [buyer]=dealerSetup();await elements.dealerSkipBtn.onclick();assert.equal(buyer.net,10);assert.equal(state.dealer.length,5);
 [buyer]=dealerSetup();state.bankroll=9;context.game.renderCards();assert.equal(elements.dealerBuyBtn.disabled,true);
 await elements.dealerBuyBtn.onclick();assert.equal(buyer.dealerChoice,null);assert.equal(state.bankroll,9);
 state.busy=true;await elements.dealerSkipBtn.onclick();assert.equal(buyer.dealerChoice,null);state.busy=false;await declineDealer();
 // Insurance pays against the original reveal, even when the purchased card qualifies the dealer.
 [buyer]=dealerSetup();buyer.insurancePaid=20;buyer.insurance=20;state.bankroll-=20;
 await elements.dealerBuyBtn.onclick();assert.equal(buyer.net,90);assert.equal(state.bankroll,1090);assert(buyer.result.includes('INS WON'));
 // Qualifying dealers and all-folded rounds never offer a purchase.
 dealerSetup();state.phase='playing';state.dealer=['AS','KD','8H','4C','2D'].map(card);resolveRound();assert.equal(state.phase,'round');
 dealerSetup();state.phase='playing';state.boxes[0].status='folded';resolveRound();assert.equal(state.phase,'round');
 console.log('Passed: dealer sixth-card eligibility, fees, retained cards, best-five wins/losses/ties/no game, multibox choices, funds, insurance, repeat guards and reset.');
 console.log('Passed: five/six-card Ace–King second payouts, unchanged rankings, insurance maximum, labels, wins/losses/ties/no game.');
 console.log('Passed: insurance popup, eligibility, bankroll limits, all insurance outcomes, draw/fold cleanup and reset.');
 console.log('Passed: ace-low and ace-high sorting, automatic deal/draw sorting, pending exchange positions, 1–3 box dealing, unique cards, funds checks, settlement, and round reset.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
