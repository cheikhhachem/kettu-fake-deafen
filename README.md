# Fake Deafen

A [Kettu](https://github.com/C0C0B01/Kettu) plugin that reports you as deafened to Discord without changing your local audio or microphone controls. It is a mobile port of [DeafenVencord](https://github.com/fizzexual/DeafenVencord).

**Status:** built and tested in a Node fixture harness, not yet verified on a phone. Treat this as experimental.

## What it does

- `/fd` toggles the deafen report. You get a local toast, not a channel message.
- `/fdstatus` shows a local status/diagnostic toast.
- Plugin settings include toggle and refresh buttons.
- Your microphone stays as you set it and may remain live. Leave Discord's normal Deafen control **off** if you want to keep hearing others.
- Starts off. Leaving voice, replacing the gateway socket, or disabling the plugin resets or restores the real voice state when it can.
- This cannot override a moderator or server-imposed deafen, and it does not claim to be undetectable.

## Install in Kettu

1. In Kettu, open **Settings → General** and turn on **Developer Settings**.
2. Open the **Plugins** tab and choose **Install Plugin**.
3. Paste this URL:

```
https://raw.githubusercontent.com/cheikhhachem/kettu-fake-deafen/main/dist/fake-deafen/manifest.json
```

The same `manifest.json` URL is the install link. After it loads, enable the plugin.

## Other mobile clients

This plugin uses the Vendetta-compatible plugin API (a standard `manifest.json` plus a bundled `index.js`). That API is shared by **Vendetta**, **Bunny**, **Kettu** (which continues Bunny), and **Revenge**, so you should be able to install it the same way: paste the manifest URL above into the client's plugin installer.

Runtime behavior is a different question. The plugin hooks Kettu's Vendetta-compatible gateway socket to send a voice-state update. Similar hooks may exist on Revenge and the other clients in this family, but none of them have been tested on a phone yet. If the hook is missing, the plugin will not claim success.

Modified Discord clients and plugins can carry account or terms-of-service risk.

## Build

Node 20+ and npm:

```sh
npm ci --ignore-scripts
npm test
npm run build
```

Build output is `dist/fake-deafen/{manifest.json,index.js}`. The manifest hash is the SHA-256 of the plugin bundle.

## License

GPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

Authors: Vermillion, with the original Vencord plugin by [fizzexual](https://github.com/fizzexual/DeafenVencord).
