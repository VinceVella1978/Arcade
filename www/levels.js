/* ══════════════════════════════════════════════════════════════
   POINT — campagne 70 niveaux
   Chaque niveau = (formule de base, modificateurs, objectifs).
   La formule dweet est le "génome" ; les mods la déforment.
   ══════════════════════════════════════════════════════════════ */
"use strict";

const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;

/* ── familles de formules (le génome) ──
   Chaque famille renvoie une fonction (i, t, P) -> [x, y] dans un repère
   centré, unité = arène (rayon ~1). Le moteur applique ensuite zoom/rotation. */
const FAMILIES={
  classic:{ /* l'originale — courbes de Lissajous plissées */
    label:"CLASSIQUE",
    make:P=>(i,t)=>{
      const m=(i%P.layers)*P.spread;
      const k=P.amp*Math.cos(i*P.fa)*Math.sin(i*P.fb);
      const e=Math.cos(i*P.fc)*Math.cos(i*P.fd)*P.amp;
      const g=Math.hypot(k,e);
      const d=g*g*g/P.scale+1.5-Math.pow(Math.sin(t/2+m),3)/P.breath;
      if(d<=0) return null;
      const c=d/P.swirl-t/P.spin+m;
      const p=Math.pow(d,Math.sin(d*d-t+m));
      return [P.ring*Math.sin(c)+k*p, P.ring*Math.sin(c*P.harm)+e*p];
    }
  },
  rose:{ /* rosace : pétales tournants */
    label:"ROSACE",
    gain:120,
    make:P=>(i,t)=>{
      const petals=P.fa|0, off=(i%P.layers)*0.13;
      const u=i*0.618034%1, ph=u*6.2832;
      const rr=Math.abs(Math.sin(petals*(ph+t*0.21+off)))*(0.55+0.45*Math.sin(t*0.5+i));
      const a=ph+t/(P.spin||40);
      return [rr*Math.cos(a), rr*Math.sin(a)];
    }
  },
  vortex:{ /* spirale double sens */
    label:"VORTEX",
    gain:115,
    make:P=>(i,t)=>{
      const u=(i*0.618034)%1, arm=i%2?Math.PI:0;
      const ang=u*11+t*(0.5+(i%P.layers)*0.05)+arm;
      const r=0.15+u*0.95-0.12*Math.sin(t*0.8+i);
      return [r*Math.cos(ang), r*Math.sin(ang)];
    }
  },
  swarm:{ /* nuée : chaque point chaud a sa propre orbite couvrant l'arène.
             Garantit une menace répartie sur tout l'écran à tout instant. */
    label:"NUÉE",
    make:P=>(i,t)=>{
      const hot=(i%P.layers)<P.hotLayers;   // couches chaudes = orbites agressives
      const l=i%P.layers;
      const r1=hot?1:0.55,                  // rayon max des chaudes
            w1=hot?1.6+((l*37)%23)/23:0.5,  // vitesse angulaire propre
            ph1=(l*2.39996)%6.283,
            ph2=((l*97)%211)/211*6.283;
      const x=r1*Math.sin(w1*t+ph1)+(hot?0:0.3*Math.sin(t*0.7+i));
      const y=r1*Math.sin(w1*t*1.31+ph2);
      return [x,y];
    }
  },
  weave:{ /* tresses tournantes */
    label:"TRESSE",
    gain:125,
    make:P=>(i,t)=>{
      const l=i%P.layers, u=(i/P.layers)%1;
      const ang=u*6.2832+t*0.35+l*(6.2832/P.layers);
      const r=0.42+0.34*Math.sin(u*12.566+l*1.7+t*0.7);
      return [r*Math.cos(ang), r*Math.sin(ang)];
    }
  },
  pulse:{ /* coquillages pulsants */
    label:"PULSAR",
    gain:118,
    make:P=>(i,t)=>{
      const l=i%P.layers, ph=l/(P.layers||16)*6.2832;
      const b=0.5+0.5*Math.sin(t*1.4+ph*2);
      const ang=i*2.39996+t*0.22;
      const r=(0.12+0.88*b)*(0.35+0.65*((i*0.618)%1));
      return [r*Math.cos(ang), r*Math.sin(ang)];
    }
  },
};

/* ── modificateurs par niveau ── */
const MODS={
  none:   {label:"", desc:""},
  drift:  {label:"DÉRIVE", desc:"le motif glisse latéralement"},
  mirror: {label:"MIROIR", desc:"la moitié du motif est inversée périodiquement"},
  blink:  {label:"CLIGNOTANT", desc:"des brins s'éteignent et se rallument"},
  storm:  {label:"ORAGE", desc:"secousses aléatoires du motif"},
  gravity:{label:"MARÉE", desc:"le vaisseau est tiré vers le centre"},
  shrink: {label:"ÉTRANGLEMENT", desc:"la zone sûre rétrécit puis reprend"},
};
function applyMods(x,y,i,t,st){
  if(st.mods.includes("drift")){
    x+=Math.sin(t*0.4+i*0.01)*0.06; y+=Math.cos(t*0.31)*0.05;
  }
  if(st.mods.includes("mirror") && ((t%8)<2.4)){
    if(((i*2654435761)>>>28)%2) x=-x;
  }
  return [x,y];
}

/* ── génération des 70 niveaux ──
   7 zones × 10 niveaux. Difficulté = f(index global). */
const ZONES=[
  {name:"ÉVEIL",       fam:"classic", hue:200},
  {name:"ROSACE",      fam:"rose",    hue:280},
  {name:"VORTEX",      fam:"vortex",  hue:180},
  {name:"TRESSE",      fam:"weave",   hue:330},
  {name:"PULSAR",      fam:"pulse",   hue:150},
  {name:"CHAOS",       fam:"mixed",   hue:20},
  {name:"SINGULARITÉ", fam:"mixed",   hue:0},
];

const LEVELS=[];
for(let z=0;z<7;z++){
  for(let n=0;n<10;n++){
    const idx=z*10+n;              // 0..69
    const diff=idx/69;             // 0..1
    const zone=ZONES[z];
    const lvl={
      idx, zone:z, num:idx+1,
      name:zone.name,
      diff,
      fam: zone.fam==="mixed" ? ["classic","rose","vortex","weave","pulse"][idx%5] : zone.fam,
      speed: lerp(3.2,8.5,diff),
      density: Math.round(lerp(5200,8600,diff)),
      hotLayers: Math.round(lerp(3,12,diff)),
      warnDur: +(lerp(1.65, 0.9, diff).toFixed(2)),
      tokensNeeded: n<3?2 : n<7?3 : 4,
      timeLimit: n===9 ? 45+Math.round(diff*30) : 0,
      mods:[],
    };
    if(n>=2 && (idx%3===0)) lvl.mods.push("drift");
    if(n>=4 && (idx%4===1)) lvl.mods.push("mirror");
    if(n>=5 && (idx%5===2)) lvl.mods.push("blink");
    if(n>=6 && diff>0.55)   lvl.mods.push("storm");
    if(n>=7 && diff>0.6)    lvl.mods.push("gravity");
    if(n>=8 && diff>0.72)   lvl.mods.push("shrink");
    LEVELS.push(lvl);
  }
}

/* export pour le jeu */
if(typeof module!=="undefined") module.exports={LEVELS,ZONES,FAMILIES,MODS,FAMILIES_KEYS:Object.keys(FAMILIES)};
