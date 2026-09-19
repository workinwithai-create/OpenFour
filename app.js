const CDN = "https://cdn.jsdelivr.net/gh/workinwithai-create/PreEight@main/public/samples";
const STEPS = 16;
const OPEN = 4;
const VERSE = 8;
const TOTAL = OPEN + VERSE;

const recipes = [
  { id:"walk-in", name:"Walk in", blurb:"Upright walks roots into the verse tonic. Kit stays sparse." },
  { id:"kit-establish", name:"Kit establish", blurb:"Kick on 1, snare on 3 of bar 4. Hats closed until verse." },
  { id:"nylon-door", name:"Nylon door", blurb:"Nylon plays a short figure that yields on the verse downbeat." },
  { id:"piano-door", name:"Piano door", blurb:"Piano voicings open, then thin so the verse has room." },
  { id:"bass-root", name:"Bass root", blurb:"Upright holds the tonic. No walk. Space is the point." },
  { id:"hat-open", name:"Hat open", blurb:"Closed hats die on bar 4. Open hat on the last eighth." },
  { id:"brass-call", name:"Brass call", blurb:"Trumpet on bar 3, then silence. The verse answers." },
  { id:"violin-hold", name:"Violin hold", blurb:"Violin sustains the 5, resolves into the verse root." },
  { id:"half-hush", name:"Half hush", blurb:"Half-time pocket for two bars, then full pocket on 3–4." },
  { id:"stop-hit", name:"Stop hit", blurb:"Bar 4 is air until beat 4. Verse lands on the next 1." }
];

function bar(symbol, piano, guitar, bass){ return { symbol, piano, guitar, bass }; }

const grooves = [
  { id:"amber", name:"Amber Walk", bpm:98, key:"A minor",
    open:[bar("Am",[45,48,52,57],[45,52,57],33),bar("F",[41,45,48,53],[41,48,53],41),bar("G",[43,47,50,55],[43,47,50],31),bar("Am",[45,48,52,57],[45,52,57],33)],
    verse:[bar("Am",[45,48,52,57],[45,52,57],33),bar("F",[41,45,48,53],[41,48,53],41),bar("C",[48,52,55,60],[48,52,55],36),bar("G",[43,47,50,55],[43,47,50],31),bar("Am",[45,48,52,57],[45,52,57],33),bar("F",[41,45,48,53],[41,48,53],41),bar("C",[48,52,55,60],[48,52,55],36),bar("G",[43,47,50,55],[43,47,50],31)] },
  { id:"porch", name:"Porch Climb", bpm:86, key:"E major",
    open:[bar("E",[40,44,47,52],[40,47,52],28),bar("B",[35,39,42,47],[35,42,47],23),bar("A",[33,37,40,45],[33,40,45],33),bar("E",[40,44,47,52],[40,47,52],28)],
    verse:[bar("E",[40,44,47,52],[40,47,52],28),bar("B",[35,39,42,47],[35,42,47],23),bar("C#m",[44,47,51,56],[44,51,56],32),bar("A",[33,37,40,45],[33,40,45],33),bar("E",[40,44,47,52],[40,47,52],28),bar("B",[35,39,42,47],[35,42,47],23),bar("C#m",[44,47,51,56],[44,51,56],32),bar("A",[33,37,40,45],[33,40,45],33)] },
  { id:"fold", name:"Fold Radio", bpm:104, key:"D minor",
    open:[bar("Dm",[38,41,45,50],[38,45,50],26),bar("Bb",[34,38,41,46],[34,41,46],34),bar("C",[36,40,43,48],[36,43,48],24),bar("Dm",[38,41,45,50],[38,45,50],26)],
    verse:[bar("Dm",[38,41,45,50],[38,45,50],26),bar("Bb",[34,38,41,46],[34,41,46],34),bar("F",[41,45,48,53],[41,48,53],29),bar("C",[36,40,43,48],[36,43,48],24),bar("Dm",[38,41,45,50],[38,45,50],26),bar("Bb",[34,38,41,46],[34,41,46],34),bar("F",[41,45,48,53],[41,48,53],29),bar("C",[36,40,43,48],[36,43,48],24)] }
];

const state = { groove: grooves[0], recipe: recipes[0], playing:false, bar:0, mode:null };
let ctx, bus, buffers = {};

