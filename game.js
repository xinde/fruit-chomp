import {createScene, departure} from "./scene.js";
import {loadModel, readExpression} from "./camera.js";
import "./offline.js";

const $ = id => document.getElementById(id);
const stage=$("stage"), canvas=$("world"), video=$("video");
const scene=createScene(canvas);
const duration=60;
let state="home", mode="practice", session=0, stream=null, detector=null;
let lastFrame=0, lastVideo=-1, lastDetection=0, lastSeen=-Infinity, alignedSince=0;
let score=0, streak=0, hits=0, elapsed=0, item=null, itemAge=0, nextItem=0;
let mouth=false, armed=false, latched=false, keyUntil=0;
let aim=.5, wink=0, winkSince=0;
const heldKeys=new Set();
let frameRequest=0, audio;
function stored(key,fallback) {try{return localStorage.getItem(key)??fallback;}catch{return fallback;}}
function save(key,value){try{localStorage.setItem(key,String(value));}catch{}}
let best=Number(stored("fruit-chomp.best",0))||0;
let sound=stored("fruit-chomp.sound","on")==="on";
const digits=value=>value<0?"−"+String(-value).padStart(3,"0"):String(value).padStart(4,"0");
function hud() {
  const values = { score: digits(score), combo: "×"+streak, seconds: String(Math.max(0,Math.ceil(duration-elapsed))), best: digits(best) };
  for (const [id, value] of Object.entries(values)) {
    const el = $(id);
    if (el.textContent !== value) el.textContent = value;
  }
}
function soundLabel() {
  $("sound").querySelector("use").setAttribute("href",sound?"#volume":"#mute");
  $("sound").querySelector("span").textContent=sound?"音效开":"音效关";
  $("sound").setAttribute("aria-label",sound?"关闭音效":"开启音效");
  $("sound").setAttribute("aria-pressed",String(sound));
}
function unlockSound() {
  if (!sound) return;
  try {audio??=new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});}catch{}
}
function chirp(pitch,length=.1,delay=0,type="triangle") {
  if (!sound || !audio || audio.state!=="running") return;
  const at=audio.currentTime+delay;
  const osc=audio.createOscillator(),gain=audio.createGain();
  osc.type=type;osc.frequency.setValueAtTime(pitch,at);osc.frequency.exponentialRampToValueAtTime(pitch*.76,at+length);
  gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.07,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+length);
  osc.connect(gain);gain.connect(audio.destination);osc.start(at);osc.stop(at+length+.01);
}
$("sound").onclick=()=>{sound=!sound;save("fruit-chomp.sound",sound?"on":"off");soundLabel();unlockSound();chirp(500);};
function hint(text="") {
  const el=$("hint");if(el.textContent!==text)el.textContent=text;el.hidden=!text;
}
function panel(title,text,actions) {
  $("panel-title").textContent=title;$("panel-text").textContent=text;
  const buttons=actions.map(([label,fn,primary])=>{
    const el=document.createElement("button");el.className=primary?"primary":"practice";el.textContent=label;el.onclick=fn;return el;
  });
  $("panel-actions").replaceChildren(...buttons);$("overlay").hidden=false;
  buttons[0]?.focus({preventScroll:true});
}
function switchState(value,status) {
  state=value;stage.dataset.view=value;
  document.body.classList.toggle("game-focus",value!=="home");$("status").textContent=status;
  $("overlay").hidden=true;$("pause-button").hidden=!(value==="playing"||value==="align");
  hint();
}
function stopCamera() {
  if (stream) for (const track of stream.getTracks()) {track.onended=null;track.stop();}
  stream=null;video.pause();video.srcObject=null;stage.classList.remove("show-video");
}
function invalidate() {
  session++;cancelAnimationFrame(frameRequest);stopCamera();scene.reset();
}
function home() {
  invalidate();score=streak=elapsed=0;hud();switchState("home","等待开始");$("start").focus({preventScroll:true});
}
function fail(error, returning=false) {
  invalidate();switchState("error","摄像头模式未启动");
  let message="识别资源未能启动。请检查首次下载是否完成，或换用支持 WebGL 的浏览器。";
  if(error.name==="NotAllowedError"||error.name==="SecurityError")message="请在浏览器的网站设置中允许摄像头，再点重试。也可以先用屏幕或空格键试玩。";
  if(error.name==="NotFoundError"||error.name==="NotSupportedError")message="当前浏览器没有可用的摄像头。请用 Safari 或 Chrome 打开，或切到触屏试玩。";
  if(error.name==="NotReadableError"||error.name==="AbortError")message="摄像头已断开或正被其他应用占用。释放摄像头后可以重试。";
  const retry = returning ? () => activateCamera(true) : () => start("camera");
  const alternate = returning ? ["结束本局",finish] : ["免摄像头试玩",()=>start("practice")];
  panel("摄像头未就绪",message,[["重试",retry,true],alternate,["返回",home]]);
}
function resetSteering() {
  wink=0;winkSince=0;heldKeys.clear();
}
function prepareAlignment() {
  resetSteering();
  lastSeen=-Infinity;alignedSince=0;lastVideo=-1;lastDetection=0;mouth=false;armed=false;latched=false;
  switchState("align","正在定位面部");hint("面对镜头，轻轻合上嘴巴");
}
function beginFrames() {
  if(document.hidden){pause();return;}
  lastFrame=0;
  frameRequest=requestAnimationFrame(frame);
}
async function activateCamera(returning) {
  const ticket=++session;
  switchState("loading","正在开启前置摄像头");
  panel(returning?"恢复摄像头":"准备摄像头","请允许使用前置摄像头，然后面对镜头，轻轻合嘴。",[
    returning?["结束本局",finish]:["取消",home]
  ]);
  try {
    if(!navigator.mediaDevices?.getUserMedia)throw new DOMException("Camera unavailable","NotSupportedError");
    const incoming=await navigator.mediaDevices.getUserMedia({audio:false,video:{
      facingMode:{ideal:"user"},width:{ideal:640},height:{ideal:480},frameRate:{ideal:24,max:30}
    }});
    if(ticket!==session){incoming.getTracks().forEach(t=>t.stop());return;}
    stream=incoming;
    stream.getVideoTracks()[0].onended=()=>{
      if(ticket!==session)return;
      if(state==="loading")fail(new DOMException("Camera interrupted","AbortError"),returning);
      else pause();
    };
    stage.classList.add("show-video");
    video.muted=true;
    video.playsInline=true;
    video.srcObject=stream;
    await video.play();
    if(ticket!==session)return;
    detector=await loadModel();
    if(ticket!==session)return;
    prepareAlignment();
    beginFrames();
  } catch(error) {
    if(ticket===session)fail(error,returning);
  }
}
function start(input) {
  invalidate();unlockSound();mode=input;score=streak=hits=elapsed=0;aim=.5;resetSteering();
  item=null;itemAge=0;nextItem=0;keyUntil=0;mouth=latched=false;armed=false;hud();
  if(mode==="camera"){activateCamera(false);return;}
  switchState("playing","免摄像头试玩");hint("点水果瞄准并咬，或用方向键和空格");
  beginFrames();
}
function pause() {
  if(state!=="playing"&&state!=="align")return;
  resetSteering();cancelAnimationFrame(frameRequest);stopCamera();switchState("paused","已暂停");
  panel("游戏暂停","本局分数和剩余时间已保留。",[["继续游戏",resume,true],["结束本局",finish]]);
}
function resume() {
  if(state!=="paused")return;
  unlockSound();keyUntil=0;mouth=latched=false;armed=false;
  if(mode==="camera"){activateCamera(true);return;}
  switchState("playing","免摄像头试玩");
  beginFrames();
}
function finish() {
  invalidate();const record=score>best;
  if(record){best=score;save("fruit-chomp.best",best);}
  hud();switchState("done","本局结束");chirp(540,.14);chirp(740,.16,.13);
  panel(record?"刷新最高纪录！":"本局结束",score+" 分 · 吃掉 "+hits+" 个水果",[["再玩一次",()=>start(mode),true],["返回果园",home]]);
}
function readFace(now) {
  if(now-lastDetection<78||video.readyState<2||video.currentTime===lastVideo)return;
  lastDetection=now;lastVideo=video.currentTime;
  const face=readExpression(detector.detectForVideo(video,now),video.videoWidth,video.videoHeight);
  // A single dropped frame must not erase a closed mouth or re-arm a held bite.
  if(!face){mouth=false;wink=0;alignedSince=0;return;}
  lastSeen=now;
  if(face.wink!==wink){wink=face.wink;winkSince=now;}
  if(face.closed){armed=true;mouth=false;latched=false;}
  if(face.open && armed){mouth=true;}
  if(state==="align"){
    if(!face.closed){alignedSince=0;return;}
    if(!alignedSince)alignedSince=now;
    if(now-alignedSince>=300){switchState("playing","表情识别中");lastFrame=now;}
  }
}
function frame(now) {
  const delta=lastFrame?Math.max(0,(now-lastFrame)/1000):0;lastFrame=now;
  if(mode==="camera"){
    try {readFace(now);} catch(error){fail(error);return;}
    if(state==="playing" && now-lastSeen>550){prepareAlignment();hint("暂时没看到脸，回到镜头前继续");}
  }
  if(state==="playing"){
    elapsed+=delta;
    if(elapsed>=duration){elapsed=duration;finish();return;}
    const eyeDirection = now-lastSeen<220 && now-winkSince>=85 ? wink : 0;
    const keyDirection = Number(heldKeys.has("ArrowRight")) - Number(heldKeys.has("ArrowLeft"));
    const direction = mode==="camera" ? eyeDirection : keyDirection;
    aim = Math.max(0, Math.min(1, aim + direction * .82 * Math.min(delta,.1)));

    if(!item){
      nextItem-=delta;
      if(nextItem<=0){item=scene.makeItem();itemAge=0;}
    }
    const flight=2.65-Math.min(.45,elapsed*.008);
    if(item)itemAge+=delta;
    const progress=itemAge/flight;
    let pose=scene.project(item,progress,aim);
    const biting=mode==="camera" ? mouth && !latched && now-lastSeen<220 : keyUntil>now;
    if(pose?.inFrame && biting){
      let points;
      if(item.type==="bomb"){
        points=-20;streak=0;
        chirp(115,.27,0,"sawtooth");
      } else {
        streak++;hits++;
        points=10+Math.min(5,Math.floor(streak/3))*5;
        chirp(240,.08,0,"sawtooth");chirp(620+streak*12,.12,.045);
      }
      score+=points;
      scene.bite(item,points,streak,now,aim);
      latched=true;keyUntil=0;item=null;pose=null;nextItem=.65;
    } else if(item && progress>departure){
      if(item.type!=="bomb")streak=0;
      item=null;pose=null;nextItem=.25;
    }
    if(item?.type==="bomb")hint("炸弹！闭嘴放过");
    else if(mode==="practice")hint("点水果咬一口 · 方向键移动，空格咬");
    else if(latched)hint("合嘴，准备下一口");
    else hint(pose?.inFrame?"对准了，张嘴！":"闭左眼向左，闭右眼向右");
    scene.draw(item,pose,aim,mode==="camera"?mouth:keyUntil>now,now);hud();
  } else if(state==="align")scene.draw(null,null,aim,false,now);
  frameRequest=requestAnimationFrame(frame);
}
function practiceBite() {
  if(state==="playing" && mode==="practice")keyUntil=performance.now()+260;
}
$("start").onclick=()=>start("camera");$("practice").onclick=()=>start("practice");
$("pause-button").onclick=pause;canvas.onpointerdown=event=>{
  if(state!=="playing"||mode!=="practice"||!event.isPrimary||event.button!==0)return;
  aim=scene.aimAt(event.clientX);
  practiceBite();
};
window.addEventListener("keydown",event=>{
  if((event.code==="ArrowLeft"||event.code==="ArrowRight")&&mode==="practice"&&state==="playing"){
    event.preventDefault();heldKeys.add(event.code);
  }
  if(event.code==="Space"&&mode==="practice"&&state==="playing"&&!$("install-dialog").open){
    event.preventDefault();if(!event.repeat)practiceBite();
  }
  if(event.key==="Escape"&&!$("install-dialog").open){
    if(state==="paused")resume();else pause();
  }
});
window.addEventListener("keyup",event=>heldKeys.delete(event.code));
window.addEventListener("blur",resetSteering);
window.addEventListener("fruit-settings",pause);
document.addEventListener("visibilitychange",()=>{if(document.hidden)pause();});
window.addEventListener("pagehide",event=>{
  if(event.persisted && (state==="playing"||state==="align"))pause();
  else if(!event.persisted||state==="loading")home();
});
soundLabel();hud();
