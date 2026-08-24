/* Génère les icônes PNG de la PWA à partir d'un canvas Node.
   Usage : node tools/gen-icons.js   (dépend de zbar-png via npm i) */
let zlib;
try { zlib = require("zlib"); } catch(_) {}
const fs = require("fs");
const path = require("path");

function crc32(buf){
  let table = crc32.table;
  if(!table){
    table = crc32.table = new Int32Array(256);
    for(let n=0;n<256;n++){
      let c=n;
      for(let k=0;k<8;k++) c = c&1 ? 0xEDB88320 ^ (c>>>1) : c>>>1;
      table[n]=c;
    }
  }
  let c = -1;
  for(let i=0;i<buf.length;i++) c = table[(c^buf[i])&0xFF] ^ (c>>>8);
  return (c^-1)>>>0;
}
function chunk(type, data){
  const len=Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td=Buffer.concat([Buffer.from(type),data]);
  const crc=Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len,td,crc]);
}
function png(w,h,rgba){
  const sig=Buffer.from([137,80,78,71,13,10,26,10]);
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4);
  ihdr[8]=8; ihdr[9]=6; /* 8-bit RGBA */
  const raw=Buffer.alloc((w*4+1)*h);
  for(let y=0;y<h;y++){
    raw[y*(w*4+1)]=0; /* filtre none */
    rgba.copy(raw,y*(w*4+1)+1,y*w*4,(y+1)*w*4);
  }
  return Buffer.concat([sig,
    chunk("IHDR",ihdr),
    chunk("IDAT",zlib.deflateSync(raw,{level:9})),
    chunk("IEND",Buffer.alloc(0))]);
}

/* dessin logiciel dans un Float32Array RGBA */
function canvas(S){
  const px=new Float32Array(S*S*4);
  const blend=(x,y,r,g,b,a)=>{
    if(x<0||y<0||x>=S||y>=S||a<=0) return;
    const o=(y*S+x)*4;
    px[o]+=(r-px[o])*a; px[o+1]+=(g-px[o+1])*a;
    px[o+2]+=(b-px[o+2])*a; px[o+3]+=(px[o+3]===0&&a>0?a:Math.max(px[o+3],a));
  };
  return { S, px, blend };
}
function dot(cv,x,y,sz,r,g,b,al){
  for(let dy=0;dy<sz;dy++) for(let dx=0;dx<sz;dx++)
    cv.blend((x|0)-(sz>>1)+dx,(y|0)-(sz>>1)+dy,r,g,b,al);
}
function line(cv,x0,y0,x1,y1,w,r,g,b,al){
  const n=Math.max(2,Math.ceil(Math.hypot(x1-x0,y1-y0)));
  for(let j=0;j<=n;j++){
    const x=x0+(x1-x0)*j/n, y=y0+(y1-y0)*j/n;
    dot(cv,x,y,w,r,g,b,al);
  }
}
/* losange plein */
function diamond(cv,cx,cy,r,w,col,al){
  line(cv,cx,cy-r,cx+r*.72,cy,w,...col,al);
  line(cv,cx+r*.72,cy,cx,cy+r,w,...col,al);
  line(cv,cx,cy+r,cx-r*.72,cy,w,...col,al);
  line(cv,cx-r*.72,cy,cx,cy-r,w,...col,al);
}
/* hexagone vert + delta, comme l'orb du jeu */
function hexagon(cv,cx,cy,r,w){
  let px=cx+Math.cos(-Math.PI/2)*r, py=cy+Math.sin(-Math.PI/2)*r;
  for(let j=1;j<=6;j++){
    const a=-Math.PI/2+j*Math.PI/3;
    const nx=cx+Math.cos(a)*r, ny=cy+Math.sin(a)*r;
    line(cv,px,py,nx,ny,w,95,230,138,.95);
    px=nx; py=ny;
  }
  line(cv,cx,cy-r*.44,cx+r*.42,cy+r*.32,w*.8,255,255,255,.9);
  line(cv,cx+r*.42,cy+r*.32,cx-r*.42,cy+r*.32,w*.8,255,255,255,.9);
  line(cv,cx-r*.42,cy+r*.32,cx,cy-r*.44,w*.8,255,255,255,.9);
}
/* motif : brins inspirés de la formule du jeu */
function strands(cv,S,t){
  const cx=S/2, cy=S/2, sc=S/300;
  const amp=9,fa=5,fc=3,fd=2,scale=1999,swirl=16,ring=99,harm=4,spin=48,breath=3,layers=16,spread=13;
  const n=Math.round(2600*(S/512));
  for(let i=n;i--;){
    const m=(i%layers)*spread;
    const k=amp*Math.cos(i*fa);
    const e=Math.cos(i*fc)*Math.cos(i*fd)*amp;
    const g=Math.hypot(k,e);
    const d=g*g*g/scale+1.5-Math.pow(Math.sin(t/2+m),3)/breath;
    if(d<=0) continue;
    const c=d/swirl-t/spin+m;
    const p=Math.pow(d,Math.sin(d*d-t+m));
    const X=cx+sc*(ring*Math.sin(c)+k*p), Y=cy+sc*(ring*Math.sin(c*harm)+e*p);
    const hot=(i%layers)%5===0;
    hot ? dot(cv,X,Y,3,95,211,255,.85) : dot(cv,X,Y,1.4,233,231,240,.34);
  }
}
function render(S,t,fadeBg){
  const cv=canvas(S);
  if(fadeBg){ /* fond radial léger pour le maskable */
    for(let y=0;y<S;y++) for(let x=0;x<S;x++){
      const dx=(x-S/2)/(S/2), dy=(y-S/2)/(S/2), q=Math.hypot(dx,dy);
      cv.blend(x,y,7,7,12,Math.max(0,1-q*.9));
    }
  } else {
    for(let i=0;i<cv.px.length;i+=4){ cv.px[i]=5;cv.px[i+1]=5;cv.px[i+2]=6;cv.px[i+3]=255; }
  }
  strands(cv,S,t);
  return cv;
}
function toPng(cv){
  const {S,px}=cv, out=Buffer.alloc(S*S*4);
  for(let i=0;i<px.length;i++) out[i]=Math.max(0,Math.min(255,Math.round(px[i])));
  return png(S,S,out);
}

