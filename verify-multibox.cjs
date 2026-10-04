const fs=require('fs'),vm=require('vm'),assert=require('assert');
const html=fs.readFileSync('index.html','utf8');
let script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
new vm.Script(script);
script=script.replace(/\}\)\(\);\s*$/, 'globalThis.game={state,BoxState,deal,modify,decide,resolveRound,newHand,renderCards,bestHand,dealerQualifies,sortHand};})();');
const node=()=>({children:[],style:{setProperty(){}},dataset:{},classList:{toggle(){},remove(){}},setAttribute(){},focus(){},scrollIntoView(){},addEventListener(){},querySelector(){return node();},querySelectorAll(){return [];}});
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
  if(count===3){const other=state.boxes[1].hand.map(c=>c.id).join();state.boxes[0].selected.add(0);await modify();assert.equal(state.boxes[0].fee,10);assert.equal(state.boxes[1].hand.map(c=>c.id).join(),other);assert.equal(state.boxes[0].pending.size,1);assert.equal(state.active,1);assert(elements.boxStack.innerHTML.includes('Replacement card hidden'));state.active=0;const bank=state.bankroll;await modify(true);await decide(false);assert.equal(state.bankroll,bank);assert.equal(state.boxes[0].status,'postDraw');state.active=1;await modify(true);assert.equal(state.boxes[1].pending.size,1);assert.equal(state.boxes[0].pending.size,1);await decide(true);assert(state.boxes.every(b=>b.pending.size===0));assert.equal(state.active,0);}
  await decide(true);if(count>1)assert.equal(state.phase,'playing');while(state.phase==='playing')await decide(true);
  assert.equal(state.phase,'round');newHand();assert.equal(state.boxes.length,count);assert.equal(state.phase,'betting');
 }
 // Use a known low-card replacement to ensure pending cards are not sorted early.
 state.count=2;state.phase='betting';state.bankroll=1000;await deal();
 const first=state.boxes[0];first.hand=['AS','KH','9D','6C','3S'].map(card);first.selected.add(0);state.deck.cards.push(card('2H'));
 await modify();assert.equal(first.hand[0].id,'2H');assert(first.pending.has(0));
 state.active=0;document.getElementById('sortAfterBtn').onclick();assert.equal(first.hand[0].id,'2H');state.active=1;
 await decide(true);assert.equal(first.pending.size,0);assertSorted(first);assert.equal(first.hand[4].id,'2H');assert.equal(first.selected.size,0);
 state.count=1;state.phase='betting';state.bankroll=1000;await deal();state.deck.cards.push(card('AS'));await modify(true);assertSorted(state.boxes[0]);assert.equal(state.boxes[0].hand.length,6);assert.equal(state.boxes[0].pending.size,0);
 state.count=3;state.phase='betting';state.bankroll=20;await deal();assert.equal(state.phase,'betting');assert.equal(state.bankroll,20);
 const ak=bestHand(['AS','KD','8C','6H','2D'].map(card));assert.equal(ak.key,'aceKing');assert.equal(ak.payout,1);assert(dealerQualifies(ak));assert(!dealerQualifies(bestHand(['AS','QD','8C','6H','2D'].map(card))));assert.equal(bestHand(['AS','KD','8C','6H','2D','2C'].map(card)).key,'pair');
 state.boxes=Array.from({length:3},(_,i)=>new BoxState(i+1));state.active=0;state.phase='playing';state.bankroll=100;state.roundStart=200;
 state.dealer=['AS','KD','8C','6H','2D'].map(card);
 const hands=[['2S','2C','9D','7H','4S'],['9S','8D','7C','6C','5H'],['AH','KC','8H','6D','2H']];
 state.boxes.forEach((b,i)=>{b.ante=10;b.bet=i===0?0:20;b.fee=i===1?10:0;b.status=i===0?'folded':'bet';b.hand=hands[i].map(card);});
 resolveRound();assert.equal(state.bankroll,240);assert.deepEqual(Array.from(state.boxes,b=>b.net),[-10,70,0]);resolveRound();assert.equal(state.bankroll,240);
 state.phase='playing';state.boxes[0].status='decision';state.active=0;state.bankroll=19;await decide(false);assert.equal(state.boxes[0].status,'decision');assert.equal(state.bankroll,19);
 console.log('Passed: ace-low and ace-high sorting, automatic deal/draw sorting, pending exchange positions, 1–3 box dealing, unique cards, funds checks, settlement, and round reset.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
