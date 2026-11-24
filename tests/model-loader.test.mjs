import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {loadModel,prepareStartButtons} from "../model-loader.js";

test("partial model reports real progress, blocks both starts, and permits one fresh retry",async t=>{
  const bytes=await readFile(new URL("../vendor/mediapipe/face_landmarker.task",import.meta.url));
  let stream,requests=0,attemptUrl;
  t.mock.method(globalThis,"fetch",async url=>{
    requests++;attemptUrl=String(url);
    return new Response(new ReadableStream({start(controller){stream=controller;}}));
  });
  const controls=[{disabled:false},{disabled:false}];
  const label={},progress={removeAttribute(){}},retry=new EventTarget();
  const panel={dataset:{},querySelector(s){return {"[role=status]":label,progress,button:retry}[s];}};
  let ready=0;
  prepareStartButtons(panel,controls,()=>ready++);
  const outcome=assert.rejects(loadModel(),/不完整/);
  assert.equal(requests,1);
  assert.ok(controls.every(button=>button.disabled));
  stream.enqueue(bytes.subarray(0,Math.ceil(bytes.length/2)));
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(progress.value,50);
  assert.equal(ready,0);
  stream.close();await outcome;
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(panel.dataset.state,"error");
  assert.equal(retry.hidden,false);
  assert.ok(controls.every(button=>button.disabled));

  const reloading=retry.onclick();retry.onclick();
  assert.equal(requests,2);
  assert.match(attemptUrl,/model-retry=/);
  const corrupt=Buffer.from(bytes);corrupt[0]^=1;
  stream.enqueue(corrupt);stream.close();
  await reloading;
  assert.match(label.textContent,/校验失败/);
  assert.equal(ready,0);
  assert.ok(controls.every(button=>button.disabled));
});
