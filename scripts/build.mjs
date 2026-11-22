import {build} from "esbuild";
import {mkdir,readFile,writeFile} from "node:fs/promises";
import {createHash} from "node:crypto";
const result=await build({entryPoints:["src/index.js"],bundle:true,write:false,format:"iife",globalName:"__FakeDeafen",platform:"neutral",target:"es2017",legalComments:"inline"});
const js="(()=>{ /* Fake Deafen 0.1.0; GPL-3.0-or-later. See source archive and NOTICE. */\n"+result.outputFiles[0].text+"\nreturn __FakeDeafen.default;\n})()";
const manifest=JSON.parse(await readFile("manifest.json","utf8"));manifest.hash=createHash("sha256").update(js).digest("hex");
await mkdir("dist/fake-deafen",{recursive:true});await writeFile("dist/fake-deafen/index.js",js);await writeFile("dist/fake-deafen/manifest.json",JSON.stringify(manifest,null,2)+"\n");
console.log("Built fake-deafen:",Buffer.byteLength(js),"bytes; sha256",manifest.hash);