const outDir=path.join(__dirname,"..","www","icons");
fs.mkdirSync(outDir,{recursive:true});

for(const [S,file] of [[192,"icon-192.png"],[512,"icon-512.png"],[180,"apple-touch-icon.png"]]){
  const cv=render(S,3.2,false);
  const r=S*0.30, w=Math.max(2,Math.round(S*0.022));
  diamond(cv,S/2,S/2,r,w,[255,180,84],.98);
  dot(cv,S/2,S/2,Math.max(3,Math.round(S*0.03)),255,255,255,1);
  hexagon(cv,S*0.74,S*0.26,S*0.11,w*0.8);
  fs.writeFileSync(path.join(outDir,file),toPng(cv));
  console.log("ok",file);
}
{ /* maskable : motif réduit, zone sûre 80 % */
  const S=512, cv=render(S,3.2,true);
  const r=S*0.20;
  diamond(cv,S/2,S/2,r,Math.round(S*0.02),[255,180,84],.98);
  dot(cv,S/2,S/2,Math.round(S*0.03),255,255,255,1);
  fs.writeFileSync(path.join(outDir,"maskable-512.png"),toPng(cv));
  console.log("ok maskable-512.png");
}

/* ── sources pour @capacitor/assets (ios/ + android/) ── */
fs.mkdirSync(path.join(__dirname,"..","assets"),{recursive:true});
{
  /* icône transparente, le fond est posé par capacitor/assets */
  const S=1024, cv=canvas(S);
  strands(cv,S,3.2);
  const r=S*0.26, w=Math.max(4,Math.round(S*0.02));
  diamond(cv,S/2,S/2,r,w,[255,180,84],1);
  dot(cv,S/2,S/2,Math.max(8,Math.round(S*0.03)),255,255,255,1);
  hexagon(cv,S*0.75,S*0.25,S*0.10,w*0.8);
  fs.writeFileSync(path.join(__dirname,"..","assets","icon-only.png"),toPng(cv));
  console.log("ok assets/icon-only.png");

  /* splash 2732² : motif centré, le titre reste en vectoriel côté OS */
  const L=2732, sp=canvas(L);
  for(let i=0;i<sp.px.length;i+=4){ sp.px[i]=5;sp.px[i+1]=5;sp.px[i+2]=6;sp.px[i+3]=255; }
  strands(sp,L,3.2);
  diamond(sp,L/2,L/2,L*0.13,Math.round(L*0.006),[255,180,84],1);
  dot(sp,L/2,L/2,Math.round(L*0.009),255,255,255,1);
  fs.writeFileSync(path.join(__dirname,"..","assets","splash.png"),toPng(sp));
  console.log("ok assets/splash.png");
}
