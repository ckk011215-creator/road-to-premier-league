/* ================= 介面 ================= */
const $ = id => document.getElementById(id);
/* 三個存檔位；舊版單一存檔會自動移到第一格 */
const NSLOT = 3, SLOT_KEY = i => `g2p-slot-${i}`;
const store = {
  slot:0,
  get(i=store.slot){ try{ return JSON.parse(localStorage.getItem(SLOT_KEY(i))||'null'); }catch(e){ return null; } },
  set(v, i=store.slot){ try{ localStorage.setItem(SLOT_KEY(i), JSON.stringify(v)); }catch(e){} },
  clear(i=store.slot){ try{ localStorage.removeItem(SLOT_KEY(i)); }catch(e){} },
  migrate(){ try{ const old = localStorage.getItem('g2p-save-v1'); if(old && !localStorage.getItem(SLOT_KEY(0))) localStorage.setItem(SLOT_KEY(0), old); localStorage.removeItem('g2p-save-v1'); }catch(e){} },
  free(){ for(let i=0;i<NSLOT;i++){ const v = store.get(i); if(!v || !v.S || v.S.done) return i; } return -1; }
};
function show(id){ ['start','create','game','end'].forEach(x => $(x).hidden = x!==id); window.scrollTo(0,0); }

let BUSY = false, TAB = 'home';
const UI = {
  auto:null,
  /* 開始一段「事件視窗」；視窗已開啟時加入分隔標題 */
  newPage(title){
    const m = $('modal');
    if(m.hidden){ $('feed').innerHTML = ''; $('act').innerHTML = ''; m.hidden = false; document.body.classList.add('modal-open'); }
    else if(title && $('m-title').textContent !== title){ const d = document.createElement('div'); d.className = 'mdiv'; d.textContent = title; $('feed').appendChild(d); }
    $('m-title').textContent = title || '';
  },
  card(tone, title, html, extra, meta){
    if($('modal').hidden) UI.newPage(S ? `${slotDate()}・${pageTitle()}` : '');
    const d = document.createElement('div'); d.className = `card ${tone||''}${extra==='goal'?' goalfx':''}`;
    const ic = !['moment','echo','summary','prematch','mreport','paper'].includes(tone) ? iconFor(tone, title) : null;
    d.innerHTML = (title?`<h4>${ic?`<img class="pxic" src="${iconURL(ic, ic==='shirt'?palFor(kitOf(S&&S.aca?S.aca.club:S&&S.gr)):null)}" alt="">`:''}<span>${title}</span></h4>`:'') + (html?`<div>${html}</div>`:'');
    $('feed').appendChild(d);
    if(tone==='moment' && meta) try{ mountScene(d, meta.scene, false, meta.oc); }catch(e){ console.error(e); }
    if(typeof sfx==='function'){ if(tone==='prematch') sfx('whistle'); else if(tone==='gold') sfx('level'); else if(tone==='mreport') sfx('whistle2'); }
    if(S && tone!=='echo' && title && !['moment'].includes(tone)){ S.flog = S.flog || []; S.flog.unshift({ d:slotDate(), t:title, x:String(html||'').replace(/<div class="fx">[\s\S]*$/,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim().slice(0,70), tone }); S.flog = S.flog.slice(0,30); }
    return d;
  },
  play(card, r){ try{ playScene(card, r); }catch(e){ console.error(e); } },
  choose(prompt, opts){
    const a = $('act'); a.innerHTML = prompt ? `<div class="q">${prompt}</div>` : '';
    const grid = document.createElement('div'); grid.className = 'optgrid' + (opts.length>=3 && opts.every(o=>o.pct!=null||o.locked) ? ' cols' : '');
    opts.forEach(o => { const b = document.createElement('button'); b.className = 'btn' + (o.main?' main':'') + (o.warn?' warn':'') + (o.locked?' locked':'') + (o.pct!=null?' odds':'');
      b.innerHTML = `${o.locked?'<em class="lk">未解鎖</em>':o.risk?`<em class="rk rk-${o.risk}">${o.risk}</em>`:''}<b>${o.t}</b>${o.s?`<small>${o.s}</small>`:''}${o.pct!=null?`<span class="pbar" aria-hidden="true"><i style="width:${o.pct}%"></i></span>`:''}`;
      if(o.locked){ b.disabled = true; grid.appendChild(b); return; }
      const ki = grid.querySelectorAll('button:not([disabled])').length; if(ki < 9) b.dataset.key = ki + 1;
      /* 放棄、退役、轉會等重要決定：要按兩次 */
      b.onclick = () => { if((o.warn||o.confirm) && !b.dataset.sure){ b.dataset.sure = 1; b.classList.add('sure'); b.insertAdjacentHTML('beforeend', '<small class="sure-t">再按一次確認</small>'); return; }
        sfx('click'); act(() => { if(o.t && !/^▸/.test(o.t)) UI.card('echo','',esc(o.t.replace(/<[^>]+>/g,''))); o.f(); }); };
      grid.appendChild(b); });
    a.appendChild(grid);
    refreshSide();
  },
  pick(prompt, items, n, cb){ cb(items.map((x,i)=>i).filter(i=>!items[i].dis).slice(0,n)); },
  /* 引擎完成一件事，等待玩家「推進」 */
  idle(){
    UI.save(); refreshSide();
    if(S.done) return;
    if(UI.auto && S.year===UI.auto.year && (UI.auto.whole || S.term===UI.auto.term)){ setTimeout(() => advance(), 0); return; }
    UI.auto = null;
    if(!$('feed').children.length){ closeModal(); return; }
    $('act').innerHTML = '';
    const b = document.createElement('button'); b.className = 'btn main center'; b.innerHTML = '<b>完成</b>'; b.onclick = closeModal;
    $('act').appendChild(b); b.focus({ preventScroll:true });
  },
  autoSim(){ return !!UI.auto; },
  save(){ if(S && !S.busy){ store.set({ S, rs:_s }); if(typeof cloudQueue==='function') cloudQueue(); } },
  end(ev){ store.clear(); closeModal(); renderEnd(ev); }
};
function closeModal(){ $('modal').hidden = true; document.body.classList.remove('modal-open'); $('feed').innerHTML = ''; $('act').innerHTML = ''; renderView(); }
/* 執行一個選擇，然後捲到第一張新卡 */
function act(fn){
  if(BUSY) return; BUSY = true;
  const before = $('feed').children.length; $('act').innerHTML = '';
  try{ fn(); } catch(e){ console.error(e); UI.card('bad','出錯', esc(e.message)); }
  BUSY = false; refreshSide();
  if(S && S.done) return;
  const first = $('feed').children[before], body = $('m-body');
  if(first && body) body.scrollTo({ top:Math.max(0, first.offsetTop - 12) });
}
function doAdvance(auto, whole){
  if(!S || S.done || S.busy || !$('modal').hidden) return;
  UI.auto = auto ? { term:S.term, year:S.year, whole:!!whole } : null;
  act(() => advance());
}

/* ---------- 側欄：球員卡、量表、導航 ---------- */
const estAttr = k => { const [lo,hi] = rangeOf(k); return Math.round((lo+hi)/2); };
function estOvr(){ const w = POS[S.pos].w; let v = 0; for(const k in w) v += estAttr(k)*w[k]; return Math.round(v*famF(S.pos)); }
function clubKit(){ return S.pos==='GK' ? GK_KIT : kitOf(S.stage==='PRO'?curClub():S.stage==='GR'?S.gr:S.aca&&S.aca.club); }
function refreshSide(){
  if(!S || S.done) return;
  const pro = S.stage==='PRO', kit = clubKit();
  const ms = [['fat','疲勞',S.m.fat,true],['love','熱誠',S.m.love],['conf','自信',S.m.conf], pro?['trust','主帥信任',Math.round(S.pro.trust)]:['coach','教練印象',S.m.coach]];
  $('side-card').style.setProperty('--kit', kit);
  $('side-card').innerHTML = `<div class="pc-top"><div class="pc-ovr"><b>${estOvr()}</b><small>評估</small></div><div class="pc-pos"><b>${POS[S.pos].n}</b><small>${S.age} 歲</small></div><img class="pc-av" src="${playerURL(5)}" alt=""></div>
    <div class="pc-name">${esc(fullName())}</div><div class="pc-club">${S.pro ? crestSVG(curClub(), 14) : ''}${esc(stageLabel())}${S.pro ? `<small class="kitn">${KIT_PAT_N[kitDesign(curClub()).pat]}球衣</small>` : ''}</div>
    <div class="pc-attrs">${ATTRS.map(k => `<span class="${keyAttrs().slice(0,4).includes(k)?'key':''}"><b>${estAttr(k)}</b><i>${ATTR_N[k]}</i></span>`).join('')}</div>`;
  $('side-m').innerHTML = ms.map(([k,n,v,inv]) => `<div class="mt${(inv?v>=70:v<=25)?' bad':''}"><span>${n}<b>${v}</b></span><i><u style="width:${v}%"></u></i></div>`).join('') + (S.inj&&S.inj.w>0?`<div class="inj">傷患：${esc(S.inj.n)}，尚餘 ${S.inj.w} 星期</div>`:'');
  const sl = nextSlot();
  $('g-date').textContent = `${slotDate(sl?sl.wk:S.wk)}・${pageTitle()}`;
  $('b-auto').innerHTML = `<b>${isYouth()?'模擬至學期末':'模擬至半季末'}</b>`;
  $('b-year').innerHTML = `<b>${isYouth()?'模擬至學年末':'模擬至賽季末'}</b>`;
}

/* ---------- 分頁 ---------- */
function setTab(t){
  TAB = t; MKT_MSG = null;
  document.querySelectorAll('.snav button').forEach(b => b.setAttribute('aria-current', b.dataset.t===t ? 'page' : 'false'));
  renderView(); window.scrollTo(0,0);
}
const VIEW_T = { home:'主頁', me:'球員', plan:'訓練', mates:'同屆', life:'生活', career:'生涯' };
function renderView(){
  if(!S || S.done) return;
  refreshSide();
  const mkt = S.stage==='PRO' && S.pro, mb = document.querySelector('.snav [data-t=mates]');
  if(mb) mb.innerHTML = mkt ? '<i>⇄</i>轉會' : '<i>☰</i>同屆';
  $('g-title').textContent = TAB==='mates' && mkt ? '轉會' : VIEW_T[TAB];
  const v = $('g-view');
  v.innerHTML = TAB==='home' ? viewHome() : TAB==='me' ? panelMe() : TAB==='plan' ? viewPlan() : TAB==='mates' ? (mkt ? viewMarket() : panelMates()) : TAB==='life' ? viewLife() : panelCareer();
  if(TAB==='plan') bindPlan();
  if(TAB==='life') bindLife();
  if(TAB==='mates' && mkt) bindMarket();
  if(TAB==='career' && $('pc-card')) $('pc-card').onclick = () => openShareCard(false);
  if(TAB==='home'){ const go = $('nb-go'); if(go) go.onclick = () => doAdvance(false); }
}
const sec = (t, html, cls='') => `<section class="pc ${cls}">${t?`<h3>${t}</h3>`:''}${html}</section>`;

/* ---------- 主頁儀表板 ---------- */
function nextBanner(){
  const sl = nextSlot(); if(!sl) return '';
  let k = '', h = '', sub = '';
  if(sl.k==='cup'){ const st = S.cup && S.cup[sl.cup], o = st && club(st.opp), c = club(curClub());
    k = cupRoundName(sl.cup, sl.r); h = `<div class="nb-vs"><b>${crestSVG(c.id, 26)}${esc(c.n)}</b><i>VS</i><b>${o ? crestSVG(o.id, 26) : ''}${esc(o ? o.n : '抽籤待定')}</b></div>`; sub = `淘汰賽：打和便加時，再和便互射十二碼${o ? `｜對手 ${LG[o.lg].short}・實力 ${Math.round(o.str)}` : ''}`; }
  else if(sl.k==='euro'){ const E = S.eu, c = club(curClub());
    const oid = sl.ph==='icc' ? null : sl.ph==='lg' ? (E && E.opps ? E.opps[sl.i] : null) : (E && E.ko ? E.ko.opp : null), o = oid ? anyClub(oid) : null, cu = E && E.comp ? EURO[E.comp] : null;
    k = sl.ph==='icc' ? '洲際盃決賽' : sl.ph==='lg' ? `${cu?cu.n:'歐洲賽'}・聯賽階段第 ${sl.i+1} 輪` : `${cu?cu.n:'歐洲賽'}・${KO_N[sl.st]}${sl.leg?`・${sl.leg===1?'首':'次'}回合`:''}`;
    h = `<div class="nb-vs"><b>${crestSVG(c.id, 26)}${esc(c.n)}</b><i>VS</i><b>${o ? crestSVG(o.id, 26) : ''}${esc(o ? o.n : '待定')}</b></div>`;
    sub = sl.ph==='lg' ? `聯賽階段：${E ? `${E.pts} 分（${E.w} 勝 ${E.d} 和 ${E.l} 負）` : ''}｜首八名直入十六強，第 9 至 24 名踢附加賽` : sl.ph==='icc' ? '單場決賽：爭奪世界最佳球會' : sl.st==='final' ? '單場決賽' : `兩回合主客制${E && E.ko && E.ko.l1 && sl.leg===2 ? `｜首回合 ${E.ko.l1.gf}–${E.ko.l1.ga}` : ''}`; }
  else if(sl.k==='match'){
    if(isYouth()){ const f = sl.fx; k = f.tag; h = `<div class="nb-vs"><b>${esc(f.home)}</b><i>VS</i><b>${esc(f.opp)}</b></div>`; sub = f.diff>2?'我方較強':f.diff<-2?'對手較強':'實力相若'; }
    else { const c = club(curClub()), { o, derby } = fixtureOpp(sl), se = S.season || {};
      k = sl.friendly ? '季前熱身賽' : derby ? `${LG[c.lg].short}・${derby}` : se.dev ? (c.lg==='PL'?'PL2':'U21 預備組') : `${LG[c.lg].short}・聯賽`;
      h = `<div class="nb-vs"><b>${crestSVG(c.id, 26)}${esc(c.n)}</b><i>VS</i><b>${se.dev&&!sl.friendly ? '' : crestSVG(o.id, 26)}${esc(se.dev&&!sl.friendly?'預備組對手':o.n)}</b></div>`; sub = `你的角色：${se.r!=null?roleTxt():'—'}${!se.dev?`｜對手實力 ${Math.round(o.str)}`:''}`; }
  } else if(sl.k==='start'){ k = isYouth() ? TERMS_Y[S.term] : TERMS_P[S.term]; h = `<div class="nb-h">${isYouth()?'新學期開始':S.term===2?'一月轉會窗':'上半季開始'}</div>`; sub = isYouth() ? '學期事件、購買裝備（新學年）' : '確認角色與外借機會'; }
  else if(sl.k==='pre'){ k = '季前'; h = `<div class="nb-h">季前集訓</div>`; sub = '新賽季的角色、主帥與合約'; }
  else if(sl.k==='event'){ k = '生活'; h = `<div class="nb-h">生活事件</div>`; sub = '球場以外的事情'; }
  else { k = isYouth() ? `${TERMS_Y[S.term]}結束` : `${TERMS_P[S.term]}結束`; h = `<div class="nb-h">${isYouth() ? (S.term===2?'學年結束・年度評估':'學期總結') : (S.term===2?'賽季結束・頒獎與合約':'半季總結')}</div>`; sub = isYouth()&&S.term===2 ? '年度報告、學院去留、試訓邀請' : '教練評語與狀態變化'; }
  return `<div class="nb" style="--kit:${clubKit()}"><div class="nb-l"><span class="nb-k">${esc(k)}</span>${h}<small>${slotDate(sl.wk)}・${esc(sub)}</small></div><button class="btn main nb-go" id="nb-go"><b>推進 ▸</b></button></div>`;
}
function viewHome(){
  const r = (S.recent||[]).slice(0,5).reverse(), ss = S.ss || { app:0, g:0, a:0, cs:0, rt:0 }, gk = S.pos==='GK';
  const avg = r.length ? r.reduce((s,x)=>s+x.rt,0)/r.length : 0;
  const form = !r.length ? '—' : avg>=7.6?'火熱':avg>=7.0?'良好':avg>=6.4?'平穩':'低迷';
  const bars = Array.from({ length:5 }, (_,i) => { const x = r[i]; return x ? `<div class="fb" title="${esc(x.opp)} ${x.gf}–${x.ga}"><b>${x.rt.toFixed(1)}</b><i style="height:${clamp((x.rt-4.5)/5.3*100,6,100)}%" class="${x.rt>=7.5?'hi':x.rt<6.2?'lo':''}"></i><small>${x.gf>x.ga?'勝':x.gf<x.ga?'負':'和'}</small></div>` : `<div class="fb e"><b>—</b><i></i><small></small></div>`; }).join('');
  /* 積分榜（職業）或同屆排名（青訓） */
  let table;
  if(S.stage==='PRO' && S.lt){ const lg = curLg(), my = curClub(), rows = tableOf(lg);
    table = sec(`${LG[lg].n}積分榜`, `<div class="lt"><table><thead><tr><th></th><th>球會</th><th>賽</th><th>得失</th><th>分</th></tr></thead><tbody>${rows.map((x,i) => `<tr class="${x.id===my?'me':''}${i<1?' up':''}${i>=rows.length-3?' dn':''}"><td>${i+1}</td><td class="cl">${crestSVG(x.id, 13)}${esc(cName(x.id))}</td><td>${x.p}</td><td>${x.gf-x.ga>0?'+':''}${x.gf-x.ga}</td><td><b>${x.pts}</b></td></tr>`).join('')}</tbody></table></div>`, 'span4 tall'); }
  else { const me = { n:'你', v:Math.round(perf()), st:stageLabel(), me:true };
    const list = [me, ...S.cohort.filter(n=>n.st!=='QUIT').map(n => ({ n:n.n, v:Math.round(npcPerf(n, S.age)), st:npcStatusTxt(n), tag:n.tag }))].sort((a,b)=>b.v-a.v);
    table = sec('同屆排名', `<p class="hint">按教練評估排列，只供參考。</p><div class="lt"><table><thead><tr><th></th><th>球員</th><th>現況</th><th>評估</th></tr></thead><tbody>${list.map((x,i) => `<tr class="${x.me?'me':''}"><td>${i+1}</td><td>${esc(x.n)}${x.tag==='friend'?' <em class="tg">好友</em>':x.tag==='rival'?' <em class="tg">對手</em>':''}</td><td class="hint">${esc(x.st)}</td><td><b>${x.v}</b></td></tr>`).join('')}</tbody></table></div>`, 'span4 tall'); }
  const feed = (S.flog||[]).slice(0,8).map(f => `<li class="${f.tone||''}"><i>${esc(f.d)}</i><b>${esc(f.t)}</b><span>${esc(f.x)}</span></li>`).join('');
  const P = S.plan || defaultPlan(), pf = planList().find(p=>p.id===P.focus), of = OFFTIME.find(o=>o.id===P.off);
  return `<div class="home">${nextBanner()}
    ${table}
    ${sec('近期表現', `<div class="form"><span>近 5 場平均 <b>${r.length?avg.toFixed(2):'—'}</b></span><span>狀態 <b>${form}</b></span></div><div class="fbars">${bars}</div>`, 'span4')}
    ${sec(isYouth()?'本學年數據':'本季數據', `<div class="ssg"><div><b>${ss.app}</b><small>出場</small></div><div><b>${gk?ss.cs:ss.g}</b><small>${gk?'零封':'入球'}</small></div><div><b>${ss.a}</b><small>助攻</small></div><div><b>${ss.app?(ss.rt/ss.app).toFixed(2):'—'}</b><small>平均評分</small></div></div>`, 'span4')}
    ${objHTML()}
    ${sec('訓練計劃', `<div class="plan-s"><span>重點 <b>${pf?pf.n:'—'}</b></span><span>強度 <b>${INTENSITY[P.int].n}</b></span><span>課餘 <b>${of?of.n:'—'}</b></span></div><button class="btn sm" onclick="setTab('plan')"><b>調整訓練 ▸</b></button>`, 'span4')}
    ${sec('最近動態', feed ? `<ul class="flog">${feed}</ul>` : '<p class="hint">按「推進」開始。</p>', objHTML() ? 'span12' : 'span8')}
  </div>`;
}

/* ---------- 訓練頁 ---------- */
function viewPlan(){
  fixPlan();
  const P = S.plan, w = planWeights(P.focus);
  const row = p => { const pw = p.w || planWeights('pos'); return `<button class="prow" data-pk="focus" data-pv="${p.id}" aria-pressed="${P.focus===p.id}"><b>${p.n}</b><span>${p.d || Object.keys(pw).map(k=>ATTR_N[k]).join('・')}</span><em>${P.focus===p.id?'進行中':'可選'}</em></button>`; };
  const card = (key, id, n, d) => `<button class="opt" data-pk="${key}" data-pv="${id}" aria-pressed="${P[key]===id}"><span class="ot"><b>${n}</b></span><small>${d}</small></button>`;
  const items = SHOP.filter(x=>S.items&&S.items[x.id]).map(x=>x.n).join('、') || '沒有';
  return `<div class="pgrid">
    ${sec('訓練重點', `<p class="hint">兩件事之間會按計劃自動訓練，隨時可以更改。</p><div class="plist">${planList().map(row).join('')}</div>`, 'span7')}
    <div class="span5 stack">
      ${sec('訓練強度', `<div class="opts" style="--cols:1">${Object.entries(INTENSITY).map(([k,v]) => card('int', k, v.n, v.d)).join('')}</div>`)}
      ${sec(S.age>=18?'訓練以外':'課餘時間', `<div class="opts" style="--cols:2">${offList().map(o => card('off', o.id, o.n, o.d)).join('')}</div>`)}
      ${sec('本計劃重點提升', `<div class="mchips">${Object.keys(w).map(k=>`<span><b>${ATTR_N[k]}</b></span>`).join('')}</div><p class="hint">學院與學徒期另有球會的固定訓練。已有裝備：${esc(items)}。</p>${S.pro && club(curClub()).mgr ? `<p class="hint">主帥打法：<b>${MSTYLE[club(curClub()).mgr.st].n}</b>，重視${styleAttrs(curClub()).join('、')}。提升這些能力可改善戰術契合度（現時：${fitN(styleFit(curClub()))}）。</p>` : ''}`)}
    </div></div>`;
}
function bindPlan(){ document.querySelectorAll('#g-view [data-pk]').forEach(b => b.onclick = () => { S.plan[b.dataset.pk] = b.dataset.pv; UI.save(); renderView(); }); }

/* ---------- 球員、同屆、生涯 ---------- */
function rangeOf(k){
  const w = clamp(13 - (S.age-6)*0.75, 2, 13) + (S.stage==='GR'?3:0) - (S.items&&S.items.video?2:0), v = S.ab[k];
  const jit = (hashStr(S.seed+k+S.age)%100)/100 - 0.5;
  const lo = Math.max(1, Math.round(v - w*(0.5+jit*0.4))), hi = Math.min(99, Math.round(v + w*(0.5-jit*0.4)));
  return [lo, hi];
}
function hashStr(s){ let h = 2166136261; for(const c of s){ h ^= c.charCodeAt(0); h = Math.imul(h,16777619); } return h>>>0; }
function panelMe(){
  const ks = keyAttrs();
  const attrs = ATTRS.map(k => { const [lo,hi] = rangeOf(k); return `<div class="attr${ks.includes(k)?' key':''}"><b>${ATTR_N[k]}</b><div class="bar"><u style="left:${lo}%;width:${Math.max(2,hi-lo)}%"></u></div><span class="rng">${lo}–${hi}</span></div>`; }).join('');
  const bp = bestPositions(), top = bp[0][1];
  const pf = (S.pos==='GK' ? ['GK'] : OUT_POS).map(p => { const v = bp.find(x=>x[0]===p)[1]*famF(p), st = clamp(Math.round(5 - (top - v)/3.5), 1, 5); return `<div class="${p===S.pos?'cur':''}">${POS[p].n.slice(0,2)}<b>${'●'.repeat(st)}</b></div>`; }).join('');
  const heightTxt = S.spurt && S.spurt.done ? `${Math.round(S.h)} 厘米（預計成年約 ${S.adultH}）` : `${Math.round(S.h)} 厘米（按父母身高推算成年約 ${Math.round((S.fatherH+S.motherH+13)/2)}，誤差 ±7）`;
  const meters = Object.keys(METER_N).filter(k => !['mates','fans','fam'].includes(k) && !(k==='scout' && S.stage!=='GR') && !(k==='study' && S.age>=18) && !(k==='coach' && S.stage==='PRO')).map(k => `<dt>${METER_N[k]}</dt><dd class="num">${S.m[k]}</dd>`).join('');
  const mid = Object.fromEntries(ATTRS.map(k => [k, estAttr(k)]));
  const eRef = Math.round(E(S.age)), rad = radarSVG([{ v:Object.fromEntries(ATTRS.map(k=>[k,eRef])), cls:'rp-base' }, { v:mid, cls:'rp-me' }], { aria:'能力估計雷達', label:k => `${ATTR_N[k]} ${mid[k]}`, cls:k => ks.includes(k)?'up':'' }) + `<div class="rp-key"><span class="k-base">同齡精英學院水平（${eRef}）</span><span class="k-me">你（估計）</span></div>`;
  return `<div class="pgrid">
    ${sec('能力雷達', rad, 'span5')}
    ${sec('能力估計', `<p class="hint">教練與球探只能估算：年紀越大、數據越多，範圍越窄。粗底線者為${POS[S.pos].n}的關鍵能力。</p>${attrs}`, 'span7')}
    ${sec('能力成長曲線', growthSVG(), 'span12')}
    ${sec(`特技（${Object.keys(S.perks||{}).length}／${PERKS.filter(perkFor).length}）`, perkHTML(), 'span12')}
    ${sec('位置', `<div class="posfit">${pf}</div><p class="hint">現時司職${POS[S.pos].n}。${S.pos==='GK'?'門將不會轉踢外場，外場球員亦不會轉做門將。':'圓點越多越適合（已計算熟悉度）。'}</p>`, 'span6')}
    ${sec('身體', `<dl class="kv"><dt>身高</dt><dd>${heightTxt}</dd><dt>體型</dt><dd>${BODY_N[S.body]}</dd><dt>慣用腳</dt><dd>${FOOT_N[S.foot]}</dd>${S.spot?`<dt>原本位置</dt><dd>${SPOTS.find(x=>x.id===S.spot).n}${roleOf(S.posPref,S.role)?`・${roleOf(S.posPref,S.role).n}（${S.role}）`:''}</dd>`:''}<dt>出生月份</dt><dd>${MONTHS[S.bm]}（學年第 ${S.bm+1} 個月）</dd>${S.inj&&S.inj.w>0?`<dt>傷患</dt><dd>${S.inj.n}，${S.inj.w} 星期</dd>`:''}</dl>`, 'span6')}
    ${sec('狀態', `<dl class="kv">${meters}${S.stage==='PRO'?'':`<dt>零用錢</dt><dd class="num">£${S.money}</dd>`}${S.pro?`<dt>主帥信任</dt><dd class="num">${Math.round(S.pro.trust)}</dd><dt>週薪</dt><dd class="num">${money(S.pro.wage)}</dd>`:''}${S.earn?`<dt>生涯收入</dt><dd class="num">${money(Math.round(S.earn))}</dd>`:''}</dl>`, 'span4')}
    ${sec('人際關係', relHTML(), 'span4')}
    <div class="span4 stack">${sec('性格', `<dl class="kv">${S.posTrait?`<dt>正面</dt><dd>${TRAIT_POS[S.posTrait].n}：${TRAIT_POS[S.posTrait].fx}</dd><dt>負面</dt><dd>${TRAIT_NEG[S.negTrait].n}：${TRAIT_NEG[S.negTrait].fx}</dd>`:''}</dl>`)}${sec('家庭', `<dl class="kv"><dt>城市</dt><dd>${CITIES[S.city].n}</dd><dt>經濟</dt><dd>${WEALTH_N[S.wealth]}（每學期 £${ALLOW[S.wealth]}）</dd><dt>父母</dt><dd>${PARENT_N[S.parent]}</dd><dt>兄弟姊妹</dt><dd>${SIB_N[S.sib]}</dd><dt>血統</dt><dd>${HERITAGE[S.heritage].n}</dd><dt>裝備</dt><dd>${SHOP.filter(x=>S.items&&S.items[x.id]).map(x=>x.n).join('、')||'沒有'}</dd><dt>支持球隊</dt><dd>${cName(S.fav)}</dd></dl><p class="hint">種子：<span class="num">${esc(S.seed)}</span></p>`)}</div>
  </div>`;
}
/* 成長曲線：你的評估 vs 同齡精英學院水平 */
function growthSVG(){
  const g = (S.grow||[]).slice(); if(!g.length || g.at(-1).age!==S.age) g.push({ age:S.age, v:Math.round(ovr()) });
  const a0 = 6, a1 = Math.max(24, S.age+2), W = 900, H = 200, px = a => 40 + (a-a0)/(a1-a0)*(W-60), py = v => H-24 - v/90*(H-40);
  const line = pts => pts.map((p,i) => `${i?'L':'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`).join('');
  const ref = []; for(let a=a0;a<=a1;a++) ref.push([a, E(a)]);
  let x = `<svg class="grow" viewBox="0 0 ${W} ${H}" role="img" aria-label="能力成長曲線">`;
  [20,40,60,80].forEach(v => x += `<line x1="40" x2="${W-20}" y1="${py(v)}" y2="${py(v)}" class="gl"/><text x="8" y="${py(v)+4}" class="gt">${v}</text>`);
  for(let a=a0;a<=a1;a+=2) x += `<text x="${px(a)}" y="${H-6}" text-anchor="middle" class="gt">${a}</text>`;
  x += `<path d="${line(ref)}" class="gref"/><path d="${line(g.map(p=>[p.age,p.v]))}" class="gme"/>`;
  g.forEach(p => x += `<circle cx="${px(p.age)}" cy="${py(p.v)}" r="3.5" class="gdot"/>`);
  return x + `</svg><div class="rp-key"><span class="k-base">同齡精英學院水平</span><span class="k-me">你的評估</span></div>`;
}
function relHTML(){
  const bar = (n, v, d) => `<div class="rel"><span>${n}<b>${Math.round(v)}</b></span><i><u style="width:${clamp(v,0,100)}%"></u></i><small>${d}</small></div>`;
  const lv = v => v>=75?'非常好':v>=60?'良好':v>=40?'一般':v>=25?'緊張':'惡劣';
  const coach = S.stage==='PRO' ? S.pro.trust : S.m.coach;
  return bar(S.stage==='PRO'?'主帥':'教練', coach, `${lv(coach)}・影響正選機會與續約`) + bar('隊友', S.m.mates??50, `${lv(S.m.mates??50)}・影響傳送配合成功率`) + bar('家庭', S.m.fam, `${lv(S.m.fam)}・影響熱誠與低潮時的支持`) + bar('球迷', S.m.fans??20, `${(S.m.fans??20)>=70?'萬人迷':(S.m.fans??20)>=45?'受歡迎':'未算知名'}・影響報價與獎項`)
    + (S.agent && agentOf() ? bar('經紀人', S.agent.rel, `${AGENTS[S.agent.type].n}・影響物色球會的成效`) : `<p class="hint">經紀人：未有代理（可在「生活」頁聘請）</p>`);
}
function panelMates(){
  const list = S.cohort.slice().sort((a,b) => (b.tag?1:0)-(a.tag?1:0));
  const rows = list.map(n => `<div class="npc"><span>${esc(n.n)}${n.tag==='friend'?'<em>好朋友</em>':n.tag==='rival'?'<em>爭位對手</em>':''}</span><span class="hint">${POS[n.pos].n}</span><small>${npcStatusTxt(n)}${n.hist.length?`｜${esc(n.hist.slice(-2).join('；'))}`:''}</small></div>`).join('');
  return `<div class="pgrid">${sec('同屆', `<p class="hint">由草根到學院與你一起踢過球的人。每個學年末會更新他們的去向。</p>${rows||'<p class="hint">暫時沒有。</p>'}`, 'span12')}</div>`;
}
function panelCareer(){
  const sc = dominance();
  const hon = S.honours.filter(h=>!h.silent).map(h => `<span>${h.y} ${esc(h.t)}</span>`).join('');
  const rows = S.hist.slice().reverse().map(histRow).join('');
  const tl = S.log.slice().reverse().map(l => `<div><b>${l.age}</b><span>${esc(l.t)}</span></div>`).join('');
  return `<div class="pgrid">
    ${sec('稱霸指數', `<div class="big">${sc}</div><p class="hint">英超冠軍、金靴／金手套、PFA 獎項、英超出場、入球與零封、國家隊均會加分。英超傳奇需要 1600 分。</p><button class="btn sm" id="pc-card"><b>產生生涯卡 ▸</b></button>`, 'span4')}
    ${sec('榮譽', hon ? `<div class="honours">${hon}</div>` : '<p class="hint">暫時未有榮譽，繼續努力。</p>', 'span8')}
    ${sec('職業數據', rows?`<div class="tablewrap"><table class="hist"><thead>${histHead()}</thead><tbody>${rows}</tbody></table></div>`:'<p class="hint">尚未踢過職業比賽。</p>', 'span12')}
    ${rivalHTML() ? sec('宿敵', rivalHTML(), 'span12') : ''}
    ${recordsHTML()}
    ${sec(`成就（${Object.keys(S.ach||{}).length}／${ACH.length}）`, achGrid(), 'span12')}
    ${sec('人生紀錄', `<div class="timeline">${tl}</div>`, 'span12')}
  </div>`;
}
function achGrid(){ let all = {}; try{ all = JSON.parse(localStorage.getItem('g2p-ach')||'{}'); }catch(e){}
  return `<div class="achs">${ACH.map(([id,n,d]) => { const got = S.ach && S.ach[id]; return `<div class="ach ${got?'on':all[id]?'past':''}"><b>${got?'★':all[id]?'☆':'🔒'} ${n}</b><small>${d}${got?`｜${got} 年達成`:all[id]?'｜過往生涯曾達成':''}</small></div>`; }).join('')}</div>`; }
/* 數據表：門將以零封取代入球、助攻 */
const isGK = () => S && S.pos==='GK';
function histHead(){ return `<tr><th>賽季</th><th>球會</th><th>聯賽</th><th>角色</th><th>出場</th>${isGK()?'<th>零封</th>':'<th>入球</th><th>助攻</th>'}<th>評分</th></tr>`; }
function histRow(r){ return `<tr><td>${seasonLabel(r.y)}</td><td>${esc(cName(r.club))}${r.loan?'（借）':''}</td><td>${r.lg==='DEV'?'預備組':LG[r.lg].short}</td><td>${r.role}</td><td>${r.app}</td>${isGK()?`<td>${r.cs||0}</td>`:`<td>${r.g}</td><td>${r.a}</td>`}<td>${r.app?r.rt.toFixed(2):'—'}</td></tr>`; }

/* ---------- 結局 ---------- */
function renderEnd(ev){
  const rec = careerRecord(ev), rank = recAdd(rec);
  show('end');
  const cs = ev.cs, pl = ev.pl;
  const hon = S.honours.filter(h=>!h.silent).map(h => `<span>${h.y} ${esc(h.t)}</span>`).join('');
  const rows = S.hist.map(histRow).join('');
  const mates = S.cohort.map(n => `<div class="npc"><span>${esc(n.n)}</span><span class="hint">${POS[n.pos].n}</span><small>${npcStatusTxt(n)}${n.hist.length?`｜${esc(n.hist.slice(-3).join('；'))}`:''}</small></div>`).join('');
  const proMates = S.cohort.filter(n=>n.hist.some(h=>/職業合約|英超|英冠|英甲|英乙/.test(h))).length;
  const tl = S.log.map(l => `<div><b>${l.age}</b><span>${esc(l.t)}</span></div>`).join('');
  $('end').innerHTML = `<div class="hero"><div class="wrap"><div class="end-px"><img src="${playerURL(6)}" alt="">${S.honours.some(h=>/英超冠軍|FA Cup|世界盃（冠軍|歐洲國家盃（冠軍|^(西甲|意甲|德甲|法甲)冠軍/.test(h.t))?`<img src="${iconURL('trophy',null,6)}" alt="">`:''}</div><div class="eyebrow">生涯結算</div><div class="tier">${ev.tier}</div><p class="lede">${esc(fullName())}・${esc(S.endReason||'')}</p>
    <div class="endstats"><div><b>${ev.sc}</b><span>稱霸指數</span></div><div><b>${cs.app}</b><span>職業出場</span></div><div><b>${isGK()?cs.cs:cs.g}</b><span>${isGK()?'零封':'入球'}</span></div><div><b>${pl.app}</b><span>英超出場</span></div>${ev.ab && ev.ab.app ? `<div><b>${ev.ab.app}</b><span>海外出場</span></div>` : ''}</div></div></div>
    <div class="wrap panel">
    ${hon?`<h3>榮譽</h3><div class="honours">${hon}</div>`:''}
    ${rows?`<h3>職業數據</h3><div class="tablewrap"><table class="hist"><thead>${histHead()}</thead><tbody>${rows}</tbody></table></div>`:''}
    ${S.after ? `<h3>退役之後</h3><p class="after">${esc(S.after.t)}</p>` : ''}
    ${rivalHTML() ? `<h3>宿敵</h3>${rivalHTML()}` : ''}
    <h3>同屆的去向</h3><p class="hint">${S.cohort.length} 名同屆隊友之中，${proMates} 人踢過職業足球。</p>${mates}
    <h3>人生紀錄</h3><div class="timeline">${tl}</div>
    <p class="hint">天賦上限（隱藏）：${S.ceil}｜種子：${esc(S.seed)}</p>
    ${endBoardHTML(rec, rank)}
    <div class="lf-b"><button class="btn" id="end-card"><b>產生生涯分享卡</b></button><button class="btn main" id="again"><b>再來一段人生</b></button></div></div>`;
  $('end-card').onclick = () => openShareCard(true, ev);
  bindEndBoard(rec);
  $('again').onclick = () => { S = null; openCreate(); };
}

/* ---------- 角色創建（7 步） ---------- */
const randSeed = () => String(Math.floor(100000 + Math.random()*900000));
let CF = null, CSTEP = 0;
const rp = a => a[Math.floor(Math.random()*a.length)];
const CSTEPS = [
  { id:'basic', n:'基礎', h:'基本資料', sub:'姓名、家庭經濟、出生月份與城市' },
  { id:'body', n:'身體', h:'身體條件', sub:'身高、體型與慣用腳，會改變能力上限' },
  { id:'origin', n:'出身', h:'家族血統', sub:'家族足球文化與國家隊選擇' },
  { id:'pos', n:'位置', h:'選擇比賽位置', sub:'在球場上點選你想踢的位置' },
  { id:'role', n:'角色', h:'選擇比賽角色', sub:'' },
  { id:'pers', n:'性格', h:'性格特質', sub:'正面與負面各選一項' },
  { id:'look', n:'外貌', h:'球員外貌', sub:'像素公仔的膚色、髮型與外貌特徵，純粹外觀，不影響能力' },
  { id:'confirm', n:'確認', h:'確認球員', sub:'確認預計天賦上限後開始' }
];
function defaultCF(){ return { first:rp(FIRST), last:rp(LAST), bm:6, fatherH:178, motherH:164, body:'even', foot:'R', posTrait:'disc', negTrait:'shy',
  city:'NOT', wealth:1, heritage:'none', fav:'ARS', posPref:'none', spot:null, role:null, seed:randSeed(), diff:'normal' }; }
/* 隨機：先隨機選擇，超出點數便逐項降級 */
function randCF(){
  const her = Math.random()<0.55 ? 'none' : rp(Object.keys(HERITAGE)), H = HERITAGE[her].h;
  const pt = rp(Object.keys(TRAIT_POS)), nt = rp(Object.keys(TRAIT_NEG).filter(k => !TRAIT_POS[pt].ax || TRAIT_NEG[k].ax!==TRAIT_POS[pt].ax));
  const sp = Math.random()<0.85 ? rp(SPOTS) : null;
  const cf = { first:rp(FIRST), last:rp(LAST), bm:Math.floor(Math.random()*12), fatherH:H[0]+Math.round((Math.random()-0.5)*14), motherH:H[1]+Math.round((Math.random()-0.5)*12),
    body:rp(Object.keys(BODY)), foot:rp(['R','R','R','L','B']), posTrait:pt, negTrait:nt,
    city:rp(Object.keys(CITIES)), wealth:rp([0,1,1,1,2,3]), heritage:her, fav:rp(CLUB_DATA.filter(c=>c[2]==='PL').map(c=>c[0])),
    posPref:sp?sp.pos:'none', spot:sp?sp.id:null, role:sp?rp(ROLES_BY_POS[sp.pos]).id:null, seed:randSeed() };
  const downs = [()=>cf.wealth=Math.min(cf.wealth,1), ()=>cf.foot='R', ()=>cf.bm=Math.max(cf.bm,6), ()=>{ cf.fatherH=Math.min(cf.fatherH,H[0]); cf.motherH=Math.min(cf.motherH,H[1]); }];
  for(let i=0; i<60 && cfgCost(cf) > CREATE_BUDGET; i++) rp(downs)();
  return cf;
}
const left = () => CREATE_BUDGET - cfgCost(CF);
function costTag(c){ return c>0 ? `<i class="cost">${c} 點</i>` : c<0 ? `<i class="cost back">退還 ${-c} 點</i>` : `<i class="cost free">免費</i>`; }
/* 選項卡：[值, 名稱, 一句效果, 成本] */
function opts(key, list, val, cols){ return `<div class="opts" style="--cols:${cols||list.length}">${list.map(([v,t,d,c]) => `<button class="opt" data-k="${key}" data-v="${v}" aria-pressed="${String(v)===String(val)}"><span class="ot"><b>${t}</b>${c!=null?costTag(c):''}</span>${d?`<small>${d}</small>`:''}</button>`).join('')}</div>`; }
/* 能力加成標籤：「+4 傳球」 */
function modChips(m){ const e = Object.entries(m||{}).filter(([,v])=>v).sort((a,b)=>b[1]-a[1]); return e.length ? `<div class="mchips">${e.map(([k,v]) => `<span class="${v<0?'neg':''}"><b>${v>0?'+':'−'}${Math.abs(v)}</b> ${ATTR_N[k]}</span>`).join('')}</div>` : ''; }
function cityInfo(code){ const c = CITIES[code]; const n1 = CLUB_DATA.filter(x=>x[4]>0 && c.near.includes(x[3])).length, n2 = CLUB_DATA.filter(x=>x[4]>0 && [...c.near,...c.mid].includes(x[3])).length; return { n1, n2 }; }
function openCreate(){ CF = CF ? randCF() : defaultCF(); CSTEP = 0; CAP_PREV = null; show('create'); renderCreate(); }
const TIER_TXT = ['世界強隊','強隊','中上','中游','較弱','弱隊'];
const CAP_BASE = 56.5;   /* 沒有任何加減時，每項能力上限的平均值 */
/* 九邊形雷達：series = [{ v:{能力:值}, cls }]，值 0–100 */
function radarSVG(series, opt={}){
  const W = 320, Hh = 280, cx = 160, cy = 142, R = 100, n = ATTRS.length;
  const pt = (i, v) => { const a = -Math.PI/2 + i*2*Math.PI/n, r = R*clamp(v,0,100)/100; return [cx + r*Math.cos(a), cy + r*Math.sin(a)]; };
  const poly = f => ATTRS.map((k,i) => pt(i, f(k)).map(x=>x.toFixed(1)).join(',')).join(' ');
  let g = `<svg class="radar" viewBox="0 0 ${W} ${Hh}" role="img" aria-label="${opt.aria||'九項能力雷達圖'}">`;
  [25,50,75,100].forEach(r => g += `<polygon class="rg" points="${poly(()=>r)}"/>`);
  ATTRS.forEach((k,i) => { const [x,y] = pt(i,100); g += `<line class="ra" x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`; });
  series.forEach(s => g += `<polygon class="${s.cls}" points="${poly(k=>s.v[k])}"/>`);
  ATTRS.forEach((k,i) => { const [x,y] = pt(i,124), lb = opt.label ? opt.label(k) : ATTR_N[k];
    g += `<text x="${x.toFixed(1)}" y="${(y+4).toFixed(1)}" text-anchor="middle" class="rl ${opt.cls?opt.cls(k):''}">${lb}</text>`; });
  return g + '</svg>';
}
function capPreview(){
  const { mods, parts, h } = capMods(CF);
  const exp = Object.fromEntries(ATTRS.map(k => [k, Math.round(clamp(CAP_BASE + mods[k], 28, 97))]));
  const radar = radarSVG([{ v:Object.fromEntries(ATTRS.map(k=>[k,CAP_BASE])), cls:'rp-base' }, { v:exp, cls:'rp-me' }],
    { aria:'天賦上限預覽', label:k => `${ATTR_N[k]} ${exp[k]}`, cls:k => mods[k]>0?'up':mods[k]<0?'dn':'' });
  const rows = parts.filter(([,m]) => Object.values(m).some(v=>v)).map(([n,m]) => `<li><b>${n}</b><span>${modTxt(m)}</span></li>`).join('');
  return { exp, html:`${radar}<div class="rp-key"><span class="k-base">普通球員平均</span><span class="k-me">你的預計上限</span></div>
    <ul class="capsrc">${rows || '<li><span>目前所有設定均為普通，上限不變。</span></li>'}</ul>
    <p class="hint">數字為平均預計；實際每項另有隨機浮動（約 ±8），於結局時揭曉。身高按預計成年 ${h} 厘米計算。</p>` };
}
let CAP_PREV = null;
const PERS_D = {};
/* 球場位置圖 */
function pitchPicker(){
  const lines = `<svg class="pp-lines" viewBox="0 0 100 110" preserveAspectRatio="none" aria-hidden="true"><rect x="3" y="3" width="94" height="104" /><line x1="3" y1="55" x2="97" y2="55"/><circle cx="50" cy="55" r="10"/><rect x="25" y="3" width="50" height="17"/><rect x="38" y="3" width="24" height="6"/><rect x="25" y="90" width="50" height="17"/><rect x="38" y="101" width="24" height="6"/></svg>`;
  const spots = SPOTS.map(s => `<button class="pp-spot" data-spot="${s.id}" aria-pressed="${CF.spot===s.id}" style="left:${s.x}%;top:${s.y/1.1}%"><i></i><span>${s.n}</span></button>`).join('');
  return `<div class="pitchpick"><div class="pp-arrow">進攻方向 ↑</div>${lines}${spots}</div>`;
}
function stepBody(id){
  const ci = cityInfo(CF.city), proj = Math.round((CF.fatherH+CF.motherH+13)/2), H = HERITAGE[CF.heritage], hc = heightCost(CF), gk = CF.posPref==='GK';
  const monthSel = CF.bm<=2 ? '學年初：年幼時體格佔優，較易入選' : CF.bm<=5 ? '學年前半：年幼時略有體格優勢' : CF.bm<=8 ? '學年中後段：既不佔優亦不吃虧' : '學年末：年幼時身形較細，較難進入學院；一旦入選反而更易成功';
  if(id==='basic') return `
    <div class="row2"><div class="field"><label for="f-first">名</label><input type="text" id="f-first" maxlength="14" value="${esc(CF.first)}"></div><div class="field"><label for="f-last">姓</label><input type="text" id="f-last" maxlength="14" value="${esc(CF.last)}"></div></div>
    <div class="field"><span class="lbl">家庭經濟</span>${opts('wealth', [[0,'拮据','每學期 £10',WEALTH_COST[0]],[1,'普通','每學期 £35',0],[2,'小康','每學期 £80，開局 £150',WEALTH_COST[2]],[3,'富裕','每學期 £160，開局 £400',WEALTH_COST[3]]], CF.wealth, 2)}
      <p class="hint">不影響上限；金錢可用於購買裝備、私人教練及訓練營，令你更快接近上限。</p></div>
    <div class="field"><span class="lbl">出生月份</span><div class="months">${MONTHS.map((m,i) => { const c = bmCost(i); return `<button class="mo" data-k="bm" data-v="${i}" aria-pressed="${i===CF.bm}"><b>${m}</b><i class="${c>0?'pay':c<0?'back':''}">${c>0?`${c} 點`:c<0?`退還 ${-c}`:'免費'}</i></button>`; }).join('')}</div>
      <p class="hint">不影響上限。英格蘭學年由 9 月開始，${MONTHS[CF.bm]}：${monthSel}。</p></div>
    <div class="field"><label for="f-city">城市</label><select id="f-city">${Object.entries(CITIES).map(([k,v])=>`<option value="${k}" ${k===CF.city?'selected':''}>${v.n}${CITY_COST[k]>0?'（1 點）':CITY_COST[k]<0?'（退還 1 點）':''}</option>`).join('')}</select>
      <p class="hint">不影響上限。1 小時車程內有 ${ci.n1} 間學院，1.5 小時內有 ${ci.n2} 間。</p></div>`;
  if(id==='body') return `
    <div class="field"><label for="f-fh">父親身高 <span class="num">${CF.fatherH}</span> 厘米</label><input type="range" id="f-fh" min="155" max="200" value="${CF.fatherH}"></div>
    <div class="field"><label for="f-mh">母親身高 <span class="num">${CF.motherH}</span> 厘米</label><input type="range" id="f-mh" min="145" max="188" value="${CF.motherH}"></div>
    ${gk?'<p class="hint"><b>門將模式</b>：身高對門將的影響遠大於外場球員。</p>':''}
    <div class="hbands">${HBANDS[gk?'GK':'OUT'].map(([v,t]) => `<div class="${heightBand(proj,CF.posPref)===heightBand(v,CF.posPref)?'on':''}"><b>${t}</b><small>${modTxt(heightMod(v,CF.posPref))}</small></div>`).join('')}</div>
    <p class="hint">預計成年約 <b class="num">${proj}</b> 厘米（實際 ±7）。${costTag(hc)} 比血統平均每高 5 厘米需 1 點。</p>
    <div class="field"><span class="lbl">體型</span>${opts('body', Object.entries(BODY).map(([k,v]) => [k, v.n, modTxt(bodyMod(k, CF.posPref))]), CF.body, 3)}</div>
    <div class="field"><span class="lbl">慣用腳</span>${opts('foot', [['R','右腳','上限不變',0],['L','左腳',gk?'上限不變':'司職邊閘、翼鋒較易獲得位置',FOOT_COST.L],['B','雙腳',modTxt(footMod('B',CF.posPref))+(gk?'':'，起點更高'),FOOT_COST.B]], CF.foot, 3)}
      <p class="hint">${gk?'已選門將：以上數字按門將計算。':'若在「位置」一步選擇門將，身高、體型與慣用腳的效果會改為門將版本。慣用腳亦會與位置的左右路互相影響。'}</p></div>`;
  if(id==='origin'){ const herOpts = HERITAGE_GROUPS.map(g => { const ks = Object.keys(HERITAGE).filter(k => HERITAGE[k].g===g); return ks.length ? `<optgroup label="${g}">${ks.map(k=>`<option value="${k}" ${k===CF.heritage?'selected':''}>${HERITAGE[k].n}${HERITAGE[k].b?`（${modTxt(HERITAGE[k].b)}・1 點）`:''}</option>`).join('')}</optgroup>` : ''; }).join('');
    return `
    <div class="field"><label for="f-her">家族血統</label><select id="f-her">${herOpts}</select></div>
    <div class="infocard">${CF.heritage==='none' ? '<b>純英格蘭家庭</b><p>上限不變；只能代表英格蘭。</p>' : `<span class="eyebrow2">${H.g}</span><b>${H.n}</b><p>${H.cul}</p>${H.b ? modChips(H.b) + `<div>${costTag(1)}</div>` : '<p class="hint">此血統的足球風格與英格蘭相近或不算突出，沒有能力加成，亦不需要點數。</p>'}<div class="ref"><span>國家隊</span><b>${H.nt}・${TIER_TXT[H.tier]}</b></div><p class="hint">${H.b?'加成能力的起點亦高 1.5。':''}父母身高已設為當地平均（${H.h[0]}／${H.h[1]} 厘米）。如果英格蘭不選你，${H.nt}或會邀請你；國家隊越弱，入選門檻越低。</p>`}</div>
    <div class="field"><label for="f-fav">童年支持的球隊</label><select id="f-fav">${CLUB_DATA.filter(c=>c[2]==='PL'||c[2]==='CH').map(c=>`<option value="${c[0]}" ${c[0]===CF.fav?'selected':''}>${c[1]}</option>`).join('')}</select></div>
    <div class="field"><label for="f-seed">世界種子</label><input type="text" id="f-seed" maxlength="16" value="${esc(CF.seed)}"><span class="hint">相同種子配合相同選擇＝相同人生。</span></div>`; }
  if(id==='pos'){ const sp = SPOTS.find(s=>s.id===CF.spot);
    return `${pitchPicker()}
    <button class="opt wide" data-k="spot" data-v="" aria-pressed="${!CF.spot}"><span class="ot"><b>未定</b><i class="cost free">不加不減</i></span><small>由教練決定位置；日後轉位沒有損失，但沒有位置與角色加成</small></button>
    ${sp ? `<div class="infocard sel"><span class="eyebrow2">${SIDE_N[sp.side]}・${POS[sp.pos].n}</span><b>${sp.n}</b>${modChips(posMod(sp.pos))}${sideTxt(sp.id, CF.foot)?`<p class="side">${sideTxt(sp.id, CF.foot)}</p>`:''}<p class="hint">${sp.pos==='GK'?'門將使用另一套能力：反應、站位、接球、制空、指揮、爆發、出球。門將不會被安排轉踢外場；正選位置只有一個，競爭更激烈，但職業生涯可延續至 40 歲。':'專攻此位置：關鍵能力上限大幅提高，其他能力 −2。日後若被教練安排轉位，便會吃虧。'}</p></div>` : ''}`; }
  if(id==='role'){ const sp = SPOTS.find(s=>s.id===CF.spot);
    if(!sp) return `<div class="infocard"><b>未定位置</b><p>你沒有選擇位置，因此沒有打法角色。可返回上一步選擇位置，或直接進入下一步。</p></div>`;
    return `<div class="rolecards">${ROLES_BY_POS[sp.pos].map(r => `<button class="rolecard" data-k="role" data-v="${r.id}" aria-pressed="${CF.role===r.id}"><span class="code">${r.id}</span><b>${r.n}</b><span class="desc">${SIDE_N[sp.side]==='中路'?'':SIDE_N[sp.side]}${r.d}</span>${modChips(r.m)}<span class="ref"><span>風格參考</span><b>${r.ref}</b></span></button>`).join('')}</div>`; }
  if(id==='pers') return `
    <div class="field"><span class="lbl">正面特質</span>${opts('posTrait', Object.entries(TRAIT_POS).map(([k,t]) => [k, t.n, `${modTxt(t.m)}<br>${t.fx}`]), CF.posTrait, 2)}</div>
    <div class="field"><span class="lbl">負面特質</span>${opts('negTrait', Object.entries(TRAIT_NEG).map(([k,t]) => [k, t.n, `${modTxt(t.m)}<br>${t.fx}`]), CF.negTrait, 2)}</div>
    <p class="hint">同一類別的正負特質（例如自律與懶散）不可同時選擇。性格不需要點數。</p>`;
  if(id==='look') return lookPicker(CF.look, CF.posPref==='GK'?GK_KIT:'#f2b705');
  if(id==='confirm'){ const cp = capPreview(), sp = SPOTS.find(s=>s.id===CF.spot), r = sp && roleOf(sp.pos, CF.role);
    const avgCap = Math.round(ATTRS.reduce((s,k)=>s+cp.exp[k],0)/ATTRS.length);
    return `<div class="cf-grid"><div class="cf-card"><div class="cf-top"><div><b>${avgCap}</b><small>平均上限</small></div><img src="${lookURL(CF.look, CF.posPref==='GK'?GK_KIT:'#f2b705', 6)}" alt=""></div>
    <div class="cf-name">${esc(CF.first)}・${esc(CF.last)}</div><div class="cf-pos">${sp?`${sp.n}${r?`・${r.n}`:''}`:'位置未定'}</div>
    <dl class="kv sum"><dt>名字</dt><dd>${esc(CF.first)}・${esc(CF.last)}</dd><dt>出身</dt><dd>${CITIES[CF.city].n}・${WEALTH_N[CF.wealth]}・${MONTHS[CF.bm]}出生</dd>
    <dt>身體</dt><dd>預計 ${proj} 厘米・${BODY_N[CF.body]}・${FOOT_N[CF.foot]}</dd><dt>血統</dt><dd>${H.n}</dd>
    <dt>位置</dt><dd>${sp?`${sp.n}${r?`・${r.n}（${r.id}）`:''}`:'未定'}</dd><dt>性格</dt><dd>${TRAIT_POS[CF.posTrait].n}・${TRAIT_NEG[CF.negTrait].n}</dd></dl>
    <p class="hint">父母性格、兄弟姊妹、學校及家中是否有車，於生涯開始後隨機決定。</p></div><div class="cf-cap">${cp.html}</div></div>
    <div class="cf-diff"><h3>難度</h3>${opts('diff', Object.entries(DIFF).map(([k,v]) => [k, v.n, v.d]), CF.diff||'normal', 2)}</div>`; }
  return '';
}
function renderCreate(){
  if(!CF.look) CF.look = defaultLook(CF.seed||'x');
  setAttrSet(CF.posPref==='GK');
  const st = CSTEPS[CSTEP], L = left(), last = CSTEP===CSTEPS.length-1;
  const cp = capPreview(), prev = CAP_PREV; CAP_PREV = cp.exp;
  const strip = ATTRS.map(k => { const d = prev ? cp.exp[k]-prev[k] : 0; return `<div class="${d>0?'chg up':d<0?'chg dn':''}"><span>${ATTR_N[k]}</span><b class="num">${cp.exp[k]}</b></div>`; }).join('');
  const sp = SPOTS.find(s=>s.id===CF.spot);
  const sub = st.id==='role' ? (sp ? `為 <b class="hl">${sp.n}</b> 選擇具體打法，影響能力上限` : '未選擇位置') : st.sub;
  const mini = radarSVG([{ v:Object.fromEntries(ATTRS.map(k=>[k,CAP_BASE])), cls:'rp-base' }, { v:cp.exp, cls:'rp-me' }], { aria:'天賦上限預覽', label:k => `${ATTR_N[k]} ${cp.exp[k]}` });
  $('create').innerHTML = `<div class="cwiz">
  <aside class="cw-side">
    <div class="cw-title"><small>生涯模式</small><b>建立球員</b></div>
    <nav class="cw-steps" aria-label="創建步驟">${CSTEPS.map((s,i) => `<button data-step="${i}" class="${i===CSTEP?'on':i<CSTEP?'done':''}" ${i===CSTEP?'aria-current="step"':''}><i>${i<CSTEP?'✓':i+1}</i><span>${s.n}</span></button>`).join('')}</nav>
    <div class="budget ${L<0?'over':''}"><span>出身點數 尚餘 <b class="num">${L}</b>／${CREATE_BUDGET}${L>0?`（餘數兌換 £${L*30}）`:''}</span><div class="seg">${Array.from({length:CREATE_BUDGET},(_,i)=>`<i class="${i < CREATE_BUDGET-L ? 'used':''}"></i>`).join('')}</div></div>
    <div class="cw-prev"><small>預計天賦上限</small>${mini}</div>
  </aside>
  <section class="cw-main">
    <div class="capstrip cw-strip"><div class="cs-row" aria-live="polite">${strip}</div></div>
    <header class="cw-banner"><small>第 ${CSTEP+1} 步／共 ${CSTEPS.length} 步</small><h1>${st.h}</h1><p>${sub}</p></header>
    <div class="cw-body c-body">${stepBody(st.id)}</div>
    <footer class="cw-bar">
      <div class="budget mob ${L<0?'over':''}"><span>出身點數 尚餘 <b class="num">${L}</b>／${CREATE_BUDGET}</span></div>
      <div class="cb-btns">${CSTEP>0?`<button class="btn" id="c-prev"><b>上一步</b></button>`:`<button class="btn" id="c-rand"><b>全部隨機</b></button>`}
        <button class="btn" id="c-rec"><b>一鍵推薦</b></button>
        ${last ? `<button class="btn main" id="c-go" ${L<0?'disabled':''}><b>${L<0?`超出 ${-L} 點`:'開始生涯 ▸'}</b></button>` : `<button class="btn next" id="c-next"><b>下一步 ▸</b></button>`}</div>
    </footer>
  </section></div>`;
  const ax = TRAIT_POS[CF.posTrait]?.ax, ax2 = TRAIT_NEG[CF.negTrait]?.ax;
  document.querySelectorAll('#create .opt[data-k=negTrait]').forEach(e => { if(ax && TRAIT_NEG[e.dataset.v].ax===ax) e.classList.add('clash'); });
  document.querySelectorAll('#create .opt[data-k=posTrait]').forEach(e => { if(ax2 && TRAIT_POS[e.dataset.v].ax===ax2) e.classList.add('clash'); });
  bindCreate();
}
/* 一鍵推薦：按已選位置（未選則中場）配搭身體、慣用腳、出生月份與性格，並保持在點數之內 */
const REC_BODY = { CB:'burly', FB:'engine', DM:'solid', CM:'engine', AM:'nimble', W:'explosive', ST:'solid', GK:'rangy' };
const REC_H = { CB:[186,170], GK:[188,172], ST:[183,168], DM:[181,166] };
function recommendCF(){
  if(!CF.spot){ CF.spot = 'CM'; CF.posPref = 'CM'; }
  const sp = SPOTS.find(s=>s.id===CF.spot), pos = sp.pos, ks = keyAttrs(pos);
  CF.role = (ROLES_BY_POS[pos].slice().sort((a,b) => Object.keys(b.m).filter(k=>ks.slice(0,3).includes(k)).length - Object.keys(a.m).filter(k=>ks.slice(0,3).includes(k)).length)[0]).id;
  CF.body = REC_BODY[pos]; CF.wealth = 1; CF.bm = 0;
  CF.foot = sp.side==='L' ? 'L' : 'R';
  const H = HERITAGE[CF.heritage].h, rh = REC_H[pos];
  CF.fatherH = rh ? Math.max(H[0], rh[0]) : H[0]; CF.motherH = rh ? Math.max(H[1], rh[1]) : H[1];
  CF.posTrait = ks.includes('sta') ? 'disc' : pos==='GK' || pos==='CB' ? 'cool' : 'disc';
  const hurt = k => Object.entries(TRAIT_NEG[k].m).reduce((s,[a,v]) => s + (POS[pos].w[a]||0)*Math.abs(v), 0);
  CF.negTrait = Object.keys(TRAIT_NEG).filter(k => !TRAIT_POS[CF.posTrait].ax || TRAIT_NEG[k].ax!==TRAIT_POS[CF.posTrait].ax).sort((a,b) => hurt(a)-hurt(b))[0];
  for(let i=0;i<40 && cfgCost(CF) > CREATE_BUDGET;i++){
    if(CF.bm<6) CF.bm += 3; else if(heightCost(CF)>0){ CF.fatherH -= 2; CF.motherH -= 2; } else if(CF.foot!=='R') CF.foot = 'R'; else break;
  }
}
function goStep(i){ CSTEP = clamp(i, 0, CSTEPS.length-1); renderCreate(); window.scrollTo(0,0); }
function bindCreate(){
  document.querySelectorAll('#create [data-k]').forEach(b => b.onclick = () => { const k = b.dataset.k; let v = b.dataset.v;
    if(['bm','wealth'].includes(k)) v = +v;
    if(k==='spot'){ const sp = SPOTS.find(s=>s.id===v); CF.spot = sp ? sp.id : null; CF.posPref = sp ? sp.pos : 'none'; if(!sp || !roleOf(sp.pos, CF.role)) CF.role = sp ? ROLES_BY_POS[sp.pos][0].id : null; keepScroll(renderCreate); return; }
    CF[k] = v;
    const ax = TRAIT_POS[CF.posTrait]?.ax;
    if(ax && TRAIT_NEG[CF.negTrait]?.ax===ax){ if(k==='posTrait') CF.negTrait = Object.keys(TRAIT_NEG).find(x => TRAIT_NEG[x].ax!==ax); else CF.posTrait = Object.keys(TRAIT_POS).find(x => TRAIT_POS[x].ax!==ax); }
    keepScroll(renderCreate); });
  document.querySelectorAll('#create .pp-spot').forEach(b => b.onclick = () => { const sp = SPOTS.find(s=>s.id===b.dataset.spot); CF.spot = sp.id; CF.posPref = sp.pos; if(!roleOf(sp.pos, CF.role)) CF.role = ROLES_BY_POS[sp.pos][0].id; keepScroll(renderCreate); });
  document.querySelectorAll('#create [data-step]').forEach(b => b.onclick = () => goStep(+b.dataset.step));
  const on = (id, ev, fn) => { const e = $(id); if(e) e[ev] = fn; };
  on('f-first','oninput', e => CF.first = e.target.value); on('f-last','oninput', e => CF.last = e.target.value); on('f-seed','oninput', e => CF.seed = e.target.value);
  on('f-fh','onchange', e => { CF.fatherH = +e.target.value; keepScroll(renderCreate); }); on('f-mh','onchange', e => { CF.motherH = +e.target.value; keepScroll(renderCreate); });
  on('f-fh','oninput', e => { e.target.previousElementSibling.querySelector('.num').textContent = e.target.value; });
  on('f-mh','oninput', e => { e.target.previousElementSibling.querySelector('.num').textContent = e.target.value; });
  on('f-city','onchange', e => { CF.city = e.target.value; keepScroll(renderCreate); });
  on('f-her','onchange', e => { CF.heritage = e.target.value; const H = HERITAGE[CF.heritage].h; CF.fatherH = H[0]; CF.motherH = H[1]; keepScroll(renderCreate); });
  on('f-fav','onchange', e => CF.fav = e.target.value);
  on('c-rand','onclick', () => { CF = randCF(); CF.look = randLook(); CAP_PREV = null; renderCreate(); });
  bindLook($('create'), () => CF.look, v => { CF.look = v; }, () => keepScroll(renderCreate));
  on('c-rec','onclick', () => { recommendCF(); keepScroll(renderCreate); });
  on('c-prev','onclick', () => goStep(CSTEP-1));
  on('c-next','onclick', () => goStep(CSTEP+1));
  on('c-go','onclick', () => {
    if(left()<0) return;
    const cfg = { ...CF, first:(CF.first||'').trim()||'無名', last:(CF.last||'').trim(), seed:(CF.seed||'').trim()||randSeed() };
    const slot = store.free(); store.slot = slot>=0 ? slot : 0;
    newGame(cfg); newTerm(); show('game'); setTab('home'); UI.save(); maybeTutorial();
  });
}
/* 第一次玩：四張提示卡 */
const TIPS = [
  ['推進時間', '右上角「推進 ▸」會前往下一件事（比賽、學期事件或學期總結）。「模擬至學期末」與「模擬至學年末」會一直推進，只在需要你作決定時停下。在主頁按空白鍵亦可推進。'],
  ['訓練計劃', '在「訓練」頁選擇訓練重點、強度與課餘時間。兩件事之間會按計劃自動訓練，隨時可以更改。加練成長較快，但疲勞與受傷風險較高。'],
  ['比賽與關鍵時刻', '每場比賽可以「親自上陣」或「模擬比賽」。親自上陣時，每個選項都會顯示成功率與相關能力；冒險成功對評分幫助較大，穩健失敗扣分較多。'],
  ['能力與天賦上限', '能力不會直接顯示，只有教練與球探的估算範圍；年紀越大，範圍越窄。每項能力都有隱藏上限，越接近上限，進步越慢。']
];
function maybeTutorial(){
  let seen = null; try{ seen = localStorage.getItem('g2p-tut'); }catch(e){}
  if(seen) return; try{ localStorage.setItem('g2p-tut','1'); }catch(e){}
  let i = 0;
  const done = () => { S.flog = []; closeModal(); };
  const step = () => { if(i >= TIPS.length){ done(); return; } const [t,x] = TIPS[i++]; UI.card('info', `提示 ${i}／${TIPS.length}：${t}`, x);
    UI.choose('', [{ t:i<TIPS.length ? '▸ 下一個提示' : '▸ 開始生涯', main:true, f:step }, ...(i<TIPS.length ? [{ t:'▸ 略過提示', f:done }] : [])]); };
  UI.newPage('新手提示'); step();
}
function keepScroll(fn){ const y = window.scrollY; fn(); window.scrollTo(0, y); }

/* ---------- 開始畫面 ---------- */
function slotLabel(x){
  const c = id => x.W && x.W.clubs[id] ? x.W.clubs[id].n : '';
  if(x.stage==='GR') return x.gr;
  if(x.stage==='ACA') return `${c(x.aca.club)}學院`;
  if(x.stage==='SCH') return `${c(x.aca.club)}學徒`;
  if(x.stage==='PRO' && x.pro) return c(x.pro.loan ? x.pro.loan.club : x.pro.club);
  return '';
}
function renderStart(){
  store.migrate();
  const slots = Array.from({ length:NSLOT }, (_,i) => { const v = store.get(i); return v && v.S && !v.S.done ? v : null; });
  const full = slots.every(Boolean);
  $('startbtns').innerHTML = `<div class="slots">
    <button class="slot new" id="s-new" ${full?'disabled':''}><small>生涯模式</small><b>開始新生涯</b><span>由 6 歲草根足球起步，經歷學院、學徒、外借，目標稱霸英超。</span><em>${full?'存檔已滿，請先刪除一個存檔':'建立球員 ▸'}</em></button>
    ${slots.map((v,i) => v ? `<div class="slot"><small>存檔 ${i+1}<button class="ren" data-ren="${i}" aria-label="改名">✎ 改名</button></small><b data-nm="${i}">${esc(v.S.label || `${v.S.first}・${v.S.last}`)}</b><span>${v.S.label?`${esc(v.S.first)}・${esc(v.S.last)}・`:''}${v.S.age} 歲・${POS[v.S.pos]?POS[v.S.pos].n:''}${v.S.diff && v.S.diff!=='normal' ? `・${DIFF[v.S.diff].n}` : ''}<br>${esc(slotLabel(v.S))}・${seasonLabel(v.S.year)}</span>
      <div class="slot-b"><button class="btn main sm" data-cont="${i}"><b>繼續 ▸</b></button><button class="btn sm" data-exp="${i}"><b>匯出</b></button><button class="btn sm warn" data-del="${i}"><b>刪除</b></button></div></div>`
      : `<div class="slot empty"><small>存檔 ${i+1}</small><b>空置</b><span>開始新生涯時會使用這一格。</span></div>`).join('')}
  </div>
  <div class="start-set"><button class="verlink" id="s-log">v${GAME_VER}・更新日誌</button><span><button class="btn sm" id="s-inst" hidden><b>安裝到主畫面</b></button><button class="btn sm" id="s-lb"><b>排行榜</b></button><button class="btn sm" id="s-cloud"><b>雲端存檔</b></button><button class="btn sm" id="s-imp"><b>匯入存檔</b></button><button class="btn sm" id="s-set"><b>⚙ 設定</b></button></span></div>
  ${START_MSG ? `<div class="mk-msg ${START_MSG.ok?'ok':''}" id="s-msg">${esc(START_MSG.t)}</div>` : ''}
  <details class="note"><summary>這是甚麼遊戲？</summary><p>一段英格蘭足球員的人生：由六、七歲參加星期日聯賽開始，經歷學院試訓、保留或被放棄、16 歲 Scholarship、17 歲職業合約、外借及升降級，目標是稱霸英超。被放棄不代表終結：非聯賽同樣有出路。</p><p>能力不會直接顯示，你只會看到教練評語與球探估算。球會以 2025/26 賽季為起點，其後升降級由遊戲模擬；學院級別經遊戲簡化。</p></details>`;
  try{ $('hp1').src = iconURL('player', palFor('#f2b705', lookOf('hero')), 6); $('hp2').src = iconURL('kick', palFor('#f2b705', lookOf('hero')), 6); $('hpb').src = iconURL('ball', null, 6); }catch(e){}
  $('s-new').onclick = () => { if(!full) openCreate(); };
  $('s-set').onclick = openSettings; $('s-imp').onclick = () => openImport(); $('s-log').onclick = openChangelog; $('s-lb').onclick = () => openBoard(lbOn() ? 'global' : 'local'); $('s-cloud').onclick = openCloud; pwaButton(); START_MSG = null;
  document.querySelectorAll('[data-exp]').forEach(b => b.onclick = () => openExport(+b.dataset.exp));
  document.querySelectorAll('[data-cont]').forEach(b => b.onclick = () => { const i = +b.dataset.cont, sv = store.get(i), mg = migrateS(sv.S);
    if(!mg.ok){ START_MSG = { ok:false, t:mg.msg }; renderStart(); return; }
    if(mg.from < SAVE_VER) store.set(sv, i);
    store.slot = i; S = sv.S; _s = sv.rs; S.busy = false; if(!S.cal) newTerm(); setAttrSet(S.pos==='GK'); show('game'); setTab('home'); });
  document.querySelectorAll('[data-ren]').forEach(b => b.onclick = () => renameSlot(+b.dataset.ren));
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { if(b.dataset.sure){ store.clear(+b.dataset.del); renderStart(); return; } b.dataset.sure = 1; b.innerHTML = '<b>確定刪除？</b>'; });
  drawPitch();
}
function drawPitch(){
  const cv = $('pitch'); if(!cv) return; const r = cv.getBoundingClientRect(), dpr = window.devicePixelRatio||1;
  cv.width = r.width*dpr; cv.height = r.height*dpr; const g = cv.getContext('2d'); g.scale(dpr,dpr);
  const W = r.width, H = r.height; g.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--bar-ink'); g.lineWidth = 2;
  const cx = W*0.72, cy = H*0.5, s = Math.max(W,H)*0.9;
  g.strokeRect(cx - s*0.33, cy - s*0.5, s*0.66, s);
  g.beginPath(); g.moveTo(cx - s*0.33, cy); g.lineTo(cx + s*0.33, cy); g.stroke();
  g.beginPath(); g.arc(cx, cy, s*0.09, 0, Math.PI*2); g.stroke();
  g.strokeRect(cx - s*0.16, cy - s*0.5, s*0.32, s*0.14); g.strokeRect(cx - s*0.16, cy + s*0.36, s*0.32, s*0.14);
}
/* ---------- 選單：返回主畫面、重新開始、放棄 ---------- */
function openMenu(){
  const m = $('menu'), body = $('menu-body');
  const item = (id, t, sub, cls) => `<button class="btn ${cls||''}" id="${id}"><b>${t}</b>${sub?`<small>${sub}</small>`:''}</button>`;
  const main = () => {
    $('menu-h').textContent = '選單';
    body.innerHTML = item('m-home','返回主畫面','已自動存檔，下次由本學期開頭繼續') + item('m-exp','匯出存檔','備份進度，或轉到另一部裝置繼續') + item('m-set','設定','字體大小、主題、動畫、比賽方式') + item('m-new','重新開始新生涯','現時這段人生將被刪除','warn') + item('m-quit','放棄這段人生','不再踢球，直接進入生涯結算','warn') + item('m-close','返回遊戲','','main');
    $('m-home').onclick = () => { closeMenu(); renderStart(); show('start'); };
    $('m-new').onclick = () => confirm('重新開始？', `${esc(fullName())}（${S.age} 歲）這段人生將被刪除，無法復原。`, '確定重新開始', () => { store.clear(); S = null; closeMenu(); openCreate(); });
    $('m-quit').onclick = () => confirm('放棄這段人生？', '這段人生將於此刻結束，直接進入結算。', '確定放棄', () => { closeMenu(); endGame(`${S.age} 歲，你決定放下足球。`); });
    $('m-close').onclick = closeMenu;
    $('m-set').onclick = () => settingsBody(main);
    $('m-exp').onclick = () => { UI.save(); exportBody(store.slot, main); };
  };
  const confirm = (h, txt, yes, fn) => { body.innerHTML = `<div class="note"><b>${h}</b><br>${txt}</div>` + item('m-yes', yes, '', 'warn') + item('m-no', '取消，返回', '', 'main'); $('m-yes').onclick = fn; $('m-no').onclick = main; };
  main(); m.hidden = false; $('m-close').focus();
}
function closeMenu(){ $('menu').hidden = true; }

