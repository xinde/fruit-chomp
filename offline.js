const $ = id => document.getElementById(id);
const dialog=$("install-dialog");
let promptEvent=null, registration=null, offlineState="loading", retry=false;
const states={
  loading:["正在准备离线资源…","正在保存游戏、声音所需代码和面部识别模型。首次准备约需 23 MB，请保持页面打开。"],
  ready:["离线已就绪","游戏和面部识别模型已保存在此设备。现在断开网络，也可以重新打开游戏并使用摄像头。"],
  error:["离线资源未备妥 · 重试","离线资源尚未保存完整。请确认网络和浏览器存储空间，再点重试。"],
  unsupported:["离线功能不可用","请使用支持 Service Worker 的浏览器，通过 HTTPS 或本机 localhost 打开游戏。"]
};
function standalone(){return matchMedia("(display-mode: standalone)").matches||navigator.standalone;}
function refresh(){
  const [label,detail]=states[offlineState];
  $("offline").textContent=label;$("offline").classList.toggle("ready",offlineState==="ready");
  $("cache-detail").textContent=detail;
  $("install-guide").textContent=standalone()?"游戏已安装在此设备。":promptEvent?"离线资源就绪后，点下方按钮安装到此设备。":/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Mac/.test(navigator.platform)&&navigator.maxTouchPoints>1)?"在 Safari 的分享菜单中选「添加到主屏幕」。":"在浏览器菜单中选择「安装应用」或「添加到主屏幕」。";
  $("install-action").hidden=offlineState!=="error"&&!(offlineState==="ready"&&promptEvent&&!standalone());
  $("install-action").textContent=offlineState==="error"?"重试下载":"安装游戏";
  if(standalone())$("install").querySelector("span").textContent="已安装";
}
function update(value){offlineState=value;refresh();}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();promptEvent=event;refresh();});
window.addEventListener("appinstalled",()=>{promptEvent=null;refresh();});
const seen=new WeakSet();
function observe(worker){
  if(!worker||seen.has(worker))return;
  seen.add(worker);
  const inspect=()=>{
    if(worker.state==="activated")update("ready");
    else if(worker.state==="redundant"&&!registration?.active)update("error");
  };
  worker.addEventListener("statechange",inspect);inspect();
}
async function setup(){
  if(!("serviceWorker" in navigator)){update("unsupported");return;}
  if(retry)return;
  retry=true;update("loading");
  try {
    registration=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
    registration.onupdatefound=()=>observe(registration.installing);
    observe(registration.installing);observe(registration.waiting);
    if(registration.active?.state==="activated")update("ready");
    else if(!registration.installing&&!registration.waiting){
      await registration.update();observe(registration.installing);
    }
    navigator.serviceWorker.ready.then(()=>update("ready"));
  } catch {update("error");}
  finally{retry=false;}
}
function show(){
  window.dispatchEvent(new Event("fruit-settings"));
  refresh();if(!dialog.open)dialog.showModal();
}
$("install").onclick=show;$("offline").onclick=show;
$("install-action").onclick=async()=>{
  if(offlineState==="error"){await setup();return;}
  if(promptEvent){const current=promptEvent;promptEvent=null;await current.prompt();await current.userChoice;refresh();}
};
setup();
