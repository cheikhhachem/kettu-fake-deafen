import test from "node:test";
import assert from "node:assert/strict";
import patcher from "spitroast";
let createPlugin;
try{({createPlugin}=await import("../src/plugin.js"));}catch(e){if(e.code!=="ERR_MODULE_NOT_FOUND")throw e;}
export function makeApi({unsupported=false}={}){
 const sent=[],commands=[],toasts=[];const socket={voiceStateUpdate(){},send(...args){sent.push(structuredClone(args));}};
 const gateway={getSocket:()=>socket};let removed=0;
 const api={patcher,metro:{findByStoreName:n=>unsupported?undefined:n==="GatewayConnectionStore"?gateway:undefined,findByProps:()=>undefined,
 common:{channels:{getVoiceChannelId:()=>"200"}}},ui:{toasts:{showToast:t=>toasts.push(t)}},commands:{registerCommand:c=>{commands.push(c);return()=>removed++;}},logger:{warn(){}}};
 return {api,sent,commands,toasts,socket,gateway,get removed(){return removed;}};
}
test("missing mobile gateway keeps diagnostics usable and sends no fake success",()=>{
 const f=makeApi({unsupported:true});const p=createPlugin(f.api);p.onLoad();
 f.commands.find(c=>c.name==="fd").execute([],{});assert.match(f.toasts.at(-1),/UNAVAILABLE/);assert.equal(f.sent.length,0);p.onUnload();
});
test("Vendetta entry registers local-only commands and restores state on unload",()=>{
 assert.equal(typeof createPlugin,"function","Missing mobile plugin adapter");const f=makeApi();const original=f.socket.send;
 const plugin=createPlugin(f.api);plugin.onLoad();assert.equal(typeof plugin.settings,"function");
 const fd=f.commands.find(c=>c.name==="fd");assert.ok(fd);
 f.socket.send(4,{guild_id:"100",channel_id:"200",self_mute:true,self_deaf:false});
 assert.equal(fd.execute([],{}),undefined,"Command return must not post a message");assert.equal(f.sent.at(-1)[1].self_deaf,true);assert.equal(f.sent.at(-1)[1].self_mute,true);
 assert.ok(f.toasts.some(t=>t.includes("REQUEST SENT")));
 const status=f.commands.find(c=>c.name==="fdstatus");assert.equal(status.execute([],{}),undefined);
 plugin.onUnload();assert.equal(f.sent.at(-1)[1].self_deaf,false);assert.equal(f.socket.send,original);assert.equal(f.removed,2);
 plugin.onUnload();assert.equal(f.removed,2);
});