document.addEventListener('DOMContentLoaded', () => {
  $('t-menu').onclick = openMenu;
  $('menu').onclick = e => { if(e.target.id==='menu') closeMenu(); };
  document.addEventListener('keydown', e => { if(e.key==='Escape' && !$('menu').hidden) closeMenu(); });
  document.querySelectorAll('.snav button').forEach(b => b.onclick = () => setTab(b.dataset.t));
  $('b-adv').onclick = () => doAdvance(false);
  $('b-auto').onclick = () => doAdvance(true);
  $('b-year').onclick = () => doAdvance(true, true);
  $('feed').addEventListener('click', feedClick);
  document.addEventListener('keydown', e => { if(e.key===' ' && !$('game').hidden && $('modal').hidden && $('menu').hidden && !/INPUT|SELECT|TEXTAREA|BUTTON/.test(document.activeElement.tagName)){ e.preventDefault(); doAdvance(false); } });
  applySet(); renderStart(); show('start'); pwaInit();
});

/* ---------- 存檔改名 ---------- */
function renameSlot(i){
  const sv = store.get(i), b = document.querySelector(`[data-nm="${i}"]`); if(!sv || !b) return;
  const inp = document.createElement('input'); inp.className = 'ren-in'; inp.maxLength = 16; inp.value = sv.S.label || ''; inp.placeholder = `${sv.S.first}・${sv.S.last}`; inp.setAttribute('aria-label', '存檔名稱');
  b.replaceWith(inp); inp.focus();
  let done = false;
  const save = ok => { if(done) return; done = true; if(ok){ const v = inp.value.trim().slice(0,16); if(v) sv.S.label = v; else delete sv.S.label; store.set(sv, i); } renderStart(); };
  inp.onkeydown = e => { if(e.key==='Enter') save(true); if(e.key==='Escape') save(false); };
  inp.onblur = () => save(true);
}

