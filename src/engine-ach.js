/* ================= 成就 ================= */
const hasHon = re => S.honours.some(h => re.test(h.t));
const everStage = st => S.flags['st_'+st];
const ACH = [
  ['firstgoal','第一個入球','在任何比賽中打入第一球', () => (S.flags.goals||0)>=1],
  ['sig10','招牌球星','成功使出招牌動作 10 次', () => (S.flags.sigs||0)>=10],
  ['hat','帽子戲法','單場關鍵時刻入三球', () => S.flags.hat],
  ['r9','完美演出','單場評分 9.0 或以上', () => S.flags.r9],
  ['motm10','全場最佳常客','獲選全場最佳 10 次', () => (S.flags.motm||0)>=10],
  ['aca','踏入學院','加入任何一間學院', () => everStage('ACA')],
  ['cat1','頂級青訓','加入 Category 1 學院', () => S.flags.cat1],
  ['ycap','少年隊長','成為青年隊隊長', () => S.flags.ycap],
  ['engy','三獅幼苗','入選英格蘭青年隊訓練營', () => (S.flags.engYouth||0)>=1],
  ['scholar','全職學徒','獲得 Scholarship', () => everStage('SCH')],
  ['comeback','跌倒再起','被學院放棄後，仍然簽下職業合約', () => S.flags.released && S.pro && !S.pro.semi],
  ['nonleague','非聯賽出身','由非聯賽起步，最終踢上英足聯', () => S.flags.wasSemi && S.hist.some(r => ['CH','L1','L2'].includes(r.lg) || r.lg==='PL')],
  ['pro','職業球員','簽下第一份職業合約', () => S.pro && !S.pro.semi],
  ['debut','一隊首秀','代表一隊上陣', () => S.pro && S.pro.debut],
  ['loan','外借歷練','被外借到其他球會', () => S.hist.some(r => r.loan)],
  ['plDebut','英超首秀','在英超上陣', () => S.hist.some(r => r.lg==='PL' && r.app>0) || (S.stage==='PRO' && curLg()==='PL' && S.ss && S.ss.app>0)],
  ['pl100','英超百場','英超出場 100 次', () => plStats().app>=100],
  ['g100','百球射手','職業生涯入球 100 個', () => careerStats().g>=100],
  ['cs50','零封專家','職業生涯零封 50 場', () => careerStats().cs>=50],
  ['promo','升級功臣','隨球會升級', () => hasHon(/升級/)],
  ['eng','三獅國腳','代表英格蘭出賽', () => S.nt==='ENG' && S.caps>0],
  ['her','血濃於水','代表家族血統的國家隊出賽', () => S.nt==='HER' && S.caps>0],
  ['caps50','國家隊中堅','國際賽出場 50 次', () => S.caps>=50],
  ['captain','隊長','成為球會隊長', () => S.pro && S.pro.captain],
  ['facup','溫布萊之夜','贏得 FA Cup', () => hasHon(/^FA Cup/)],
  ['title','英超冠軍','贏得英超冠軍', () => hasHon(/^英超冠軍/)],
  ['boot','金靴','贏得英超金靴', () => hasHon(/^英超金靴/)],
  ['glove','金手套','贏得英超金手套', () => hasHon(/^英超金手套/)],
  ['pfa','PFA 年度最佳球員','獲選 PFA 年度最佳球員', () => hasHon(/^PFA 年度最佳球員/)],
  ['wc','世界盃冠軍','贏得世界盃', () => hasHon(/世界盃（冠軍）/)],
  ['loyal','一生一會','同一球會效力 10 季', () => S.pro && Object.values(S.pro.clubYrs||{}).some(v => v>=10)],
  ['gkpl','英超門將','以門將身份在英超上陣', () => S.pos==='GK' && S.hist.some(r => r.lg==='PL' && r.app>0)],
  ['vet','老而彌堅','38 歲仍在職業聯賽上陣', () => S.age>=38 && S.stage==='PRO' && S.ss && S.ss.app>0],
  ['euro','歐洲之巔','贏得歐洲國家盃', () => hasHon(/歐洲國家盃（冠軍）/)],
  ['pens','十二碼英雄','在大賽互射十二碼中射入或撲出關鍵一球', () => !!S.flags.penHero],
  ['tgb','大賽神射手','奪得世界盃或歐洲國家盃金靴', () => hasHon(/(世界盃|歐洲國家盃)金靴/)],
  ['rvking','宿敵終結者','在宿敵對決中勝出 5 次', () => (S.rv&&S.rv.w||0)>=5],
  ['perk5','全能球員','解鎖 5 個特技', () => Object.keys(S.perks||{}).length>=5],
  ['oneclub','一生一會','為同一間球會效力十個賽季', () => !!(S.pro && Object.values(S.pro.clubYrs||{}).some(y=>y>=10))],
  ['statue','不朽銅像','球會在球場外為你豎立銅像', () => hasHon(/銅像/)],
  ['hard','逆境中成長','以困難難度成為職業球員', () => S.diff==='hard' && S.stage==='PRO'],
  ['objall','超額完成','一季內達成全部賽季目標', () => (S.flags.objAll||0)>=1],
  ['legend','英超傳奇','生涯結算達到「英超傳奇」', () => S.done && dominance()>=1600]
];
/* 檢查並記錄新成就；回傳新解鎖的名稱 */
function checkAch(){
  if(!S) return [];
  S.ach = S.ach || {}; S.flags['st_'+S.stage] = 1;
  if(S.aca && S.aca.cat===1) S.flags.cat1 = 1;
  if(S.pro && S.pro.semi) S.flags.wasSemi = 1;
  const got = [];
  ACH.forEach(([id, n, d, f]) => { if(S.ach[id]) return; let ok = false; try{ ok = !!f(); }catch(e){} if(ok){ S.ach[id] = S.year; got.push(n); } });
  if(got.length){ try{ const g = JSON.parse(localStorage.getItem('g2p-ach')||'{}'); Object.keys(S.ach).forEach(k => g[k] = 1); localStorage.setItem('g2p-ach', JSON.stringify(g)); }catch(e){} }
  return got;
}
