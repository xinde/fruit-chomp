// Four beats per bar. Each melody note specifies its beat, MIDI pitch and length in beats.
const score = [
  {bass:[48,55], chord:[60,64], melody:[[0,67,.7],[1,64,.4],[1.5,67,.4],[2,69,.8],[3.25,67,.5]]},
  {bass:[45,52], chord:[60,64], melody:[[0,64,.8],[1.5,60,.4],[2,64,.6],[3,67,.65]]},
  {bass:[41,48], chord:[57,60], melody:[[0,65,.7],[1,69,.4],[1.5,72,.8],[2.75,69,.4],[3.5,65,.35]]},
  {bass:[43,50], chord:[59,62], melody:[[0,62,.8],[1.5,67,.45],[2.5,71,.45],[3.25,67,.5]]},
  {bass:[48,55], chord:[60,64], melody:[[0,72,.8],[1.25,71,.4],[2,67,.7],[3,64,.65]]},
  {bass:[41,48], chord:[57,60], melody:[[0,65,.7],[1,69,.45],[1.75,67,.45],[2.5,65,.8]]},
  {bass:[43,50], chord:[59,62], melody:[[0,62,.6],[1,67,.45],[2,69,.45],[2.75,71,.75]]},
  {bass:[48,55], chord:[60,64], melody:[[0,72,.8],[1.5,67,.45],[2.25,64,.45],[3,60,.8]]}
];

function renderLoop(context) {
  const rate=22050, beat=60/112;
  const buffer=context.createBuffer(1,Math.round(score.length*4*beat*rate),rate);
  const samples=buffer.getChannelData(0);
  function note(start,pitch,beats,level,overtone) {
    const first=Math.round(start*beat*rate);
    const length=Math.min(Math.round(beats*beat*rate),samples.length-first);
    const step=2*Math.PI*440*2**((pitch-69)/12)/rate;
    for(let i=0;i<length;i++){
      const envelope=Math.min(1,i/(rate*.012),(length-1-i)/(rate*.05))*Math.exp(-2*i/length);
      samples[first+i]+=level*envelope*(Math.sin(i*step)+overtone*Math.sin(2*i*step));
    }
  }
  score.forEach(({bass,chord,melody},bar)=>{
    const start=bar*4;
    note(start,bass[0],1.3,.034,.2);
    note(start+2,bass[1],1.05,.028,.2);
    for(const pitch of chord){
      note(start+1,pitch,.34,.013,.1);
      note(start+3,pitch,.32,.011,.1);
    }
    for(const [at,pitch,length] of melody)note(start+at,pitch,length,.052,.3);
  });
  return buffer;
}

export class BackgroundMusic {
  buffer=null;
  voice=null;
  offset=0;

  play(context) {
    if(this.voice || context.state!=="running")return;
    this.buffer??=renderLoop(context);
    const source=context.createBufferSource(), gain=context.createGain();
    source.buffer=this.buffer;source.loop=true;
    source.connect(gain);gain.connect(context.destination);
    const now=context.currentTime;
    gain.gain.setValueAtTime(0,now);
    gain.gain.linearRampToValueAtTime(1,now+.025);
    source.onended=()=>{source.disconnect();gain.disconnect();};
    source.start(now,this.offset);
    this.voice={context,source,gain,start:now};
  }

  stop() {
    if(!this.voice)return;
    const {context,source,gain,start}=this.voice;
    const now=context.currentTime;
    this.offset=(this.offset+now-start)%this.buffer.duration;
    this.voice=null;
    if(context.state==="running"){
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0,now,.004);
      source.stop(now+.025);
    }else{
      gain.disconnect();source.stop();
    }
  }

  reset() {
    this.stop();
    this.offset=0;
  }
}
