# LibreMetronome for macOS

A native macOS app (Swift, AppKit, WKWebView) around the shared React
frontend. The web bundle from `frontend/build` is served from inside the app
under `libremetronome://app/`, so the app works offline without the Django
backend; the sound-set service falls back to its built-in sounds.

## Build and install

Requires Xcode (the build script uses it automatically when the active
developer directory points at the older Command Line Tools) and the frontend
dependencies (`cd frontend && npm install`).

```bash
macos/build.sh                      # web build + universal app in macos/build/
macos/build.sh --install --dock     # also copy to /Applications and pin in the Dock
macos/build.sh --skip-web --debug   # reuse frontend/build, Web Inspector, error log on stderr
```

The app is signed ad hoc by default; pass `--sign "Apple Development: …"` to
use a certificate. Distribution outside this Mac would additionally need a
Developer ID certificate and notarization.

## Native features

- **Dock**: BPM badge while playing; right-click menu with Start/Pause,
  tempo steps, tempo presets and mode selection. Closing the window keeps the
  metronome running; clicking the Dock icon brings the window back.
- **Menu bar**: Start/Pause `⌘↩`, Tap Tempo `⌘T`, Tempo ±1 `⌘]`/`⌘[`,
  ±10 `⇧⌘]`/`⇧⌘[`, presets, beats per bar, modes `⌘1`–`⌘5`, settings `⌘,`,
  page zoom `⌘+`/`⌘-`/`⌘0`, Keep on Top, full screen.
  The web shortcuts (Space, T, arrow keys, 1–9) keep working in the window.
- **Global shortcut**: `⌃⌥⌘P` starts/pauses from any app (can be switched off
  in the Metronome menu).
- **Media keys and Control Center**: the play/pause key and headphone buttons
  control the metronome once it is the current Now Playing app.
- **Background playback**: App Nap and idle sleep are suspended while playing,
  and WebKit's timer throttling for hidden pages is disabled, so the Web Audio
  lookahead scheduler keeps full timing when the window is closed, minimized
  or on another Space. The pendulum animation pauses while the window is not
  visible; audio does not. The system is asked to pause playback before sleep.
- **Automation** via URL, e.g. from Shortcuts, Raycast, a Stream Deck or
  Terminal:

  ```bash
  open libremetronome://control/toggle      # also: start, stop, tap, show
  open libremetronome://control/tempo/96    # absolute, or tempo/+5, tempo/-5
  open libremetronome://control/mode/grid   # analog, beat, grid, sequence, polyrhythm
  open libremetronome://control/beats/3
  ```

## Web ↔ native bridge

`frontend/src/desktop.js` posts `{ tempo, isPaused, mode, subdivisions }` to
the `libreMetronome` message handler and the shell sends commands as
`libremetronome-native-command` window events, handled in `App.js`. Outside
the macOS app the bridge is inactive.

## Limitations

- Hidden-page timer throttling is disabled through WebKit preferences that are
  not public API. They are applied only when WebKit offers them; a Mac App
  Store build would need a different approach, for example a Web Worker timer
  in the frontend scheduler.
- Audible timing has not been measured externally; Bluetooth output adds
  route-dependent latency.
