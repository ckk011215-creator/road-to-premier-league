/* ================= 靜態資料 =================
   世界觀：只有英格蘭足球體系（含喺英格蘭聯賽踢嘅威爾斯球會）。
   球會以 2025/26 賽季為起點，之後每季升降級由遊戲模擬。學院級別為遊戲簡化。 */

/* 外場球員與門將共用九個能力欄位，但名稱及意義不同；setAttrSet() 按位置切換顯示名稱 */
const ATTR_OUT = { tec:'技術', pas:'傳球', sho:'射門', def:'防守', pac:'速度', str:'力量', sta:'體能', hea:'頭球', iq:'球商' };
const ATTR_GK  = { tec:'接球', pas:'出球', sho:'反應', def:'站位', pac:'爆發', str:'力量', sta:'體能', hea:'制空', iq:'指揮' };
const ATTR_N = { ...ATTR_OUT };
const ATTRS = Object.keys(ATTR_N);
function setAttrSet(gk){ Object.assign(ATTR_N, gk ? ATTR_GK : ATTR_OUT); }
/* P＝身體（受發育影響），T＝技術，M＝讀比賽 */
const ATTR_KIND = { tec:'T', pas:'T', sho:'T', hea:'T', def:'M', iq:'M', pac:'P', str:'P', sta:'P' };

/* 位置：綜合能力權重（合計 1） */
const POS = {
  CB: { n:'中堅', g:'DEF', w:{ def:.34, str:.2, hea:.22, pas:.12, iq:.12 } },
  FB: { n:'邊閘', g:'DEF', w:{ def:.28, pac:.28, sta:.2, pas:.16, tec:.08 } },
  DM: { n:'後腰', g:'MID', w:{ def:.3, pas:.24, iq:.24, sta:.14, str:.08 } },
  CM: { n:'中場', g:'MID', w:{ pas:.32, iq:.24, sta:.18, tec:.18, def:.08 } },
  AM: { n:'進攻中場', g:'MID', w:{ tec:.3, pas:.28, iq:.24, sho:.18 } },
  W:  { n:'翼鋒', g:'ATT', w:{ pac:.32, tec:.34, sho:.16, pas:.12, sta:.06 } },
  ST: { n:'中鋒', g:'ATT', w:{ sho:.42, hea:.18, str:.16, pac:.14, tec:.1 } },
  /* 門將：反應＝撲救、站位、接球、制空、指揮、爆發（出擊）、出球 */
  GK: { n:'門將', g:'GK', w:{ sho:.26, def:.2, tec:.16, hea:.14, iq:.1, pac:.1, pas:.04 } }
};
const POS_ORDER = ['CB','FB','DM','CM','AM','W','ST','GK'];
const OUT_POS = POS_ORDER.filter(p => p!=='GK');
const GOAL90 = { CB:.05, FB:.04, DM:.05, CM:.11, AM:.22, W:.3, ST:.46, GK:0 };
const AST90  = { CB:.03, FB:.11, DM:.07, CM:.15, AM:.27, W:.24, ST:.14, GK:.005 };

/* 聯賽：par＝該級一隊平均能力；g＝聯賽場數；wage＝週薪基準（英鎊） */
const LG = {
  PL:  { n:'英超', short:'英超', par:70, g:38, wage:45000, lvl:1 },
  CH:  { n:'英冠', short:'英冠', par:62, g:46, wage:9000,  lvl:2 },
  L1:  { n:'英甲', short:'英甲', par:56, g:46, wage:3000,  lvl:3 },
  L2:  { n:'英乙', short:'英乙', par:51, g:46, wage:1500,  lvl:4 },
  NL:  { n:'英議聯', short:'英議聯', par:46, g:46, wage:700, lvl:5 },
  NON: { n:'非聯賽（第 6 級以下）', short:'非聯賽', par:38, g:42, wage:120, lvl:6 }
};
const LG_ORDER = ['PL','CH','L1','L2','NL','NON'];

