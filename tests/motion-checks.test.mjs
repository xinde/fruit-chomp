import test from "node:test";
import assert from "node:assert/strict";
import {MotionTrial} from "../motion-checks.js";
import {BiteGesture, FeastGesture, HeadCalibration} from "../camera.js";

const neutral={closed:true,open:false,eyesOpen:true,eyesShut:false,faceWidth:.32,headX:.49};
const mouthOpen={...neutral,closed:false,open:true};
const eyesShut={...neutral,eyesOpen:false,eyesShut:true};

test("a head trial requires centering, then reports the observed direction including mismatches",()=>{
  const t=new MotionTrial(0);
  t.sample(neutral,.1,false,false,10);
  assert.equal(t.phase,"prepare");
  t.sample(neutral,.5,false,false,110);
  t.sample(neutral,.75,false,false,210);
  assert.deepEqual(t.result,{pass:false,text:"瞄准框向右"});
  t.restart();t.sample(neutral,.5,false,false,310);t.sample(neutral,.25,false,false,410);
  assert.equal(t.result.pass,true);
});

test("camera calibration and bite gating require observed closure and re-arm between bites",()=>{
  const head=new HeadCalibration(),bite=new BiteGesture();
  assert.equal(head.sample(neutral,0),false);head.sample(null,100);
  assert.equal(head.sample(neutral,280),false);assert.equal(head.sample(neutral,600),true);
  assert.equal(head.target(neutral),.5);
  bite.sample(mouthOpen);assert.equal(bite.ready(false,true),false);
  bite.sample(neutral);bite.sample(mouthOpen);assert.equal(bite.ready(true,true),false);
  assert.equal(bite.ready(false,true),true);bite.consume();bite.sample(mouthOpen);
  assert.equal(bite.ready(false,true),false);bite.sample(neutral);bite.sample(mouthOpen);
  assert.equal(bite.ready(false,false),false);assert.equal(bite.ready(false,true),true);
});

test("a brief blink must actually be observed, long closure produces the opposite result",()=>{
  for(const [index,hold,expected] of [[4,120,true],[4,620,false],[5,120,false],[5,620,true]]){
    const trial=new MotionTrial(index),gesture=new FeastGesture();
    const sample=(f,ms)=>trial.sample(f,.5,false,gesture.sample(f,true,ms),ms);
    sample(neutral,0);sample(eyesShut,100);
    for(let ms=200;ms<100+hold;ms+=100)sample(eyesShut,ms);
    sample(neutral,100+hold);
    assert.equal(trial.result.pass,expected);
  }
});

test("tracking loss cannot pass a trial, and holding still eventually reports a miss",()=>{
  const t=new MotionTrial(3);
  t.sample(mouthOpen,.5,false,false,0);t.sample(null,.5,false,false,90);
  t.sample(neutral,.5,false,false,200);assert.equal(t.phase,"prepare");
  for(let time=300;time<=8400;time+=100)t.sample(neutral,.5,false,false,time);
  assert.deepEqual(t.result,{pass:false,text:"未识别到准备动作"});
});
