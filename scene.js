const fruits = ["melon","orange","berry","lemon","cherry"];
const names = [...fruits, "bomb"];
export const bombChance = .20;
const sprites = Object.fromEntries(names.map(name => {
  const img = new Image();
  img.src = new URL("./assets/" + name + ".png", import.meta.url);
  return [name, img];
}));
const juice = {melon:"#fa5961", orange:"#ffad2c", berry:"#ec485f", lemon:"#ffd946", cherry:"#c63f5e", bomb:"#505969"};
const ink = "#293548";
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
export const arrival = .78;
export const departure = 1.13;

export function createScene(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0;
  let burst = null;
  let particles = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    w = rect.width; h = rect.height;
    canvas.width = Math.round(w*dpr); canvas.height = Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = false;
  }
  new ResizeObserver(resize).observe(canvas);

  function sprite(type,x,y,size,angle) {
    const img=sprites[type];
    if (!img.complete || !img.naturalWidth) return;
    ctx.save(); ctx.translate(x,y); ctx.rotate(angle);
    ctx.drawImage(img,-size/2,-size/2,size,size); ctx.restore();
  }
  function ellipse(x,y,rx,ry,fill) {
    ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fillStyle=fill;ctx.fill();
  }
  // aim is in [0, 1] over the reachable track, independent of orientation.
  function target(aim) {
    const r = Math.min(h*.13, w*.11);
    const margin = r+12;
    return {x: margin + aim*(w-2*margin), y: h*.67, r};
  }
  function aimAt(clientX) {
    const rect = canvas.getBoundingClientRect();
    const start = target(0).x;
    return Math.max(0,Math.min(1,(clientX-rect.left-start)/(w-2*start)));
  }
  function reticle(aim,mouth,ready,bomb) {
    const {x,y,r}=target(aim);
    ellipse(x,y+r*.76,r*.85,r*.14,"#3e624f3d");
    const corners=[[1,1],[1,-1],[-1,1],[-1,-1]];
    ctx.lineJoin="miter";
    for(const [color,width] of [[ink,8],[ready?(bomb?"#ff8c79":"#ffdb54"):"#fff4ca",4]]){
      ctx.beginPath();
      for(const [dx,dy] of corners){
        ctx.moveTo(x+dx*r*.52,y+dy*r);
        ctx.lineTo(x+dx*r,y+dy*r);
        ctx.lineTo(x+dx*r,y+dy*r*.52);
      }
      ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    }
    if (!mouth) {
      ctx.fillStyle=ink;ctx.fillRect(x-5,y-2,10,4);ctx.fillRect(x-2,y-5,4,10);
      ctx.fillStyle="#fff5ce";ctx.fillRect(x-3,y-1,6,2);ctx.fillRect(x-1,y-3,2,6);
    }
    if (mouth) {
      ellipse(x,y+5,r*.66,r*.68,ink);ellipse(x,y+r*.32,r*.36,r*.18,"#ef827d");
      ctx.fillStyle="#fff0c5";ctx.fillRect(x-r*.37,y-r*.48,r*.22,r*.20);ctx.fillRect(x+r*.15,y-r*.48,r*.22,r*.20);
    }
  }
  function reset() { particles=[];burst=null;ctx.clearRect(0,0,w,h); }
  function makeItem() {
    const end = Math.random();
    const start = .65*end + .35*Math.random();
    const type = Math.random()<bombChance ? "bomb" : fruits[Math.floor(Math.random()*fruits.length)];
    return {type, start, end, rise:.37+.24*Math.random(), phase:Math.random()*Math.PI*2};
  }
  // The renderer and scorer share this projection so only visible overlaps count.
  function project(item, progress, aim) {
    if (!w || !h) resize();
    if (!item || !w || !h) return null;
    const frame = target(aim);
    const t = Math.max(0,progress);
    const travel = Math.max(0,1-t);
    const path = item.end + (item.start-item.end)*travel;
    const x = target(path).x + Math.sin(t*Math.PI*2+item.phase)*travel*w*.020;
    const y = frame.y - h*item.rise*travel - Math.sin(Math.min(1,t)*Math.PI)*h*.07
      + Math.max(0,t-1)*h*.55;
    const inFrame = t>=arrival && t<=departure && Math.abs(x-frame.x)<=frame.r && Math.abs(y-frame.y)<=frame.r;
    return {x,y,size:frame.r*(.40+1.45*t*t),angle:Math.sin(t*5+item.phase)*.21,inFrame};
  }
  function bite(item,points,streak,now,aim) {
    const {x,y,r}=target(aim);
    burst={type:item.type,points,streak,at:now,aim};
    particles=Array.from({length:reduced.matches?7:38},(_,i)=>{
      const angle=i*2.4+Math.random()*.3;
      const speed=r*(.9+Math.random()*3.4);
      return {x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-r*1.4,
        color:[juice[item.type],"#fff1ab","#ffbe42","#fff9df","#639f62"][i%5],size:r*(.052+Math.random()*.10)};
    });
  }
  function drawBurst(now) {
    if (!burst) return;
    const age=(now-burst.at)/1000;
    if (age>1) {burst=null;particles=[];return;}
    const {x,y,r}=target(burst.aim);
    ctx.save();ctx.globalAlpha=Math.min(1,(1-age)*3);
    if (age<.42 && !reduced.matches) {
      const expansion=r*(.65+age*3.2);
      ctx.beginPath();
      for(let i=0;i<32;i++){
        const a=i*Math.PI/16,rad=i%2?expansion*.68:expansion;
        const px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad;
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();ctx.fillStyle=burst.type==="bomb"?"#ff784c":"#ffda54";ctx.fill();
      ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();
    }
    if (age<.37 && burst.type!=="bomb") {
      // Upper and lower jaws stretch open, then snap together over the fruit.
      const snap=Math.sin(age/.37*Math.PI);
      const rx=r*(1+.34*snap),ry=r*(.22+.68*snap);
      ellipse(x,y,rx,ry,ink);ellipse(x,y+ry*.48,rx*.56,ry*.3,"#f2777f");
      ctx.fillStyle="#fff5d5";
      for (let i=-2;i<=2;i++) ctx.fillRect(x+i*rx*.31-rx*.12,y-ry*.73,rx*.25,ry*.39);
      sprite(burst.type,x,y+3,r*(1.1-age*2.8),age*6);
    }
    for(const p of particles){
      const px=p.x+p.vx*age,py=p.y+p.vy*age+age*age*h*.61;
      ctx.fillStyle=p.color;ctx.fillRect(Math.round(px),Math.round(py),p.size,p.size);
    }
    ctx.textAlign="center";ctx.lineJoin="round";ctx.lineWidth=5;
    const fontSize=Math.round(Math.min(30,w*.057));
    const label=burst.points>0?"+"+burst.points:String(burst.points);
    const labelY=y-r*(1.2+age*.72);
    ctx.font=fontSize+"px Arcade, monospace";ctx.strokeStyle=ink;ctx.strokeText(label,x,labelY);
    ctx.fillStyle=burst.type==="bomb"?"#ffab95":"#fff695";ctx.fillText(label,x,labelY);
    if(burst.streak>=3){
      ctx.font="bold "+Math.round(fontSize*.7)+"px system-ui";ctx.strokeText(burst.streak+" 连击!",x,labelY+24);ctx.fillStyle="#fff8cf";ctx.fillText(burst.streak+" 连击!",x,labelY+24);
    }
    ctx.restore();
  }
  function draw(item,pose,aim,mouth,now) {
    if (!w) resize();
    ctx.clearRect(0,0,w,h);
    reticle(aim,mouth,pose?.inFrame,item?.type==="bomb");
    if(item && pose){
      const {x,y,size,angle}=pose;
      if(pose.inFrame) ellipse(x,y,size*.54,size*.54,item.type==="bomb"?"#ff7e6857":"#fff2a957");
      sprite(item.type,x,y,size,angle);
    }
    drawBurst(now);
  }
  return {reset,makeItem,aimAt,project,bite,draw};
}