/* 地區代碼：LDN 倫敦、SE 東南、SW 西南、WM 西米特蘭、EM 東米特蘭、NW 西北、YK 約克郡、NE 東北、EA 東英格蘭、WAL 南威爾斯 */
/* [id, 顯示名, 聯賽, 地區, 學院級別(0=冇學院)] — 每個聯賽大致由強到弱排 */
const CLUB_DATA = [
  ['LIV','利物浦','PL','NW',1],['ARS','阿仙奴','PL','LDN',1],['MCI','曼城','PL','NW',1],['CHE','車路士','PL','LDN',1],
  ['NEW','紐卡素','PL','NE',1],['MUN','曼聯','PL','NW',1],['TOT','熱刺','PL','LDN',1],['AVL','阿士東維拉','PL','WM',1],
  ['BHA','白禮頓','PL','SE',1],['NFO','諾定咸森林','PL','EM',1],['CRY','水晶宮','PL','LDN',1],['BOU','般尼茅夫','PL','SW',2],
  ['BRE','賓福特','PL','LDN',0],['FUL','富咸','PL','LDN',1],['WHU','韋斯咸','PL','LDN',1],['EVE','愛華頓','PL','NW',1],
  ['WOL','狼隊','PL','WM',1],['LEE','列斯聯','PL','YK',1],['BUR','般尼','PL','NW',2],['SUN','新特蘭','PL','NE',1],

  ['LEI','李斯特城','CH','EM',1],['SOU','修咸頓','CH','SE',1],['IPS','葉士域治','CH','EA',2],['SHU','錫菲聯','CH','YK',2],
  ['MID','米杜士堡','CH','NE',1],['COV','高雲地利','CH','WM',2],['WBA','西布朗','CH','WM',1],['NOR','諾域治','CH','EA',1],
  ['WAT','屈福特','CH','LDN',2],['BRC','布里斯托城','CH','SW',2],['HUL','侯城','CH','YK',2],['MIL','米禾爾','CH','LDN',2],
  ['STK','史篤城','CH','WM',1],['QPR','昆士柏流浪','CH','LDN',2],['SWA','史雲斯','CH','WAL',1],['PNE','普雷斯頓','CH','NW',3],
  ['DER','打吡郡','CH','EM',1],['BLB','布力般流浪','CH','NW',1],['WRE','域斯咸','CH','NW',3],['POR','樸茨茅夫','CH','SE',3],
  ['BIR','伯明翰','CH','WM',2],['SHW','錫周三','CH','YK',2],['OXF','牛津聯','CH','SE',3],['CHA','查爾頓','CH','LDN',2],

  ['LUT','盧頓','L1','LDN',3],['PLY','普利茅夫','L1','SW',3],['CAR','卡迪夫','L1','WAL',2],['HUD','哈德斯菲爾德','L1','YK',2],
  ['BOL','保頓','L1','NW',3],['WIG','韋根','L1','NW',3],['REA','雷丁','L1','SE',1],['STO','史托港','L1','NW',3],
  ['BAR','巴恩斯利','L1','YK',3],['BPL','黑池','L1','NW',3],['PET','彼德堡','L1','EA',3],['ROT','洛達咸','L1','YK',3],
  ['WYC','韋甘比','L1','SE',3],['LIN','林肯城','L1','EM',3],['MAN','曼斯菲特','L1','EM',3],['LEY','雷頓東方','L1','LDN',3],
  ['EXE','艾斯特城','L1','SW',3],['STE','史蒂芬納吉','L1','LDN',3],['NTN','北安普頓','L1','EM',3],['BRT','伯頓艾爾賓','L1','WM',3],
  ['PVL','韋爾港','L1','WM',3],['DON','唐卡士打','L1','YK',3],['BRA','布拉福特城','L1','YK',3],['WIM','溫布頓','L1','LDN',3],

  ['MKD','米爾頓凱恩斯','L2','SE',3],['CHF','車士打菲特','L2','EM',3],['NCO','諾士郡','L2','EM',3],['SAL','索爾福德城','L2','NW',0],
  ['GRI','甘士比','L2','YK',3],['WAL','華素爾','L2','WM',3],['SWI','史雲頓','L2','SW',3],['GIL','基寧咸','L2','SE',3],
  ['BRR','布里斯托流浪','L2','SW',3],['CRE','卓維','L2','NW',3],['CAM','劍橋聯','L2','EA',3],['COL','高車士打','L2','EA',3],
  ['FLE','費特活','L2','NW',3],['TRA','特蘭米爾','L2','NW',3],['OLD','奧咸','L2','NW',3],['BRW','巴羅','L2','NW',3],
  ['SHR','舒茲伯利','L2','WM',3],['BRO','布林里','L2','LDN',3],['CHL','車頓咸','L2','SW',3],['CRA','克羅利','L2','SE',3],
  ['NWP','新港郡','L2','WAL',3],['HAR','夏洛蓋特','L2','YK',3],['ACC','阿克寧頓','L2','NW',3],['BNT','巴尼特','L2','LDN',3],

  ['YOR','約克城','NL','YK',0],['ROC','洛奇代爾','NL','NW',0],['FGR','森林綠流浪','NL','SW',0],['SEN','紹森德聯','NL','EA',0],
  ['CRL','卡素爾','NL','NW',0],['MOR','摩甘比','NL','NW',0],['HPL','哈特爾浦','NL','NE',0],['ALT','艾爾特寧咸','NL','NW',0],
  ['ALD','艾達索特','NL','SE',0],['BOS','波士頓聯','NL','EM',0],['BTR','布倫特里','NL','EA',0],['BRK','布拉克利','NL','EM',0],
  ['EAS','伊斯特利','NL','SE',0],['HAL','哈利法克斯','NL','YK',0],['GAT','蓋茨黑德','NL','NE',0],['SCU','斯肯索普','NL','YK',0],
  ['SOL','索利赫爾摩斯','NL','WM',0],['SUT','薩頓聯','NL','LDN',0],['TAM','塔姆沃思','NL','WM',0],['TRU','特魯羅城','NL','SW',0],
  ['WEA','威爾斯通','NL','LDN',0],['WOK','沃金','NL','SE',0],['BWD','博勒姆伍德','NL','LDN',0],['YEO','約維爾','NL','SW',0],

  ['KID','基德明斯特','NON','WM',0],['CHS','切斯特','NON','NW',0],['DAR','達靈頓','NON','NE',0],['HEM','赫默爾亨普斯特德','NON','LDN',0],
  ['DOR','多爾金流浪','NON','SE',0],['MAI','梅德斯通聯','NON','SE',0],['WOR','沃辛','NON','SE',0],['BUX','巴克斯頓','NON','EM',0],
  ['SPE','斯彭尼穆爾','NON','NE',0],['SCA','斯卡伯勒競技','NON','YK',0],['HER','赫里福德','NON','WM',0],['BAT','巴斯城','NON','SW',0],
  ['CHI','奇彭納姆','NON','SW',0],['YAT','耶特','NON','SW',0],['STB','斯托克斯布里奇鋼鐵','NON','YK',0],['TOO','圖廷米查姆','NON','LDN',0],
  ['MAR','馬林','NON','NW',0],['LEA','利明頓','NON','WM',0],['WSM','濱海韋斯頓','NON','SW',0],['HUN','亨格福德','NON','SE',0],
  ['MAT','馬特洛克','NON','EM',0],['HED','赫德斯福德','NON','WM',0],['BIL','比勒里基','NON','EA',0],['STA','斯泰利布里奇凱爾特人','NON','NW',0]
];

