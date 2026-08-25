/* POINT — sons + musique générative (WebAudio), zéro asset */
"use strict";
const Sfx=(()=>{
  let ac=null, master=null, mus=null, muted=false;

  function ctx(){
    if(!ac){
      try{
        ac=new (window.AudioContext||window.webkitAudioContext)();
        master=ac.createGain(); master.gain.value=0.5; master.connect(ac.destination);
        mus=ac.createGain(); mus.gain.value=0.85; mus.connect(master);
      }catch(_){ return null; }
    }
    if(ac.state==="suspended") ac.resume();
    return ac;
  }
  function tone(freq,dur,type="sine",vol=0.5,slide=0,dest){
    const a=ctx(); if(!a||muted) return;
    const o=a.createOscillator(), g=a.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,a.currentTime);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),a.currentTime+dur);
    g.gain.setValueAtTime(vol,a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+dur);
    o.connect(g); g.connect(dest||master);
    o.start(); o.stop(a.currentTime+dur+0.02);
  }

  /* ── musique générative : thump + basse + arpège pentatonique + nappe filtrée.
     L'intensité (0..1) ouvre le filtre, déclenche hats/arpèges et monte le volume.
     La tonalité suit la teinte de la zone. ── */
  const PENT=[0,3,5,7,10];
  const M={on:false,step:0,next:0,bpm:100,root:220,intensity:.4,chord:0,iv:null,
           prog:[0,3,-2,-4]};
  const nf=(deg,oct=0)=>M.root*Math.pow(2,(PENT[((deg%5)+5)%5]+12*(Math.floor(deg/5)+oct))/12);

  let nzBuf=null;
  function noiseSrc(){
    if(!nzBuf){ nzBuf=ac.createBuffer(1,(ac.sampleRate*.12)|0,ac.sampleRate);
      const d=nzBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; }
    const s=ac.createBufferSource(); s.buffer=nzBuf; s.loop=true; return s;
  }
  function env(t,v,a,d,dest){
    const g=ac.createGain();
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(v,t+a);
    g.gain.exponentialRampToValueAtTime(0.0001,t+a+d);
    g.connect(dest||mus); return g;
  }
  function thump(t,v){
    const o=ac.createOscillator(); o.type="sine";
    o.frequency.setValueAtTime(130,t); o.frequency.exponentialRampToValueAtTime(44,t+.11);
    o.connect(env(t,.5*v,.002,.17)); o.start(t); o.stop(t+.21);
  }
  function hat(t,v,dest){
    const s=noiseSrc(), f=ac.createBiquadFilter();
    f.type="highpass"; f.frequency.value=6500;
    s.connect(f); f.connect(env(t,v,.001,.05,dest)); s.start(t); s.stop(t+.07);
  }
  function bassN(t,f){
    const o=ac.createOscillator(); o.type="triangle"; o.frequency.value=f;
    const lp=ac.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=340;
    o.connect(lp); lp.connect(env(t,.23,.004,.21)); o.start(t); o.stop(t+.25);
  }
  function pluck(t,f,v){
    const o=ac.createOscillator(); o.type="square"; o.frequency.value=f;
    const hp=ac.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=480;
    o.connect(hp); hp.connect(env(t,v,.002,.12)); o.start(t); o.stop(t+.15);
  }
  function pad(t,deg,dur){
    const I=M.intensity;
    const lp=ac.createBiquadFilter(); lp.type="lowpass";
    lp.frequency.value=380+I*2500; lp.Q.value=.6;
    const g=ac.createGain(); const v=.045+.06*I;
    g.gain.setValueAtTime(0.0001,t);
    g.gain.linearRampToValueAtTime(v,t+.6);
    g.gain.setValueAtTime(v,t+Math.max(.7,dur-.5));
    g.gain.linearRampToValueAtTime(0.0001,t+dur+.4);
    lp.connect(g); g.connect(mus);
    [[1,"triangle",-5],[1.5,"sawtooth",-10],[2,"sine",-15]].forEach(([r,tp,det])=>{
      const o=ac.createOscillator(); o.type=tp; o.frequency.value=nf(deg)*r; o.detune.value=det;
      o.connect(lp); o.start(t); o.stop(t+dur+.5);
    });
  }
  function rampMus(to,dur){
    if(!mus||!ac) return;
    const g=mus.gain,n=ac.currentTime;
    g.cancelScheduledValues(n); g.setValueAtTime(Math.max(.0001,g.value),n);
    g.linearRampToValueAtTime(to,n+dur);
  }
  function sched(){
    if(!M.on||!ac) return;
    const sd=60/M.bpm/4;
    if(M.next<ac.currentTime-.2) M.next=ac.currentTime+.05;
    const ahead=ac.currentTime+.14;
    while(M.next<ahead){
      const s=M.step%16, I=M.intensity;
      if(s%8===0) thump(M.next,s===0?1:.72);
      if(I>.22&&s%2===1) hat(M.next,.03+.05*I);
      if([0,6,8,11].indexOf(s)>=0) bassN(M.next,nf(M.prog[M.chord],-1));
      if(I>.35&&s%2===0){
        const seq=[0,2,4,2,1,3,4,3], deg=M.prog[M.chord]+seq[(M.step>>1)%8];
        pluck(M.next,nf(deg,I>.7?1:0),.07+.05*I);
      }
      if(s===0){
        if(M.step%32===0) M.chord=(M.chord+1)%M.prog.length;
        if(M.step%32===0) pad(M.next,M.prog[M.chord],32*sd);
      }
      M.next+=sd; M.step++;
    }
  }

  return {
    unlock(){ ctx(); },
    token(){ tone(660,0.09,"triangle",0.35,240); },
    orb(){ tone(440,0.12,"sine",0.3); setTimeout(()=>tone(660,0.14,"sine",0.3),70); },
    pick(){ tone(520,0.1,"square",0.18); },
    hit(){ tone(160,0.25,"sawtooth",0.5,-90); },
    over(){ [330,262,196].forEach((f,i)=>setTimeout(()=>tone(f,0.28,"triangle",0.4),i*130)); },
    win(){ [392,523,659,784].forEach((f,i)=>setTimeout(()=>tone(f,0.22,"triangle",0.35),i*110)); },
    wave(){ tone(880,0.12,"sine",0.22,120); },
    tick(){ tone(1150,0.035,"sine",0.05,-300); },
    near(k){
      const a=ctx(); if(!a||muted) return;
      tone(560+900*k,0.11,"sine",0.13+0.22*k,260);
      hat(a.currentTime,0.09+0.12*k,master);
    },
    corrupt(){
      const a=ctx(); if(!a||muted) return;
      tone(70,0.5,"sawtooth",0.22,25);
      tone(210,0.35,"triangle",0.12,60);
    },
    warn(){
      const a=ctx(); if(!a||muted) return;
      tone(880,0.08,"sine",0.10,-180);
      setTimeout(()=>{ if(!muted) tone(720,0.07,"sine",0.08,-140); },110);
    },
    music:{
      start(){
        const a=ctx(); if(!a||muted) return;
        M.on=true; M.next=a.currentTime+.06;
        rampMus(0.85,.3);
        if(!M.iv) M.iv=setInterval(sched,42);
      },
      stop(){
        M.on=false;
        if(M.iv){ clearInterval(M.iv); M.iv=null; }
        rampMus(0.0001,.4);
      },
      setPaused(p){ rampMus(p?0.0001:0.85,.25); },
      duck(){ if(!ac||!mus) return; rampMus(0.25,.05); setTimeout(()=>{ if(M.on) rampMus(0.85,.4); },420); },
      setZone(hue){
        const ROOTS=[220,196,174.61,164.81,146.83];
        M.root=ROOTS[(hue/51|0)%ROOTS.length];
      },
      setIntensity(x){ M.intensity=Math.max(0,Math.min(1,x)); },
      pulse(){
        if(!ac||!M.on) return 0;
        const ph=(ac.currentTime*M.bpm/60)%1;
        return Math.max(0,1-ph*1.6);
      }
    },
    setMuted(m){
      muted=m;
      try{ localStorage.setItem("point_mute",m?"1":"0"); }catch(_){}
      if(mus&&ac){ const g=mus.gain,n=ac.currentTime;
        g.cancelScheduledValues(n); g.setValueAtTime(m?0.0001:0.85,n); }
      if(!m&&M.on) Sfx.music.start();
    },
    get muted(){ return muted; },
    loadMuted(){ try{ muted=localStorage.getItem("point_mute")==="1"; }catch(_){} return muted; }
  };
})();