/* ---------- 戰報分頁與回放 ---------- */
function feedClick(e){
  const t = e.target.closest('[data-mtab]');
  if(t){ const card = t.closest('.card'), n = t.dataset.mtab;
    card.querySelectorAll('[data-mtab]').forEach(x => x.setAttribute('aria-selected', String(x===t)));
    card.querySelectorAll('[data-mpane]').forEach(p => p.hidden = p.dataset.mpane!==n); return; }
  const rp = e.target.closest('[data-rp]');
  if(rp){ const li = rp.closest('li'), had = li.querySelector('.mr-replay');
    document.querySelectorAll('.mr-replay').forEach(x => { if(x._px) x._px.running = false; x.remove(); });
    document.querySelectorAll('[data-rp]').forEach(x => x.textContent = '▶ 回放');
    if(had) return;
    const [grp, k, ok] = rp.dataset.rp.split('|'), box = document.createElement('div'); box.className = 'mr-replay'; box.innerHTML = '<h4 hidden></h4>';
    li.appendChild(box); rp.textContent = '■ 收起';
    try{ mountScene(box, grp, true); setTimeout(() => playScene(box, { k, ok:ok==='1' }), 500); }catch(err){ console.error(err); } }
}

/* ---------- 主頁：賽季目標 ---------- */
function objHTML(){
  const se = S.season; if(S.stage!=='PRO' || !se || !se.obj || !se.obj.length) return '';
  return sec('賽季目標', `<ul class="obj">${se.obj.map(o => { const s = objectiveStatus(o); return `<li class="${s.ok?'ok':''}"><b>${s.ok?'✓':'○'} ${esc(o.n)}</b><small>${esc(s.now)}</small></li>`; }).join('')}</ul><p class="hint">季尾結算：每達成一項，主帥信任與球迷人氣上升，並獲得獎金。</p>`, 'span4');
}

