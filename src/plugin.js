// SPDX-License-Identifier: GPL-3.0-or-later
import {createController} from "./controller.js";
export function createPlugin(api) {
    let controller=null,unregister=[],loaded=false,problem="";
    function statusText() {
        if(problem)return `Fake Deafen: UNAVAILABLE — ${problem}`;
        const s=controller?.status();
        if(!s || s.state==="unavailable")return "Fake Deafen: UNAVAILABLE — compatible gateway socket not found";
        if(s.state==="requested")return "Fake Deafen: REQUEST SENT — deafened flag sent; audio/remote icon not independently verified. Microphone unchanged."
            +(s.realDeaf?" Normal Deafen is also ON; turn it OFF to hear.":"");
        if(s.state==="armed")return "Fake Deafen: ARMED, not sent yet. Join/rejoin voice or change your voice state. Microphone unchanged.";
        return "Fake Deafen: OFF";
    }
    const notify=()=>api.ui.toasts.showToast(statusText());
    function toggle() {
        if(!controller){notify();return;}
        try{controller.setEnabled(!controller.status().enabled);}
        catch {api.ui.toasts.showToast("Fake Deafen: unable to send. Run /fdstatus; do not assume it is active.");return;}
        notify();
    }
    function Settings() {
        const {React:R,ReactNative:N}=api.metro.common;
        const [,update]=R.useState(0);
        const button=(label,action)=>R.createElement(N.Pressable,{onPress:()=>{action();update(v=>v+1);},style:{padding:14,marginVertical:6,backgroundColor:"#34415b",borderRadius:8}},R.createElement(N.Text,{style:{color:"white",fontSize:16}},label));
        return R.createElement(N.ScrollView,{contentContainerStyle:{padding:18,backgroundColor:"#17191f",flexGrow:1}},
            R.createElement(N.Text,{style:{color:"white",fontSize:21,marginBottom:16}},"Fake Deafen · experimental 0.1.0"),
            R.createElement(N.Text,{style:{color:"#ddd",fontSize:16,marginBottom:16}},statusText()),
            button(controller?.status().enabled?"Turn OFF":"Turn ON",toggle),
            button("Refresh status",()=>{}),
            R.createElement(N.Text,{style:{color:"#bbb",fontSize:14,marginTop:12}},"Changes reported deafening only. Your microphone remains exactly as you set it. Leave normal Deafen OFF to hear. Resets on leaving voice, replacing the gateway socket, or restarting the app. REQUEST SENT is not proof of audible playback or remote status. Use only where participants understand your presence. No recording, uploads or analytics."));
    }
    return {
        onLoad() {
            if(loaded)return;loaded=true;problem="";
            try {
                const gateway=api.metro.findByStoreName?.("GatewayConnectionStore") ?? api.metro.findByProps?.("getSocket");
                const channels=api.metro.common.channels ?? api.metro.findByProps?.("getVoiceChannelId");
                if(typeof gateway?.getSocket!=="function")throw new Error("GatewayConnectionStore/getSocket unavailable on this build");
                if(typeof channels?.getVoiceChannelId!=="function")throw new Error("Current voice-channel store unavailable");
                controller=createController({patcher:api.patcher,gateway,getVoiceChannelId:()=>channels.getVoiceChannelId()});
                controller.start();
            } catch(error) {
                try{controller?.stop();}finally{controller=null;}
                problem=error.message;
            }
            try {
                for(const command of [{name:"fd",description:"Toggle reported deafening (experimental)",execute:()=>{toggle();}},
                    {name:"fdstatus",description:"Show local Fake Deafen diagnostics",execute:()=>{notify();}}]) {
                    unregister.push(api.commands.registerCommand(command));
                }
            } catch(error) {this.onUnload();throw error;}
        },
        onUnload() {
            try{controller?.stop();}
            finally{for(const fn of unregister.splice(0))fn();controller=null;loaded=false;}
        },
        settings:Settings
    };
}
