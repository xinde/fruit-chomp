import test from "node:test";
import assert from "node:assert/strict";
import {Round, capacity, departure} from "../round.js";
import {FeastGesture, headAim} from "../camera.js";

function add(round,type) {
  const flight={item:{type},start:round.elapsed,duration:3,progress:0};
  round.flights.push(flight);
  return flight;
}

test("staggered flights overlap, stay bounded and expire independently",()=>{
  const round=new Round();
  let maximum=0, seenOverlap=false;
  for(let i=0;i<400;i++){
    round.advance(.05,()=>({type:"berry"}));
    maximum=Math.max(maximum,round.flights.length);
    if(round.flights.length>1){
      seenOverlap=true;
      assert.ok(round.flights[0].progress>round.flights[1].progress);
    }
    assert.ok(round.flights.every(f=>f.progress<=departure));
  }
  assert.ok(seenOverlap);
  assert.ok(maximum<=4);
});

test("feast consumes each current fruit once, preserves bombs and starts a fresh meter",()=>{
  const round=new Round();
  for(let i=0;i<capacity-1;i++)round.bite(add(round,"melon"));
  assert.equal(round.feast(),null);
  round.bite(add(round,"orange"));
  const bomb=add(round,"bomb");
  assert.equal(round.feast(),null);
  assert.ok(round.full);
  const first=add(round,"cherry"),second=add(round,"berry");
  const previous=round.score;
  const result=round.feast();
  assert.deepEqual(result.fruits,[first,second]);
  assert.equal(result.points,40);
  assert.equal(round.score,previous+40);
  assert.equal(round.hits,capacity+2);
  assert.equal(round.streak,capacity+2);
  assert.deepEqual(round.flights,[bomb]);
  assert.equal(round.fullness,0);
  assert.equal(round.bite(first),0);
  assert.equal(round.feast(),null);
  assert.equal(round.bite(bomb),-20);
  assert.equal(round.streak,0);
});

test("closed eyes require a fresh half-second hold with full charge and tracked frames",()=>{
  const gesture=new FeastGesture();
  const open={eyesOpen:true,eyesShut:false},shut={eyesOpen:false,eyesShut:true};
  const sample=(face,time,full=true)=>gesture.sample(face,full,time);
  sample(open,0,false);
  assert.equal(sample(shut,100),false);
  sample(open,200);sample(shut,300);sample(open,410);
  sample(shut,450);sample(shut,600);sample(null,650);
  assert.equal(sample(shut,800),false);
  sample(open,900);sample(shut,1000);
  assert.equal(sample(shut,1501),false); // Missing video frames.
  sample(open,1600);sample(shut,1700);sample(shut,1900);sample(shut,2100);
  assert.equal(sample(shut,2200),true);
  assert.equal(sample(shut,2320),false);
});

test("head position tracks left and right, with a stable neutral point and reachable edges",()=>{
  const aim=x=>headAim({headX:x},.45,.14);
  assert.equal(aim(.455),.5);
  assert.ok(aim(.38)<.5);
  assert.ok(aim(.52)>.5);
  assert.equal(aim(.2),0);
  assert.equal(aim(.7),1);
});