/* ---------- 生活頁：存款、經紀人、生活商店 ---------- */
function viewLife(){
  const pro = S.stage==='PRO' && S.pro, a = agentOf();
  const weekly = pro ? Math.round(S.pro.wage*0.45*(1-(a?a.fee:0))*(S.pro.loan?0.8:1)) : 0;
  const sav = sec('財務', `<div class="ssg"><div><b>${money(Math.round(S.money||0))}</b><small>${pro?'存款':'零用錢'}</small></div>${pro?`<div><b>${money(S.pro.wage)}</b><small>週薪</small></div><div><b>${money(weekly)}</b><small>每週存入</small></div>`:''}<div><b>${money(Math.round(S.earn||0))}</b><small>生涯收入</small></div></div>
    <p class="hint">${pro ? '週薪扣除稅項、日常開支' + (a ? `及經紀人佣金 ${Math.round(a.fee*100)}%` : '') + '後存入存款；達成賽季目標另有獎金。' : '職業合約後，薪金會存入存款，可在這裏購買生活項目。'}</p>`, 'span12');
  let ag;
  if(S.age < 16) ag = sec('經紀人', '<p class="hint">16 歲後可以聘請經紀人。</p>', 'span5');
  else if(!S.agent){ ag = sec('經紀人', `<p class="hint">經紀人會在轉會窗替你聯絡球會、爭取更高薪金。</p><div class="opts" style="--cols:1">${Object.entries(AGENTS).map(([k,x]) => `<button class="opt" data-ag="${k}"><span class="ot"><b>聘請${x.n}</b>${x.fee?`<i class="cost">佣金 ${x.fee*100}%</i>`:'<i class="cost free">免佣金</i>'}</span><small>${x.d}</small></button>`).join('')}</div>`, 'span5'); }
  else { const asked = pro && S.pro.agentAsk===S.year, rel = Math.round(S.agent.rel);
    ag = sec('經紀人', `<div class="rel"><span>${AGENTS[S.agent.type].n}<b>${rel}</b></span><i><u style="width:${rel}%"></u></i><small>${rel>=70?'合作無間：報價更多':rel>=40?'關係一般':'關係緊張：成效下降'}</small></div>
      <p class="hint">${AGENTS[S.agent.type].d}${agentWage()?`現時談判薪金約 +${Math.round(agentWage()*100)}%。`:''}</p>
      <div class="lf-b">${pro?`<button class="btn sm main" data-agask ${asked?'disabled':''}><b>${asked?'已委託：賽季結束時帶來報價':'請經紀人物色球會'}</b></button>`:''}<button class="btn sm warn" data-agfire><b>解除代理</b></button></div>`, 'span5'); }
  const owned = SHOP.filter(x=>S.items&&S.items[x.id]).map(x=>x.n);
  const shop = pro ? sec('生活商店', `<div class="lshop">${LIFE.map(x => { const own = hasLife(x.id), can = (S.money||0) >= x.p;
      return `<button class="opt" data-life="${x.id}" ${own||!can?'disabled':''} aria-pressed="${!!own}"><span class="ot"><b>${x.n}</b><i class="cost ${own?'free':''}">${own?'已擁有':money(x.p)+(x.yr?'／年':'')}</i></span><small>${x.d}${x.yr?'｜每季季前自動續費':''}</small></button>`; }).join('')}</div>`, 'span7')
    : sec('裝備', `<p class="hint">青訓期每個新學年開始時可用零用錢購買裝備。</p><p>已擁有：${esc(owned.join('、')||'沒有')}</p>`, 'span7');
  const style = sec('造型', `<p class="hint">隨時可以轉換髮型、鬍鬚、頭帶、紋身與波鞋顏色（膚色不能更改）。</p>${lookPicker(myLook(), S.pos==='GK' ? GK_KIT : clubKit(), { noSkin:true })}`, 'span12');
  const deals = S.pro ? sec('代言', S.deals && S.deals.length ? `<ul class="obj">${S.deals.map(d => `<li class="ok"><b>${esc(d.n)}</b><small>每季 ${money(d.pay)}・${d.y} 年起</small></li>`).join('')}</ul>` : '<p class="hint">球迷人氣達 55 或以上，品牌便有機會在季前找你代言。人氣跌穿 35 會被終止合約。</p>', 'span12') : '';
  return `<div class="pgrid">${sav}${abroadHTML()}${ag}${shop}${deals}${style}</div>`;
}
/* 海外生活：語言、適應、家人、語言老師 */
function abroadHTML(){
  const langs = Object.entries(S.langs || {}).filter(([,v]) => v>0);
  if(!isAbroad()) return langs.length ? sec('語言', `<p>${langs.map(([c,v]) => `${CTY[c].lang} <b>${Math.round(v)}</b>`).join('　')}</p><p class="hint">在海外學會的語言會一直保留；再次到同一個國家時會較快適應。</p>`, 'span12') : '';
  const a = S.abroad, c = CTY[a.cty], l = langOf(a.cty), ad = Math.round(a.adapt), pen = abroadPen(), fee = Math.round(S.pro.wage*2/50)*50;
  const bar = (n, v, t) => `<div class="rel"><span>${n}<b>${v}</b></span><i><u style="width:${v}%"></u></i><small>${t}</small></div>`;
  return sec(`海外生活・${c.n}`, `${bar(c.lang, l, l>=70?'流利':l>=40?'可以日常溝通':l>=15?'只懂簡單句子':'幾乎不懂')}${bar('適應', ad, adaptN(ad))}
    <p class="hint">在${esc(cityN())}的第 ${a.n+1} 季｜家人：${a.fam==='with'?'一起生活':a.fam==='alone'?'留在英格蘭':'—'}｜${pen>=0.5?`適應不足：主帥起用你的機會略為下降（−${pen.toFixed(1)}）`:'已經融入球隊'}。語言與適應每半季都會進步，語言老師、家人陪伴與良好的隊友關係會加快進度。</p>
    <div class="lf-b"><button class="btn sm ${a.tutor?'':'main'}" data-tutor ${!a.tutor && (S.money||0) < fee ? 'disabled' : ''}><b>${a.tutor?'停止語言課程':`聘請語言老師（每季 ${money(fee)}）`}</b></button></div>`, 'span12');
}
function bindLife(){
  const v = $('g-view');
  v.querySelectorAll('[data-ag]').forEach(b => b.onclick = () => { hireAgent(b.dataset.ag); UI.save(); renderView(); });
  v.querySelectorAll('[data-agask]').forEach(b => b.onclick = () => { askAgent(); UI.save(); renderView(); });
  v.querySelectorAll('[data-agfire]').forEach(b => b.onclick = () => { if(!b.dataset.sure){ b.dataset.sure = 1; b.innerHTML = '<b>確定解約？</b>'; return; } fireAgent(); UI.save(); renderView(); });
  bindLook(v, () => myLook(), nv => { S.look = nv; }, () => { UI.save(); keepScroll(renderView); });
  v.querySelectorAll('[data-life]').forEach(b => b.onclick = () => { if(buyLife(b.dataset.life)){ sfx('coin'); UI.save(); renderView(); } });
  v.querySelectorAll('[data-tutor]').forEach(b => b.onclick = () => { const a = S.abroad; if(!a) return; if(a.tutor) a.tutor = false; else { const fee = Math.round(S.pro.wage*2/50)*50; if((S.money||0) < fee) return; S.money -= fee; a.tutor = true; addLang(3); sfx('coin'); } UI.save(); renderView(); });
}

