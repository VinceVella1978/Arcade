/* ══════════════════════════════════════════════════════════════
   POINT — campagne 70 figures, 7 mythes
   Une seule nappe (la formule dweet) ; chaque zone la plie autrement,
   la fait bouger autrement, et lui prête un monstre.
   Géométrie = règles. Mythologie = noms, versets, épreuves.
   ══════════════════════════════════════════════════════════════ */
"use strict";

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;

/* ── nappe dweet identique ; chaque zone plie la forme + change le déplacement ── */
function fieldClassic(P){
  return (i,t)=>{
    const m=(i%P.layers)*P.spread;
    const k=P.amp*Math.cos(i*P.fa)*Math.sin(i*P.fb);
    const e=Math.cos(i*P.fc)*Math.cos(i*P.fd)*P.amp;
    const g=Math.hypot(k,e);
    const d=g*g*g/P.scale+1.5-Math.pow(Math.sin(t/2+m),3)/P.breath;
    if(d<=0) return null;
    const c=d/P.swirl-t/P.spin+m;
    const p=Math.pow(d,Math.sin(d*d-t+m));
    return [P.ring*Math.sin(c)+k*p, P.ring*Math.sin(c*P.harm)+e*p];
  };
}
function wrapShape(shape){
  return P=>{
    const fn=fieldClassic(P);
    return (i,t)=>{
      const q=fn(i,t); if(!q) return null;
      return shape(q[0], q[1]);
    };
  };
}
/* les créatures cornues de l'Éveil : la tête porte deux petites cornes en V */
function fieldHorned(P){
  return (i,t)=>{
    const m=(i%P.layers)*P.spread;
    const k=P.amp*Math.cos(i*P.fa)*Math.sin(i*P.fb);
    const e=Math.cos(i*P.fc)*Math.cos(i*P.fd)*P.amp;
    const g=Math.hypot(k,e);
    const d=g*g*g/P.scale+1.5-Math.pow(Math.sin(t/2+m),3)/P.breath;
    if(d<=0) return null;
    const c=d/P.swirl-t/P.spin+m;
    const p=Math.pow(d,Math.sin(d*d-t+m));
    const ox=P.ring*Math.sin(c)+k*p;
    const oy=P.ring*Math.sin(c*P.harm)+e*p;
    const face=Math.atan2(P.harm*Math.cos(c*P.harm), Math.cos(c));
    const slot=i%8;
    if(slot===0||slot===1){
      const ha=face+(slot?1:-1)*0.50;
      return [ox+22*Math.cos(ha), oy+22*Math.sin(ha)];
    }
    return [ox,oy];
  };
}
const FAMILIES={
  classic:{label:"CLASSIQUE", make:fieldHorned},
  rose:   {label:"ROSACE",    make:wrapShape((x,y)=>{
    const r=Math.hypot(x,y), a=Math.atan2(y,x);
    const r2=r*(0.92+0.08*Math.cos(5*a));
    const a2=a+0.16*Math.sin(5*a);
    return [r2*Math.cos(a2), r2*Math.sin(a2)];
  })},
  vortex: {label:"VORTEX",    make:wrapShape((x,y)=>{
    const r=Math.hypot(x,y), a=Math.atan2(y,x);
    return [r*Math.cos(a+0.011*r), r*Math.sin(a+0.011*r)];
  })},
  weave:  {label:"TRESSE",    make:wrapShape((x,y)=>[
    x+12*Math.sin(y*0.036), y+8*Math.sin(x*0.032)
  ])},
  pulse:  {label:"PULSAR",    make:wrapShape((x,y)=>{
    const r=Math.hypot(x,y), a=Math.atan2(y,x);
    const r2=r*(0.88+0.12*Math.cos(6*a));
    return [r2*Math.cos(a), r2*Math.sin(a)];
  })},
  swarm:  {label:"NUÉE", make:fieldHorned},
};

const MOTIONS={
  spin:    {label:"ROTATION",     desc:"le motif tourne sur lui-même — le mouvement de base"},
  precess: {label:"PRÉCESSION",   desc:"tout le motif bascule autour du centre, comme une tête qui se tourne"},
  breathe: {label:"RESPIRATION",  desc:"les brins s'écartent puis se resserrent — le gouffre inspire"},
  shear:   {label:"CISAILLEMENT", desc:"les couches glissent en sens inverse, fil contre fil"},
  orbit:   {label:"ORBITES",      desc:"chaque point gravite autour de sa place — cent yeux qui roulent"},
  tumble:  {label:"TOURBILLON",   desc:"chaque couche tourne à sa propre vitesse — la boucle se mord"},
};
function applyMotion(x,y,i,t,kind){
  if(!kind || kind==="spin") return [x,y];
  const layer=i%16;
  if(kind==="precess"){
    const ph=0.34*Math.sin(t*0.21);
    const c=Math.cos(ph), s=Math.sin(ph);
    return [x*c-y*s, x*s+y*c];
  }
  if(kind==="breathe"){
    const k=0.83+0.17*Math.sin(t*0.82);
    return [x*k,y*k];
  }
  if(kind==="shear"){
    const dir=layer%2?1:-1;
    return [x+13*Math.sin(t*0.48+y*0.028)*dir, y];
  }
  if(kind==="orbit"){
    const o=6, w=t*1.05+i*0.012;
    return [x+o*Math.cos(w), y+o*Math.sin(w)];
  }
  if(kind==="tumble"){
    const ph=t*0.11*(1+(layer%5)*0.4);
    const c=Math.cos(ph), s=Math.sin(ph);
    return [x*c-y*s, x*s+y*c];
  }
  return [x,y];
}