/* 德比（用 id） */
const DERBIES = [
  ['ARS','TOT','北倫敦德比'],['MUN','MCI','曼市德比'],['LIV','EVE','默西塞德德比'],['AVL','BIR','第二城德比'],
  ['NEW','SUN','泰恩威爾德比'],['WHU','MIL','東倫敦德比'],['SHU','SHW','錫菲德比'],['NFO','DER','東米特蘭德比'],
  ['WOL','WBA','黑鄉德比'],['POR','SOU','南岸德比'],['BRC','BRR','布里斯托德比'],['CAR','SWA','南威爾斯德比'],
  ['NOR','IPS','東英格蘭德比'],['CHE','FUL','西倫敦德比'],['CRY','BHA','二十三號公路德比'],['LEE','HUD','西約克郡德比']
];

/* 城市：near＝1 個鐘車程內嘅地區、mid＝1.5 個鐘車程內嘅地區 */
const CITIES = {
  LDN: { n:'倫敦', near:['LDN'], mid:['SE','EA'], gr:['嶺道流浪','格林福德凱爾特人','哈克尼維克少年','薩頓公地流浪'] },
  MAN: { n:'曼徹斯特', near:['NW'], mid:['YK','WM'], gr:['費查摩斯流浪','雷迪殊火神','摩斯頓少年','索爾福德少年'] },
  LIV: { n:'利物浦', near:['NW'], mid:['WM'], gr:['愛華頓公園少年','加斯頓小馬','克羅斯比流浪','西打吡漫遊者'] },
  BHM: { n:'伯明翰', near:['WM'], mid:['EM','NW'], gr:['京士希夫青年','厄丁頓少年','阿科克斯綠競技','諾斯菲爾德少年'] },
  LDS: { n:'列斯', near:['YK'], mid:['NW','NE','EM'], gr:['米杜頓公園少年','加福斯流浪','沃特利少年','荷斯福斯聖瑪嘉烈'] },
  NCL: { n:'紐卡素', near:['NE'], mid:['YK'], gr:['華士欣男童會','蒙塔古少年','克蘭靈頓少年','蓋茨黑德紅休'] },
  BRS: { n:'布里斯托', near:['SW'], mid:['WAL','WM'], gr:['布里斯托少年','唐恩德飛翼','布拉德利斯托克','貝德明斯特唐'] },
  NOT: { n:'諾定咸', near:['EM'], mid:['WM','YK'], gr:['布爾韋爾少年','比斯頓萊蘭茲','克利夫頓全白','阿諾德少年'] },
  SOT: { n:'修咸頓', near:['SE'], mid:['SW','LDN'], gr:['修林少年','漢布爾獵犬','比特恩公園少年','托頓猛虎'] },
  NWC: { n:'諾域治', near:['EA'], mid:['LDN','EM'], gr:['諾域治飛鷹','索普流浪','洛克斯咸少年','赫勒斯登少年'] },
  SHF: { n:'錫菲', near:['YK','EM'], mid:['NW'], gr:['希爾斯堡少年','斯托克斯布里奇少年','德朗菲爾德少年','漢茲沃斯少年'] },
  TWN: { n:'赫里福郡小鎮', near:[], mid:['WM','WAL','SW'], gr:['萊姆斯特少年','金頓少年','萊德伯里雨燕','布羅姆亞德少年'] }
};

const MONTHS = ['9 月','10 月','11 月','12 月','1 月','2 月','3 月','4 月','5 月','6 月','7 月','8 月']; /* 英格蘭學年由 9 月開始 */

/* 家族血統：h＝該國男女平均身高（約數，用作預設父母身高）；b＝足球文化帶來的能力上限加成（只有風格突出的足球國家才有）；tier＝國家隊強弱（0 最強）
   加成代表家族帶來的足球文化與訓練習慣；沒有加成的血統，國家隊門檻通常較低 */
