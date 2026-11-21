import {feastHoldMs} from "./input-controls.js";

export const checks = [
  {id:"left", label:"头向左移", prepare:"头回到中间，标记停在中线附近。", action:"水平向左移头，让标记进入左侧色带。"},
  {id:"right", label:"头向右移", prepare:"头回到中间，标记停在中线附近。", action:"水平向右移头，让标记进入右侧色带。"},
  {id:"bite", label:"张嘴咬合", prepare:"先合嘴，准备咬下一口。", action:"张开嘴巴，模拟咬到框内的水果。"},
  {id:"close", label:"合嘴复位", prepare:"先张开嘴巴，保持一小会儿。", action:"合上嘴巴，让下一口重新就绪。"},
  {id:"blink", label:"短眨眼", prepare:"先睁开双眼。", action:"双眼快速眨一下再睁开，检查大口吞会不会误触。"},
  {id:"feast", label:"闭眼大口吞", prepare:"先睁开双眼。本项已模拟满饱腹。", action:"双眼同时闭紧半秒，再睁眼查看结果。"}
];

export class MotionTrial {
  constructor(index) {
    this.check=checks[index];
    this.restart();
  }
  restart() {
    this.phase="prepare";
    this.elapsed=0;
    this.last=null;
    this.blinkStart=null;
    this.result=null;
  }
  finish(pass,text) {
    this.phase="done";
    this.result={pass,text};
  }
  sample(face,aim,bite,feast,now) {
    if(this.result)return;
    if(!face){this.restart();return;}
    // A gap cannot establish a blink, but a valid head target still has meaning.
    if(this.last!==null && now-this.last>350)this.blinkStart=null;
    this.elapsed+=this.last===null?0:Math.min(1000,now-this.last);
    this.last=now;
    const id=this.check.id;
    if(this.phase==="prepare"){
      let ready;
      if(id==="left"||id==="right")ready=Math.abs(aim-.5)<.07;
      else if(id==="bite")ready=face.closed;
      else if(id==="close")ready=face.open;
      else ready=face.eyesOpen;
      if(ready){this.phase="attempt";this.elapsed=0;}
      else if(this.elapsed>=8000)this.finish(false,"未识别到准备动作");
      return;
    }
    if(id==="left"||id==="right"){
      const side=aim<=.35?"left":aim>=.65?"right":null;
      if(side)this.finish(side===id,side==="left"?"瞄准框向左":"瞄准框向右");
    } else if(id==="bite" && bite)this.finish(true,"咬合触发一次");
    else if(id==="close" && face.closed)this.finish(true,"已合嘴，下一口就绪");
    else if(id==="feast"||id==="blink"){
      if(feast)this.finish(id==="feast","大口吞已触发");
      else if(face.eyesShut)this.blinkStart??=now;
      else if(face.eyesOpen && this.blinkStart!==null){
        if(now-this.blinkStart<feastHoldMs)this.finish(id==="blink","短眨眼，大口吞未触发");
        this.blinkStart=null;
      } else this.blinkStart=null;
    }
    if(!this.result && this.elapsed>=8000)this.finish(false,"8 秒内未识别到目标动作");
  }
}