/* ---------- 設定 ---------- */
const SET_OPTS = [
  ['fz', '字體大小', [['0.9','細'],['1','標準'],['1.12','大'],['1.25','特大']], '1'],
  ['theme', '主題', [['auto','跟隨系統'],['light','淺色'],['dark','深色']], 'auto'],
  ['anim', '比賽動畫', [['1','開啟'],['0','關閉']], '1', '關閉後關鍵時刻不顯示像素球場（戰報回放仍可使用）'],
  ['odds', '成功率', [['1','顯示數字'],['0','只顯示把握程度']], '1', '只顯示「把握較大／機會一半／把握較小」，增加挑戰性'],
  ['match', '比賽方式', [['ask','每場詢問'],['play','一律親自上陣'],['sim','一律模擬']], 'ask', '選擇「一律」可減少每場比賽前的點擊'],
  ['sfx', '音效', [['1','開啟'],['0','關閉']], '1', '入球歡呼、哨聲、撲救等'],
  ['music', '背景音樂', [['1','開啟'],['0','關閉']], '0', '8 位元風格的循環音樂']
];
const BOOL_SET = { anim:true, odds:true, sfx:true, music:false };
const setVal = k => { const v = SET[k]; if(k in BOOL_SET) return (v==null ? BOOL_SET[k] : v) ? '1' : '0'; return v==null ? SET_OPTS.find(o=>o[0]===k)[3] : String(v); };
function applySet(){
  const r = document.documentElement;
  r.style.setProperty('--fz', SET.fz || 1);
  if(SET.theme==='light' || SET.theme==='dark') r.dataset.theme = SET.theme; else delete r.dataset.theme;
  document.body.classList.toggle('noanim', SET.anim===false);
}
function saveSet(){ try{ localStorage.setItem('g2p-set', JSON.stringify(SET)); }catch(e){} applySet(); }
function settingsBody(back){
  const body = $('menu-body'); $('menu-h').textContent = '設定';
  body.innerHTML = SET_OPTS.map(([k, n, opts, , d]) => `<div class="setrow"><b>${n}</b>${d?`<small>${d}</small>`:''}<div class="seg" role="group" aria-label="${n}">${opts.map(([v,t]) => `<button data-sk="${k}" data-sv="${v}" aria-pressed="${setVal(k)===v}">${t}</button>`).join('')}</div></div>`).join('')
    + `<button class="btn main" id="set-back"><b>完成</b></button>`;
  body.querySelectorAll('[data-sk]').forEach(b => b.onclick = () => { const k = b.dataset.sk, v = b.dataset.sv;
    SET[k] = k==='fz' ? +v : (k in BOOL_SET) ? v==='1' : v; saveSet(); if(k==='music'){ if(SET.music) musicStart(); else musicStop(); } if(k==='sfx' && SET.sfx) sfx('click'); settingsBody(back); });
  $('set-back').onclick = () => { $('menu-h').textContent = '選單'; back ? back() : closeMenu(); };
}
function openSettings(){ $('menu').hidden = false; settingsBody(null); }

