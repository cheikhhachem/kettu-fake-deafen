(()=>{ /* Fake Deafen 0.1.0; GPL-3.0-or-later. See source archive and NOTICE. */
var __FakeDeafen = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    default: () => index_default
  });

  // src/controller.js
  function createController({ patcher, gateway, getVoiceChannelId }) {
    let socket = null, unpatchSend = null, unpatchGetter = null;
    let started = false, enabled = false, last = null, applied = false;
    const status = () => ({ state: !started ? "stopped" : !unpatchSend ? "unavailable" : enabled ? applied ? "requested" : "armed" : "off", enabled, hookReady: !!unpatchSend, realDeaf: (last == null ? void 0 : last.self_deaf) === true });
    function adopt(candidate) {
      if (socket === candidate) return;
      unpatchSend == null ? void 0 : unpatchSend();
      unpatchSend = null;
      socket = candidate;
      enabled = false;
      last = null;
      applied = false;
      if (!socket || typeof socket.send !== "function" || typeof socket.voiceStateUpdate !== "function") return;
      unpatchSend = patcher.instead("send", socket, function(args, original) {
        const payload = args[1];
        const isVoice = args[0] === 4 && payload && typeof payload === "object" && (payload.channel_id === null || typeof payload.channel_id === "string") && (payload.guild_id == null || typeof payload.guild_id === "string") && typeof payload.self_deaf === "boolean" && typeof payload.self_mute === "boolean";
        if (isVoice) {
          const real = __spreadValues({}, payload);
          if (real.channel_id === null) {
            const result2 = original.apply(this, args);
            last = null;
            enabled = false;
            applied = false;
            return result2;
          }
          const out = enabled ? [4, __spreadProps(__spreadValues({}, real), { self_deaf: true }), ...args.slice(2)] : args;
          const result = original.apply(this, out);
          last = real;
          applied = enabled;
          return result;
        }
        return original.apply(this, args);
      });
    }
    function refresh() {
      adopt(gateway.getSocket());
    }
    return {
      status,
      start() {
        if (started) return;
        started = true;
        unpatchGetter = patcher.after("getSocket", gateway, (_, result) => {
          adopt(result);
        });
        refresh();
      },
      setEnabled(value) {
        if (!started) throw new Error("Plugin is stopped");
        refresh();
        if (value && !unpatchSend) throw new Error("Compatible gateway socket unavailable; client build not supported yet");
        enabled = !!value;
        applied = false;
        try {
          if ((last == null ? void 0 : last.channel_id) != null && last.channel_id === getVoiceChannelId()) socket.send(4, __spreadValues({}, last));
        } catch (error) {
          enabled = false;
          applied = false;
          last = null;
          throw error;
        }
        return status();
      },
      stop() {
        if (!started) return;
        try {
          if (enabled) this.setEnabled(false);
        } finally {
          unpatchGetter == null ? void 0 : unpatchGetter();
          unpatchSend == null ? void 0 : unpatchSend();
          unpatchGetter = null;
          unpatchSend = null;
          socket = null;
          last = null;
          enabled = false;
          applied = false;
          started = false;
        }
      }
    };
  }

  // src/plugin.js
  function createPlugin(api) {
    let controller = null, unregister = [], loaded = false, problem = "";
    function statusText() {
      if (problem) return `Fake Deafen: UNAVAILABLE \u2014 ${problem}`;
      const s = controller == null ? void 0 : controller.status();
      if (!s || s.state === "unavailable") return "Fake Deafen: UNAVAILABLE \u2014 compatible gateway socket not found";
      if (s.state === "requested") return "Fake Deafen: REQUEST SENT \u2014 deafened flag sent; audio/remote icon not independently verified. Microphone unchanged." + (s.realDeaf ? " Normal Deafen is also ON; turn it OFF to hear." : "");
      if (s.state === "armed") return "Fake Deafen: ARMED, not sent yet. Join/rejoin voice or change your voice state. Microphone unchanged.";
      return "Fake Deafen: OFF";
    }
    const notify = () => api.ui.toasts.showToast(statusText());
    function toggle() {
      if (!controller) {
        notify();
        return;
      }
      try {
        controller.setEnabled(!controller.status().enabled);
      } catch (e) {
        api.ui.toasts.showToast("Fake Deafen: unable to send. Run /fdstatus; do not assume it is active.");
        return;
      }
      notify();
    }
    function Settings() {
      const { React: R, ReactNative: N } = api.metro.common;
      const [, update] = R.useState(0);
      const button = (label, action) => R.createElement(N.Pressable, { onPress: () => {
        action();
        update((v) => v + 1);
      }, style: { padding: 14, marginVertical: 6, backgroundColor: "#34415b", borderRadius: 8 } }, R.createElement(N.Text, { style: { color: "white", fontSize: 16 } }, label));
      return R.createElement(
        N.ScrollView,
        { contentContainerStyle: { padding: 18, backgroundColor: "#17191f", flexGrow: 1 } },
        R.createElement(N.Text, { style: { color: "white", fontSize: 21, marginBottom: 16 } }, "Fake Deafen \xB7 experimental 0.1.0"),
        R.createElement(N.Text, { style: { color: "#ddd", fontSize: 16, marginBottom: 16 } }, statusText()),
        button((controller == null ? void 0 : controller.status().enabled) ? "Turn OFF" : "Turn ON", toggle),
        button("Refresh status", () => {
        }),
        R.createElement(N.Text, { style: { color: "#bbb", fontSize: 14, marginTop: 12 } }, "Changes reported deafening only. Your microphone remains exactly as you set it. Leave normal Deafen OFF to hear. Resets on leaving voice, replacing the gateway socket, or restarting the app. REQUEST SENT is not proof of audible playback or remote status. Use only where participants understand your presence. No recording, uploads or analytics.")
      );
    }
    return {
      onLoad() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        if (loaded) return;
        loaded = true;
        problem = "";
        try {
          const gateway = (_e = (_b = (_a = api.metro).findByStoreName) == null ? void 0 : _b.call(_a, "GatewayConnectionStore")) != null ? _e : (_d = (_c = api.metro).findByProps) == null ? void 0 : _d.call(_c, "getSocket");
          const channels = (_h = api.metro.common.channels) != null ? _h : (_g = (_f = api.metro).findByProps) == null ? void 0 : _g.call(_f, "getVoiceChannelId");
          if (typeof (gateway == null ? void 0 : gateway.getSocket) !== "function") throw new Error("GatewayConnectionStore/getSocket unavailable on this build");
          if (typeof (channels == null ? void 0 : channels.getVoiceChannelId) !== "function") throw new Error("Current voice-channel store unavailable");
          controller = createController({ patcher: api.patcher, gateway, getVoiceChannelId: () => channels.getVoiceChannelId() });
          controller.start();
        } catch (error) {
          try {
            controller == null ? void 0 : controller.stop();
          } finally {
            controller = null;
          }
          problem = error.message;
        }
        try {
          for (const command of [
            { name: "fd", description: "Toggle reported deafening (experimental)", execute: () => {
              toggle();
            } },
            { name: "fdstatus", description: "Show local Fake Deafen diagnostics", execute: () => {
              notify();
            } }
          ]) {
            unregister.push(api.commands.registerCommand(command));
          }
        } catch (error) {
          this.onUnload();
          throw error;
        }
      },
      onUnload() {
        try {
          controller == null ? void 0 : controller.stop();
        } finally {
          for (const fn of unregister.splice(0)) fn();
          controller = null;
          loaded = false;
        }
      },
      settings: Settings
    };
  }

  // src/index.js
  var index_default = createPlugin(vendetta);
  return __toCommonJS(index_exports);
})();

return __FakeDeafen.default;
})()