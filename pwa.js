// The active worker owns the manifest and verifies its cache before declaring readiness.
function verifyOffline(worker) {
  return new Promise((resolve,reject)=>{
    const channel=new MessageChannel();
    const finish=ok=>{
      clearTimeout(timer);channel.port1.close();
      if(ok)resolve();else reject(new Error("Offline resources incomplete"));
    };
    const timer=setTimeout(()=>finish(false),90000);
    channel.port1.onmessage=event=>finish(event.data?.ready===true);
    try{worker.postMessage({type:"prepare-offline"},[channel.port2]);}
    catch{finish(false);}
  });
}

export function monitorOffline(report) {
  let registration,revision=0;
  const watched=new WeakSet();
  function inspect(){
    const current=++revision;
    const worker=registration?.installing || registration?.waiting || registration?.active;
    if(!worker){report("error");return;}
    if(worker.state==="activated"){
      verifyOffline(worker).then(
        ()=>{if(revision===current)report("ready");},
        ()=>{if(revision===current)report("error");}
      );
      return;
    }
    if(worker.state==="redundant"){report("error");return;}
    report("loading");
    if(!watched.has(worker)){
      watched.add(worker);worker.addEventListener("statechange",inspect);
    }
  }
  async function prepare(){
    if(!("serviceWorker" in navigator)){report("unsupported");return;}
    report("loading");
    try{
      registration=await navigator.serviceWorker.register("./sw.js",{scope:"./",updateViaCache:"none"});
      registration.onupdatefound=inspect;
      if(!registration.active && !registration.installing && !registration.waiting)await registration.update();
      inspect();
      // A newly visited deep link can still be under control of the previous release.
      if(registration.active && !registration.installing && navigator.onLine){
        registration.update().catch(()=>{}); // The installed cache remains usable offline.
      }
    }catch{report("error");}
  }
  navigator.serviceWorker?.addEventListener("controllerchange",()=>{if(registration)inspect();});
  prepare();
  return prepare;
}
