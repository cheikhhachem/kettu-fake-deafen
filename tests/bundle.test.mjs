import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import vm from "node:vm";
import patcher from "spitroast";
test("built manifest and expression execute through the actual Kettu loader contract",()=>{
 const build=spawnSync(process.execPath,["scripts/build.mjs"],{encoding:"utf8"});assert.equal(build.status,0,build.stderr);
 const root=new URL("../dist/fake-deafen/",import.meta.url);const manifest=JSON.parse(readFileSync(new URL("manifest.json",root)));
 const js=readFileSync(new URL(manifest.main,root),"utf8");assert.equal(manifest.hash,createHash("sha256").update(js).digest("hex"));
 // Same evaluation contract as Kettu's VdPluginManager.evalPlugin; no Discord network or credentials.
 const loader=vm.runInNewContext(`vendetta=>{return ${js}}`);const frames=[],commands=[],toasts=[];
 const socket={voiceStateUpdate(){},send(...a){frames.push(structuredClone(a));}};const gateway={getSocket:()=>socket};
 const api={patcher,metro:{findByStoreName:()=>gateway,common:{channels:{getVoiceChannelId:()=>"200"},React:{useState:()=>[0,()=>{}],createElement:(type,props,...children)=>({type,props,children})},ReactNative:{ScrollView:"ScrollView",Text:"Text",Pressable:"Pressable"}}},commands:{registerCommand:c=>{commands.push(c);return()=>{};}},ui:{toasts:{showToast:t=>toasts.push(t)}}};
 const plugin=loader(api);plugin.onLoad();assert.equal(typeof plugin.settings,"function");assert.equal(plugin.settings().type,"ScrollView");
 socket.send(4,{guild_id:"100",channel_id:"200",self_mute:false,self_deaf:false});commands[0].execute([],{});
 assert.equal(frames.at(-1)[1].self_deaf,true);assert.equal(frames.at(-1)[1].self_mute,false);assert.match(toasts.at(-1),/REQUEST SENT/);
 plugin.onUnload();assert.equal(frames.at(-1)[1].self_deaf,false);
});