const HERITAGE = {
  none:{ n:'無（純英格蘭）', g:'英國', h:[178,164] },
  IRL:{ n:'愛爾蘭', nt:'愛爾蘭', g:'英國及愛爾蘭', h:[179,165], tier:3, cul:'愛爾蘭式拚勁，打法與英格蘭相近' },
  SCO:{ n:'蘇格蘭', nt:'蘇格蘭', g:'英國及愛爾蘭', h:[177,163], tier:3, cul:'蘇格蘭式硬朗打法，與英格蘭相近' },
  WAL:{ n:'威爾斯', nt:'威爾斯', g:'英國及愛爾蘭', h:[177,163], tier:3, cul:'威爾斯谷地的足球傳統，與英格蘭相近' },
  NIR:{ n:'北愛爾蘭', nt:'北愛爾蘭', g:'英國及愛爾蘭', h:[178,164], tier:4, cul:'北愛爾蘭的防守傳統，與英格蘭相近' },
  ES:{ n:'西班牙', nt:'西班牙', g:'歐洲', h:[176,163], b:{ pas:4, tec:2 }, tier:0, cul:'西班牙 tiki-taka 傳控' },
  FR:{ n:'法國', nt:'法國', g:'歐洲', h:[177,164], b:{ pac:3, tec:3 }, tier:0, cul:'法國青訓的技術訓練' },
  DE:{ n:'德國', nt:'德國', g:'歐洲', h:[180,166], b:{ iq:3, sta:3 }, tier:0, cul:'德國式紀律、戰術與高位壓迫' },
  IT:{ n:'意大利', nt:'意大利', g:'歐洲', h:[177,163], b:{ def:5, iq:2 }, tier:1, cul:'意大利 Catenaccio 防守學問' },
  PT:{ n:'葡萄牙', nt:'葡萄牙', g:'歐洲', h:[174,163], b:{ tec:4, sho:2 }, tier:0, cul:'葡萄牙街頭盤扭' },
  NL:{ n:'荷蘭', nt:'荷蘭', g:'歐洲', h:[183,170], b:{ pas:3, iq:3 }, tier:1, cul:'荷蘭全能足球' },
  BE:{ n:'比利時', nt:'比利時', g:'歐洲', h:[180,166], tier:1, cul:'比利時黃金一代的青訓方法' },
  HR:{ n:'克羅地亞', nt:'克羅地亞', g:'歐洲', h:[180,166], b:{ pas:3, iq:3 }, tier:1, cul:'克羅地亞中場傳統' },
  TR:{ n:'土耳其', nt:'土耳其', g:'歐洲', h:[176,162], tier:2, cul:'土耳其球場的熱血' },
  POL:{ n:'波蘭', nt:'波蘭', g:'歐洲', h:[179,165], tier:2, cul:'波蘭射手傳統' },
  BR:{ n:'巴西', nt:'巴西', g:'美洲', h:[174,161], b:{ tec:5, sho:2 }, tier:0, cul:'巴西五人足球與沙灘足球' },
  AR:{ n:'阿根廷', nt:'阿根廷', g:'美洲', h:[175,161], b:{ tec:4, iq:2 }, tier:0, cul:'阿根廷 potrero 空地街頭足球' },
  UY:{ n:'烏拉圭', nt:'烏拉圭', g:'美洲', h:[175,162], b:{ def:3, str:3 }, tier:1, cul:'烏拉圭 garra 鬥心與硬朗防守' },
  CO:{ n:'哥倫比亞', nt:'哥倫比亞', g:'美洲', h:[171,159], tier:2, cul:'哥倫比亞的技術流' },
  US:{ n:'美國', nt:'美國', g:'美洲', h:[177,163], tier:2, cul:'美國大學體育的體能訓練' },
  MX:{ n:'墨西哥', nt:'墨西哥', g:'美洲', h:[170,157], tier:2, cul:'墨西哥快速傳送' },
  CA:{ n:'加拿大', nt:'加拿大', g:'美洲', h:[178,164], tier:3, cul:'加拿大多項運動背景' },
  JAM:{ n:'牙買加', nt:'牙買加', g:'美洲', h:[174,163], tier:3, cul:'牙買加街頭足球' },
  MA:{ n:'摩洛哥', nt:'摩洛哥', g:'非洲', h:[173,160], b:{ sta:3, tec:3 }, tier:1, cul:'摩洛哥的街頭技術與跑動' },
  SN:{ n:'塞內加爾', nt:'塞內加爾', g:'非洲', h:[175,163], b:{ sta:4, str:2 }, tier:2, cul:'塞內加爾高強度的對抗與跑動' },
  NG:{ n:'尼日利亞', nt:'尼日利亞', g:'非洲', h:[172,162], b:{ sta:4, pac:2 }, tier:2, cul:'尼日利亞街頭足球與高強度跑動' },
  GHA:{ n:'迦納', nt:'迦納', g:'非洲', h:[170,159], b:{ sta:4, pac:2 }, tier:2, cul:'迦納的跑動與轉換節奏' },
  EG:{ n:'埃及', nt:'埃及', g:'非洲', h:[170,159], b:{ sta:4, tec:2 }, tier:3, cul:'埃及的跑動與腳下技術' },
  CV:{ n:'佛得角', nt:'佛得角', g:'非洲', h:[172,161], b:{ sta:4, tec:2 }, tier:4, cul:'佛得角沙地足球與跑動' },
  JP:{ n:'日本', nt:'日本', g:'亞洲及大洋洲', h:[172,158], b:{ pas:3, sta:3 }, tier:1, cul:'日本的紀律、傳控與基本功' },
  KR:{ n:'韓國', nt:'韓國', g:'亞洲及大洋洲', h:[175,162], b:{ sta:4, def:2 }, tier:1, cul:'韓國的體能與鬥志' },
  AU:{ n:'澳洲', nt:'澳洲', g:'亞洲及大洋洲', h:[179,165], tier:2, cul:'澳洲的運動文化' },
  CN:{ n:'中國', nt:'中國', g:'亞洲及大洋洲', h:[172,160], tier:3, cul:'中國足校的基本功' },
  HKG:{ n:'香港', nt:'中國香港', g:'亞洲及大洋洲', h:[174,160], tier:5, cul:'香港硬地場的腳下技術' },
  MO:{ n:'澳門', nt:'澳門', g:'亞洲及大洋洲', h:[172,159], tier:5, cul:'澳門街場足球' },
  TW:{ n:'台灣', nt:'中華台北', g:'亞洲及大洋洲', h:[173,160], tier:5, cul:'台灣的苦練精神' },
  VN:{ n:'越南', nt:'越南', g:'亞洲及大洋洲', h:[165,155], tier:4, cul:'越南的靈活技術' },
  TH:{ n:'泰國', nt:'泰國', g:'亞洲及大洋洲', h:[170,159], tier:4, cul:'泰國的技術足球' },
  ID:{ n:'印尼', nt:'印尼', g:'亞洲及大洋洲', h:[166,154], tier:4, cul:'印尼街頭足球' },
  SA:{ n:'沙地阿拉伯', nt:'沙地阿拉伯', g:'亞洲及大洋洲', h:[171,157], tier:3, cul:'沙地阿拉伯的技術流' },
  IND:{ n:'印度', nt:'印度', g:'亞洲及大洋洲', h:[166,155], tier:5, cul:'印度的五人足球' },
  PAK:{ n:'巴基斯坦', nt:'巴基斯坦', g:'亞洲及大洋洲', h:[168,155], tier:5, cul:'巴基斯坦街場足球' }
};
const HERITAGE_GROUPS = ['英國','英國及愛爾蘭','歐洲','美洲','非洲','亞洲及大洋洲'];

