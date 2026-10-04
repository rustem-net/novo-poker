const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
html = html.replace('Novo Poker — One Box', 'Novo Poker — Three Box Preview');
html = html.slice(0, html.indexOf('<script>'));
const start = html.indexOf('    <div class="zone player">');
const end = html.indexOf('    <div class="message"', start);
html = html.slice(0, start) + '    <div class="box-stack" id="boxStack"></div>\n' + html.slice(end);
const panel = html.indexOf('  <section class="panel">');
html = html.slice(0, panel) + `
  <section class="panel action-dock" aria-label="Active box controls">
    <div class="control-heading"><b id="controlTitle">BOX 1</b><span id="controlHint">Choose your next move</span></div>
    <div class="actions"><button class="btn danger" id="fold">FOLD</button><button class="btn primary" id="bet">BET 20</button></div>
    <div class="minirow"><button class="btn" id="draw">DRAW SELECTED · 10</button><button class="btn" id="sixth">BUY 6TH · 10</button></div>
    <button class="btn restart" id="restart" hidden>TRY AGAIN</button>
  </section>
  <p class="preview-note">Layout preview · Sample hands · Tap any unfinished box to play it</p>
</main>`;
html = html.replace('</style>', `
  .app{max-width:500px;padding-bottom:12px}
  .dealer,.app.compact-height .dealer,.app.short-height .dealer{min-height:0}
  .dealer .cards{min-height:0;padding:4px 2px 6px}
  .dealer .card{flex:0 1 48px}
  .dealer .rank{font-size:26px}
  .dealer .hand-name{height:0}
  .table{padding:14px 10px 10px;border-radius:25px}
  .divider{margin:10px 15px}
  .box-stack{position:relative;z-index:1;display:grid;gap:8px}
  .box-row{background:rgba(2,24,17,.38);border:1px solid rgba(255,255,255,.14);border-radius:15px;padding:9px 10px;scroll-margin-bottom:190px}
  .box-row.active{border-color:var(--gold2);box-shadow:inset 0 0 0 1px rgba(255,217,120,.3);background:rgba(226,182,80,.07)}
  .box-header{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11px;letter-spacing:.08em}
  .box-header button{border:0;background:none;padding:4px 0;color:var(--text);font-weight:900;cursor:pointer;min-height:28px}
  .box-status{font-size:10px;color:var(--muted);letter-spacing:.03em}
  .active .box-status{color:var(--gold2)}
  .box-row .cards,.app.compact-height .box-row .cards,.app.short-height .box-row .cards{min-height:0;padding:9px 0 6px;gap:7px}
  .box-row .card,.app.compact-height .box-row .card,.app.short-height .box-row .card{flex:0 1 47px;width:47px}
  .box-row .rank{font-size:26px}
  .box-row .suit-corner{font-size:15px;left:4px;top:4px}
  .box-row .suit-corner.bottom{left:auto;top:auto;right:4px;bottom:4px}
  .box-row .card.selected{transform:translateY(-5px)}
  .box-footer{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:11px}
  .box-footer b{color:var(--gold2);font-size:12px}
  .box-stakes{color:#b7c9c1;font-size:10px}
  .action-dock,.app.compact-height .action-dock,.app.short-height .action-dock{position:sticky;bottom:0;z-index:20;background:#0a1d16f5;backdrop-filter:blur(12px);border-color:#526044;padding:10px 12px calc(10px + env(safe-area-inset-bottom));margin-top:10px;border-radius:18px 18px 0 0}
  .control-heading{display:flex;justify-content:space-between;align-items:center;font-size:11px;gap:8px}
  .control-heading b{color:var(--gold2);letter-spacing:.08em}
  .control-heading span{color:var(--muted)}
  .action-dock .btn,.app.short-height .action-dock .btn{min-height:44px}
  .action-dock .minirow .btn{font-size:11px}
  .message,.app.compact-height .message,.app.short-height .message{min-height:32px;font-size:11px;margin-top:8px;padding:6px}
  .preview-note{text-align:center;color:var(--muted);font-size:10px;margin:8px 0}
  .restart{width:100%;margin-top:8px}
  [hidden]{display:none!important}
</style>`);
html += `
<script>
const suits={S:'♠',H:'♥',D:'♦',C:'♣'};
const samples=[['AS','AH','8C','5D','2S'],['KH','QD','JC','10S','9H'],['QC','QS','7D','7H','3C']];
const names=['One Pair','Straight','Two Pair'];
let active=0, bank=970, hands;
const $=id=>document.getElementById(id);
function card(code,down=false,selected=false,index=-1){const suit=code.slice(-1),rank=code.slice(0,-1);return '<button class="card '+(down?'face-down ':'')+(selected?'selected':'')+'" data-card="'+index+'" aria-label="'+rank+' '+suits[suit]+'" type="button"><span class="card-inner"><span class="face front suit-'+suit+'"><span class="suit-corner">'+suits[suit]+'</span><span class="rank">'+rank+'</span><span class="suit-corner bottom">'+suits[suit]+'</span></span><span class="face back"></span></span></button>';}
function render(){
 const done=hands.every(h=>h.status!=='playing');
 $('bankroll').textContent=bank.toLocaleString();
 $('dealerCards').innerHTML=['AD','KC','8H','6S','4D'].map((c,i)=>card(c,!done&&i!==4)).join('');
 $('dealerHint').textContent=done?'Dealer reveals · Ace-King':'One card exposed · A-K to qualify';
 $('boxStack').innerHTML=hands.map((h,i)=>'<section class="box-row '+(active===i&&!done?'active':'')+'" data-box="'+i+'" aria-label="Box '+(i+1)+'"><div class="box-header"><button data-activate="'+i+'" aria-pressed="'+(active===i)+'">BOX '+(i+1)+'</button><span class="box-status">'+(h.status==='playing'?(active===i?'● YOUR MOVE':'AWAITING DECISION'):h.status==='folded'?'FOLDED':done?'WON · +'+(i===1?80:20):'BET PLACED')+'</span></div><div class="cards">'+h.cards.map((c,j)=>card(c,false,h.selected.has(j),j)).join('')+'</div><div class="box-footer"><b>'+names[i]+'</b><span class="box-stakes">Ante 10 · Bet '+(h.status==='bet'?20:'—')+(h.modified?' · Fee 10':'')+'</span></div></section>').join('');
 $('controlTitle').textContent=done?'ROUND COMPLETE':'BOX '+(active+1);
 $('controlHint').textContent=done?'Sample result':hands[active].modified?'Bet or fold':'Tap cards to select';
 ['fold','bet','draw','sixth'].forEach(id=>$(id).disabled=done||hands[active].status!=='playing');
 $('draw').disabled||=hands[active].modified||!hands[active].selected.size;
 $('sixth').disabled||=hands[active].modified;
 $('draw').textContent=hands[active].selected.size?'DRAW '+hands[active].selected.size+' · 10':'DRAW SELECTED · 10';
 $('restart').hidden=!done;
 $('message').textContent=done?'Sample round complete. Try again to explore the layout.':'All three hands stay visible. Dealer reveals after every decision.';
}
function reset(){active=0;bank=970;hands=samples.map(cards=>({cards:[...cards],selected:new Set(),status:'playing',modified:false}));render();}
function finish(status){const h=hands[active];if(h.status!=='playing')return;h.status=status;if(status==='bet')bank-=20;const next=hands.findIndex(h=>h.status==='playing');if(next>=0)active=next;else hands.forEach((h,i)=>{if(h.status==='bet')bank+=30+(i===1?80:20);});render();if(next>=0)document.querySelector('[data-box="'+next+'"]').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'nearest'});}
 $('boxStack').addEventListener('click',e=>{const row=e.target.closest('[data-box]');if(!row)return;const i=Number(row.dataset.box);if(hands[i].status!=='playing')return;const previous=active;active=i;const button=e.target.closest('[data-card]');if(button&&previous===i&&!hands[i].modified){const j=Number(button.dataset.card);hands[i].selected.has(j)?hands[i].selected.delete(j):hands[i].selected.add(j);}render();});
 $('fold').onclick=()=>finish('folded');$('bet').onclick=()=>finish('bet');
 $('draw').onclick=()=>{const h=hands[active];if(h.modified||!h.selected.size)return;const replacements=['2H','3S','4C','5H','6D'];h.selected.forEach(i=>h.cards[i]=replacements[i]);h.selected.clear();h.modified=true;bank-=10;names[active]='Updated sample hand';render();};
 $('sixth').onclick=()=>{const h=hands[active];if(h.modified)return;h.cards.push(['JD','10C','9S'][active]);h.selected.clear();h.modified=true;bank-=10;render();};
 $('restart').onclick=()=>{names.splice(0,3,'One Pair','Straight','Two Pair');reset();};reset();
</script></body></html>`;
fs.writeFileSync('multibox-preview.html', html);