async function load() {
  ctx = new AudioContext();
  bus = ctx.createGain(); bus.gain.value = 0.35; bus.connect(ctx.destination);
  const files = [
    ["kick",`${CDN}/drums/kick.mp3`],["snare",`${CDN}/drums/snare.mp3`],["hat",`${CDN}/drums/hihat.mp3`],["crash",`${CDN}/drums/crash.mp3`],
    ["pC3",`${CDN}/piano/C3.mp3`],["pC4",`${CDN}/piano/C4.mp3`],["pA3",`${CDN}/piano/A3.mp3`],
    ["bE1",`${CDN}/bass/E1.mp3`],["bA1",`${CDN}/bass/A1.mp3`],["bC2",`${CDN}/bass/C2.mp3`],
    ["gE2",`${CDN}/guitar/E2.mp3`],["gA2",`${CDN}/guitar/A2.mp3`],["gE3",`${CDN}/guitar/E3.mp3`],
    ["tC4",`${CDN}/trumpet/C4.mp3`],["vA3",`${CDN}/violin/A3.mp3`]
  ];
  let n=0;
  for (const [k,url] of files) {
    try { const r = await fetch(url); buffers[k] = await ctx.decodeAudioData(await r.arrayBuffer()); } catch (e) { console.warn(k, e); }
    n++; document.getElementById("status").textContent = `Seating chairs ${n}/${files.length}`;
  }
  document.getElementById("status").textContent = "Chairs seated · live FluidR3 + kit";
}

function playBuf(name, when, rate=1, gain=0.4) {
  const b = buffers[name]; if (!b || !ctx) return;
  const src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain; src.connect(g); g.connect(bus); src.start(when);
}

function rateFromMidi(midi, baseMidi){ return Math.pow(2, (midi-baseMidi)/12); }

function chordAt(i){
  if (i < OPEN) return state.groove.open[i];
  return state.groove.verse[i - OPEN];
}

function scheduleBar(barIndex, t0, stepDur){
  const ch = chordAt(barIndex);
  const onOpen = barIndex < OPEN;
  const rec = state.recipe.id;

  for (let s=0; s<STEPS; s++){
    const when = t0 + s*stepDur;

    // Kit
    if (rec === "half-hush" && onOpen && barIndex < 2) {
      if (s === 0) playBuf("kick", when, 1, 0.55);
      if (s === 8) playBuf("snare", when, 1, 0.35);
    } else if (rec === "stop-hit" && onOpen && barIndex === 3) {
      if (s === 12) playBuf("kick", when, 1, 0.6);
    } else if (rec === "kit-establish" && onOpen) {
      if (s === 0) playBuf("kick", when, 1, 0.65);
      if (s === 8 && barIndex === 3) playBuf("snare", when, 1, 0.5);
      if (s % 2 === 0) playBuf("hat", when, 1, 0.05);
    } else {
      if (s % 2 === 0) playBuf("hat", when, 1, (onOpen && rec === "hat-open" && barIndex === 3) ? 0.03 : 0.07);
      if (s === 0) playBuf("kick", when, 1, 0.7);
      if (s === 8) playBuf("snare", when, 1, 0.45);
    }

    if (rec === "hat-open" && onOpen && barIndex === 3 && s === 14) {
      playBuf("hat", when, 1, 0.18);
    }

    // Chords on downbeat
    if (s === 0) {
      const pianoGain = (rec === "piano-door" && onOpen) ? 0.32 : 0.26;
      playBuf("pC4", when, rateFromMidi(ch.piano[2]||60, 60), pianoGain);
      playBuf("pA3", when, rateFromMidi(ch.piano[1]||57, 57), 0.2);

      let bassGain = 0.45;
      if (rec === "bass-root" && onOpen) bassGain = 0.55;
      if (rec === "walk-in" && onOpen) bassGain = 0.5;
      playBuf("bA1", when, rateFromMidi(ch.bass, 33), bassGain);

      const nylonGain = (rec === "nylon-door" && onOpen) ? 0.3 : 0.2;
      playBuf("gA2", when, rateFromMidi(ch.guitar[0]||45, 45), nylonGain);
    }

    // Recipe-specific colour
    if (onOpen && rec === "brass-call" && barIndex === 2 && (s === 0 || s === 8)) {
      playBuf("tC4", when, rateFromMidi(ch.piano[3]||69, 60), 0.32);
    }
    if (onOpen && rec === "violin-hold" && s === 0) {
      playBuf("vA3", when, rateFromMidi(ch.piano[2]||60, 57), 0.16);
    }
    if (onOpen && rec === "nylon-door" && barIndex === 3 && s === 8) {
      playBuf("gE3", when, rateFromMidi((ch.guitar[0]||45)+7, 52), 0.25);
    }
  }
}

