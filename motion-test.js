import {loadModel, readExpression, FeastGesture} from "./camera.js";
import {requestFrontCamera, HeadCalibration, followAim, BiteGesture} from "./input-controls.js";
import {monitorOffline} from "./pwa.js";
import {checks, MotionTrial} from "./motion-checks.js";

const $=id=>document.getElementById(id);
const video=$("preview"), head=new HeadCalibration(), bite=new BiteGesture(), feast=new FeastGesture();
const outcomes=checks.map(()=>null);
let selected=0, trial=new MotionTrial(0), state="idle", message="";
let stream=null, model=null, ticket=0, raf=0;
let lastFrame=0,lastVideo=-1,lastSample=0,lastSeen=-Infinity,face=null,aim=.5,target=.5;
let lastAction="";

function text(el,value){if(el.textContent!==value)el.textContent=value;}
function selectCheck(index){
  selected=index;trial=new MotionTrial(index);outcomes[index]=null;
  feast.reset();lastAction="";
  render();
}
const tiles=checks.map((check,index)=>{
  const button=document.createElement("button");
  button.type="button";button.className="choice";
  const label=document.createElement("span"),status=document.createElement("small");
  label.textContent=check.label;button.append(label,status);button.onclick=()=>selectCheck(index);
  $("choices").append(button);
  const option=new Option(check.label,String(index));$("compact-choice").add(option);
  return {button,status,option};
});

function render(){
  const tracking=state==="testing", calibrating=state==="align", starting=state==="loading";
  const result=outcomes[selected], check=checks[selected];
  const running=tracking||calibrating;
  text($("progress"),"通过 "+outcomes.filter(r=>r?.pass).length+" / "+checks.length);
  for(let i=0;i<tiles.length;i++){
    const {button,status,option}=tiles[i],out=outcomes[i];
    const label=out?(out.pass?"通过":"未通过"):(i===selected&&tracking?"检测中":"待测");
    button.dataset.result=out?(out.pass?"pass":"fail"):"";
    button.setAttribute("aria-pressed",String(i===selected));
    text(status,label);text(option,checks[i].label+" · "+label);
  }
  $("compact-choice").value=String(selected);
  text($("camera"),starting?"取消开启":running?"关闭摄像头":state==="error"?"重试开启":"开启摄像头");
  $("camera").classList.toggle("primary",!running);
  $("next").hidden=!(tracking&&result);$("retry").hidden=!(tracking&&result);
  $("recenter").hidden=!running;
  const nextIndex=nextPending();
  text($("next"),nextIndex<0?"再测一轮":"下一项");
  $("screen").classList.toggle("live",!!stream);
  text($("tracking"),starting?"正在启动":state==="error"?"摄像头未就绪":!running?"摄像头已关闭":!face?"未检测到人脸":calibrating?"正在校准":"已定位面部");
  const hasSignal=!!face&&running;
  $("cursor").style.left=(100*aim).toFixed(1)+"%";
  text($("position"),!hasSignal||!tracking?"等待定位":aim<.43?"偏左":aim>.57?"偏右":"居中");
  text($("mouth"),!hasSignal?"—":face.open?"张开":face.closed?"合上":"过渡");
  text($("eyes"),!hasSignal?"—":face.eyesOpen?"睁开":face.eyesShut?"闭紧":"过渡");
  $("last-event").hidden=!lastAction||!tracking||!face;
  text($("last-event"),lastAction);
  let title,detail;
  if(state==="error"){title="无法开始测试";detail=message;}
  else if(starting){title="正在准备摄像头";detail="请允许使用前置摄像头，首次打开需加载识别模型。";}
  else if(!running){title="准备测试 · "+check.label;detail=message||"开启摄像头，把整张脸放进画面。影像只在本机处理。";}
  else if(calibrating){title="居中校准";detail="正对镜头，头放在舒服的位置，轻轻合嘴片刻。";}
  else if(result){title=(result.pass?"通过 · ":"未通过 · ")+check.label;detail="实际结果："+result.text+"。";}
  else if(!face){title="测试暂停";detail="请让整张脸回到画面中。";}
  else {
    title=check.label+" · "+(trial.phase==="prepare"?"准备":"请做动作");
    detail=trial.phase==="prepare"?check.prepare:check.action;
  }
  text($("instruction-title"),title);text($("instruction"),detail);
  $("instruction").parentElement.dataset.result=tracking&&result&&!result.pass?"fail":"";
}

