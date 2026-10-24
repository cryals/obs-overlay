# OBS Mouse Overlay

## Start

```powershell
cd D:\zzz\obs-mouse-overlay
npm install
npm start
```

In OBS add **Browser Source** → URL `http://127.0.0.1:31337/overlay/` → width and height `512` → enable **Refresh browser when scene becomes active**. The page is transparent.

## Portable EXE

The CI workflow produces one standalone file: `Pink-Kitty-OBS-Overlay-*-portable.exe`. No installer is used. Keep it open during a stream: its status window confirms the server is live and repeats the two OBS URLs.

**OBS setting:** open each Browser Source's Properties and delete every character from **Custom CSS**. OBS inserts default CSS there; leaving it can create a background or offset the transparent overlays.

## Keyboard source

Add a second **Browser Source** at `http://127.0.0.1:31337/keyboard/`, also `512×512`. It follows the rows `Tab Q W E R T`, `Caps A S D F G`, `Shift Z X C V`, and `Ctrl Alt Space`. Restart the Node process once after updating to enable keyboard events.

## Preview

Run `npm run demo`, then open the URL in a browser. It drives a safe animation without reading the mouse.

## Skins

Duplicate `skins/pink-kitty`, supply a transparent `base-ai.png`, and update `manifest.json`. The press-reference images are kept as art references; runtime highlights are composited independently so every combination of left/right/middle buttons has a distinct response.
