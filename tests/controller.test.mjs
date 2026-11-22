import test from "node:test";
import assert from "node:assert/strict";
import patcher from "spitroast";
let createController;
try { ({createController}=await import("../src/controller.js")); } catch (e) { if(e.code!=="ERR_MODULE_NOT_FOUND")throw e; }
const real={guild_id:"100",channel_id:"200",self_mute:false,self_deaf:false,self_video:true};
function fixture() {
 const sent=[]; let current="200";
 const makeSocket=()=>{const s={voiceStateUpdate(){},send(...args){assert.equal(this,s);sent.push(structuredClone(args));return 42;}};return s;};
 let socket=makeSocket();
 const gateway={getSocket(){return socket;}};
 assert.equal(typeof createController,"function","Missing controller implementation");
 const controller=createController({patcher,gateway,getVoiceChannelId:()=>current});controller.start();
 return {controller,sent,gateway,get socket(){return socket;},setCurrent(v){current=v;},replaceSocket(){socket={voiceStateUpdate(){},send(...args){sent.push(structuredClone(args));}};gateway.getSocket();return socket;}};
}
test("only reported deafening changes; microphone and input are untouched",()=>{
 const f=fixture();const input=Object.freeze({...real});
 assert.equal(f.socket.send(4,input),42);
 assert.deepEqual(f.sent[0],[4,real]);
 const result=f.controller.setEnabled(true);
 assert.equal(result.state,"requested");
 assert.deepEqual(f.sent.at(-1),[4,{...real,self_deaf:true}]);
 assert.equal(input.self_deaf,false);assert.equal(input.self_mute,false);
 f.controller.stop();
});
test("disable and unload restore the latest real flags without changing microphone state",()=>{
 const f=fixture();const original=f.socket.send;
 f.socket.send(4,{...real,self_mute:true});f.controller.setEnabled(true);
 f.controller.setEnabled(false);assert.deepEqual(f.sent.at(-1),[4,{...real,self_mute:true}]);
 f.controller.setEnabled(true);f.controller.stop();assert.deepEqual(f.sent.at(-1),[4,{...real,self_mute:true}]);
 const count=f.sent.length;f.controller.stop();assert.equal(f.sent.length,count);
});
test("never replays a stale channel or reconnects the user while toggling",()=>{
 const f=fixture();f.socket.send(4,real);f.setCurrent("300");const count=f.sent.length;
 f.controller.setEnabled(true);f.controller.stop();assert.equal(f.sent.length,count);
});
test("gateway socket replacement removes old hooks and resets active state",()=>{
 const f=fixture();const old=f.socket;f.socket.send(4,real);f.controller.setEnabled(true);
 f.replaceSocket();assert.equal(f.controller.status().enabled,false);
 old.send(4,real);assert.deepEqual(f.sent.at(-1),[4,real]);
 f.socket.send(4,real);assert.deepEqual(f.sent.at(-1),[4,real]);
 f.controller.setEnabled(true);assert.deepEqual(f.sent.at(-1),[4,{...real,self_deaf:true}]);f.controller.stop();
});
test("leave packets disable the override and all non-voice or malformed traffic passes untouched",()=>{
 const f=fixture();f.socket.send(4,real);f.controller.setEnabled(true);
 for(const args of [[1,null],[2,{token:"fixture-not-a-credential"}],[4,{self_deaf:false}],[4,{...real,self_mute:"wrong"}],["binary-frame"],[{op:4,d:real}]]){
  f.socket.send(...args);assert.deepEqual(f.sent.at(-1),args);
 }
 const leave={...real,channel_id:null};f.socket.send(4,leave);
 assert.deepEqual(f.sent.at(-1),[4,leave]);assert.equal(f.controller.status().enabled,false);
 f.setCurrent(null);const count=f.sent.length;f.controller.stop();assert.equal(f.sent.length,count);
});
test("unsupported sockets fail explicitly instead of claiming enabled",()=>{
 const controller=createController({patcher,gateway:{getSocket:()=>({send(){}})},getVoiceChannelId:()=>null});controller.start();
 assert.throws(()=>controller.setEnabled(true),/compatible/i);assert.equal(controller.status().enabled,false);assert.equal(controller.status().state,"unavailable");controller.stop();
});
test("failed resend never leaves a false active state and cleanup still removes patches",()=>{
 let fail=false;const original=function(){if(fail)throw Error("fixture send failure");};const socket={voiceStateUpdate(){},send:original};
 const gateway={getSocket:()=>socket};const c=createController({patcher,gateway,getVoiceChannelId:()=>"200"});c.start();socket.send(4,real);fail=true;
 assert.throws(()=>c.setEnabled(true),/fixture send failure/);assert.equal(c.status().enabled,false);
 c.stop();assert.equal(socket.send,original);
});
test("arming before any observed voice update does not invent a payload or claim requested",()=>{
 const f=fixture();assert.equal(f.controller.setEnabled(true).state,"armed");assert.equal(f.sent.length,0);
 f.socket.send(4,real);assert.equal(f.controller.status().state,"requested");assert.equal(f.sent.at(-1)[1].self_deaf,true);f.controller.stop();
});
export {fixture,real};