function nextPending(){
  for(let offset=1;offset<=checks.length;offset++){
    const i=(selected+offset)%checks.length;
    if(!outcomes[i])return i;
  }
  return -1;
}
function align(){
  state="align";head.since=null;bite.reset();feast.reset();face=null;lastSeen=-Infinity;
  aim=target=.5;lastAction="";
  if(!trial.result)trial.restart();
}
function stop(nextState="idle",note=""){
  ticket++;cancelAnimationFrame(raf);
  if(stream)for(const track of stream.getTracks()){track.onended=null;track.stop();}
  stream=null;video.pause();video.srcObject=null;
  align();state=nextState;message=note;render();
}
function fail(err){
  const reasons={
    NotAllowedError:"请在这个网站的权限设置中允许摄像头，再重新开启。",
    SecurityError:"请使用 HTTPS 或本机地址打开，并允许访问摄像头。",
    NotFoundError:"没有找到摄像头。请连接设备或换到带前置摄像头的浏览器。",
    NotSupportedError:"当前浏览器无法使用摄像头。可尝试 Safari 或 Chrome。",
    NotReadableError:"摄像头可能正被占用，请关闭其他使用摄像头的应用再试。",
    AbortError:"摄像头已断开，请重新开启。"
  };
  stop("error",reasons[err?.name]||"识别模型启动失败，请检查离线资源是否已备妥，再重新开启。");
}
async function start(){
  stop("loading");const current=ticket;
  try{
    const incoming=await requestFrontCamera();
    if(current!==ticket){incoming.getTracks().forEach(track=>track.stop());return;}
    stream=incoming;stream.getVideoTracks()[0].onended=()=>{if(current===ticket)fail(new DOMException("Camera ended","AbortError"));};
    video.srcObject=stream;render();await video.play();
    if(current!==ticket)return;
    const loaded=await loadModel();
    if(current!==ticket)return;
    model=loaded;align();lastVideo=-1;lastSample=lastFrame=0;render();
    if(document.hidden){stop();return;}
    raf=requestAnimationFrame(frame);
  }catch(err){if(current===ticket)fail(err);}
}
function frame(now){
  const delta=lastFrame?(now-lastFrame)/1000:0;lastFrame=now;
  if(now-lastSample>=78 && video.readyState>=2 && video.currentTime!==lastVideo){
    lastSample=now;lastVideo=video.currentTime;
    try{face=readExpression(model.detectForVideo(video,now),video.videoWidth,video.videoHeight);}
    catch(err){fail(err);return;}
    bite.sample(face);
    if(!face){
      head.since=null;feast.reset();lastAction="";
      if(!trial.result)trial.sample(null,aim,false,false,now);
    }else{
      lastSeen=now;
      if(state==="align"){
        if(head.sample(face,now)){state="testing";aim=target=.5;}
      }else{
        target=head.target(face);
        // The range always supplies an in-frame fruit and a full meter.
        const big=feast.sample(face,true,now);
        const chomp=!big && bite.ready(face.eyesShut,true);
        if(big||chomp){bite.consume();lastAction=big?"最近触发：大口吞":"最近触发：咬合";}
        trial.sample(face,aim,chomp,big,now);
        if(trial.result)outcomes[selected]=trial.result;
      }
    }
    render();
  }
  if(state==="testing" && now-lastSeen>550){align();render();}
  if(state==="testing" && face && now-lastSeen<220){
    aim=followAim(aim,target,delta);
    $("cursor").style.left=(aim*100).toFixed(1)+"%";
  }
  raf=requestAnimationFrame(frame);
}

$("camera").onclick=()=>["loading","align","testing"].includes(state)?stop():start();
$("compact-choice").onchange=event=>selectCheck(Number(event.target.value));
$("recenter").onclick=()=>{align();render();};
$("retry").onclick=()=>selectCheck(selected);
$("next").onclick=()=>{
  const index=nextPending();
  if(index<0){outcomes.fill(null);selectCheck(0);}else selectCheck(index);
};
document.addEventListener("visibilitychange",()=>{if(document.hidden && ["loading","align","testing"].includes(state))stop("idle","测试已暂停，重新开启可继续。");});
window.addEventListener("pagehide",()=>stop());
monitorOffline(status=>{
  text($("cache-link"),{loading:"准备离线…",ready:"离线已就绪",error:"离线未就绪",unsupported:"离线不可用"}[status]);
});
render();