/* ---------- 轉會頁（職業期） ---------- */
let MKT_MSG = null;
function viewMarket(){
  const p = S.pro, cur = club(p.club), now = club(curClub()), rc = roleCalc(), a = agentOf();
  const endYr = S.year + Math.max(1, p.cyrs);
  const contract = sec('合約', `<dl class="kv"><dt>球會</dt><dd>${esc(cur.n)}（${LG[cur.lg].n}）</dd>${p.loan?`<dt>外借</dt><dd>${esc(now.n)}，至季尾</dd>`:''}
    <dt>合約</dt><dd>尚餘 ${p.cyrs} 年（${endYr} 年夏天到期）</dd><dt>週薪</dt><dd class="num">${money(p.wage)}</dd><dt>角色</dt><dd>${roleTxt()}</dd>
    <dt>主帥</dt><dd>${esc((now.mgr||{}).n||'—')}・${fitTxt(now.id)}</dd><dt>球衣號碼</dt><dd class="num">${p.num||'—'}</dd><dt>主帥信任</dt><dd class="num">${Math.round(p.trust)}</dd><dt>估計身價</dt><dd class="num"><b>${money(marketValue())}</b></dd>${p.listed===S.year?'<dt>狀態</dt><dd class="bad-t">已提出轉會要求</dd>':''}</dl>`, 'span5');
  const IL = ['球探觀察','有興趣','準備報價'];
  const il = interestList();
  const win = S.term<2 ? (S.term===0 ? '一月轉會窗：主要是外借機會' : '一月轉會窗即將開啟：主要是外借機會') : '賽季結束後：夏季轉會窗';
  const interest = sec('轉會傳聞', `<p class="hint">下一個轉會窗：${win}。以下為傳媒報道，不代表一定會有報價；表現、球迷人氣、經紀人與轉會要求都會影響興趣。</p>
    ${il.length ? `<div class="mk">${il.map(({c,lv}) => `<div class="mk-r"><b>${crestSVG(c.id, 16)}${esc(c.n)}</b><span class="hint">${LG[c.lg].short}・實力 ${Math.round(c.str)}・預計${ROLES[roleFor(c)]}</span><i class="lv lv${lv}">${IL[lv]}</i></div>`).join('')}</div>` : '<p>暫時沒有球會關注你。</p>'}`, 'span7');
  const young = S.age<=22 && rc.r>=2 && !p.loan && !p.semi && S.term<2;
  const canRenew = !p.loan && !p.semi && p.cyrs<=2 && p.renewAsk!==S.year;
  const acts = sec('行動', `${MKT_MSG?`<div class="mk-msg ${MKT_MSG.ok?'ok':''}">${esc(MKT_MSG.t)}</div>`:''}<div class="opts" style="--cols:1">
    <button class="opt" data-mk="renew" ${canRenew?'':'disabled'}><span class="ot"><b>要求續約</b></span><small>${p.loan||p.semi?'外借或半職業期間不適用':p.cyrs>2?'合約尚餘兩年或以下才可提出':p.renewAsk===S.year?'今季已經提出過':'主帥信任 60 或以上、而且是正選或輪換球員，球會才會答應'}</small></button>
    <button class="opt" data-mk="list" ${p.loan||p.listed===S.year?'disabled':''}><span class="ot"><b>提出轉會要求</b><i class="cost">信任 −8</i></span><small>${p.listed===S.year?'已經提出':'夏季轉會窗會有更多報價（包括較低級別球會）；主帥、隊友與球迷都會不滿'}</small></button>
    ${young?`<button class="opt" data-mk="loan" ${S.flags.wantLoan?'disabled':''}><span class="ot"><b>申請外借</b></span><small>${S.flags.wantLoan?'已經申請：一月轉會窗會有更多外借機會':'一月轉會窗較易獲外借到較低級別爭取上陣'}</small></button>`:''}
    ${!p.semi && S.age>=18 ? (isAbroad() ? `<button class="opt" data-mk="home" ${S.flags.homeWish===S.year?'disabled':''}><span class="ot"><b>表示希望回流英格蘭</b></span><small>${S.flags.homeWish===S.year?'已表態：夏季轉會窗會有更多英格蘭球會報價':'夏季轉會窗較易收到英格蘭球會報價'}</small></button>`
      : `<button class="opt" data-mk="abroad" ${S.flags.abroadWish===S.year?'disabled':''}><span class="ot"><b>表示希望到海外發展</b><i class="cost">信任 −2</i></span><small>${S.flags.abroadWish===S.year?'已表態：夏季轉會窗較易收到海外報價':'夏季轉會窗較易收到西甲、意甲、德甲或法甲球會的報價'}</small></button>`) : ''}
    ${a?`<button class="opt" data-mk="agent" ${p.agentAsk===S.year?'disabled':''}><span class="ot"><b>請經紀人物色球會</b></span><small>${p.agentAsk===S.year?'已委託：季尾會帶來報價':`${AGENTS[S.agent.type].n}會在夏季轉會窗帶來額外報價`}</small></button>`:`<button class="opt" data-mk="golife"><span class="ot"><b>聘請經紀人</b></span><small>前往「生活」頁</small></button>`}
  </div>`, 'span5');
  const moves = S.log.filter(l => l.age>=17 && /加盟|外借|續約|轉會要求|收購|行政接管|職業合約/.test(l.t)).slice(-10).reverse();
  const hist = sec('轉會紀錄', moves.length ? `<ul class="flog">${moves.map(l => `<li><i>${seasonLabel(l.y)}</i><b>${l.age} 歲</b><span>${esc(l.t.replace(/^\d+ 歲/,''))}</span></li>`).join('')}</ul>` : '<p class="hint">暫時沒有。</p>', 'span7');
  const mates = panelMates().replace('<div class="pgrid">','').replace(/<\/div>$/,'');
  return `<div class="pgrid">${contract}${interest}${acts}${hist}${squadHTML()}${mates}</div>`;
}
function bindMarket(){
  document.querySelectorAll('#g-view [data-mk]').forEach(b => b.onclick = () => { const k = b.dataset.mk;
    if(k==='list'){ if(!b.dataset.sure){ b.dataset.sure = 1; b.classList.add('sure'); b.querySelector('small').textContent = '再按一次確認：主帥信任會下降'; return; } requestTransfer(); MKT_MSG = { ok:false, t:'你向球會提出了轉會要求。消息很快傳到傳媒耳中。' }; }
    if(k==='renew') MKT_MSG = askRenew();
    if(k==='loan'){ S.flags.wantLoan = 1; MKT_MSG = { ok:true, t:'經紀人開始聯絡低級別球會，一月轉會窗會有更多外借機會。' }; }
    if(k==='agent'){ askAgent(); MKT_MSG = { ok:true, t:'經紀人答應會在夏季轉會窗前聯絡多間球會。' }; }
    if(k==='abroad'){ S.flags.abroadWish = S.year; fx({ trust:-2 }); MKT_MSG = { ok:true, t:'消息傳到歐洲：幾間海外球會開始留意你。' }; }
    if(k==='home'){ S.flags.homeWish = S.year; MKT_MSG = { ok:true, t:'經紀人開始聯絡英格蘭的球會。' }; }
    if(k==='golife'){ setTab('life'); return; }
    UI.save(); renderView(); });
}

/* ---------- 匯出／匯入存檔 ---------- */
let START_MSG = null;
const SAVE_RE = /^R2PL(\d+)([gr])\.([0-9a-f]{8})\.([A-Za-z0-9+/=]+)$/;
const fnv8 = s => { let h = 2166136261; for(let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h>>>0).toString(16).padStart(8,'0'); };
const b64e = u8 => { let s = ''; for(let i=0;i<u8.length;i+=0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i+0x8000)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function gzip(u8, back){ const cs = back ? new DecompressionStream('gzip') : new CompressionStream('gzip');
  return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(cs)).arrayBuffer()); }
