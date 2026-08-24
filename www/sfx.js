/* POINT — sons synthétisés (WebAudio), zéro asset */
"use strict";
const Sfx=(()=>{
  let ac=null, master=null, muted=false;
  function ctx(){
    if(!ac){
      try{
        ac=new (window.AudioContext||window.webkitAudioContext)();
        master=ac.createGain(); master.gain.value=0.5; master.connect(ac.destination);
      }catch(_){ return null; }
    }
    if(ac.state==="suspended") ac.resume();
    return ac;
  }
  function tone(freq,dur,type="sine",vol=0.5,slide=0){
    const a=ctx(); if(!a||muted) return;
    const o=a.createOscillator(), g=a.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,a.currentTime);
    if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30,freq+slide),a.currentTime+dur);
    g.gain.setValueAtTime(vol,a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001,a.currentTime+dur);
    o.connect(g); g.connect(master);
    o.start(); o.stop(a.currentTime+dur+0.02);
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
    setMuted(m){ muted=m; try{ localStorage.setItem("point_mute",m?"1":"0"); }catch(_){}} ,
    get muted(){ return muted; },
    loadMuted(){ try{ muted=localStorage.getItem("point_mute")==="1"; }catch(_){} return muted; }
  };
})();
