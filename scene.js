const names = ["melon","orange","berry","lemon","cherry"];
const sprites = names.map(name => {
  const img = new Image();
  img.src = new URL("./assets/" + name + ".png", import.meta.url);
  return img;
});
const juice = ["#fa5961","#ffad2c","#ec485f","#ffd946","#c63f5e"];
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
  function target() { return {x:w*.5,y:h*.70,r:Math.min(h*.148,w*.134)}; }

  function ring(mouth,ready,now) {
    const {x,y,r}=target();
    ellipse(x,y+r*.57,r*.87,r*.19,"#3e624f3d");
    for (const [radius,color,width] of [[r+4,"#354c4b",5],[r+4,ready?"#ffcf40":"#fff6ce",2.5]]) {
      ctx.beginPath();ctx.setLineDash([10,6]);ctx.lineDashOffset=-now*.014;
      ctx.arc(x,y,radius,0,Math.PI*2);ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();
    }
    ctx.setLineDash([]);
    if (mouth) {
      ellipse(x,y+5,r*.66,r*.68,ink);ellipse(x,y+r*.32,r*.36,r*.18,"#ef827d");
      ctx.fillStyle="#fff0c5";ctx.fillRect(x-r*.37,y-r*.48,r*.22,r*.20);ctx.fillRect(x+r*.15,y-r*.48,r*.22,r*.20);
    }
  }
  function reset() { particles=[];burst=null;ctx.clearRect(0,0,w,h); }
  function makeFruit(index) {
    return {type:Math.floor(Math.random()*names.length),index,side:(index%2?1:-1)*(.48+Math.random()*.45),phase:Math.random()*6};
  }
  function bite(fruit,points,streak,now) {
    const {x,y,r}=target();
    burst={type:fruit.type,points,streak,at:now};
    particles=Array.from({length:reduced.matches?7:38},(_,i)=>{
      const angle=i*2.4+Math.random()*.3;
      const speed=r*(.9+Math.random()*3.4);
      return {x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-r*1.4,
        color:[juice[fruit.type],"#fff1ab","#ffbe42","#fff9df","#639f62"][i%5],size:r*(.052+Math.random()*.10)};
    });
  }
  function drawBurst(now) {
    if (!burst) return;
    const age=(now-burst.at)/1000;
    if (age>1) {burst=null;particles=[];return;}
    const {x,y,r}=target();
    ctx.save();ctx.globalAlpha=Math.min(1,(1-age)*3);
    if (age<.42 && !reduced.matches) {
      const expansion=r*(.65+age*3.2);
      ctx.beginPath();
      for(let i=0;i<32;i++){
        const a=i*Math.PI/16,rad=i%2?expansion*.68:expansion;
        const px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad;
        if(i===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);
      }
      ctx.closePath();ctx.fillStyle="#ffda54";ctx.fill();
      ctx.strokeStyle=ink;ctx.lineWidth=3;ctx.stroke();
    }
    if (age<.37) {
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
    const label="+"+burst.points;
    const labelY=y-r*(1.2+age*.72);
    ctx.font=fontSize+"px Arcade, monospace";ctx.strokeStyle=ink;ctx.strokeText(label,x,labelY);
    ctx.fillStyle="#fff695";ctx.fillText(label,x,labelY);
    if(burst.streak>=3){
      ctx.font="bold "+Math.round(fontSize*.7)+"px system-ui";ctx.strokeText(burst.streak+" 连击!",x,labelY+24);ctx.fillStyle="#fff8cf";ctx.fillText(burst.streak+" 连击!",x,labelY+24);
    }
    ctx.restore();
  }
  function draw(fruit,progress,mouth,now) {
    if (!w) resize();
    ctx.clearRect(0,0,w,h);
    ring(mouth,!!fruit&&progress>=arrival,now);
    if(fruit){
      const {x,y,r}=target();
      const p=Math.max(0,progress);
      const travel=Math.max(0,1-p);
      const px=x+w*.40*fruit.side*travel+Math.sin(p*Math.PI*2+fruit.phase)*travel*w*.045;
      const py=y-(h*.46)*travel-Math.sin(Math.min(p,1)*Math.PI)*h*.16;
      const size=r*(.26+1.62*p*p);
      if(p>=arrival){
        ellipse(px,py,size*.54,size*.54,"#fff2a957");
      }
      sprite(fruit.type,px,py,size,Math.sin(p*5+fruit.phase)*.24);
    }
    drawBurst(now);
  }
  return {reset,makeFruit,bite,draw};
}