/* 角色創建點數：每項設定嘅點數成本（負數＝退返點數） */
const CREATE_BUDGET = 10;
const WEALTH_N = ['家境拮据','普通家庭','小康之家','富裕家庭'];
const WEALTH_COST = [-2, 0, 2, 4];
const ALLOW = [10, 35, 80, 160];      /* 每個學期嘅零用錢 */
const START_MONEY = [0, 40, 150, 400];
function bmCost(bm){ return bm<=2 ? 2 : bm<=5 ? 1 : bm<=8 ? 0 : -1; }
const FOOT_COST = { R:0, L:1, B:3 };
const CITY_COST = { LDN:1, MAN:1, LIV:1, BHM:1, TWN:-1 };
function heightCost(cfg){ const H = HERITAGE[cfg.heritage].h, d = (cfg.fatherH + cfg.motherH) - (H[0] + H[1]); return clamp(Math.round(d/10), -1, 3); }
/* 有能力加成的血統需 1 點 */
const herCost = h => HERITAGE[h] && HERITAGE[h].b ? 1 : 0;
function cfgCost(cfg){
  return WEALTH_COST[cfg.wealth] + bmCost(cfg.bm) + FOOT_COST[cfg.foot] + (CITY_COST[cfg.city]||0) + heightCost(cfg) + herCost(cfg.heritage);
}

/* 裝備同訓練資源：once＝一次過買；yr＝年費（逢 9 月到期）；每個學期被動加成 */
const SHOP = [
  { id:'ball', n:'個人足球與迷你球門', p:30, once:true, d:'在家中也能練習', per:{ tec:0.3, sho:0.2 } },
  { id:'boots', n:'一雙優質球鞋', p:70, once:true, d:'比賽關鍵時刻成功率略為提高', mo:2 },
  { id:'ladder', n:'敏捷梯與小欄架', p:45, once:true, d:'鍛鍊步法與速度', per:{ pac:0.3, sta:0.1 }, min:8 },
  { id:'rebound', n:'反彈網', p:120, once:true, d:'獨自一人也能練習傳接', per:{ tec:0.35, pas:0.3 } },
  { id:'futsal', n:'室內足球會籍', p:120, yr:true, d:'全年逢星期三參加五人足球', per:{ tec:0.55, iq:0.25 }, min:7, max:16 },
  { id:'pt', n:'私人教練套票', p:300, yr:true, d:'全年針對最弱的關鍵能力', per:{ weak:1.0 } },
  { id:'gym', n:'健身室會籍', p:150, yr:true, d:'力量與體能', per:{ str:0.55, sta:0.3 }, min:14 },
  { id:'food', n:'運動營養餐', p:100, yr:true, d:'恢復較快、減少受傷', fat:-3, inj:-1, min:10 },
  { id:'video', n:'比賽錄影分析', p:80, once:true, d:'重溫自己的比賽，能力估算更準確', per:{ iq:0.3 }, min:11 },
  { id:'camp', n:'暑期精英訓練營', p:180, yr:true, d:'暑假一星期：球探注意或教練印象↑', camp:true, min:7, max:15 }
];


const FIRST = ['積克','哈利','奧利華','佐治','查理','艾菲','李奧','費迪','阿奇','迪奧','諾亞','奧斯卡','雅各','列治','凱','泰勒','卡藍','祖舒','賓','賴恩','林恩','梅臣','謝頓','科菲','托比','迪夫','阿俊','里奧','馬卡斯','奧利','辛尼','基安','以利亞','薩克','伊巴謙','芬尼','路易','賈馬爾','拉夫','拿頓'];
const LAST  = ['史密夫','鍾斯','泰萊','布朗','威廉斯','威爾遜','莊遜','戴維斯','韋特','獲加','羅便臣','湯臣','曉士','愛德華斯','格連','賀爾','基拉克','活特','夏里斯','路易斯','文沙','奧卡福','阿迪耶米','簡恩','帕特爾','梅菲','基利','金寶','賓尼特','摩里斯','班尼斯','高爾','華殊','杜爾','博阿滕','諾瓦克','費雷拉','羅斯','陳','李'];
const COACH_FIRST = ['史提夫','戴夫','加里','保羅','馬克','伊恩','尼爾','東尼','奇雲','達倫','李','馬田'];

