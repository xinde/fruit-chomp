import {monitorOffline} from "./pwa.js";
const $ = id => document.getElementById(id);
const dialog=$("install-dialog");
let promptEvent=null, offlineState="loading";
const states={
  loading:["正在准备离线资源…","正在保存游戏、动作测试和识别模型，首次约 23 MB。"],
  ready:["离线已就绪","离线已就绪 · 游戏、动作测试和识别模型已缓存。"],
  error:["离线资源未备妥 · 重试","离线资源尚未保存完整。请确认网络和浏览器存储空间，再点重试。"],
  unsupported:["离线功能不可用","请使用支持 Service Worker 的浏览器，通过 HTTPS 或本机 localhost 打开游戏。"]
};
function standalone(){return matchMedia("(display-mode: standalone)").matches||navigator.standalone;}
function refresh(){
  const [label,detail]=states[offlineState];
  $("offline").textContent=label;$("offline").classList.toggle("ready",offlineState==="ready");
  $("cache-detail").textContent=detail;
  const appleMobile=/iPad|iPhone|iPod/.test(navigator.userAgent)||(/Mac/.test(navigator.platform)&&navigator.maxTouchPoints>1);
  let guide="打开浏览器菜单，选择「安装应用」或「添加到主屏幕」。";
  if(appleMobile)guide="在 Safari 点「分享」→「添加到主屏幕」，如有「作为网页 App 打开」选项，将它开启。";
  else if(promptEvent)guide="等离线资源就绪，点「安装应用」并确认。";
  else if(/Mac/.test(navigator.platform)&&/^((?!chrome|android).)*safari/i.test(navigator.userAgent))guide="在 Safari 的「文件」或分享菜单中选择「添加到程序坞」。";
  if(standalone())guide="已从安装后的网页应用打开。";
  $("install-guide").textContent=guide;
  $("install-action").hidden=offlineState!=="error"&&!(offlineState==="ready"&&promptEvent&&!standalone());
  $("install-action").textContent=offlineState==="error"?"重试缓存":"安装应用";
  if(standalone())$("install").querySelector("span").textContent="已安装";
}
function update(value){offlineState=value;refresh();}
window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();promptEvent=event;refresh();});
window.addEventListener("appinstalled",()=>{promptEvent=null;refresh();});
const prepare=monitorOffline(update);
function show(){
  window.dispatchEvent(new Event("fruit-settings"));
  refresh();if(!dialog.open)dialog.showModal();
}
$("install").onclick=show;$("offline").onclick=show;
$("install-action").onclick=async()=>{
  if(offlineState==="error"){await prepare();return;}
  if(promptEvent){const current=promptEvent;promptEvent=null;await current.prompt();await current.userChoice;refresh();}
};
if(location.hash==="#install")show();
