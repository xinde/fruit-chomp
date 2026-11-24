const root = new URL("./vendor/mediapipe/", import.meta.url);
// The pinned Google float16 v1 bundle listed in THIRD_PARTY.md.
const modelSize = 3758596;
const modelHash = "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff";
let pending, attempt = 0;
let status = {text:"准备识别模型…", percent:null};
const listeners = new Set();

function report(text, percent=null) {
  if(status.text===text && status.percent===percent)return;
  status={text,percent};
  for(const listener of listeners)listener(status);
}

function asset(path) {
  const url=new URL(path,root);
  if(attempt>1)url.searchParams.set("model-retry",String(attempt));
  return url.href;
}

async function readModel() {
  const controller=new AbortController();
  let timer, timedOut=false;
  function markActivity() {
    clearTimeout(timer);
    timer=setTimeout(()=>{timedOut=true;controller.abort();},30000);
  }
  const incomplete="模型文件不完整，请重新加载。";
  report("正在读取识别模型…");
  try {
    markActivity();
    let response;
    try {
      response=await fetch(asset("face_landmarker.task"),{signal:controller.signal});
    } catch {
      throw new Error("模型下载中断，请检查网络后重试。");
    }
    if(!response.ok)throw new Error("模型下载失败（HTTP "+response.status+"）。");

    report("加载识别模型 0%",0);
    let bytes;
    if(response.body?.getReader){
      bytes=new Uint8Array(modelSize);
      const reader=response.body.getReader();
      let received=0;
      while(true){
        let chunk;
        try {chunk=await reader.read();}
        catch {throw new Error("模型下载中断，请检查网络后重试。");}
        if(chunk.done)break;
        markActivity();
        if(received+chunk.value.length>modelSize){
          controller.abort();
          throw new Error(incomplete);
        }
        bytes.set(chunk.value,received);
        received+=chunk.value.length;
        const percent=Math.floor(received/modelSize*100);
        report("加载识别模型 "+percent+"%",percent);
      }
      if(received!==modelSize)throw new Error(incomplete);
    }else{
      bytes=new Uint8Array(await response.arrayBuffer());
      if(bytes.length!==modelSize)throw new Error(incomplete);
    }
    clearTimeout(timer);
    report("正在校验模型…");
    const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",bytes));
    const hex=Array.from(digest,n=>n.toString(16).padStart(2,"0")).join("");
    if(hex!==modelHash)throw new Error("模型校验失败，请重新加载。");
    return bytes;
  } catch(error) {
    if(timedOut)throw new Error("模型下载超时，请检查网络后重试。");
    throw error;
  } finally {clearTimeout(timer);}
}

async function prepare() {
  const bytes=await readModel();
  report("正在加载识别引擎…");
  try {
    const {FilesetResolver,FaceLandmarker}=await import(asset("vision_bundle.mjs"));
    const files=await FilesetResolver.forVisionTasks(new URL("wasm",root).href);
    if(attempt>1){
      files.wasmLoaderPath=asset(files.wasmLoaderPath);
      files.wasmBinaryPath=asset(files.wasmBinaryPath);
    }
    const options={
      baseOptions:{modelAssetBuffer:bytes,delegate:"GPU"},
      runningMode:"VIDEO",numFaces:1,outputFaceBlendshapes:true
    };
    try {return await FaceLandmarker.createFromOptions(files,options);}
    catch {
      options.baseOptions.delegate="CPU";
      return await FaceLandmarker.createFromOptions(files,options);
    }
  } catch {
    throw new Error("识别引擎加载失败，请重试。");
  }
}

export function loadModel(onProgress) {
  if(onProgress){listeners.add(onProgress);onProgress(status);}
  if(!pending){
    attempt++;
    pending=prepare().catch(error=>{pending=undefined;throw error;});
  }
  return onProgress ? pending.finally(()=>listeners.delete(onProgress)) : pending;
}

export function prepareStartButtons(panel,buttons,onReady) {
  const label=panel.querySelector("[role=status]");
  const progress=panel.querySelector("progress");
  const retry=panel.querySelector("button");
  let busy=false;
  async function run(){
    if(busy)return;
    busy=true;
    panel.hidden=false;panel.dataset.state="loading";
    retry.hidden=true;progress.hidden=false;
    for(const button of buttons)button.disabled=true;
    try{
      const model=await loadModel(({text,percent})=>{
        if(label.textContent!==text)label.textContent=text;
        if(percent===null)progress.removeAttribute("value");else progress.value=percent;
      });
      onReady(model);
      panel.hidden=true;
      for(const button of buttons)button.disabled=false;
    }catch(error){
      panel.dataset.state="error";label.textContent=error.message||"模型加载失败，请重试。";
      progress.hidden=true;retry.hidden=false;
    }finally{busy=false;}
  }
  retry.onclick=()=>{
    if(busy)return;
    retry.dispatchEvent(new Event("fruit-retry-offline",{bubbles:true}));
    return run();
  };
  run();
}