function achAll(){ try{ return JSON.parse(localStorage.getItem('g2p-ach')||'{}'); }catch(e){ return {}; } }
async function encodeSave(sv){
  const json = JSON.stringify({ app:'R2PL', v:SAVE_VER, ver:GAME_VER, t:Date.now(), sv, ach:achAll() });
  let data = new TextEncoder().encode(json), mode = 'r';
  if(typeof CompressionStream!=='undefined'){ try{ data = await gzip(data); mode = 'g'; }catch(e){} }
  return `R2PL${SAVE_VER}${mode}.${fnv8(json)}.${b64e(data)}`;
}
/* 回傳 { ok, sv, ach, msg } */
async function decodeSave(code){
  const m = SAVE_RE.exec(String(code||'').replace(/\s+/g,''));
  if(!m) return { ok:false, msg:'存檔碼格式不正確。請確認已複製完整的存檔碼（以 R2PL 開頭）。' };
  let json;
  try{ let u8 = b64d(m[4]); if(m[2]==='g'){ if(typeof DecompressionStream==='undefined') return { ok:false, msg:'這個瀏覽器不支援解壓存檔，請更新瀏覽器。' }; u8 = await gzip(u8, true); } json = new TextDecoder().decode(u8); }
  catch(e){ return { ok:false, msg:'存檔碼不完整或已損壞，可能複製時漏了部分內容。' }; }
  if(fnv8(json)!==m[3]) return { ok:false, msg:'存檔碼不完整或已損壞，可能複製時漏了部分內容。' };
  let p; try{ p = JSON.parse(json); }catch(e){ return { ok:false, msg:'存檔內容無法讀取。' }; }
  if(!p || p.app!=='R2PL' || !p.sv || !p.sv.S) return { ok:false, msg:'這不是本遊戲的存檔。' };
  const mg = migrateS(p.sv.S); if(!mg.ok) return { ok:false, msg:mg.msg };
  return { ok:true, sv:p.sv, ach:p.ach||{}, from:mg.from };
}
function sheet(title, html){ $('menu-h').textContent = title; $('menu-body').innerHTML = html; $('menu').hidden = false; }
function copyText(ta, btn){
  const done = () => { btn.innerHTML = '<b>已複製 ✓</b>'; setTimeout(() => { btn.innerHTML = '<b>複製存檔碼</b>'; }, 1800); };
  const fallback = () => { ta.focus(); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){ btn.innerHTML = '<b>請手動全選並複製</b>'; } };
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).then(done, fallback); else fallback();
}
async function exportBody(i, back){
  const sv = store.get(i); if(!sv || !sv.S) return;
  sheet('匯出存檔', '<p class="hint">正在產生存檔碼……</p>');
  const code = await encodeSave(sv), nm = sv.S.label || `${sv.S.first}・${sv.S.last}`;
  $('menu-body').innerHTML = `<div class="note"><b>${esc(nm)}</b>　${sv.S.age} 歲・${seasonLabel(sv.S.year)}・v${GAME_VER}</div>
    <p class="hint">複製以下存檔碼並妥善保存（例如貼到備忘錄或電郵給自己）。在另一部裝置或瀏覽器按開始畫面的「匯入存檔」貼上，便可繼續這段生涯。存檔碼只代表匯出這一刻的進度。</p>
    <textarea class="savecode" id="x-code" readonly rows="6">${code}</textarea>
    <div class="lf-b"><button class="btn main" id="x-copy"><b>複製存檔碼</b></button><button class="btn" id="x-dl"><b>下載存檔檔案</b></button></div>
    <button class="btn" id="x-back"><b>返回</b></button>`;
  const ta = $('x-code'); ta.onfocus = () => ta.select();
  $('x-copy').onclick = () => copyText(ta, $('x-copy'));
  const d = new Date(), fname = `英超之路存檔-${nm.replace(/[\\/:*?"<>|・]/g,'')}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.txt`, dl = $('x-dl');
  /* 在 claude.ai 內開啟時經平台下載（玩家會看到確認）；獨立網頁則直接下載 */
  if(window.claude && typeof window.claude.use==='function'){
    dl.disabled = true;
    window.claude.use('downloads').then(D => { if(!D){ dl.hidden = true; return; } dl.disabled = false;
      dl.onclick = () => D.save({ filename:fname, data:code }).then(() => { dl.innerHTML = '<b>已下載 ✓</b>'; },
        e => { const c = e && e.code; if(c==='declined' || c==='rate_limited') return; dl.hidden = true; }); });
  } else dl.onclick = () => { try{ const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type:'text/plain' })); a.download = fname;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }catch(e){ dl.innerHTML = '<b>無法下載，請改用複製</b>'; } };
  $('x-back').onclick = () => back ? back() : closeMenu();
}
function openExport(i){ exportBody(i, null); }
function openImport(){
  const slotTxt = i => { const v = store.get(i); return v && v.S && !v.S.done ? `存檔 ${i+1}：${esc(v.S.label || `${v.S.first}・${v.S.last}`)}（${v.S.age} 歲）` : `存檔 ${i+1}：空置`; };
  const free = store.free();
  sheet('匯入存檔', `<p class="hint">貼上之前匯出的存檔碼，或選擇下載過的存檔檔案。舊版本的存檔會自動轉換。</p>
    <textarea class="savecode" id="i-code" rows="6" placeholder="R2PL……"></textarea>
    <label class="btn sm filebtn"><b>選擇存檔檔案</b><input type="file" id="i-file" accept=".txt,text/plain" hidden></label>
    <div class="setrow"><b>匯入到</b><div class="seg" role="group" aria-label="匯入到">${Array.from({ length:NSLOT }, (_,i) => `<button data-slot="${i}" aria-pressed="${i===(free<0?0:free)}">${slotTxt(i)}</button>`).join('')}</div>
    <small id="i-warn"></small></div>
    <div class="mk-msg" id="i-msg" hidden></div>
    <div class="lf-b"><button class="btn main" id="i-go"><b>匯入</b></button><button class="btn" id="i-back"><b>取消</b></button></div>`);
  let target = free<0 ? 0 : free;
  const warn = () => { const v = store.get(target); $('i-warn').textContent = v && v.S && !v.S.done ? '這一格已有存檔，匯入後會被覆蓋。' : ''; $('i-go').dataset.sure = ''; $('i-go').innerHTML = '<b>匯入</b>'; };
  document.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => { target = +b.dataset.slot; document.querySelectorAll('[data-slot]').forEach(x => x.setAttribute('aria-pressed', String(x===b))); warn(); });
  warn();
  $('i-file').onchange = e => { const f = e.target.files[0]; if(!f) return; if(f.size > 2e6){ msg(false, '檔案太大，不是本遊戲的存檔。'); return; } f.text().then(t => { $('i-code').value = t.trim(); $('i-msg').hidden = true; }); };
  const msg = (ok, t) => { const m = $('i-msg'); m.hidden = false; m.className = `mk-msg ${ok?'ok':''}`; m.textContent = t; };
  $('i-go').onclick = async () => {
    const code = $('i-code').value; if(!code.trim()){ msg(false, '請先貼上存檔碼或選擇檔案。'); return; }
    const occ = store.get(target); if(occ && occ.S && !occ.S.done && !$('i-go').dataset.sure){ $('i-go').dataset.sure = 1; $('i-go').innerHTML = '<b>確定覆蓋？</b>'; return; }
    const r = await decodeSave(code); if(!r.ok){ msg(false, r.msg); return; }
    store.set(r.sv, target);
    try{ const g = achAll(); Object.keys(r.ach).forEach(k => g[k] = 1); localStorage.setItem('g2p-ach', JSON.stringify(g)); }catch(e){}
    START_MSG = { ok:true, t:`已匯入到存檔 ${target+1}：${r.sv.S.label || `${r.sv.S.first}・${r.sv.S.last}`}（${r.sv.S.age} 歲）。${r.from<SAVE_VER?'舊版本存檔已自動轉換。':''}` };
    closeMenu(); renderStart(); };
  $('i-back').onclick = closeMenu;
}
function openChangelog(){
  sheet('更新日誌', CHANGELOG.map(([v, d, items], i) => `<div class="clog"><b>v${v}${i===0?' <em>目前版本</em>':''}</b><small>${d}</small><ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`).join('') + '<button class="btn main" id="cl-back"><b>關閉</b></button>');
  $('cl-back').onclick = closeMenu;
}

