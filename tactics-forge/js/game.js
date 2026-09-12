/* ============================= RNG ============================= */
function mulberry32(seed){
  let a = seed >>> 0;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function randInt(rng, min, max){ return Math.floor(rng()*(max-min+1))+min; }
function pick(rng, arr){ return arr[Math.floor(rng()*arr.length)]; }
function pickN(rng, arr, n){
  const pool = arr.slice(); const out=[];
  while(out.length<n && pool.length){
    out.push(pool.splice(Math.floor(rng()*pool.length),1)[0]);
  }
  return out;
}
function newSeed(){ return Math.floor(Math.random()*4294967295); }
function shuffle(rng, arr){
  const a = arr.slice();
  for(let i=a.length-1; i>0; i--){
    const j = Math.floor(rng()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============================= DATA ============================= */
const CLASSES = {
  warrior:{name:'Warrior', tag:'Melee', hp:150, atk:13, atkSpeed:0.80, castTime:0.10, def:9, crit:5,
    targeting:'lowestHp', desc:'Slow, sturdy, hard to put down.'},
  archer:{name:'Archer', tag:'Ranged', hp:85, atk:15, atkSpeed:1.15, castTime:0.10, def:2, crit:16,
    targeting:'random', desc:'Steady fire, no real defense.'},
  mage:{name:'Mage', tag:'Ranged', hp:75, atk:24, atkSpeed:0.45, castTime:0.55, def:1, crit:9,
    targeting:'highestAtk', desc:'Long wind-up, devastating payoff.'},
  rogue:{name:'Rogue', tag:'Melee', hp:95, atk:11, atkSpeed:1.55, castTime:0.05, def:3, crit:26,
    targeting:'lowestHp', desc:'A flurry of cheap, likely-to-crit hits.'},
  cleric:{name:'Cleric', tag:'Support', hp:105, atk:7, atkSpeed:0.70, castTime:0.25, def:6, crit:5,
    targeting:'healLowestAlly', desc:'Mends allies before it ever strikes.'},
};

// Player-selectable targeting priorities. 'default' defers to the class's built-in rule above.
// This is set blind during prep (in single-player, blind vs. the AI's generated roster; in
// duels, blind vs. whatever your opponent picks) and only affects who a unit's ATTACKS go to —
// a Cleric set to e.g. 'lowestHp' still heals allies first when someone needs it, and only uses
// the override to choose an attack target once no ally needs healing.
const TARGETING_OPTIONS = [
  {id:'default', label:'Class Default'},
  {id:'lowestHp', label:'Lowest HP Enemy'},
  {id:'highestHp', label:'Highest HP Enemy'},
  {id:'highestAtk', label:'Highest Attack Enemy'},
  {id:'lowestDef', label:'Lowest Defense Enemy'},
  {id:'random', label:'Random Enemy'},
];
function resolveTargetRule(unit){
  if(unit.targetingOverride && unit.targetingOverride!=='default') return unit.targetingOverride;
  return CLASSES[unit.classId].targeting;
}

const ITEMS = [
  {id:'ironsword', name:'Iron Sword', slot:'weapon', cost:3, mods:{atk:5}, desc:'+5 Attack'},
  {id:'warhammer', name:'Warhammer', slot:'weapon', cost:4, mods:{atk:9, castTime:0.1}, desc:'+9 Attack, +0.1s cast'},
  {id:'dagger', name:'Twin Dagger', slot:'weapon', cost:3, mods:{atkSpeed:0.35}, desc:'+0.35 Attacks/sec'},
  {id:'arcstaff', name:'Arcane Staff', slot:'weapon', cost:4, mods:{atk:6, crit:8}, desc:'+6 Attack, +8% Crit'},
  {id:'longbow', name:'Longbow', slot:'weapon', cost:3, mods:{atk:4, crit:6}, desc:'+4 Attack, +6% Crit'},
  {id:'leather', name:'Leather Armor', slot:'armor', cost:2, mods:{def:5}, desc:'+5 Defense'},
  {id:'plate', name:'Plate Armor', slot:'armor', cost:4, mods:{def:11, hp:15, atkSpeed:-0.1}, desc:'+11 Def, +15 HP, -0.1 Atk Spd'},
  {id:'robe', name:'Padded Robe', slot:'armor', cost:2, mods:{hp:20}, desc:'+20 Max HP'},
  {id:'charm', name:'Lucky Charm', slot:'trinket', cost:2, mods:{crit:12}, desc:'+12% Crit Chance'},
  {id:'vigor', name:'Amulet of Vigor', slot:'trinket', cost:3, mods:{hp:25}, desc:'+25 Max HP'},
  {id:'haste', name:'Ring of Haste', slot:'trinket', cost:3, mods:{atkSpeed:0.25, castTime:-0.05}, desc:'+0.25 Atk Spd, -0.05s cast'},
];

const PERKS = [
  {id:'lifesteal', name:'Lifesteal', desc:'Heals for 30% of damage dealt.'},
  {id:'thorns', name:'Thorns', desc:'Reflects 25% of damage taken back at the attacker.'},
  {id:'firststrike', name:'First Strike', desc:'Doubled attack speed for the first 3 seconds of battle.'},
  {id:'rally', name:'Rally', desc:'All allies gain +0.15 attacks/sec for the whole fight.'},
  {id:'berserk', name:'Berserker', desc:'Deals up to 60% more damage the lower this unit is on HP.'},
  {id:'ironskin', name:'Iron Skin', desc:'Flat -4 damage from every hit taken (min 1).'},
  {id:'executioner', name:'Executioner', desc:'+50% damage against targets under 30% HP.'},
  {id:'secondwind', name:'Second Wind', desc:'The first fatal blow instead leaves this unit at 25% HP.'},
  {id:'critmaster', name:'Crit Mastery', desc:'+20% Crit Chance.'},
  {id:'vampaura', name:'Vampiric Aura', desc:'All allies heal for 10% of damage they deal.'},
  {id:'quickcast', name:'Quick Cast', desc:'-40% cast time (minimum 0.05s).'},
];
function getPerk(id){ return PERKS.find(p=>p.id===id); }
function getItem(id){ return ITEMS.find(i=>i.id===id); }

// Doctrines are the "build" layer: instead of modifying one unit, they rewrite a stat rule for
// every unit of a given class on your roster. Several are pure trade-offs (buff one class,
// nerf another) so drafting one is a real strategic commitment, not a free upgrade.
// mods keys: atkMult/atkAdd, hpMult/hpAdd, defMult/defAdd, atkSpeedMult, castTimeMult, critAdd.
const DOCTRINES = [
  {id:'rogue_frenzy', name:'Rogue Frenzy', desc:'All Rogues: +100% Attack Speed.',
    effects:[{classId:'rogue', mods:{atkSpeedMult:2}}]},
  {id:'arcane_overload', name:'Arcane Overload', desc:'All Mages: cast time doubled. All Clerics: +25% Max HP.',
    effects:[{classId:'mage', mods:{castTimeMult:2}}, {classId:'cleric', mods:{hpMult:1.25}}]},
  {id:'iron_vanguard', name:'Iron Vanguard', desc:'All Warriors: +35% Defense, -20% Attack Speed.',
    effects:[{classId:'warrior', mods:{defMult:1.35, atkSpeedMult:0.8}}]},
  {id:'glass_cannons', name:'Glass Cannons', desc:'All Archers: +40% Attack, -30% Max HP.',
    effects:[{classId:'archer', mods:{atkMult:1.4, hpMult:0.7}}]},
  {id:'sharpened_steel', name:'Sharpened Steel', desc:'All Rogues: +18% Crit. All Warriors: -15% Attack.',
    effects:[{classId:'rogue', mods:{critAdd:18}}, {classId:'warrior', mods:{atkMult:0.85}}]},
  {id:'battle_clerics', name:'Battle Clerics', desc:'All Clerics: +8 Attack, -30% Max HP.',
    effects:[{classId:'cleric', mods:{atkAdd:8, hpMult:0.7}}]},
  {id:'siege_mages', name:'Siege Mages', desc:'All Mages: +12 Attack. All Archers: -20% Attack Speed.',
    effects:[{classId:'mage', mods:{atkAdd:12}}, {classId:'archer', mods:{atkSpeedMult:0.8}}]},
];
function getDoctrine(id){ return DOCTRINES.find(d=>d.id===id); }
// Combined draft pool used when offering perk choices: unit-perks need a unit assigned to them,
// doctrines apply to the whole roster immediately.
function perkDraftPool(){
  return PERKS.map(p=>({...p, kind:'unit'})).concat(DOCTRINES.map(d=>({...d, kind:'doctrine'})));
}

/* ============================= UNIT MODEL ============================= */
let uidCounter = 1;
function makeUnit(classId, rng){
  const c = CLASSES[classId];
  return {
    uid: 'u'+(uidCounter++),
    classId,
    name: c.name,
    items:{weapon:null, armor:null, trinket:null},
    perks:[],
    targetingOverride:'default',
  };
}
function computeStats(unit, doctrines){
  const c = CLASSES[unit.classId];
  let s = {hp:c.hp, atk:c.atk, atkSpeed:c.atkSpeed, castTime:c.castTime, def:c.def, crit:c.crit};
  ['weapon','armor','trinket'].forEach(slot=>{
    const it = unit.items[slot]; if(!it) return;
    const item = getItem(it);
    for(const k in item.mods) s[k] = (s[k]||0) + item.mods[k];
  });
  (doctrines||[]).forEach(did=>{
    const doc = getDoctrine(did);
    if(!doc) return;
    doc.effects.filter(e=>e.classId===unit.classId).forEach(e=>{
      const m = e.mods;
      if(m.atkMult) s.atk *= m.atkMult;
      if(m.atkAdd) s.atk += m.atkAdd;
      if(m.hpMult) s.hp *= m.hpMult;
      if(m.hpAdd) s.hp += m.hpAdd;
      if(m.defMult) s.def *= m.defMult;
      if(m.defAdd) s.def += m.defAdd;
      if(m.atkSpeedMult) s.atkSpeed *= m.atkSpeedMult;
      if(m.castTimeMult) s.castTime *= m.castTimeMult;
      if(m.critAdd) s.crit += m.critAdd;
    });
  });
  s.castTime = Math.max(0.05, s.castTime);
  s.atkSpeed = Math.max(0.15, s.atkSpeed);
  s.hp = Math.max(1, Math.round(s.hp));
  s.atk = Math.max(0, Math.round(s.atk));
  s.def = Math.max(0, Math.round(s.def));
  return s;
}

/* ============================= APP STATE ============================= */
const state = {
  screen:'menu',
  mode:null, // 'sp' or 'mp'
  sp:null,
  mp:null,
};

function freshRoster(rng){
  const startClasses = pickN(rng, Object.keys(CLASSES), 2);
  return startClasses.map(c=>makeUnit(c, rng));
}

/* ---------- Single player state ---------- */
function newSPGame(){
  const rng = mulberry32(newSeed());
  state.sp = {
    round:1, gold:10, losses:0, roster: freshRoster(rng), teamPerks:[],
    shop:null, phase:'draft', battle:null, pendingPerks:null,
  };
  generateShop(state.sp);
}
function generateShop(sp){
  const rng = mulberry32(newSeed());
  const round = sp.round || (state.mp && state.mp.round) || 1;
  const unitOffers = pickN(rng, Object.keys(CLASSES), 3).map(c=>({type:'unit', classId:c, cost: 3 + Math.floor(round/3)}));
  const itemOffers = pickN(rng, ITEMS, 3).map(i=>({type:'item', itemId:i.id, cost:i.cost}));
  sp.shop = {offers: unitOffers.concat(itemOffers), rerollCost:1};
}

/* ============================= COMBAT ENGINE ============================= */
function cloneRosterForBattle(roster, doctrines){
  return roster.map(u=>{
    const stats = computeStats(u, doctrines);
    return {
      uid:u.uid, name:u.name, classId:u.classId,
      maxHp: stats.hp, hp: stats.hp, atk: stats.atk, atkSpeed: stats.atkSpeed,
      castTime: stats.castTime, def: stats.def, crit: stats.crit,
      perks: u.perks.slice(), targetRule: resolveTargetRule(u),
      cooldown: 0.15, usedSecondWind:false,
    };
  });
}
function applyTeamAuras(team){
  const rallyCount = team.filter(u=>u.perks.includes('rally')).length;
  const vampCount = team.filter(u=>u.perks.includes('vampaura')).length;
  team.forEach(u=>{
    u.atkSpeed += 0.15*rallyCount;
    u._teamVamp = vampCount>0;
  });
}
function targetFor(unit, allies, enemies, rng){
  const aliveE = enemies.filter(e=>e.hp>0);
  const aliveA = allies.filter(a=>a.hp>0);
  const rule = unit.targetRule;
  if(rule==='healLowestAlly'){
    const hurt = aliveA.filter(a=>a.hp < a.maxHp*0.85).sort((a,b)=>(a.hp/a.maxHp)-(b.hp/b.maxHp));
    if(hurt.length) return {kind:'heal', target:hurt[0]};
    if(!aliveE.length) return null;
    return {kind:'attack', target:pick(rng, aliveE)};
  }
  if(!aliveE.length) return null;
  if(rule==='lowestHp') return {kind:'attack', target: aliveE.slice().sort((a,b)=>a.hp-b.hp)[0]};
  if(rule==='highestHp') return {kind:'attack', target: aliveE.slice().sort((a,b)=>b.hp-a.hp)[0]};
  if(rule==='highestAtk') return {kind:'attack', target: aliveE.slice().sort((a,b)=>b.atk-a.atk)[0]};
  if(rule==='lowestDef') return {kind:'attack', target: aliveE.slice().sort((a,b)=>a.def-b.def)[0]};
  return {kind:'attack', target: pick(rng, aliveE)};
}
function simulateBattle(rosterA, doctrinesA, rosterB, doctrinesB, seed){
  const rng = mulberry32(seed);
  const teamA = cloneRosterForBattle(rosterA, doctrinesA);
  const teamB = cloneRosterForBattle(rosterB, doctrinesB);
  applyTeamAuras(teamA); applyTeamAuras(teamB);
  teamA.forEach((u,i)=> u.cooldown = 0.15 + i*0.05);
  teamB.forEach((u,i)=> u.cooldown = 0.15 + i*0.05);

  const events = [];
  const dt = 0.1, maxTime = 45;
  let t = 0;
  const allUnits = () => teamA.concat(teamB);

  function aliveCount(team){ return team.filter(u=>u.hp>0).length; }

  while(t < maxTime && aliveCount(teamA)>0 && aliveCount(teamB)>0){
    // Tick down cooldowns first, using alive state from BEFORE this tick's actions resolve.
    const combined = allUnits();
    combined.forEach(u=>{ if(u.hp>0) u.cooldown -= dt; });
    // Units ready to act this tick are determined as a snapshot, then shuffled with the
    // seeded RNG so neither team gets a systematic first-mover advantage on simultaneous ticks
    // (previously Team A always resolved first, which let it wipe out mirrored teams for free).
    const ready = shuffle(rng, combined.filter(u => u.hp>0 && u.cooldown<=0));
    ready.forEach(u=>{
      if(u.hp<=0) return; // died earlier this same tick in a simultaneous trade

      const onTeamA = teamA.includes(u);
      const allies = onTeamA?teamA:teamB, enemies = onTeamA?teamB:teamA;
      const act = targetFor(u, allies, enemies, rng);
      let cycle = (1/u.atkSpeed) + u.castTime;
      if(u.perks.includes('firststrike') && t < 3) cycle = cycle/2;
      if(u.perks.includes('quickcast')) cycle -= Math.min(u.castTime*0.4, cycle*0.3);
      u.cooldown = Math.max(0.2, cycle);

      if(!act) return;
      if(act.kind==='heal'){
        const healAmt = Math.round(u.atk * 1.4);
        act.target.hp = Math.min(act.target.maxHp, act.target.hp + healAmt);
        events.push({t:round1(t), type:'heal', actor:u.uid, actorName:u.name, target:act.target.uid, targetName:act.target.name, amount:healAmt});
        return;
      }
      const target = act.target;
      const isCrit = rng()*100 < u.crit;
      let dmg = u.atk * (isCrit?1.5:1);
      if(u.perks.includes('berserk')){
        const missing = 1 - (u.hp/u.maxHp);
        dmg *= (1 + missing*0.6);
      }
      if(u.perks.includes('executioner') && target.hp < target.maxHp*0.3) dmg *= 1.5;
      dmg = dmg - target.def*0.5;
      if(target.perks.includes('ironskin')) dmg -= 4;
      dmg = Math.max(1, Math.round(dmg));

      target.hp -= dmg;
      let revived = false;
      if(target.hp <= 0 && target.perks.includes('secondwind') && !target.usedSecondWind){
        target.usedSecondWind = true;
        target.hp = Math.round(target.maxHp*0.25);
        revived = true;
      }
      target.hp = Math.max(0, target.hp);

      events.push({t:round1(t), type:'attack', actor:u.uid, actorName:u.name, target:target.uid, targetName:target.name, amount:dmg, crit:isCrit, killed: target.hp<=0 && !revived, revived});

      if(u.perks.includes('lifesteal')){
        const heal = Math.round(dmg*0.3);
        u.hp = Math.min(u.maxHp, u.hp+heal);
        if(heal>0) events.push({t:round1(t), type:'heal', actor:u.uid, actorName:u.name, target:u.uid, targetName:u.name, amount:heal, quiet:true});
      }
      if(u._teamVamp){
        const heal = Math.round(dmg*0.1);
        u.hp = Math.min(u.maxHp, u.hp+heal);
      }
      if(target.perks.includes('thorns') && target.hp>0){
        const reflect = Math.round(dmg*0.25);
        u.hp = Math.max(0, u.hp - reflect);
        events.push({t:round1(t), type:'thorns', actor:target.uid, actorName:target.name, target:u.uid, targetName:u.name, amount:reflect});
      }
    });
    t += dt;
  }

  const hpPctA = teamA.reduce((s,u)=>s+u.hp,0) / teamA.reduce((s,u)=>s+u.maxHp,0);
  const hpPctB = teamB.reduce((s,u)=>s+u.hp,0) / teamB.reduce((s,u)=>s+u.maxHp,0);
  let winner;
  if(aliveCount(teamA)===0 && aliveCount(teamB)===0) winner = hpPctA>=hpPctB?'A':'B';
  else if(aliveCount(teamA)===0) winner='B';
  else if(aliveCount(teamB)===0) winner='A';
  else winner = hpPctA>=hpPctB?'A':'B';

  return {events, winner, teamAFinal:teamA, teamBFinal:teamB, hpPctA, hpPctB, timedOut: t>=maxTime};
}
function round1(x){ return Math.round(x*10)/10; }

/* ============================= PEERJS LOBBY HELPERS ============================= */
function getLobbyLink(id){
  const url = new URL(window.location.href);
  url.searchParams.set('lobby', id);
  // Clean up any leftover hash/query noise
  return url.toString();
}
function copyText(text){
  return navigator.clipboard.writeText(text).catch(()=>{
    // fallback
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); }catch(e){}
    document.body.removeChild(ta);
  });
}

/* ============================= RENDER HELPERS ============================= */
const app = document.getElementById('app');
const navbar = document.getElementById('navbar');

function renderNav(){
  navbar.innerHTML = '';
  if(state.screen==='menu'){ return; }
  const items = [
    ['menu','Main Menu'],
  ];
  items.forEach(([key,label])=>{
    const b = document.createElement('button');
    b.textContent = label;
    b.className = state.screen===key?'active':'';
    b.onclick = ()=>{
      if(key==='menu' && state.mp){
        destroyPeer();
        state.mp = null;
      }
      state.screen=key; render();
    };
    navbar.appendChild(b);
  });
}

function unitCardHTML(unit, doctrines, opts){
  opts = opts||{};
  const s = computeStats(unit, doctrines);
  const c = CLASSES[unit.classId];
  return `<div class="unitcard">
    <div class="rivet tl"></div><div class="rivet br"></div>
    <h3>${unit.name}</h3>
    <div class="cls">${c.tag}</div>
    <div class="statgrid">
      <div>HP <b>${s.hp}</b></div>
      <div>Atk <b>${s.atk}</b></div>
      <div>Atk Spd <b>${s.atkSpeed.toFixed(2)}</b>/s</div>
      <div>Cast <b>${s.castTime.toFixed(2)}s</b></div>
      <div>Def <b>${s.def}</b></div>
      <div>Crit <b>${s.crit}%</b></div>
    </div>
    <div class="taglist">
      ${['weapon','armor','trinket'].map(slot=>{
        const it = unit.items[slot];
        return it ? `<span class="tag item">${getItem(it).name}</span>` : '';
      }).join('')}
      ${unit.perks.map(p=>`<span class="tag perk">${getPerk(p).name}</span>`).join('')}
    </div>
    ${opts.hideTargeting ? '' : `
    <label class="hint" style="display:block;margin-top:9px;">Attack priority (set blind)
      <select data-target-select="${unit.uid}">
        ${TARGETING_OPTIONS.map(o=>`<option value="${o.id}" ${(unit.targetingOverride||'default')===o.id?'selected':''}>${o.label}</option>`).join('')}
      </select>
    </label>`}
    ${opts.extra||''}
  </div>`;
}
let _delegatedListenersAttached = false;
function attachDelegatedListeners(){
  if(_delegatedListenersAttached) return;
  _delegatedListenersAttached = true;
  document.addEventListener('change', (e)=>{
    const sel = e.target.closest('[data-target-select]');
    if(!sel) return;
    const uid = sel.dataset.targetSelect;
    const unit = findUnitByUid(uid);
    if(unit) unit.targetingOverride = sel.value;
  });
}
function findUnitByUid(uid){
  if(state.sp && state.sp.roster){ const u = state.sp.roster.find(x=>x.uid===uid); if(u) return u; }
  if(state.mp && state.mp.me && state.mp.me.roster){ const u = state.mp.me.roster.find(x=>x.uid===uid); if(u) return u; }
  return null;
}

/* ============================= MENU SCREEN ============================= */
function renderMenu(){
  app.innerHTML = `
    <div class="plate">
      <div class="rivet tl"></div><div class="rivet tr"></div><div class="rivet bl"></div><div class="rivet br"></div>
      <h2>Choose Your Forge</h2>
      <div class="sub">Single-player campaign, or a live duel lobby with a friend via shareable link.</div>
      <div class="row">
        <div class="col plate" style="margin:0;">
          <h2 style="font-size:1rem;">Campaign</h2>
          <p class="hint">Draft a roster, fight scaling AI squads. Win for gold, lose for a perk of your choosing.</p>
          <button class="primary" id="btn-sp">Start Campaign</button>
        </div>
        <div class="col plate" style="margin:0;">
          <h2 style="font-size:1rem;">Live Duel</h2>
          <p class="hint">Create a lobby and share the link, or join a friend's lobby. Draft, ready up, and fight together in real time.</p>
          <button class="primary" id="btn-create">Create Lobby</button>
          <button class="ghost" id="btn-join" style="margin-top:8px;">Join Lobby</button>
        </div>
      </div>
    </div>
  `;
  document.getElementById('btn-sp').onclick = ()=>{ newSPGame(); state.screen='sp-draft'; render(); };
  document.getElementById('btn-create').onclick = ()=>{ startHostLobby(); };
  document.getElementById('btn-join').onclick = ()=>{
    const id = prompt('Enter lobby ID (or open a shared link):');
    if(id && id.trim()) startJoinLobby(id.trim());
  };
}

/* ============================= SP DRAFT SCREEN ============================= */
function renderSPDraft(){
  const sp = state.sp;
  app.innerHTML = `
    <div class="plate">
      <div class="rivet tl"></div><div class="rivet tr"></div>
      <h2>Round ${sp.round} &middot; Draft</h2>
      <div class="sub">Gold: <span class="goldline">${sp.gold}</span> &nbsp;|&nbsp; Losses: ${sp.losses}/3</div>
      ${sp.teamPerks.length ? `<div class="taglist" style="margin-bottom:10px;">${sp.teamPerks.map(id=>`<span class="tag perk" title="${getDoctrine(id).desc}">${getDoctrine(id).name}</span>`).join('')}</div>` : ''}
      <div class="row" id="roster-row"></div>
    </div>
    <div class="plate">
      <div class="rivet tl"></div><div class="rivet br"></div>
      <h2>Shop</h2>
      <div class="sub">Recruit units or gear up your roster. Items must be assigned to a unit slot. Set each unit's attack priority — your opponent (the AI) never sees your picks.</div>
      <div class="shopgrid" id="shop-grid"></div>
      <div class="controls">
        <button class="ghost small" id="btn-reroll">Reroll shop (1g)</button>
        <div class="spacer"></div>
        <button class="primary" id="btn-battle" ${sp.roster.length===0?'disabled':''}>Enter Battle &rarr;</button>
      </div>
    </div>
  `;
  const rosterRow = document.getElementById('roster-row');
  sp.roster.forEach(u=>{
    const el = document.createElement('div');
    el.innerHTML = unitCardHTML(u, sp.teamPerks, {extra:`<button class="ghost small" style="margin-top:8px;width:100%;" data-sell="${u.uid}">Sell unit (+1g)</button>`});
    rosterRow.appendChild(el.firstElementChild);
  });
  rosterRow.querySelectorAll('[data-sell]').forEach(btn=>{
    btn.onclick = ()=>{
      sp.roster = sp.roster.filter(u=>u.uid!==btn.dataset.sell);
      sp.gold += 1;
      render();
    };
  });

  const shopGrid = document.getElementById('shop-grid');
  sp.shop.offers.forEach((offer, idx)=>{
    const div = document.createElement('div');
    div.className='offer';
    if(offer.type==='unit'){
      const c = CLASSES[offer.classId];
      div.innerHTML = `<h4>${c.name}</h4><p>${c.desc}</p><p class="cost">${offer.cost}g</p><button data-idx="${idx}">Recruit</button>`;
    } else {
      const it = getItem(offer.itemId);
      div.innerHTML = `<h4>${it.name}</h4><p>${it.desc}</p><p class="cost">${offer.cost}g</p><button data-idx="${idx}">Buy</button>`;
    }
    shopGrid.appendChild(div);
  });
  shopGrid.querySelectorAll('button').forEach(btn=>{
    btn.onclick = ()=>{
      const offer = sp.shop.offers[parseInt(btn.dataset.idx)];
      if(sp.gold < offer.cost){ flashInsufficientGold(btn); return; }
      if(offer.type==='unit'){
        if(sp.roster.length>=6){ alert('Roster full (max 6).'); return; }
        sp.gold -= offer.cost;
        sp.roster.push(makeUnit(offer.classId, mulberry32(newSeed())));
        sp.shop.offers.splice(parseInt(btn.dataset.idx),1);
      } else {
        if(sp.roster.length===0){ alert('Recruit a unit first.'); return; }
        const unitName = prompt('Equip which unit? Enter exact name shown on a card:\\n' + sp.roster.map(u=>u.name+' ('+u.uid+')').join('\\n') + '\\n\\nTip: just click OK and use the dropdown next time.');
        assignItemFlow(offer.itemId, offer.cost, idx);
      }
      render();
    };
  });
  document.getElementById('btn-reroll').onclick = ()=>{
    if(sp.gold<1) return;
    sp.gold -= 1;
    generateShop(sp);
    render();
  };
  document.getElementById('btn-battle').onclick = ()=>{
    startSPBattle();
  };
}
function flashInsufficientGold(btn){
  btn.textContent = 'Not enough gold';
  setTimeout(()=>{ render(); }, 700);
}
// Simpler item assignment via inline unit picker instead of prompt()
function assignItemFlow(itemId, cost, offerIdx){
  const sp = state.sp;
  sp.gold -= cost;
  // auto-assign to first unit missing that slot type, else replace first unit's slot of same type
  const item = getItem(itemId);
  let target = sp.roster.find(u=>!u.items[item.slot]);
  if(!target) target = sp.roster[0];
  target.items[item.slot] = itemId;
  sp.shop.offers.splice(offerIdx,1);
}

/* ============================= SP BATTLE ============================= */
function generateEnemyRoster(round){
  const rng = mulberry32(newSeed());
  const budget = 8 + round*3;
  const roster = [];
  let spent = 0;
  const classKeys = Object.keys(CLASSES);
  const perkPool = PERKS.map(p=>p.id);
  const targetPool = TARGETING_OPTIONS.map(o=>o.id);
  while(spent < budget && roster.length < 6){
    const cls = pick(rng, classKeys);
    const u = makeUnit(cls, rng);
    spent += 3;
    if(round>2 && rng()<0.5){
      const it = pick(rng, ITEMS);
      u.items[it.slot] = it.id;
      spent += 2;
    }
    if(round>3 && rng()<0.4){
      u.perks.push(pick(rng, perkPool));
      spent += 2;
    }
    if(round>4 && rng()<0.5){
      u.targetingOverride = pick(rng, targetPool);
    }
    roster.push(u);
  }
  let doctrines = [];
  if(round>5 && rng()<0.5){
    doctrines = [pick(rng, DOCTRINES.map(d=>d.id))];
  }
  return {roster, doctrines};
}
function startSPBattle(){
  const sp = state.sp;
  const enemy = generateEnemyRoster(sp.round);
  const seed = newSeed();
  const result = simulateBattle(sp.roster, sp.teamPerks, enemy.roster, enemy.doctrines, seed);
  sp.battle = {enemy: enemy.roster, enemyDoctrines: enemy.doctrines, result, playIdx:0, finished:false, speed:1};
  state.screen='sp-battle';
  render();
}
function renderSPBattle(){
  const sp = state.sp;
  const b = sp.battle;
  app.innerHTML = `
    <div class="plate">
      <div class="rivet tl"></div><div class="rivet tr"></div>
      <h2>Round ${sp.round} &middot; Battle</h2>
      <div class="sub">Your roster vs. an enemy warband of similar size.</div>
      <div class="battlefield">
        <div class="team mine" id="team-a"></div>
        <div class="seam"></div>
        <div class="team enemy" id="team-b"></div>
      </div>
      <div class="log" id="battlelog"></div>
      <div class="controls">
        <button class="ghost small" id="btn-speed">Speed: 1x</button>
        <div class="spacer"></div>
        <div id="battle-status" class="statusbadge wait">Simulating...</div>
      </div>
    </div>
    <div id="postbattle"></div>
  `;
  const teamAEl = document.getElementById('team-a');
  const teamBEl = document.getElementById('team-b');
  const bars = {};
  b.result.teamAFinal.forEach(u=>{
    const div = document.createElement('div');
    div.className='ubar'; div.id='bar-'+u.uid;
    div.innerHTML = `<div class="name"><span>${u.name}</span><span class="hpnum">${u.maxHp}/${u.maxHp}</span></div><div class="hpouter"><div class="hpinner" style="width:100%"></div></div>`;
    teamAEl.appendChild(div); bars[u.uid]={el:div, max:u.maxHp, cur:u.maxHp};
  });
  b.result.teamBFinal.forEach(u=>{
    const div = document.createElement('div');
    div.className='ubar'; div.id='bar-'+u.uid;
    div.innerHTML = `<div class="name"><span>${u.name}</span><span class="hpnum">${u.maxHp}/${u.maxHp}</span></div><div class="hpouter"><div class="hpinner" style="width:100%"></div></div>`;
    teamBEl.appendChild(div); bars[u.uid]={el:div, max:u.maxHp, cur:u.maxHp};
  });
  const logEl = document.getElementById('battlelog');

  document.getElementById('btn-speed').onclick = (e)=>{
    b.speed = b.speed===1?2:(b.speed===2?4:1);
    e.target.textContent = 'Speed: '+b.speed+'x';
  };

  playback(b, bars, logEl, ()=>{
    document.getElementById('battle-status').textContent = b.result.winner==='A' ? 'Victory' : (b.result.timedOut?'Timeout — Defeat':'Defeat');
    document.getElementById('battle-status').className = 'statusbadge ' + (b.result.winner==='A'?'ok':'');
    renderSPPostBattle();
  });
}
function playback(b, bars, logEl, onDone){
  function step(){
    if(b.playIdx >= b.result.events.length){ onDone(); return; }
    const ev = b.result.events[b.playIdx++];
    applyEventToBars(ev, bars);
    appendLog(logEl, ev);
    setTimeout(step, 260 / b.speed);
  }
  step();
}
function applyEventToBars(ev, bars){
  if(ev.type==='attack'){
    const bar = bars[ev.target];
    if(bar){
      // we don't track running hp separately; recompute from log by decrement
      bar.cur = Math.max(0, bar.cur - ev.amount);
      updateBar(bar);
    }
    const abar = bars[ev.actor];
    if(abar){ flash(abar); }
  } else if(ev.type==='heal'){
    const bar = bars[ev.target];
    if(bar){ bar.cur = Math.min(bar.max, bar.cur + ev.amount); updateBar(bar); }
  } else if(ev.type==='thorns'){
    const bar = bars[ev.target];
    if(bar){ bar.cur = Math.max(0, bar.cur - ev.amount); updateBar(bar); }
  }
}
function updateBar(bar){
  const pct = Math.max(0, (bar.cur/bar.max)*100);
  bar.el.querySelector('.hpinner').style.width = pct+'%';
  bar.el.querySelector('.hpnum').textContent = Math.round(bar.cur)+'/'+bar.max;
  if(bar.cur<=0) bar.el.classList.add('dead');
}
function flash(bar){
  bar.el.classList.add('flash');
  setTimeout(()=>bar.el.classList.remove('flash'), 150);
}
function appendLog(logEl, ev){
  const div = document.createElement('div');
  div.className='l1';
  if(ev.type==='attack'){
    div.innerHTML = `<span class="${ev.crit?'crit':''}">${ev.actorName} hits ${ev.targetName} for ${ev.amount}${ev.crit?' (CRIT)':''}${ev.killed?' — defeated':''}${ev.revived?' — but clings to life (Second Wind)':''}</span>`;
  } else if(ev.type==='heal'){
    if(ev.quiet) div.innerHTML = `<span class="heal">${ev.actorName} recovers ${ev.amount} HP (lifesteal)</span>`;
    else div.innerHTML = `<span class="heal">${ev.actorName} heals ${ev.targetName} for ${ev.amount}</span>`;
  } else if(ev.type==='thorns'){
    div.innerHTML = `<span class="crit">${ev.targetName}'s thorns burn ${ev.actorName===ev.actorName?'':''}${ev.targetName===ev.actorName?'':''} for ${ev.amount}</span>`;
    div.innerHTML = `<span class="crit">Thorns strike back for ${ev.amount}</span>`;
  }
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

function renderSPPostBattle(){
  const sp = state.sp;
  const won = sp.battle.result.winner==='A';
  const div = document.getElementById('postbattle');
  if(won){
    const reward = 4 + sp.round;
    div.innerHTML = `<div class="plate">
      <h2>Victory</h2>
      <div class="sub">Your warband held the field.</div>
      <p>Gold earned: <span class="goldline">+${reward}</span></p>
      <button class="primary" id="btn-continue">Continue to next round</button>
    </div>`;
    document.getElementById('btn-continue').onclick = ()=>{
      sp.gold += reward;
      sp.round += 1;
      if(sp.round>10){ state.screen='sp-victory'; render(); return; }
      generateShop(sp);
      state.screen='sp-draft'; render();
    };
  } else {
    sp.losses += 1;
    if(sp.losses>=3){
      div.innerHTML = `<div class="plate"><h2>Defeat</h2><div class="sub">Three losses. The campaign ends here.</div>
        <button class="primary" id="btn-restart">Return to Menu</button></div>`;
      document.getElementById('btn-restart').onclick = ()=>{ state.screen='menu'; render(); };
      return;
    }
    const rng = mulberry32(newSeed());
    const pool = perkDraftPool().filter(p => p.kind!=='doctrine' || !sp.teamPerks.includes(p.id));
    const choices = pickN(rng, pool, 3);
    div.innerHTML = `<div class="plate">
      <h2>Defeat</h2>
      <div class="sub">No gold lost — but the loss taught your warband something. Choose one perk. Doctrine-tagged options rewrite a rule for your whole roster; the rest are for one unit you'll pick next.</div>
      <div class="perkchoice" id="perk-choices"></div>
    </div>`;
    const pc = document.getElementById('perk-choices');
    choices.forEach(p=>{
      const el = document.createElement('div');
      el.className='perkopt';
      el.innerHTML = `<h4>${p.name} ${p.kind==='doctrine'?'<span class="tag" style="margin-left:6px;">Doctrine</span>':''}</h4><p>${p.desc}</p>`;
      el.onclick = ()=>{
        if(p.kind==='doctrine'){
          sp.teamPerks.push(p.id);
          sp.round += 1;
          if(sp.round>10){ state.screen='sp-victory'; render(); return; }
          generateShop(sp);
          state.screen='sp-draft'; render();
        } else {
          showUnitPickerForPerk(p.id);
        }
      };
      pc.appendChild(el);
    });
  }
}
function showUnitPickerForPerk(perkId){
  const sp = state.sp;
  const div = document.getElementById('postbattle');
  const p = getPerk(perkId);
  div.innerHTML = `<div class="plate">
    <h2>Assign: ${p.name}</h2>
    <div class="sub">Choose which unit receives this perk.</div>
    <div class="row" id="assign-row"></div>
  </div>`;
  const row = document.getElementById('assign-row');
  sp.roster.forEach(u=>{
    const el = document.createElement('div');
    el.innerHTML = unitCardHTML(u, sp.teamPerks, {hideTargeting:true, extra:`<button class="primary small" style="width:100%;margin-top:8px;" data-uid="${u.uid}">Assign here</button>`});
    row.appendChild(el.firstElementChild);
  });
  row.querySelectorAll('[data-uid]').forEach(btn=>{
    btn.onclick = ()=>{
      const u = sp.roster.find(x=>x.uid===btn.dataset.uid);
      u.perks.push(perkId);
      sp.round += 1;
      if(sp.round>10){ state.screen='sp-victory'; render(); return; }
      generateShop(sp);
      state.screen='sp-draft'; render();
    };
  });
}
function renderSPVictory(){
  app.innerHTML = `<div class="plate"><h2>Campaign Complete</h2><div class="sub">Ten rounds cleared. Your warband is legend.</div>
    <button class="primary" id="btn-menu">Return to Menu</button></div>`;
  document.getElementById('btn-menu').onclick = ()=>{ state.screen='menu'; render(); };
}

/* ============================= MULTIPLAYER (PeerJS Lobby) ============================= */

function createEmptyMe(){
  const rng = mulberry32(newSeed());
  const me = { gold:10, roster: freshRoster(rng), teamPerks:[], shop:null, ready:false, seedPiece:null };
  generateShop(me);
  return me;
}

function destroyPeer(){
  const mp = state.mp;
  if(!mp) return;
  try{ if(mp.conn) mp.conn.close(); }catch(e){}
  try{ if(mp.peer) mp.peer.destroy(); }catch(e){}
  mp.conn = null;
  mp.peer = null;
}

function send(msg){
  const mp = state.mp;
  if(mp && mp.conn && mp.conn.open){
    try{ mp.conn.send(msg); }catch(e){ console.warn('send failed', e); }
  }
}

function setupConnection(conn, isHost){
  const mp = state.mp;
  mp.conn = conn;
  conn.on('open', ()=>{
    mp.connected = true;
    mp.statusMsg = 'Opponent connected';
    if(!isHost){
      send({ type:'hello', name:'Challenger' });
    }
    if(mp.stage === 'connecting') mp.stage = 'draft';
    render();
  });
  conn.on('data', (data)=>{
    handleLobbyMessage(data);
  });
  conn.on('close', ()=>{
    mp.connected = false;
    mp.statusMsg = 'Opponent disconnected';
    mp.opponent.ready = false;
    mp.opponent.roster = null;
    if(mp.stage === 'battling' || mp.stage === 'both-ready'){
      // stay in current stage so they can see the battle result if already started
    } else {
      mp.stage = 'connecting';
    }
    render();
  });
  conn.on('error', (err)=>{
    console.warn('conn error', err);
    mp.statusMsg = 'Connection error: ' + (err.message || err.type || 'unknown');
    render();
  });
}

function handleLobbyMessage(data){
  if(!data || !data.type) return;
  const mp = state.mp;
  switch(data.type){
    case 'hello':
      mp.opponentName = data.name || 'Opponent';
      mp.statusMsg = (data.name || 'Opponent') + ' joined';
      // Host replies so joiner also knows connection is fully up
      if(mp.role === 'host') send({ type:'welcome', name:'Host' });
      render();
      break;
    case 'welcome':
      mp.opponentName = data.name || 'Host';
      mp.statusMsg = 'Connected to host';
      render();
      break;
    case 'ready':
      mp.opponent.ready = true;
      mp.opponent.roster = data.roster;
      mp.opponent.teamPerks = data.teamPerks || [];
      mp.opponent.gold = data.gold;
      mp.opponent.seedPiece = data.seedPiece;
      mp.statusMsg = 'Opponent is ready';
      tryStartBattle();
      render();
      break;
    case 'unready':
      mp.opponent.ready = false;
      mp.opponent.roster = null;
      mp.statusMsg = 'Opponent un-readied';
      render();
      break;
    case 'start':
      // Host decided the final seed and both rosters
      mp.seed = data.seed;
      // Orient rosters from our perspective
      if(mp.role === 'host'){
        // we already have our own; opponent should match what we sent
      } else {
        // we are joiner — data.hostRoster is them, data.joinerRoster is us (already have)
        mp.opponent.roster = data.hostRoster;
        mp.opponent.teamPerks = data.hostPerks || [];
      }
      mp.stage = 'battling';
      runMPBattle();
      break;
    case 'rematch':
      advanceMPRound();
      break;
    default:
      console.log('unknown msg', data);
  }
}

function tryStartBattle(){
  const mp = state.mp;
  if(!mp.me.ready || !mp.opponent.ready) return;
  if(mp.role !== 'host') return; // only host emits the start packet
  // Combine seed pieces for determinism
  const seed = ((mp.me.seedPiece ^ ((mp.opponent.seedPiece||0) * 2654435761)) >>> 0);
  mp.seed = seed;
  send({
    type: 'start',
    seed,
    hostRoster: mp.me.roster,
    hostPerks: mp.me.teamPerks,
    joinerRoster: mp.opponent.roster,
    joinerPerks: mp.opponent.teamPerks || [],
  });
  mp.stage = 'battling';
  runMPBattle();
}

function startHostLobby(){
  destroyPeer();
  state.mode = 'mp';
  state.mp = {
    role: 'host',
    peer: null,
    conn: null,
    lobbyId: null,
    connected: false,
    opponentName: null,
    statusMsg: 'Creating lobby…',
    me: createEmptyMe(),
    opponent: { ready:false, roster:null, teamPerks:[], gold:0, seedPiece:null },
    seed: null,
    stage: 'connecting',
    battle: null,
    round: 1,
  };
  state.screen = 'mp';
  render();

  const peer = new Peer(); // random ID from cloud
  state.mp.peer = peer;
  peer.on('open', (id)=>{
    state.mp.lobbyId = id;
    state.mp.statusMsg = 'Lobby ready — share the link';
    render();
  });
  peer.on('connection', (conn)=>{
    if(state.mp.conn && state.mp.conn.open){
      // already have someone; reject extra
      conn.close();
      return;
    }
    setupConnection(conn, true);
  });
  peer.on('error', (err)=>{
    console.warn('peer error', err);
    state.mp.statusMsg = 'Lobby error: ' + (err.type || err.message || 'unknown');
    render();
  });
  peer.on('disconnected', ()=>{
    state.mp.statusMsg = 'Disconnected from signaling — trying to reconnect…';
    try{ peer.reconnect(); }catch(e){}
    render();
  });
}

function startJoinLobby(lobbyId){
  destroyPeer();
  state.mode = 'mp';
  state.mp = {
    role: 'joiner',
    peer: null,
    conn: null,
    lobbyId: lobbyId,
    connected: false,
    opponentName: null,
    statusMsg: 'Connecting to lobby…',
    me: createEmptyMe(),
    opponent: { ready:false, roster:null, teamPerks:[], gold:0, seedPiece:null },
    seed: null,
    stage: 'connecting',
    battle: null,
    round: 1,
  };
  state.screen = 'mp';
  render();

  const peer = new Peer();
  state.mp.peer = peer;
  peer.on('open', ()=>{
    const conn = peer.connect(lobbyId, { reliable: true });
    setupConnection(conn, false);
  });
  peer.on('error', (err)=>{
    console.warn('peer error', err);
    state.mp.statusMsg = 'Could not join: ' + (err.type || err.message || 'unknown') + '. Check the ID and that the host is still online.';
    render();
  });
}

function renderMP(){
  const mp = state.mp;
  if(!mp){ state.screen='menu'; return renderMenu(); }
  if(mp.stage === 'connecting') return renderMPConnecting();
  if(mp.stage === 'draft') return renderMPDraft();
  if(mp.stage === 'battling') return renderMPBattle();
  if(mp.stage === 'post') return renderMPPost();
  return renderMPDraft();
}

function renderMPConnecting(){
  const mp = state.mp;
  const link = mp.lobbyId ? getLobbyLink(mp.lobbyId) : '';
  app.innerHTML = `
    <div class="plate">
      <div class="rivet tl"></div><div class="rivet tr"></div>
      <h2>${mp.role==='host' ? 'Your Lobby' : 'Joining Lobby'}</h2>
      <div class="sub">${mp.statusMsg || ''}</div>
      ${mp.role==='host' && mp.lobbyId ? `
        <p class="hint" style="margin-top:12px;">Share this link with your opponent:</p>
        <textarea readonly onclick="this.select()" style="width:100%;min-height:64px;font-size:.85rem;">${link}</textarea>
        <div class="controls" style="margin-top:10px;">
          <button id="btn-copy-link" class="primary">Copy Link</button>
          <button id="btn-copy-id" class="ghost">Copy ID only</button>
        </div>
        <p class="hint" style="margin-top:10px;">Lobby ID: <code class="inline">${mp.lobbyId}</code></p>
        <p class="hint">Keep this tab open. Waiting for opponent to join…</p>
      ` : `
        <p class="hint">Connecting to <code class="inline">${mp.lobbyId||'…'}</code></p>
      `}
      <div class="controls" style="margin-top:16px;">
        <button class="ghost" id="btn-cancel">Cancel</button>
      </div>
    </div>
  `;
  const copyLink = document.getElementById('btn-copy-link');
  if(copyLink) copyLink.onclick = ()=>{
    copyText(link).then(()=>{
      copyLink.textContent = 'Copied!';
      setTimeout(()=>{ if(copyLink) copyLink.textContent='Copy Link'; },1200);
    });
  };
  const copyId = document.getElementById('btn-copy-id');
  if(copyId) copyId.onclick = ()=>{
    copyText(mp.lobbyId).then(()=>{
      copyId.textContent = 'Copied!';
      setTimeout(()=>{ if(copyId) copyId.textContent='Copy ID only'; },1200);
    });
  };
  document.getElementById('btn-cancel').onclick = ()=>{
    destroyPeer();
    state.mp = null;
    state.screen = 'menu';
    render();
  };
}

function renderMPDraft(){
  const mp = state.mp;
  const oppStatus = !mp.connected
    ? 'Waiting for opponent…'
    : (mp.opponent.ready ? 'Opponent is READY' : 'Opponent is drafting…');
  app.innerHTML = `
    <div class="plate">
      <div class="rivet tl"></div><div class="rivet tr"></div>
      <h2>Duel · Round ${mp.round} · ${mp.role==='host'?'Host':'Challenger'}</h2>
      <div class="sub">
        Gold: <span class="goldline">${mp.me.gold}</span>
        &nbsp;|&nbsp; <span class="statusbadge">${mp.connected ? 'Connected' : 'Disconnected'}</span>
        &nbsp;|&nbsp; ${oppStatus}
      </div>
      ${mp.me.teamPerks.length ? `<div class="taglist" style="margin-bottom:10px;">${mp.me.teamPerks.map(id=>`<span class="tag perk" title="${getDoctrine(id).desc}">${getDoctrine(id).name}</span>`).join('')}</div>` : ''}
      <div class="row" id="roster-row"></div>
    </div>
    <div class="plate">
      <h2>Shop</h2>
      <div class="sub">Draft in secret. When both players click Ready, the battle starts automatically.</div>
      <div class="shopgrid" id="shop-grid"></div>
      <div class="controls">
        <button class="ghost small" id="btn-reroll" ${mp.me.ready?'disabled':''}>Reroll (1g)</button>
        <div class="spacer"></div>
        ${mp.me.ready
          ? `<button class="danger" id="btn-unready">Cancel Ready</button>`
          : `<button class="primary" id="btn-ready" ${mp.me.roster.length===0||!mp.connected?'disabled':''}>I'm Ready</button>`}
      </div>
    </div>
    <div class="plate">
      <div class="sub">${mp.statusMsg || ''}</div>
      <div class="controls">
        <button class="ghost" id="btn-leave">Leave Lobby</button>
      </div>
    </div>
  `;

  // Roster
  const rosterRow = document.getElementById('roster-row');
  mp.me.roster.forEach(u=>{
    const el = document.createElement('div');
    const extra = mp.me.ready ? '' : `<button class="ghost small" style="margin-top:8px;width:100%;" data-sell="${u.uid}">Sell (+1g)</button>`;
    el.innerHTML = unitCardHTML(u, mp.me.teamPerks, {extra});
    rosterRow.appendChild(el.firstElementChild);
  });
  if(!mp.me.ready){
    rosterRow.querySelectorAll('[data-sell]').forEach(btn=>{
      btn.onclick = ()=>{
        mp.me.roster = mp.me.roster.filter(u=>u.uid!==btn.dataset.sell);
        mp.me.gold += 1;
        render();
      };
    });
  }

  // Shop
  const shopGrid = document.getElementById('shop-grid');
  mp.me.shop.offers.forEach((offer, idx)=>{
    const div = document.createElement('div'); div.className='offer';
    if(offer.type==='unit'){
      const c = CLASSES[offer.classId];
      div.innerHTML = `<h4>${c.name}</h4><p>${c.desc}</p><p class="cost">${offer.cost}g</p>
        <button data-idx="${idx}" ${mp.me.ready?'disabled':''}>Recruit</button>`;
    } else {
      const it = getItem(offer.itemId);
      div.innerHTML = `<h4>${it.name}</h4><p>${it.desc}</p><p class="cost">${offer.cost}g</p>
        <button data-idx="${idx}" ${mp.me.ready?'disabled':''}>Buy</button>`;
    }
    shopGrid.appendChild(div);
  });
  if(!mp.me.ready){
    shopGrid.querySelectorAll('button').forEach(btn=>{
      btn.onclick = ()=>{
        const offer = mp.me.shop.offers[parseInt(btn.dataset.idx)];
        if(mp.me.gold < offer.cost) return;
        if(offer.type==='unit'){
          if(mp.me.roster.length >= 6){ alert('Roster full (max 6).'); return; }
          mp.me.gold -= offer.cost;
          mp.me.roster.push(makeUnit(offer.classId, mulberry32(newSeed())));
        } else {
          if(mp.me.roster.length===0){ alert('Recruit a unit first.'); return; }
          mp.me.gold -= offer.cost;
          const item = getItem(offer.itemId);
          let target = mp.me.roster.find(u=>!u.items[item.slot]) || mp.me.roster[0];
          target.items[item.slot] = offer.itemId;
        }
        mp.me.shop.offers.splice(parseInt(btn.dataset.idx), 1);
        render();
      };
    });
  }

  document.getElementById('btn-reroll').onclick = ()=>{
    if(mp.me.ready || mp.me.gold < 1) return;
    mp.me.gold -= 1;
    generateShop(mp.me);
    render();
  };

  const readyBtn = document.getElementById('btn-ready');
  if(readyBtn) readyBtn.onclick = ()=>{
    mp.me.ready = true;
    mp.me.seedPiece = newSeed();
    send({
      type: 'ready',
      roster: mp.me.roster,
      teamPerks: mp.me.teamPerks,
      gold: mp.me.gold,
      seedPiece: mp.me.seedPiece,
    });
    mp.statusMsg = 'You are ready — waiting for opponent…';
    tryStartBattle();
    render();
  };
  const unreadyBtn = document.getElementById('btn-unready');
  if(unreadyBtn) unreadyBtn.onclick = ()=>{
    mp.me.ready = false;
    mp.me.seedPiece = null;
    send({ type: 'unready' });
    mp.statusMsg = 'Ready cancelled';
    render();
  };

  document.getElementById('btn-leave').onclick = ()=>{
    destroyPeer();
    state.mp = null;
    state.screen = 'menu';
    render();
  };
}

function runMPBattle(){
  const mp = state.mp;
  // From our perspective: team A = me, team B = opponent
  const myRoster = mp.me.roster;
  const myPerks = mp.me.teamPerks;
  const oppRoster = mp.opponent.roster;
  const oppPerks = mp.opponent.teamPerks || [];
  const result = simulateBattle(myRoster, myPerks, oppRoster, oppPerks, mp.seed);
  mp.battle = {
    enemy: oppRoster,
    enemyDoctrines: oppPerks,
    result,
    playIdx: 0,
    finished: false,
    speed: 1,
  };
  render();
}

function renderMPBattle(){
  const mp = state.mp;
  const b = mp.battle;
  if(!b){ mp.stage='draft'; return render(); }

  app.innerHTML = `
    <div class="plate">
      <div class="rivet tl"></div><div class="rivet tr"></div>
      <h2>Round ${mp.round} &middot; Battle</h2>
      <div class="sub">Live duel — identical simulation on both screens (seed ${mp.seed}).</div>
      <div class="battlefield">
        <div class="team mine" id="team-a"></div>
        <div class="seam"></div>
        <div class="team enemy" id="team-b"></div>
      </div>
      <div class="log" id="battlelog"></div>
      <div class="controls">
        <button class="ghost small" id="btn-speed">Speed: 1x</button>
        <div class="spacer"></div>
        <div id="battle-status" class="statusbadge wait">Fighting…</div>
      </div>
    </div>
  `;

  const teamAEl = document.getElementById('team-a');
  const teamBEl = document.getElementById('team-b');
  const bars = {};
  b.result.teamAFinal.forEach(u=>{
    const div = document.createElement('div');
    div.className='ubar'; div.id='bar-'+u.uid;
    div.innerHTML = `<div class="name"><span>${u.name}</span><span class="hpnum">${u.maxHp}/${u.maxHp}</span></div><div class="hpouter"><div class="hpinner" style="width:100%"></div></div>`;
    teamAEl.appendChild(div); bars[u.uid]={el:div, max:u.maxHp, cur:u.maxHp};
  });
  b.result.teamBFinal.forEach(u=>{
    const div = document.createElement('div');
    div.className='ubar'; div.id='bar-'+u.uid;
    div.innerHTML = `<div class="name"><span>${u.name}</span><span class="hpnum">${u.maxHp}/${u.maxHp}</span></div><div class="hpouter"><div class="hpinner" style="width:100%"></div></div>`;
    teamBEl.appendChild(div); bars[u.uid]={el:div, max:u.maxHp, cur:u.maxHp};
  });
  const logEl = document.getElementById('battlelog');

  document.getElementById('btn-speed').onclick = (e)=>{
    b.speed = b.speed===1?2:(b.speed===2?4:1);
    e.target.textContent = 'Speed: '+b.speed+'x';
  };

  playback(b, bars, logEl, ()=>{
    const won = b.result.winner==='A';
    document.getElementById('battle-status').textContent = won ? 'Victory' : (b.result.timedOut?'Timeout — Defeat':'Defeat');
    document.getElementById('battle-status').className = 'statusbadge ' + (won?'ok':'');
    b.finished = true;
    mp.stage = 'post';
    // show post UI after a short beat
    setTimeout(()=>render(), 600);
  });
}

function renderMPPost(){
  const mp = state.mp;
  const won = mp.battle && mp.battle.result.winner === 'A';
  app.innerHTML = `
    <div class="plate">
      <div class="rivet tl"></div><div class="rivet tr"></div>
      <h2>${won ? 'Victory' : 'Defeat'}</h2>
      <div class="sub">${won ? 'Your warband stood firm.' : 'The enemy held the field.'}</div>
      <div class="controls" style="margin-top:16px;">
        <button class="primary" id="btn-rematch">Rematch (same lobby)</button>
        <button class="ghost" id="btn-leave">Leave Lobby</button>
      </div>
    </div>
  `;
  document.getElementById('btn-rematch').onclick = ()=>{
    send({ type: 'rematch' });
    advanceMPRound();
  };
  document.getElementById('btn-leave').onclick = ()=>{
    destroyPeer();
    state.mp = null;
    state.screen = 'menu';
    render();
  };
}

function advanceMPRound(){
  const mp = state.mp;
  if(!mp) return;
  mp.round += 1;
  mp.me.ready = false;
  mp.me.seedPiece = null;
  mp.opponent.ready = false;
  mp.opponent.roster = null;
  mp.opponent.teamPerks = [];
  mp.opponent.seedPiece = null;
  mp.seed = null;
  mp.battle = null;
  // Keep some gold progression similar to SP feel
  mp.me.gold += 5;
  generateShop(mp.me);
  mp.stage = 'draft';
  mp.statusMsg = 'New round — draft again';
  render();
}

/* ============================= ROUTER ============================= */
function render(){
  renderNav();
  if(state.screen==='menu') return renderMenu();
  if(state.screen==='sp-draft') return renderSPDraft();
  if(state.screen==='sp-battle') return renderSPBattle();
  if(state.screen==='sp-victory') return renderSPVictory();
  if(state.screen==='mp') return renderMP();
}

// Auto-join if the page was opened with ?lobby=PEER_ID
(function boot(){
  attachDelegatedListeners();
  const params = new URLSearchParams(window.location.search);
  const lobbyId = params.get('lobby');
  if(lobbyId){
    // Clean the URL so refresh doesn't keep re-joining awkwardly
    try{
      const clean = new URL(window.location.href);
      clean.searchParams.delete('lobby');
      window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
    }catch(e){}
    startJoinLobby(lobbyId);
  } else {
    render();
  }
})();