/* ── modificateurs par niveau ──
   Les deux nouveaux (regard, pénombre) sont gérés dans le moteur :
   ils n'altèrent pas la formule mais le vaisseau et la lumière. ── */
const MODS={
  none:   {label:"", desc:"", ico:""},
  drift:  {label:"DÉRIVE",   ico:"⇢", desc:"le motif glisse lentement de côté"},
  mirror: {label:"MIROIR",   ico:"⧉", desc:"une moitié du motif bascule en douceur"},
  storm:  {label:"ORAGE",    ico:"⚡", desc:"secousses aléatoires du motif"},
  gravity:{label:"GOUFFRE",  ico:"◎", desc:"le vaisseau est tiré vers le centre"},
  shrink: {label:"ÉTAU",     ico:"▣", desc:"la zone sûre se resserre puis relâche"},
  gaze:   {label:"REGARD",   ico:"◉", desc:"un regard balaie l'arène — y rester vous pétrifie et ralentit vos gestes"},
  eclipse:{label:"PÉNOMBRE", ico:"◐", desc:"la nuit se referme autour de vous ; seule votre lumière révèle le motif"},
};
function applyMods(x,y,i,t,mods){
  if(!mods.length) return [x,y];
  if(mods.includes("drift")){
    x+=Math.sin(t*0.4)*5.5; y+=Math.cos(t*0.31)*4;
  }
  if(mods.includes("mirror")){
    const w=0.5+0.5*Math.sin(t*0.35);
    if(((i*2654435761)>>>28)%2) x=x*(1-2*w);
  }
  return [x,y];
}

/* ── les sept mythes ──
   name = nom géométrique (la règle), myth = nom mythologique (le monstre),
   epigraph = verset d'entrée, boss = nom de l'épreuve (figure 10). */
const ZONES=[
  {num:"I",   myth:"LABYRINTHE", name:"ÉVEIL",       fam:"classic", motion:"spin",    hue:200, sigil:"maze",
   epigraph:"Le Minotaure n'a jamais eu de corps. Il n'a que des angles, et il tourne.",
   boss:"Le Minotaure", bossLine:"Tenez le centre du dédale jusqu'à ce qu'il se lasse."},
  {num:"II",  myth:"MÉDUSE",     name:"ROSACE",      fam:"rose",    motion:"precess", hue:280, sigil:"gaze",
   epigraph:"Chaque pétale est un regard. Ne restez jamais dans l'axe.",
   boss:"Le Regard", bossLine:"Elle ne cligne pas. Vous, si — bougez."},
  {num:"III", myth:"CHARYBDE",   name:"VORTEX",      fam:"vortex",  motion:"breathe", hue:180, sigil:"spiral",
   epigraph:"Le gouffre respire. Ce qui entre au centre y reste.",
   boss:"La Gorge", bossLine:"Trois fois par jour elle avale la mer. Ce soir, c'est vous."},
  {num:"IV",  myth:"LES MOIRES", name:"TRESSE",      fam:"weave",   motion:"shear",   hue:330, sigil:"web",
   epigraph:"Trois sœurs tissent la même ligne. La troisième porte des ciseaux.",
   boss:"Le Fil coupé", bossLine:"Le métier se resserre. Restez dans la maille."},
  {num:"V",   myth:"ARGOS",      name:"PULSAR",      fam:"pulse",   motion:"orbit",   hue:150, sigil:"eyes",
   epigraph:"Cent yeux, tous en orbite. Quand ils se ferment, la nuit tombe autour de vous.",
   boss:"La Veille", bossLine:"Argos ne dort jamais tout entier. Vous non plus."},
  {num:"VI",  myth:"CHAOS",      name:"MÉLANGE",     fam:"mixed",   motion:"mixed",   hue:20,  sigil:"shards",
   epigraph:"Avant les formes, il n'y avait que la formule. Le Chaos s'en souvient.",
   boss:"L'Informe", bossLine:"Toutes les figures à la fois. Aucune règle ne tient longtemps."},
  {num:"VII", myth:"OUROBOROS",  name:"SINGULARITÉ", fam:"mixed",   motion:"tumble",  hue:0,   sigil:"ring",
   epigraph:"La boucle se mord la queue. La formule se réécrit elle-même.",
   boss:"La Boucle", bossLine:"Il n'y a pas de Porte ici. Seulement la fin du tour."},
];
const FAM_MOTION={classic:"spin",rose:"precess",vortex:"breathe",weave:"shear",pulse:"orbit"};

/* signature de chaque zone : mod principal (dès la 4e figure), mod secondaire (dès la 8e).
   Un tableau = rotation d'un niveau à l'autre. */