/* ================= 天賦上限修正 =================
   角色創建每個設定對九項能力上限嘅影響。引擎開局同創建畫面都用呢條，所以畫面顯示嘅數字同實際一致。
   回傳 { mods:{能力:加減}, parts:[[來源, {能力:加減}], ...] } */
/* 體型：每款都有取捨 */
const BODY = {
  even:{ n:'均勻', m:{} },
  lean:{ n:'瘦長', m:{ sta:5, pac:1, str:-4 } },
  solid:{ n:'結實', m:{ str:5, pac:-2 } },
  stocky:{ n:'矮壯', m:{ str:6, pac:1, hea:-2, sta:-3 } },
  explosive:{ n:'爆發型', m:{ pac:5, str:1, sta:-4 } },
  engine:{ n:'耐力型', m:{ sta:6, def:1, pac:-2, str:-2 } },
  nimble:{ n:'靈活型', m:{ tec:3, pac:3, str:-4, hea:-1 } },
  burly:{ n:'魁梧', m:{ str:5, hea:3, pac:-4, tec:-1 } },
  rangy:{ n:'手長腳長', m:{ def:3, hea:2, tec:-2, pac:-1 } }
};
/* 門將的體型效果（欄位：sho 反應、def 站位、tec 接球、hea 制空、iq 指揮、pac 爆發、pas 出球） */
const BODY_GK = {
  even:{}, lean:{ pac:2, sho:2, str:-4 }, solid:{ str:4, hea:2, pac:-2 }, stocky:{ str:5, pac:2, hea:-5 },
  explosive:{ pac:5, sho:2, sta:-3, str:-1 }, engine:{ sta:4, iq:2, pac:-2 }, nimble:{ sho:4, pac:3, hea:-3, str:-2 },
  burly:{ str:5, hea:3, pac:-4 }, rangy:{ hea:3, sho:3, tec:-2, pac:-1 }
};
const bodyMod = (b, pos) => (pos==='GK' ? BODY_GK : BODY_MOD)[b] || {};
const BODY_N = Object.fromEntries(Object.entries(BODY).map(([k,v]) => [k, v.n]));
const BODY_MOD = Object.fromEntries(Object.entries(BODY).map(([k,v]) => [k, v.m]));
/* 性格：正面同負面各揀一個。ax＝底層性格軸（引擎用），v＝該軸數值；m＝上限加減；fx＝其他效果描述 */
const TRAIT_POS = {
  disc:{ n:'自律', ax:'disc', v:5, m:{ sta:2 }, fx:'訓練成長 +12%；較少惹事' },
  big:{ n:'大心臟', ax:'comp', v:5, m:{ sho:2 }, fx:'關鍵時刻成功率 +4%' },
  fighter:{ n:'鬥士', ax:'grit', v:5, m:{ sta:2, def:2 }, fx:'被拒絕、被放棄時打擊較小' },
  cool:{ n:'冷靜', ax:'calm', v:5, m:{ iq:4 }, fx:'場外少惹麻煩' },
  bold:{ n:'自信', ax:'conf', v:5, m:{ sho:2, tec:2 }, fx:'比賽表現較好' },
  leader:{ n:'領袖', ax:null, m:{ iq:2, pas:2 }, fx:'教練印象、主帥信任起步較高' }
};
const TRAIT_NEG = {
  lazy:{ n:'懶散', ax:'disc', v:1, m:{ sta:-2 }, fx:'訓練成長 −12%；較易出事' },
  nerves:{ n:'怯場', ax:'comp', v:1, m:{ sho:-2 }, fx:'關鍵時刻成功率 −4%' },
  fragile:{ n:'玻璃心', ax:'grit', v:1, m:{ sta:-2 }, fx:'被拒絕、被放棄時打擊較大' },
  hothead:{ n:'火爆', ax:'calm', v:1, m:{ iq:-4 }, fx:'場外較易惹麻煩' },
  shy:{ n:'自卑', ax:'conf', v:1, m:{ sho:-2, tec:-2 }, fx:'比賽表現較差' },
  selfish:{ n:'自私', ax:null, m:{ pas:-4 }, fx:'教練印象、主帥信任起步較低' }
};
/* 由正負特質推算五條性格軸（每軸預設 3） */
function persFrom(pos, neg){ const p = { conf:3, disc:3, comp:3, grit:3, calm:3 }; const a = TRAIT_POS[pos], b = TRAIT_NEG[neg]; if(a&&a.ax) p[a.ax] = a.v; if(b&&b.ax) p[b.ax] = b.v; return p; }
function traitMod(pos, neg){ const m = {}; [TRAIT_POS[pos], TRAIT_NEG[neg]].forEach(t => { if(t) for(const k in t.m) m[k] = (m[k]||0) + t.m[k]; }); return m; }
const FOOT_MOD = { R:{}, L:{}, B:{ tec:2, sho:2 } };
const FOOT_GK = { R:{}, L:{}, B:{ pas:4 } };
const footMod = (f, pos) => (pos==='GK' ? FOOT_GK : FOOT_MOD)[f] || {};
/* 身高：門將對身高要求高得多 */
function heightMod(h, pos){
  if(pos==='GK') return h>=190 ? { hea:7, sho:3, def:2, pac:-2 } : h>=186 ? { hea:4, sho:2 } : h>=182 ? {} : h>=178 ? { hea:-4, sho:-2, pac:2 } : { hea:-9, sho:-5, def:-2, pac:3 };
  return h>=186 ? { hea:8, str:5, pac:-3, tec:-2 } : h>=180 ? { hea:4, str:2 } : h<=171 ? { tec:3, pac:3, hea:-8, str:-4 } : h<=175 ? { tec:1, pac:1, hea:-3 } : {};
}
function heightBand(h, pos){
  if(pos==='GK') return h>=190 ? '190 厘米或以上' : h>=186 ? '186–189 厘米' : h>=182 ? '182–185 厘米' : h>=178 ? '178–181 厘米' : '177 厘米或以下';
  return h>=186 ? '186 厘米或以上' : h>=180 ? '180–185 厘米' : h<=171 ? '171 厘米或以下' : h<=175 ? '172–175 厘米' : '176–179 厘米';
}
const HBANDS = { OUT:[[186,'186+'],[180,'180–185'],[176,'176–179'],[172,'172–175'],[171,'≤171']], GK:[[190,'190+'],[186,'186–189'],[182,'182–185'],[178,'178–181'],[177,'≤177']] };
/* 位置傾向：主要能力上限大幅提高，非關鍵能力 −2；唔揀就冇加減，但轉位冇損失 */
function posMod(p){ if(!p || p==='none') return {}; const w = POS[p].w, m = {}; ATTRS.forEach(k => m[k] = w[k] ? Math.round(w[k]*20) : -2); return m; }
function capMods(cfg, adultH){
  const h = adultH ?? Math.round((cfg.fatherH + cfg.motherH + 13)/2);
  const H = HERITAGE[cfg.heritage];
  const parts = [
    [`身高 ${heightBand(h, cfg.posPref)}`, heightMod(h, cfg.posPref)],
    [`體型：${BODY_N[cfg.body]}`, bodyMod(cfg.body, cfg.posPref)],
    [`慣用腳`, footMod(cfg.foot, cfg.posPref)],
    [`血統：${H.n}`, H.b || {}],
    [`性格：${TRAIT_POS[cfg.posTrait]?.n||''}／${TRAIT_NEG[cfg.negTrait]?.n||''}`, traitMod(cfg.posTrait, cfg.negTrait)],
    [`位置：${(SPOTS.find(x=>x.id===cfg.spot)||{n:'未定'}).n}`, posMod(cfg.posPref)],
    [`角色：${roleOf(cfg.posPref, cfg.role)?.n||'—'}`, roleOf(cfg.posPref, cfg.role)?.m || {}],
    [`左右路與慣用腳`, sideMod(cfg.spot, cfg.foot)]
  ];
  const mods = Object.fromEntries(ATTRS.map(k => [k, 0]));
  parts.forEach(([, m]) => { for(const k in m) mods[k] += m[k]; });
  return { mods, parts, h };
}
/* 「頭球 +8、力量 +5、速度 −3」 */
function modTxt(m){ const e = Object.entries(m||{}).filter(([,v]) => v); if(!e.length) return '上限不變'; if(e.length===ATTRS.length && e.every(([,v]) => v===e[0][1])) return `全部能力 ${e[0][1]>0?'+':'−'}${Math.abs(e[0][1])}`; return e.sort((a,b)=>b[1]-a[1]).map(([k,v]) => `${ATTR_N[k]} ${v>0?'+':'−'}${Math.abs(v)}`).join('、'); }