let timer = null;
function stop(){
  state.playing = false;
  state.mode = null;
  if (timer) clearTimeout(timer);
  timer = null;
  paintBars();
}

async function play(mode){
  if (!ctx) await load();
  if (ctx.state === "suspended") await ctx.resume();
  stop();
  state.playing = true;
  state.mode = mode;

  let startBar = 0;
  let endBar = TOTAL;
  if (mode === "loop") { startBar = OPEN; endBar = TOTAL; }
  if (mode === "four") { startBar = 0; endBar = OPEN; }

  const stepDur = 60 / state.groove.bpm / 4;
  let barIndex = startBar;

  const tick = () => {
    if (!state.playing) return;
    if (barIndex >= endBar) {
      if (mode === "loop") barIndex = startBar;
      else { stop(); return; }
    }
    state.bar = barIndex;
    paintBars();
    scheduleBar(barIndex, ctx.currentTime + 0.02, stepDur);
    barIndex += 1;
    timer = setTimeout(tick, STEPS * stepDur * 1000);
  };
  tick();
}

function punch(){
  const g = state.groove, r = state.recipe;
  return `OpenFour punch list\n${g.name} · ${g.bpm} BPM · ${g.key} · ${r.name}\n\nThe problem: generators dump straight into the first verse. No walk-in, no door.\nThe move: ${r.blurb}\n\nOpen (bars 1-4) — ${r.name}\n${g.open.map((b,i)=>`  ${i+1}. ${b.symbol}`).join("\n")}\n\nVerse (bars 5-12)\n${g.verse.map((b,i)=>`  ${i+5}. ${b.symbol}`).join("\n")}\n\nLive chairs only (FluidR3 piano, upright, nylon, kit, trumpet, violin).\nDistinct from PreEight (pre-chorus climb), LiftTwo (pre-hook lift), TagFour (last-line tag), AfterHook, EndEight, LastHook, ChickFour.\nDrop the open WAV on bars 1-4. Verse starts on 5. Do not loop the open.`;
}

function paintGrooves(){
  const el = document.getElementById("grooves");
  el.innerHTML = "";
  grooves.forEach(g => {
    const b = document.createElement("button");
    b.className = "card" + (state.groove.id === g.id ? " on" : "");
    b.innerHTML = `<b>${g.name}</b><span>${g.bpm} BPM · ${g.key}</span>`;
    b.onclick = () => { state.groove = g; render(); };
    el.appendChild(b);
  });
}

function paintRecipes(){
  const el = document.getElementById("recipes");
  el.innerHTML = "";
  recipes.forEach(r => {
    const b = document.createElement("button");
    b.className = "card" + (state.recipe.id === r.id ? " on" : "");
    b.innerHTML = `<b>${r.name}</b><span>${r.blurb}</span>`;
    b.onclick = () => { state.recipe = r; render(); };
    el.appendChild(b);
  });
}

function paintBars(){
  const el = document.getElementById("bars");
  el.innerHTML = "";
  for (let i = 0; i < TOTAL; i++) {
    const ch = chordAt(i);
    const d = document.createElement("div");
    d.className = "bar" + (i < OPEN ? " open" : "") + (state.playing && state.bar === i ? " active" : "");
    d.innerHTML = `<div class="n">${i+1} · ${i < OPEN ? "O" : "V"}</div><div class="c">${ch.symbol}</div>`;
    el.appendChild(d);
  }
}

function render(){
  paintGrooves();
  paintRecipes();
  paintBars();
  document.getElementById("punch").textContent = punch();
}

document.getElementById("playA").onclick = () => play("loop");
document.getElementById("playB").onclick = () => play("cut");
document.getElementById("play4").onclick = () => play("four");
document.getElementById("stop").onclick = stop;
document.getElementById("copy").onclick = () => navigator.clipboard.writeText(punch());

render();
load();