const ZONE_MODS=[
  null,
  {main:"gaze",    second:"drift",   mainAt:3, secondAt:7},
  {main:"gravity", second:"gaze",    mainAt:3, secondAt:7},
  {main:"shrink",  second:"mirror",  mainAt:3, secondAt:7},
  {main:"eclipse", second:"gravity", mainAt:3, secondAt:7},
  {main:"storm",   second:["gaze","shrink","eclipse"], mainAt:2, secondAt:5},
  {main:["gravity","shrink","gaze","eclipse"], second:"storm", mainAt:0, secondAt:4},
];
const pickMod=(m,n)=>Array.isArray(m)?m[n%m.length]:m;
function easeOut(t){ return 1-Math.pow(1-t,1.55); }
const round50=v=>Math.round(v/50)*50;

const LEVELS=[];
for(let z=0;z<7;z++){
  for(let n=0;n<10;n++){
    const idx=z*10+n;
    const zone=ZONES[z];
    const fam=zone.fam==="mixed" ? ["classic","rose","vortex","weave","pulse"][idx%5] : zone.fam;
    const boss=n===9;

    if(z===0){
      /* Zone I : le tutoriel, inchangé dans ses chiffres */
      const diff=idx/69;
      const lvl={
        idx, zone:z, num:idx+1, name:zone.name, diff, fam, boss,
        speed: lerp(3.2,8.5,diff),
        density: Math.round(lerp(5200,8600,diff)),
        hotLayers: Math.round(lerp(3,12,diff)),
        warnDur: +(lerp(1.65, 0.9, diff).toFixed(2)),
        orbSpeed: +(lerp(0.40, 0.65, diff).toFixed(2)),
        firstDelay: +(Math.max(2, 5.5-diff*3.5).toFixed(2)),
        corruptGap: +(Math.max(2.2, 6.5-diff*4.2).toFixed(2)),
        tokensNeeded: n<3?2 : n<7?3 : 4,
        oracles: 1,
        doorSpeed: 0.10,
        timeLimit: boss ? 45 : 0,
        mods:[],
        motion:"spin",
      };
      if(n>=2 && (idx%3===0)) lvl.mods.push("drift");
      if(n>=4 && (idx%4===1)) lvl.mods.push("mirror");
      lvl.scoreGoal=round50(lvl.tokensNeeded*150*1.5 + idx*60 + (boss?600:0));
      LEVELS.push(lvl);
      continue;
    }

    const u=easeOut((idx-10)/59);
    const diff=0.14+u*0.62;
    const zm=ZONE_MODS[z];
    const lvl={
      idx, zone:z, num:idx+1, name:zone.name, diff, fam, boss,
      hotLayers: Math.round(lerp(4, 7, u)),
      density: Math.round(lerp(5600, 6800, u)),
      speed: +(lerp(3.85, 5.4, u).toFixed(2)),
      warnDur: +(lerp(1.50, 1.20, u).toFixed(2)),
      orbSpeed: +(lerp(0.43, 0.55, u).toFixed(2)),
      firstDelay: +(lerp(4.6, 3.2, u).toFixed(2)),
      corruptGap: +(lerp(5.4, 3.8, u).toFixed(2)),
      tokensNeeded: n<4?2 : 3,
      oracles: z<=2 ? 1 : z<=4 ? (n<5?1:2) : 2,
      doorSpeed: +(lerp(0.12, 0.22, u).toFixed(2)),
      tokenDelay: +(lerp(3.2, 5.8, u).toFixed(2)),
      tokenGap: +(lerp(3.6, 6.2, u).toFixed(2)),
      tokenLife: z>=5 ? +(lerp(10.5, 5.4, Math.max(0,(idx-50)/19)).toFixed(2)) : 0,
      /* regard : largeur du cône et vitesse de balayage montent avec u */
      gazeWidth: +(lerp(0.30, 0.44, u).toFixed(2)),
      gazeSpeed: +(lerp(0.36, 0.55, u).toFixed(2)),
      /* pénombre : rayon minimal de lumière (fraction de l'arène) */
      eclipseMin: +(lerp(0.34, 0.24, u).toFixed(2)),
      timeLimit: boss ? Math.round(lerp(45, 63, z/6)) : 0,
      mods:[],
      motion: zone.motion==="mixed" ? (FAM_MOTION[fam]||"spin") : zone.motion,
    };
    if(n>=zm.mainAt) lvl.mods.push(pickMod(zm.main,n));
    if(n>=zm.secondAt){
      const s=pickMod(zm.second,n);
      if(!lvl.mods.includes(s)) lvl.mods.push(s);
    }
    lvl.scoreGoal=round50(lvl.tokensNeeded*lvl.oracles*150*1.5 + idx*60 + (boss?lvl.timeLimit*14:0));
    LEVELS.push(lvl);
  }
}

/* export pour le jeu */
if(typeof module!=="undefined") module.exports={LEVELS,ZONES,FAMILIES,MODS,MOTIONS,FAMILIES_KEYS:Object.keys(FAMILIES)};
