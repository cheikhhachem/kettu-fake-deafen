// SPDX-License-Identifier: GPL-3.0-or-later
// Inspired by fizzexual/DeafenVencord. Intercepts gateway state, never audio controls.
export function createController({patcher,gateway,getVoiceChannelId}) {
    let socket=null,unpatchSend=null,unpatchGetter=null;
    let started=false,enabled=false,last=null,applied=false;
    const status=()=>({state:!started?"stopped":!unpatchSend?"unavailable":enabled?(applied?"requested":"armed"):"off",enabled,hookReady:!!unpatchSend,realDeaf:last?.self_deaf===true});
    function adopt(candidate) {
        if(socket===candidate)return;
        unpatchSend?.();unpatchSend=null;socket=candidate;
        enabled=false;last=null;applied=false;
        if(!socket || typeof socket.send!=="function" || typeof socket.voiceStateUpdate!=="function")return;
        unpatchSend=patcher.instead("send",socket,function(args,original){
            const payload=args[1];
            const isVoice=args[0]===4 && payload && typeof payload==="object"
                && (payload.channel_id===null || typeof payload.channel_id==="string")
                && (payload.guild_id==null || typeof payload.guild_id==="string")
                && typeof payload.self_deaf==="boolean" && typeof payload.self_mute==="boolean";
            if(isVoice) {
                const real={...payload};
                if(real.channel_id===null) {
                    const result=original.apply(this,args);
                    last=null;enabled=false;applied=false;return result;
                }
                const out=enabled?[4,{...real,self_deaf:true},...args.slice(2)]:args;
                const result=original.apply(this,out);
                last=real;applied=enabled;
                return result;
            }
            return original.apply(this,args);
        });
    }
    function refresh(){adopt(gateway.getSocket());}
    return {
        status,
        start() {
            if(started)return;
            started=true;
            unpatchGetter=patcher.after("getSocket",gateway,(_,result)=>{adopt(result);});
            refresh();
        },
        setEnabled(value) {
            if(!started)throw new Error("Plugin is stopped");
            refresh();
            if(value && !unpatchSend)throw new Error("Compatible gateway socket unavailable; client build not supported yet");
            enabled=!!value;applied=false;
            try {
                if(last?.channel_id!=null && last.channel_id===getVoiceChannelId())socket.send(4,{...last});
            } catch(error) {enabled=false;applied=false;last=null;throw error;}
            return status();
        },
        stop() {
            if(!started)return;
            try {if(enabled)this.setEnabled(false);}
            finally {unpatchGetter?.();unpatchSend?.();unpatchGetter=null;unpatchSend=null;socket=null;last=null;enabled=false;applied=false;started=false;}
        }
    };
}
