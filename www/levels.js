/* ══════════════════════════════════════════════════════════════
   POINT — campagne 70 niveaux
   Chaque niveau = (formule de base, modificateurs, objectifs).
   La formule dweet est le "génome" ; les mods la déforment.
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
const FAMILIES={
  classic:{label:"CLASSIQUE", make:fieldClassic},
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
  swarm:  {label:"NUÉE", make:fieldClassic},
};

const MOTIONS={
  spin:    {label:"ROTATION",     desc:"le motif tourne sur lui-même — le mouvement de base"},
  precess: {label:"PRÉCESSION",   desc:"tout le motif bascule autour du centre"},
  breathe: {label:"RESPIRATION",  desc:"les brins s'écartent puis se resserrent"},
  shear:   {label:"CISSAILLEMENT",desc:"les couches glissent en sens inverse"},
  orbit:   {label:"ORBITES",      desc:"chaque point gravite autour de sa place"},
  tumble:  {label:"TOURBILLON",   desc:"chaque couche tourne à sa propre vitesse"},
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

/* ── modificateurs par niveau ── */
const MODS={
  none:   {label:"", desc:""},
  drift:  {label:"DÉRIVE", desc:"le motif glisse latéralement"},
  mirror: {label:"MIROIR", desc:"une moitié du motif bascule en douceur"},
  storm:  {label:"ORAGE", desc:"secousses aléatoires du motif"},
  gravity:{label:"MARÉE", desc:"le vaisseau est tiré vers le centre"},
  shrink: {label:"ÉTRANGLEMENT", desc:"la zone sûre rétrécit puis reprend"},
};
function applyMods(x,y,i,t,st){
  if(st.mods.includes("drift")){
    x+=Math.sin(t*0.4+i*0.01)*0.06; y+=Math.cos(t*0.31)*0.05;
  }
  if(st.mods.includes("mirror")){
    const w=0.5+0.5*Math.sin(t*0.35);
    if(((i*2654435761)>>>28)%2) x=x*(1-2*w);
  }
  return [x,y];
}

/* ── génération des 70 niveaux ──
   Zone 1 (Éveil) : inchangée — tutoriel lisible.
   Zones 2–7 : une idée nouvelle par zone, max 2 mods, les chiffres
   plafonnent (vitesse, couches bleues) pour rester jouable. */
const ZONES=[
  {name:"ÉVEIL",       fam:"classic", motion:"spin",    hue:200},
  {name:"ROSACE",      fam:"rose",    motion:"precess", hue:280},
  {name:"VORTEX",      fam:"vortex",  motion:"breathe", hue:180},
  {name:"TRESSE",      fam:"weave",   motion:"shear",   hue:330},
  {name:"PULSAR",      fam:"pulse",   motion:"orbit",   hue:150},
  {name:"CHAOS",       fam:"mixed",   motion:"mixed",   hue:20},
  {name:"SINGULARITÉ", fam:"mixed",   motion:"tumble",  hue:0},
];
const FAM_MOTION={classic:"spin",rose:"precess",vortex:"breathe",weave:"shear",pulse:"orbit"};
const ZONE_SIGN=[null,"drift","mirror",null,"storm","gravity","shrink"];
function easeOut(t){ return 1-Math.pow(1-t,1.55); }

const LEVELS=[];
for(let z=0;z<7;z++){
  for(let n=0;n<10;n++){
    const idx=z*10+n;
    const zone=ZONES[z];
    const fam=zone.fam==="mixed" ? ["classic","rose","vortex","weave","pulse"][idx%5] : zone.fam;

    if(z===0){
      const diff=idx/69;
      const lvl={
        idx, zone:z, num:idx+1, name:zone.name, diff, fam,
        speed: lerp(3.2,8.5,diff),
        density: Math.round(lerp(5200,8600,diff)),
        hotLayers: Math.round(lerp(3,12,diff)),
        warnDur: +(lerp(1.65, 0.9, diff).toFixed(2)),
        orbSpeed: +(lerp(0.40, 0.65, diff).toFixed(2)),
        firstDelay: +(Math.max(2, 5.5-diff*3.5).toFixed(2)),
        corruptGap: +(Math.max(2.2, 6.5-diff*4.2).toFixed(2)),
        tokensNeeded: n<3?2 : n<7?3 : 4,
        timeLimit: n===9 ? 45+Math.round(diff*30) : 0,
        mods:[],
        motion:"spin",
      };
      if(n>=2 && (idx%3===0)) lvl.mods.push("drift");
      if(n>=4 && (idx%4===1)) lvl.mods.push("mirror");
      LEVELS.push(lvl);
      continue;
    }

    const u=easeOut((idx-10)/59);
    const diff=0.14+u*0.62;
    const lvl={
      idx, zone:z, num:idx+1, name:zone.name, diff, fam,
      hotLayers: Math.round(lerp(4, 7, u)),
      density: Math.round(lerp(5600, 6800, u)),
      speed: +(lerp(3.85, 5.4, u).toFixed(2)),
      warnDur: +(lerp(1.50, 1.20, u).toFixed(2)),
      orbSpeed: +(lerp(0.43, 0.55, u).toFixed(2)),
      firstDelay: +(lerp(4.6, 3.2, u).toFixed(2)),
      corruptGap: +(lerp(5.4, 3.8, u).toFixed(2)),
      tokensNeeded: n<4?2 : 3,
      tokenDelay: +(lerp(3.2, 5.8, u).toFixed(2)),
      tokenGap: +(lerp(3.6, 6.2, u).toFixed(2)),
      tokenLife: z>=5 ? +(lerp(10.5, 5.4, Math.max(0,(idx-50)/19)).toFixed(2)) : 0,
      timeLimit: n===9 ? Math.round(lerp(42, 52, u)) : 0,
      mods:[],
      motion: zone.motion==="mixed" ? (FAM_MOTION[fam]||"spin") : zone.motion,
    };
    if(n>=4 && ZONE_SIGN[z]) lvl.mods.push(ZONE_SIGN[z]);
    if(n>=8 && ZONE_SIGN[z-1]) lvl.mods.push(ZONE_SIGN[z-1]);
    LEVELS.push(lvl);
  }
}

/* export pour le jeu */
if(typeof module!=="undefined") module.exports={LEVELS,ZONES,FAMILIES,MODS,MOTIONS,FAMILIES_KEYS:Object.keys(FAMILIES)};