/* ---------- 特技與宿敵面板 ---------- */
function perkHTML(){
  const list = PERKS.filter(perkFor);
  return `<p class="hint">達成條件後永久解鎖，在關鍵時刻自動生效（選項會顯示「特技」加成）。</p><div class="perks">${list.map(p => { const on = hasPerk(p.id), [a, b] = p.prog(), pc = clamp(a/b*100, 0, 100);
    return `<div class="perk ${on?'on':''}"><b>${on?'★ ':''}${p.n}</b><span>${p.d}</span>${on ? `<small>${S.perks[p.id]} 年解鎖</small>` : `<small>${p.need}（${Math.min(a,b)}／${b}）</small><i><u style="width:${pc}%"></u></i>`}</div>`; }).join('')}</div>`;
}
function rivalHTML(){
  const n = S.cohort.find(x => x.tag==='rival'); if(!n) return '';
  const r = S.rv || { w:0, d:0, l:0, seasons:[] }, se = (r.seasons||[]).slice(-6);
  return `<div class="rv-h"><div><b>${esc(n.n)}</b><span class="hint">${POS[n.pos].n}・${npcStatusTxt(n)}</span></div><div class="rv-rec"><b>${r.w}</b><small>勝</small><b>${r.d}</b><small>和</small><b>${r.l}</b><small>負</small></div></div>
    ${se.length ? `<div class="tablewrap"><table class="hist"><thead><tr><th>賽季</th><th>你的評分</th><th>${esc(n.n)}</th><th>宿敵聯賽</th></tr></thead><tbody>${se.map(s => `<tr><td>${seasonLabel(s.y)}</td><td class="${s.me>s.rt?'win':''}">${s.me?s.me.toFixed(2):'—'}</td><td class="${s.rt>s.me?'win':''}">${s.rt.toFixed(2)}</td><td>${LG[s.lg].short}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${n.hist.length ? `<p class="hint">${esc(n.hist.slice(-3).join('；'))}</p>` : ''}`;
}

/* ---------- 生涯分享卡 ---------- */
function cardData(final, ev){
  ev = ev || evaluate();
  const gk = S.pos==='GK', cs = ev.cs, pl = ev.pl, born = S.year - S.age;
  const clubs = []; S.hist.filter(r => r.lg!=='DEV').forEach(r => { const n = cName(r.club); if(clubs.at(-1)!==n) clubs.push(n); });
  const cnt = {}; S.honours.filter(h => !h.silent).forEach(h => { const t = h.t.replace(/^\d+ /,''); cnt[t] = (cnt[t]||0) + 1; });
  const pts = t => { const r = HONOUR_PTS.find(([re]) => re.test(t)); return r ? r[1] : 1; };
  const hon = Object.entries(cnt).sort((a,b) => pts(b[0])*b[1] - pts(a[0])*a[1]).slice(0,6).map(([t,c]) => c>1 ? `${t} ×${c}` : t);
  const rv = S.cohort.find(x => x.tag==='rival'), r = S.rv;
  return { final, name:fullName(), pos:POS[S.pos].n, years:`${born+6}–${S.year}`, age:S.age, tier:ev.tier, sc:ev.sc, img:playerURL(16),
    tiles:[['稱霸指數', ev.sc], ['職業出場', cs.app], [gk?'零封':'入球', gk?cs.cs:cs.g], ['助攻', cs.a], ['英超出場', pl.app], ['國際賽', S.caps||0]],
    clubs:clubs.slice(-6), hon, after:S.after ? S.after.t : '', diff:S.diff && S.diff!=='normal' ? DIFF[S.diff].n : '', rival: rv && r && (r.w+r.d+r.l) ? `宿敵 ${rv.n}：對決 ${r.w} 勝 ${r.d} 和 ${r.l} 負` : '', perks:Object.keys(S.perks||{}).map(id => PERKS.find(p=>p.id===id)).filter(Boolean).map(p=>p.n).slice(0,4) };
}
async function drawCard(d){
  try{ await Promise.all(['900 64px "Noto Sans HK"','700 30px "Noto Sans HK"','400 26px "Noto Sans HK"','700 60px "Barlow Condensed"','20px "Press Start 2P"'].map(f => document.fonts.load(f, '英超ROAD123'))); }catch(e){}
  const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const gr = g.createLinearGradient(0,0,0,H); gr.addColorStop(0,'#16213D'); gr.addColorStop(1,'#0A1020'); g.fillStyle = gr; g.fillRect(0,0,W,H);
  /* 球場線 */
  g.strokeStyle = 'rgba(255,255,255,.06)'; g.lineWidth = 4; g.strokeRect(40,40,W-80,H-80); g.beginPath(); g.moveTo(40,H/2); g.lineTo(W-40,H/2); g.stroke(); g.beginPath(); g.arc(W/2,H/2,130,0,Math.PI*2); g.stroke();
  const F = (w, s, fam='"Noto Sans HK"') => `${w} ${s}px ${fam}, "PingFang HK", "Microsoft JhengHei", sans-serif`;
  g.textBaseline = 'alphabetic'; g.fillStyle = '#F2B705'; g.font = F('', 20, '"Press Start 2P"'); g.fillText('ROAD TO PREMIER LEAGUE', 80, 120);
  g.fillStyle = 'rgba(233,237,245,.7)'; g.font = F(700, 28); g.fillText(d.final ? '英超之路・生涯結算' : `英超之路・生涯進行中（${d.age} 歲）`, 80, 168);
  /* 球員像素圖 */
  const img = new Image(); img.src = d.img; await new Promise(r => { img.onload = r; img.onerror = r; });
  g.imageSmoothingEnabled = false; const sw = img.width ? 240 : 0, sh = img.width ? Math.round(img.height*240/img.width) : 0;
  g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(80, 210, 300, 330); if(sw) g.drawImage(img, 80+(300-sw)/2, 210+(330-sh)/2, sw, sh);
  const fit = (t, max, w, s, fam) => { let z = s; g.font = F(w, z, fam); while(g.measureText(t).width > max && z > 18){ z -= 2; g.font = F(w, z, fam); } return z; };
  g.fillStyle = '#FFFFFF'; fit(d.name, 600, 900, 64); g.fillText(d.name, 420, 280);
  g.fillStyle = 'rgba(233,237,245,.75)'; g.font = F(500, 30); g.fillText(`${d.pos}・${d.years}`, 420, 330);
  g.fillStyle = '#F2B705'; fit(d.tier, 600, 900, 76); g.fillText(d.tier, 420, 430);
  if(d.perks.length){ g.fillStyle = 'rgba(233,237,245,.6)'; g.font = F(500, 24); g.fillText(`特技：${d.perks.join('、')}`, 420, 490); }
  /* 數據格 */
  d.tiles.forEach(([n, v], i) => { const x = 80 + (i%3)*310, y = 580 + Math.floor(i/3)*170;
    g.fillStyle = i===0 ? 'rgba(242,183,5,.16)' : 'rgba(255,255,255,.06)'; g.fillRect(x, y, 290, 150);
    g.fillStyle = i===0 ? '#F2B705' : '#FFFFFF'; g.font = F(700, 72, '"Barlow Condensed"'); g.fillText(String(v), x+24, y+88);
    g.fillStyle = 'rgba(233,237,245,.65)'; g.font = F(500, 24); g.fillText(n, x+24, y+128); });
  let y = 960;
  const line = (t, c, s, w=500) => { g.fillStyle = c; fit(t, W-160, w, s); g.fillText(t, 80, y); y += s + 18; };
  if(d.clubs.length) line(d.clubs.join(' → '), 'rgba(233,237,245,.85)', 28, 700);
  if(d.hon.length){ y += 6; d.hon.forEach(h => line(`★ ${h}`, '#F7D46B', 28, 700)); } else line('尚未有主要榮譽', 'rgba(233,237,245,.5)', 26);
  if(d.rival) line(d.rival, 'rgba(233,237,245,.75)', 26);
  if(d.after){ g.font = F(400, 24); const words = [...d.after]; let cur = ''; const rows = []; words.forEach(ch => { if(g.measureText(cur+ch).width > W-160){ rows.push(cur); cur = ch; } else cur += ch; }); if(cur) rows.push(cur); rows.slice(0,3).forEach(r0 => { g.fillStyle = 'rgba(233,237,245,.6)'; g.fillText(r0, 80, y); y += 34; }); }
  g.fillStyle = 'rgba(233,237,245,.4)'; g.font = F(400, 20); g.fillText(`非官方同人足球人生模擬遊戲・v${GAME_VER}${d.diff?`・${d.diff}難度`:''}`, 80, H-70);
  return cv;
}
async function openShareCard(final, ev){
  const d = cardData(final, ev);
  sheet('生涯分享卡', '<p class="hint">正在繪製……</p>');
  const cv = await drawCard(d), url = cv.toDataURL('image/png');
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  const fname = `英超之路-${d.name.replace(/[\\/:*?"<>|・]/g,'')}.png`;
  $('menu-body').innerHTML = `<img class="sharecard" src="${url}" alt="${esc(d.name)}的生涯分享卡"><p class="hint">手機可以長按圖片儲存，再分享到 WhatsApp、IG 等。</p>
    <div class="lf-b"><button class="btn main" id="sc-share" hidden><b>分享</b></button><button class="btn" id="sc-dl"><b>下載圖片</b></button></div><button class="btn" id="sc-back"><b>關閉</b></button>`;
  const file = blob && typeof File!=='undefined' ? new File([blob], fname, { type:'image/png' }) : null;
  if(file && navigator.canShare && navigator.canShare({ files:[file] })){ const b = $('sc-share'); b.hidden = false;
    b.onclick = () => navigator.share({ files:[file], title:'英超之路', text:`${d.name}：${d.tier}，稱霸指數 ${d.sc}` }).catch(() => {}); }
  const dl = $('sc-dl');
  if(window.claude && typeof window.claude.use==='function'){ dl.disabled = true;
    window.claude.use('downloads').then(D => { if(!D){ dl.hidden = true; return; } dl.disabled = false;
      dl.onclick = () => D.save({ filename:fname, data:blob }).then(() => { dl.innerHTML = '<b>已下載 ✓</b>'; }, e => { const c = e && e.code; if(c==='declined' || c==='rate_limited') return; dl.hidden = true; }); }); }
  else dl.onclick = () => { const a = document.createElement('a'); a.href = url; a.download = fname; document.body.appendChild(a); a.click(); a.remove(); };
  $('sc-back').onclick = closeMenu;
}

/* ---------- 鍵盤快捷鍵：1–9 選擇選項，Enter／空白鍵按「完成」 ---------- */
document.addEventListener('keydown', e => {
  if($('modal').hidden || !$('menu').hidden || e.ctrlKey || e.metaKey || e.altKey || /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) return;
  const btns = [...document.querySelectorAll('#act button:not([disabled]):not(.locked)')];
  if(/^[1-9]$/.test(e.key)){ const b = btns[+e.key-1]; if(b){ e.preventDefault(); b.click(); } return; }
  if((e.key==='Enter' || e.key===' ') && btns.length===1 && document.activeElement!==btns[0]){ e.preventDefault(); btns[0].click(); }
});

/* ---------- 外貌選擇器（建立球員及生活頁共用） ---------- */
function lookPicker(L, kit, opt={}){
  const sw = (k, c, label) => `<button class="sw" data-lk="${k}" data-lv="${c}" style="--c:${c||'transparent'}" aria-pressed="${(L[k]||'')===c}" aria-label="${label||c}" title="${label||''}">${c?'':'✕'}</button>`;
  const txt = (k, v, n) => `<button class="lp-t" data-lk="${k}" data-lv="${v}" aria-pressed="${(L[k]||'none')===v}">${n}</button>`;
  const row = (n, html) => `<div class="lp-row"><b>${n}</b><div class="lp-set">${html}</div></div>`;
  return `<div class="lookp"><div class="lp-prev"><div class="lp-imgs"><img src="${lookURL(L, kit, 10)}" alt="你的球員"><img src="${lookURL(L, kit, 10, true)}" alt=""></div><button class="btn sm" data-lrand><b>隨機外貌</b></button></div>
    <div class="lp-opts">
      ${opt.noSkin ? '' : row('膚色', SKIN_OPTS.map((c,i) => sw('s', c, `膚色 ${i+1}`)).join(''))}
      ${row('髮型', Object.entries(HAIR_STYLES).map(([k,v]) => `<button class="lp-st" data-lk="st" data-lv="${k}" aria-pressed="${(L.st||'short')===k}"><img src="${lookURL({ ...L, st:k, f:'none', hb:'', tat:'none' }, kit, 4)}" alt=""><span>${v.n}</span></button>`).join(''))}
      ${row('髮色', HAIR_OPTS.map((c,i) => sw('h', c, `髮色 ${i+1}`)).join(''))}
      ${row('鬍鬚', Object.entries(FACIAL).map(([k,v]) => txt('f', k, v.n)).join(''))}
      ${row('頭帶', BAND_OPTS.map(([c,n]) => sw('hb', c, n)).join(''))}
      ${row('紋身', Object.entries(TATTOO).map(([k,v]) => txt('tat', k, v.n)).join(''))}
      ${row('波鞋', BOOT_OPTS.map(([c,n]) => sw('bt', c, n)).join(''))}
    </div></div>`;
}
function bindLook(root, get, set, rerender){
  if(!root) return;
  root.querySelectorAll('[data-lk]').forEach(b => b.onclick = () => { const L = { ...get() }; L[b.dataset.lk] = b.dataset.lv; set(L); rerender(); });
  root.querySelectorAll('[data-lrand]').forEach(b => b.onclick = () => { const cur = get(), L = randLook(); if(root.id!=='create') L.s = cur.s; set(L); rerender(); });
}

/* ---------- 排行榜介面 ---------- */
const DIFF_TAG = d => d && d!=='normal' ? `<em class="dtag ${d}">${DIFF[d].n}</em>` : '';
function boardTable(rows, mine){
  if(!rows.length) return '<p class="hint">暫時沒有紀錄。</p>';
  return `<div class="tablewrap"><table class="lb"><thead><tr><th></th><th>球員</th><th>評級</th><th>稱霸指數</th></tr></thead><tbody>${rows.map((r,i) => `<tr class="${mine && mine===r.id?'me':''}"><td>${i+1}</td><td><b>${esc(r.name)}</b>${DIFF_TAG(r.diff)}<small>${esc(r.pos||'')}${r.honours?`・${esc(r.honours)}`:''}</small></td><td>${esc(r.tier)}</td><td class="num"><b>${r.score}</b></td></tr>`).join('')}</tbody></table></div>`;
}
function openBoard(tab='global', diff=''){
  const tabs = `<div class="mr-tabs"><button data-bt="global" aria-selected="${tab==='global'}">全球排行榜</button><button data-bt="local" aria-selected="${tab==='local'}">我的紀錄</button></div>`;
  const filt = `<div class="seg lb-f">${[['','全部'],['easy','輕鬆'],['normal','標準'],['hard','困難'],['real','現實']].map(([k,n]) => `<button data-bd="${k}" aria-pressed="${diff===k}">${n}</button>`).join('')}</div>`;
  let body;
  if(tab==='local') body = boardTable(recAll().filter(r => !diff || r.diff===diff)) + '<p class="hint">本機紀錄只儲存在這部裝置的瀏覽器。</p>';
  else body = lbOn() ? '<p class="hint" id="lb-load">載入中……</p>' : '<p class="hint">全球排行榜將於遊戲正式上線後開放。現時可以查看「我的紀錄」。</p>';
  sheet('排行榜', `${tabs}${filt}<div id="lb-body">${body}</div><button class="btn main" id="lb-close"><b>關閉</b></button>`);
  document.querySelectorAll('[data-bt]').forEach(b => b.onclick = () => openBoard(b.dataset.bt, diff));
  document.querySelectorAll('[data-bd]').forEach(b => b.onclick = () => openBoard(tab, b.dataset.bd));
  $('lb-close').onclick = closeMenu;
  if(tab==='global' && lbOn()) lbFetch(diff).then(rows => { const el = $('lb-body'); if(el) el.innerHTML = boardTable(rows) + '<p class="hint">排行榜由玩家自行上載，只供娛樂。</p>'; })
    .catch(() => { const el = $('lb-body'); if(el) el.innerHTML = '<p class="hint">暫時未能連接排行榜，請稍後再試。</p>'; });
}
/* 結算畫面：記錄成績並可上載 */
function endBoardHTML(rec, rank){
  return `<h3>排行榜</h3><div class="lb-end"><p>這段生涯在你的紀錄中排第 <b>${rank}</b> 位。</p>
    ${lbOn() ? `<div class="lb-up"><input class="ren-in" id="lb-name" maxlength="16" value="${esc(rec.name)}" aria-label="排行榜顯示名稱"><button class="btn main" id="lb-send"><b>上載到全球排行榜</b></button></div><p class="hint" id="lb-msg">只會上載名稱、評級、稱霸指數及主要榮譽。</p>` : '<p class="hint">全球排行榜將於遊戲正式上線後開放。</p>'}
    <button class="btn" id="lb-open"><b>查看排行榜</b></button></div>`;
}
function bindEndBoard(rec){
  const o = $('lb-open'); if(o) o.onclick = () => openBoard(lbOn() ? 'global' : 'local');
  const s = $('lb-send'); if(!s) return;
  if(S && S.lbSent){ s.disabled = true; s.innerHTML = '<b>已上載 ✓</b>'; return; }
  s.onclick = async () => { const nm = ($('lb-name').value||'').trim(); if(!nm){ $('lb-msg').textContent = '請輸入名稱。'; return; }
    s.disabled = true; s.innerHTML = '<b>上載中……</b>';
    try{ await lbSubmit(rec, nm); S.lbSent = 1; s.innerHTML = '<b>已上載 ✓</b>'; $('lb-msg').textContent = '成績已上載。'; }
    catch(e){ s.disabled = false; s.innerHTML = '<b>再試一次</b>'; $('lb-msg').textContent = '上載失敗，請檢查網絡後再試。'; } };
}

/* ---------- 球隊陣容與聯賽紀錄 ---------- */
const stars = (v, ref) => { const d = v - ref, n = clamp(Math.round(3 + d/3.5), 1, 5); return `<span class="stars" title="能力約 ${Math.round(v)}">${'★'.repeat(n)}<i>${'★'.repeat(5-n)}</i></span>`; };
function squadHTML(){
  const c = club(curClub()); if(!c || !hasSquad(c) || !c.sq) return '';
  const order = p => POS_ORDER.indexOf(p) < 0 ? 99 : POS_ORDER.indexOf(p);
  const xi = new Set(xiOf(c).map(p => p.id)), ref = c.str;
  const rows = c.sq.slice().sort((a,b) => order(a.p)-order(b.p) || b.v-a.v).map(p => `<tr class="${p.p===S.pos?'same':''}"><td>${POS[p.p].n}</td><td><b>${esc(p.n)}</b>${xi.has(p.id)?'<em class="tg">主力</em>':''}${p.a<=19?'<em class="tg y">新星</em>':''}</td><td>${p.a}</td><td>${stars(p.v, ref)}</td><td class="num">${p.g}</td><td class="num">${p.cg}</td></tr>`).join('');
  const me = `<tr class="me"><td>${POS[S.pos].n}</td><td><b>★ ${esc(fullName())}</b></td><td>${S.age}</td><td>${stars(estOvr(), ref)}</td><td class="num">${(S.hist.at(-1)||{}).g ?? '—'}</td><td class="num">${careerStats().g}</td></tr>`;
  const same = c.sq.filter(p => p.p===S.pos).length;
  return sec(`球隊陣容・${esc(c.n)}`, `<p class="hint">星級以球會整體水平為基準。與你同位置的隊友有 ${same} 人（以淺色標示），他們是你爭取正選的對手。入球為上季及生涯數字。</p>
    <div class="tablewrap"><table class="hist sq"><thead><tr><th>位置</th><th>球員</th><th>年齡</th><th>能力</th><th>上季入球</th><th>生涯入球</th></tr></thead><tbody>${me}${rows}</tbody></table></div>`, 'span12');
}
function recordsHTML(){
  const W = S.W; if(!W || !W.hist || !W.hist.length) return '';
  const lg = S.pro ? (club(curClub()).lg==='NON' ? 'NL' : club(curClub()).lg) : 'PL';
  const tab = l => { const rows = W.hist.filter(h => h.lg===l).slice(-10).reverse();
    return rows.length ? `<div class="tablewrap"><table class="hist"><thead><tr><th>賽季</th><th>冠軍</th><th>金靴</th></tr></thead><tbody>${rows.map(h => `<tr><td>${seasonLabel(h.y)}</td><td>${esc(cName(h.champ))}</td><td>${h.boot ? `${esc(h.boot.n)}（${esc(cName(h.boot.c))}）${h.boot.g} 球` : '—'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="hint">暫時沒有紀錄。</p>'; };
  /* 歷史射手榜：現役球員、退役名宿與你 */
  const act = Object.values(W.clubs).filter(c => c.sq).flatMap(c => c.sq.map(p => ({ n:p.n, c:c.id, g:p.cg, act:true })));
  const all = [...act, ...W.hof.map(h => ({ n:h.n, c:h.c, g:h.cg, act:false })), { n:`★ ${fullName()}`, c:S.pro ? S.pro.club : null, g:careerStats().g, me:true }].sort((a,b) => b.g-a.g).slice(0,10);
  const top = `<div class="tablewrap"><table class="hist"><thead><tr><th></th><th>球員</th><th>球會</th><th>入球</th></tr></thead><tbody>${all.map((x,i) => `<tr class="${x.me?'me':''}"><td>${i+1}</td><td>${esc(x.n)}${!x.act && !x.me ? ' <em class="tg">已退役</em>' : ''}</td><td>${esc(cName(x.c))}</td><td class="num">${x.g}</td></tr>`).join('')}</tbody></table></div><p class="hint">只計算你成為職業球員之後的賽季。</p>`;
  return `${sec(`${LG[lg].n}歷屆冠軍與金靴`, tab(lg), 'span6')}${sec('歷史射手榜', top, 'span6')}`;
}

/* ---------- PWA：可安裝、離線遊玩（只在正式網站啟用，不在 Claude 預覽中啟用） ---------- */
let PWA_EVT = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function pwaInit(){
  if((location.protocol !== 'https:' && location.hostname !== 'localhost') || window.claude || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('sw.js').catch(() => {});
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); PWA_EVT = e; pwaButton(); });
  window.addEventListener('appinstalled', () => { PWA_EVT = null; pwaButton(); });
  pwaButton();
}
function pwaButton(){
  const b = $('s-inst'); if(!b) return;
  const can = !isStandalone() && location.protocol === 'https:' && !window.claude && (PWA_EVT || isIOS());
  b.hidden = !can;
  b.onclick = async () => {
    if(PWA_EVT){ PWA_EVT.prompt(); try{ await PWA_EVT.userChoice; }catch(e){} PWA_EVT = null; pwaButton(); return; }
    sheet('安裝到主畫面', `<p>在 iPhone 或 iPad：</p><ol class="steps"><li>用 Safari 開啟這個網頁</li><li>按下方的「分享」按鈕</li><li>選擇「加入主畫面」</li></ol><p class="hint">安裝後可以像 app 一樣全螢幕遊玩，冇網絡時亦可以繼續（全球排行榜及雲端存檔除外）。</p><button class="btn main" id="pi-ok"><b>知道了</b></button>`);
    $('pi-ok').onclick = closeMenu; };
}

/* ---------- 雲端存檔介面 ---------- */
const fmtT = t => { const d = new Date(t); return isNaN(d) ? '—' : `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
const slotSum = v => v && v.S && !v.S.done ? `${esc(v.S.label || `${v.S.first}・${v.S.last}`)}（${v.S.age} 歲・${seasonLabel(v.S.year)}）` : '空置';
function openCloud(msg){
  if(!lbOn()){ sheet('雲端存檔', '<p>雲端存檔只在正式網站提供。</p><button class="btn main" id="cl-x"><b>關閉</b></button>'); $('cl-x').onclick = closeMenu; return; }
  const cfg = syncCfg(), m = msg ? `<div class="mk-msg ${msg.ok?'ok':''}">${esc(msg.t)}</div>` : '';
  if(!cfg){
    sheet('雲端存檔', `${m}<p>把三個存檔位同步到雲端，在另一部電腦或手機輸入同一個<b>同步碼</b>，便可以繼續同一段生涯。不需要登記帳號或電郵。</p>
      <div class="lf-b"><button class="btn main" id="cl-new"><b>建立同步碼</b></button></div>
      <div class="setrow"><b>已經有同步碼？</b><div class="lb-up"><input class="ren-in" id="cl-code" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX-X" autocomplete="off" autocapitalize="characters"><button class="btn" id="cl-use"><b>連接</b></button></div></div>
      <p class="hint">同步碼等同密碼：任何人取得同步碼，都可以讀取或覆蓋你的存檔，請不要公開。</p><button class="btn" id="cl-x"><b>關閉</b></button>`);
    $('cl-x').onclick = closeMenu;
    $('cl-new').onclick = async () => { const code = newSyncCode(); syncSave({ code, created:Date.now() }); try{ await cloudPush(); openCloud({ ok:true, t:'已建立同步碼並上載存檔。請把同步碼抄下或複製到安全的地方。' }); } catch(e){ openCloud({ ok:false, t:'上載失敗，請檢查網絡後按「立即上載」。' }); } };
    $('cl-use').onclick = async () => { const code = normCode($('cl-code').value); if(code.replace(/-/g,'').length < 24){ openCloud({ ok:false, t:'同步碼不完整。' }); return; }
      try{ const r = await cloudPull(code); if(!r){ openCloud({ ok:false, t:'找不到這個同步碼的存檔，請檢查是否輸入正確。' }); return; } syncSave({ code, created:Date.now() }); cloudRestore(r); }
      catch(e){ openCloud({ ok:false, t:'連接失敗，請檢查網絡後再試。' }); } };
    return;
  }
  sheet('雲端存檔', `${m}<div class="note"><b>同步碼</b><div class="sync-code" id="cl-show">●●●●●-●●●●●-●●●●●-●●●●●-●●●●●-●</div>
      <div class="lf-b"><button class="btn sm" id="cl-reveal"><b>顯示</b></button><button class="btn sm" id="cl-copy"><b>複製</b></button></div></div>
    <p class="hint">開啟同步後，每次存檔約 20 秒內會自動上載。上次上載：${cfg.last ? fmtT(cfg.last) : '未有'}</p>
    <div class="lf-b"><button class="btn main" id="cl-push"><b>立即上載</b></button><button class="btn" id="cl-pull"><b>從雲端下載</b></button></div>
    <button class="btn warn" id="cl-off"><b>在這部裝置停止同步</b></button><button class="btn" id="cl-x"><b>關閉</b></button>`);
  $('cl-x').onclick = closeMenu;
  $('cl-reveal').onclick = () => { $('cl-show').textContent = cfg.code; };
  $('cl-copy').onclick = () => { const b = $('cl-copy'); (navigator.clipboard ? navigator.clipboard.writeText(cfg.code) : Promise.reject()).then(() => { b.innerHTML = '<b>已複製 ✓</b>'; }, () => { $('cl-show').textContent = cfg.code; b.innerHTML = '<b>請手動複製</b>'; }); };
  $('cl-push').onclick = async () => { try{ await cloudPush(); openCloud({ ok:true, t:'已上載。' }); } catch(e){ openCloud({ ok:false, t:'上載失敗，請檢查網絡後再試。' }); } };
  $('cl-pull').onclick = async () => { try{ const r = await cloudPull(); if(!r){ openCloud({ ok:false, t:'雲端暫時沒有存檔。' }); return; } cloudRestore(r); } catch(e){ openCloud({ ok:false, t:'下載失敗，請檢查網絡後再試。' }); } };
  $('cl-off').onclick = () => { const b = $('cl-off'); if(!b.dataset.sure){ b.dataset.sure = 1; b.innerHTML = '<b>確定？雲端存檔不會被刪除，只是這部裝置不再同步</b>'; return; } syncSave(null); openCloud({ ok:true, t:'這部裝置已停止同步。' }); };
}
/* 下載：逐格比較，確認後以雲端覆蓋本機 */
function cloudRestore(r){
  const loc = Array.from({ length:NSLOT }, (_,i) => store.get(i)), rem = r.p.slots || [];
  sheet('從雲端下載', `<p>雲端存檔上載於 ${fmtT(r.at)}（遊戲版本 ${esc(r.p.ver||'')}）。</p>
    <div class="tablewrap"><table class="hist"><thead><tr><th></th><th>這部裝置</th><th>雲端</th></tr></thead><tbody>${Array.from({ length:NSLOT }, (_,i) => `<tr><td>存檔 ${i+1}</td><td>${slotSum(loc[i])}</td><td>${slotSum(rem[i])}</td></tr>`).join('')}</tbody></table></div>
    <p class="hint">下載會以雲端的三個存檔位覆蓋這部裝置的存檔；舊版本存檔會自動轉換。</p>
    <div class="lf-b"><button class="btn main" id="cr-go"><b>以雲端覆蓋這部裝置</b></button><button class="btn" id="cr-no"><b>取消</b></button></div>`);
  $('cr-no').onclick = () => openCloud();
  $('cr-go').onclick = () => { const b = $('cr-go'); if(!b.dataset.sure){ b.dataset.sure = 1; b.innerHTML = '<b>確定覆蓋？</b>'; return; }
    rem.forEach((sv, i) => { if(sv && sv.S){ if(migrateS(sv.S).ok) store.set(sv, i); } else store.clear(i); });
    try{ const g = JSON.parse(localStorage.getItem('g2p-ach')||'{}'); Object.keys(r.p.ach||{}).forEach(k => g[k] = 1); localStorage.setItem('g2p-ach', JSON.stringify(g)); }catch(e){}
    const c = syncCfg(); if(c){ c.last = Date.now(); syncSave(c); }
    START_MSG = { ok:true, t:'已從雲端下載存檔。' }; closeMenu(); renderStart(); show('start'); };
}