/* ================= 細分位置同打法角色 ================= */
/* 球場上可以撳嘅位置：x,y 係球場圖座標（0–100，上方係對方龍門） */
const SPOTS = [
  { id:'ST',  pos:'ST', side:'C', n:'中鋒',   x:50, y:14 },
  { id:'LW',  pos:'W',  side:'L', n:'左翼',   x:16, y:24 },
  { id:'RW',  pos:'W',  side:'R', n:'右翼',   x:84, y:24 },
  { id:'AM',  pos:'AM', side:'C', n:'前腰',   x:50, y:34 },
  { id:'CM',  pos:'CM', side:'C', n:'中場',   x:50, y:50 },
  { id:'DM',  pos:'DM', side:'C', n:'後腰',   x:50, y:63 },
  { id:'LB',  pos:'FB', side:'L', n:'左閘',   x:14, y:72 },
  { id:'RB',  pos:'FB', side:'R', n:'右閘',   x:86, y:72 },
  { id:'LCB', pos:'CB', side:'L', n:'左中堅', x:35, y:80 },
  { id:'RCB', pos:'CB', side:'R', n:'右中堅', x:65, y:80 },
  { id:'GK',  pos:'GK', side:'C', n:'門將',   x:50, y:95 }
];
const SIDE_N = { L:'左路', R:'右路', C:'中路' };
/* 每個位置三個打法角色：代號、名稱、描述、上限加成、風格參考 */
const ROLES_BY_POS = {
  CB: [ { id:'STP', n:'搶截型中堅', d:'上前搶斷，壓迫對方前鋒', m:{ def:4, pac:2, str:2 }, ref:'泰利' },
        { id:'BPD', n:'出球型中堅', d:'由後場組織，長短傳俱佳', m:{ pas:4, iq:2, tec:2 }, ref:'史東斯' },
        { id:'AER', n:'空霸型中堅', d:'禁區內制空，定位球威脅', m:{ hea:4, str:2, def:2 }, ref:'雲迪積' } ],
  FB: [ { id:'OVL', n:'插上型邊閘', d:'不停來回衝刺，助攻傳中', m:{ pac:4, sta:2, pas:2 }, ref:'華加' },
        { id:'INV', n:'內收型邊閘', d:'收入中場參與組織', m:{ pas:4, iq:2, tec:2 }, ref:'亞歷山大阿諾' },
        { id:'DFB', n:'防守型邊閘', d:'守好自己一側，甚少插上', m:{ def:4, str:2, iq:2 }, ref:'艾殊利高爾' } ],
  DM: [ { id:'DES', n:'屏障型後腰', d:'站在防線前截斷傳球', m:{ def:4, str:2, iq:2 }, ref:'簡迪' },
        { id:'REG', n:'組織型後腰', d:'由深位控制節奏', m:{ pas:4, iq:2, tec:2 }, ref:'卡域克' },
        { id:'BWM', n:'搶球型後腰', d:'全場追搶，覆蓋範圍大', m:{ sta:4, def:2, str:2 }, ref:'賴斯' } ],
  CM: [ { id:'B2B', n:'全能中場', d:'由己方禁區跑到對方禁區', m:{ sta:4, def:2, sho:2 }, ref:'謝拉特' },
        { id:'DLP', n:'後置組織中場', d:'少跑多傳，掌控全局', m:{ pas:4, iq:2, tec:2 }, ref:'史高斯' },
        { id:'BOX', n:'插上型中場', d:'後上入禁區射門', m:{ sho:4, iq:2, sta:2 }, ref:'林柏特' } ],
  AM: [ { id:'PLM', n:'組織型前腰', d:'在肋部穿針引線', m:{ pas:4, iq:2, tec:2 }, ref:'大衛施華' },
        { id:'ATK', n:'攻擊型前腰', d:'插上遠射、直接威脅球門', m:{ sho:4, pas:2, tec:2 }, ref:'迪布尼' },
        { id:'SHD', n:'影鋒型前腰', d:'無球跑動，突然殺入禁區', m:{ iq:4, tec:2, sho:2 }, ref:'貝靈恩' } ],
  W:  [ { id:'INF', n:'內切型翼鋒', d:'由邊路內切以強腳射門', m:{ sho:4, tec:2, pac:2 }, ref:'沙拿' },
        { id:'WNG', n:'速度型翼鋒', d:'沿邊線加速突破', m:{ pac:4, tec:2, sta:2 }, ref:'史達寧' },
        { id:'CRS', n:'傳中型翼鋒', d:'送出準確傳中與定位球', m:{ pas:4, sta:2, tec:2 }, ref:'碧咸' } ],
  ST: [ { id:'TGT', n:'目標中鋒', d:'背身做球，爭頂高空球', m:{ hea:4, str:2, sho:2 }, ref:'告魯治' },
        { id:'PCH', n:'禁區殺手', d:'觸球不多，專門尋找射門位置', m:{ sho:4, iq:2, pac:2 }, ref:'夏蘭特' },
        { id:'CMP', n:'全能前鋒', d:'入球、做牆、回撤組織樣樣皆能', m:{ sho:4, pas:2, tec:2 }, ref:'哈利簡尼' } ],
  GK: [ { id:'SWK', n:'清道夫門將', d:'站位靠前，出擊與腳下出球兼備', m:{ pas:4, pac:2, iq:2 }, ref:'碧福特' },
        { id:'SHS', n:'撲救型門將', d:'反應敏捷，專門撲救近距離射門', m:{ sho:4, pac:2, def:2 }, ref:'迪基亞' },
        { id:'CMD', n:'制空型門將', d:'控制禁區，傳中球果斷出擊', m:{ hea:4, str:2, iq:2 }, ref:'施治' } ]
};
function roleOf(pos, id){ return (ROLES_BY_POS[pos]||[]).find(r => r.id===id) || null; }
/* 左右邊配合慣用腳：反腳翼鋒射門 +2；同腳邊路傳送 +2；左中堅用左腳出球 +2 */
function sideMod(spotId, foot){
  const sp = SPOTS.find(s => s.id===spotId); if(!sp || sp.side==='C' || foot==='B') return {};
  const same = (sp.side==='L' && foot==='L') || (sp.side==='R' && foot==='R');
  if(sp.pos==='W') return same ? { pas:2 } : { sho:2 };
  if(sp.pos==='FB') return same ? { pas:2 } : {};
  if(sp.pos==='CB' && sp.side==='L' && foot==='L') return { pas:2 };
  return {};
}
function sideTxt(spotId, foot){
  const sp = SPOTS.find(s => s.id===spotId); if(!sp || sp.side==='C') return '';
  if(foot==='B') return '雙腳：左右兩邊皆可';
  const same = (sp.side==='L' && foot==='L') || (sp.side==='R' && foot==='R');
  if(sp.pos==='W') return same ? '同腳翼鋒：傳中較準（傳球 +2）' : '反腳翼鋒：可內切以強腳射門（射門 +2）';
  if(sp.pos==='FB') return same ? '同腳邊閘：傳中較準（傳球 +2）' : '反腳邊閘：沒有額外加成';
  if(sp.pos==='CB' && sp.side==='L') return foot==='L' ? '左腳左中堅十分罕有，出球角度佳（傳球 +2）' : '';
  return '';
}
