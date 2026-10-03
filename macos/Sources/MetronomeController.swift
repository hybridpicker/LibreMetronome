import AppKit
import WebKit

enum MetronomeMode: String, CaseIterable {
    case analog, circle, grid, multi, polyrhythm

    var title: String {
        switch self {
        case .analog: "Analog"
        case .circle: "Beat"
        case .grid: "Grid"
        case .multi: "Sequence"
        case .polyrhythm: "Polyrhythm"
        }
    }
}

/// Transport state as reported by the web app (`frontend/src/desktop.js`).
struct MetronomeState: Equatable {
    var tempo = 120
    var isPaused = true
    var mode = MetronomeMode.analog
    var subdivisions = 4

    var isPlaying: Bool { !isPaused }
}

/// Owns the metronome window and its web view, and connects the web app to
/// macOS: menu bar, Dock tile and menu, media keys, a global shortcut and
/// App Nap prevention during playback.
@MainActor
final class MetronomeController: NSWindowController, NSWindowDelegate {
    static let tempoRange = 15...240
    static let tempoPresets = [40, 60, 72, 80, 92, 100, 108, 120, 132, 144, 160, 180, 200]
    static let websiteURL = URL(string: "https://libremetronome.com/")!
    static let sourceURL = URL(string: "https://github.com/hybridpicker/LibreMetronome")!

    private enum DefaultsKey {
        static let keepOnTop = "keepWindowOnTop"
        static let pageZoom = "pageZoom"
        static let globalShortcut = "globalShortcutEnabled"
    }

    private(set) var state = MetronomeState()
    private let webView: WKWebView
    private let bridge = WebBridge()
    private let nowPlaying = NowPlayingController()
    private var globalHotKey: GlobalHotKey?
    private var playbackActivity: NSObjectProtocol?
    private let defaults = UserDefaults.standard
    private var isWebAppReady = false
    private var pendingScripts: [String] = []

    init() {
        let configuration = WKWebViewConfiguration()
        let webRoot = Bundle.main.resourceURL!.appendingPathComponent("web", isDirectory: true)
        configuration.setURLSchemeHandler(WebBundleSchemeHandler(root: webRoot), forURLScheme: WebBundleSchemeHandler.scheme)
        configuration.userContentController.add(bridge, name: WebBridge.handlerName)
        // Start/Pause from the Dock, the menu bar or a media key has no web
        // gesture behind it, so Web Audio must be allowed to start without one.
        configuration.mediaTypesRequiringUserActionForPlayback = []
        // Keep the lookahead scheduler running at full rate while the window
        // is hidden, minimized or covered by another app.
        configuration.preferences.inactiveSchedulingPolicy = .none
        configuration.preferences.isElementFullscreenEnabled = true
        disableHiddenPageThrottling(configuration.preferences)

        #if DEBUG
        // Forward page errors to stderr; the production bundle silences console.
        configuration.userContentController.add(DebugLogger(), name: DebugLogger.handlerName)
        configuration.userContentController.addUserScript(WKUserScript(source: DebugLogger.script, injectionTime: .atDocumentStart, forMainFrameOnly: true))
        #endif

        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.allowsBackForwardNavigationGestures = false
        webView.allowsMagnification = false
        webView.underPageBackgroundColor = .white
        #if DEBUG
        webView.isInspectable = true
        #endif

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 1080, height: 800),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "LibreMetronome"
        window.titlebarAppearsTransparent = true
        window.backgroundColor = .white
        // The product canvas is white in every system appearance.
        window.appearance = NSAppearance(named: .aqua)
        window.minSize = NSSize(width: 380, height: 560)
        window.isReleasedWhenClosed = false
        window.tabbingMode = .disallowed
        window.collectionBehavior.insert(.fullScreenPrimary)
        window.contentView = webView
        window.center()
        window.setFrameAutosaveName("MetronomeWindow")

        super.init(window: window)

        window.delegate = self
        webView.navigationDelegate = self
        webView.uiDelegate = self
        bridge.controller = self

        applyStoredPreferences()
        configureNowPlaying()
        observeSystemSleep()
        updateSystemIntegration()
        loadWebApp(from: webRoot)
    }

    @available(*, unavailable)
    required init?(coder: NSCoder) {
        fatalError("init(coder:) is not supported")
    }

    // MARK: - Web app

    private func loadWebApp(from webRoot: URL) {
        let indexURL = webRoot.appendingPathComponent("index.html")
        if FileManager.default.fileExists(atPath: indexURL.path) {
            webView.load(URLRequest(url: WebBundleSchemeHandler.startURL))
        } else {
            webView.loadHTMLString("""
                <body style="font: 15px -apple-system; color: #183638; padding: 40px">
                <h2>Web bundle missing</h2>
                <p>Build the app with <code>macos/build.sh</code>, which copies
                <code>frontend/build</code> into the app bundle.</p></body>
                """, baseURL: nil)
        }
    }

    /// Sends a command to the web app (`DESKTOP_COMMAND_EVENT` in desktop.js).
    func send(_ command: String, value: Any? = nil) {
        let payload: [String: Any] = ["command": command, "value": value ?? NSNull()]
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let json = String(data: data, encoding: .utf8) else { return }
        let script = "window.dispatchEvent(new CustomEvent('libremetronome-native-command', { detail: \(json) }));"
        if isWebAppReady {
            webView.evaluateJavaScript(script, completionHandler: nil)
        } else {
            pendingScripts.append(script)
        }
    }

    /// Handles `libremetronome://control/<command>[/<value>]` for automation
    /// (Shortcuts, Raycast, Stream Deck, `open` in Terminal):
    /// `toggle`, `start`, `stop`, `tap`, `tempo/120`, `tempo/+5`, `tempo/-5`,
    /// `mode/grid`, `beats/3`, `show`.
    func handleControlURL(_ url: URL) {
        guard url.scheme == WebBundleSchemeHandler.scheme, url.host == "control" else { return }
        let parts = url.pathComponents.filter { $0 != "/" }
        guard let command = parts.first?.lowercased() else { return }
        let value = parts.count > 1 ? parts[1] : nil

        switch (command, value) {
        case ("toggle", _): send("togglePlay")
        case ("start", _), ("play", _): send("play")
        case ("stop", _), ("pause", _): send("pause")
        case ("tap", _): send("tapTempo")
        case ("show", _): showWindow(nil)
        case ("tempo", let value?):
            if value.hasPrefix("+") || value.hasPrefix("-"), let delta = Int(value) {
                send("adjustTempo", value: delta)
            } else if let bpm = Int(value) {
                send("setTempo", value: bpm)
            }
        case ("mode", let value?):
            let mode = MetronomeMode(rawValue: value.lowercased())
                ?? MetronomeMode.allCases.first { $0.title.lowercased() == value.lowercased() }
            if let mode { send("setMode", value: mode.rawValue) }
        case ("beats", let value?):
            if let beats = Int(value) { send("setSubdivisions", value: beats) }
        default:
            break
        }
    }

    fileprivate func receiveState(_ body: [String: Any]) {
        // The first state report means the app has mounted its command listener.
        if !isWebAppReady {
            isWebAppReady = true
            pendingScripts.forEach { webView.evaluateJavaScript($0, completionHandler: nil) }
            pendingScripts.removeAll()
        }
        var next = state
        if let tempo = (body["tempo"] as? NSNumber)?.intValue { next.tempo = tempo }
        if let isPaused = body["isPaused"] as? Bool { next.isPaused = isPaused }
        if let mode = (body["mode"] as? String).flatMap(MetronomeMode.init(rawValue:)) { next.mode = mode }
        if let subdivisions = (body["subdivisions"] as? NSNumber)?.intValue { next.subdivisions = subdivisions }
        guard next != state else { return }
        state = next
        updateSystemIntegration()
    }

    // MARK: - System integration

    private func updateSystemIntegration() {
        let status = state.isPlaying ? "Playing" : "Paused"
        window?.subtitle = "\(state.tempo) BPM · \(state.mode.title) · \(status)"
        NSApp.dockTile.badgeLabel = state.isPlaying ? String(state.tempo) : nil
        nowPlaying.update(with: state)
        updatePlaybackActivity()
    }

    /// Prevents App Nap and idle system sleep while the metronome is audible.
    private func updatePlaybackActivity() {
        if state.isPlaying, playbackActivity == nil {
            playbackActivity = ProcessInfo.processInfo.beginActivity(
                options: [.userInitiated, .latencyCritical],
                reason: "Metronome playback"
            )
        } else if !state.isPlaying, let activity = playbackActivity {
            ProcessInfo.processInfo.endActivity(activity)
            playbackActivity = nil
        }
    }

    private func configureNowPlaying() {
        nowPlaying.onCommand = { [weak self] command in self?.send(command) }
        nowPlaying.activate()
    }

    private func observeSystemSleep() {
        NSWorkspace.shared.notificationCenter.addObserver(
            forName: NSWorkspace.willSleepNotification, object: nil, queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated { self?.send("pause") }
        }
    }

    private func applyStoredPreferences() {
        window?.level = defaults.bool(forKey: DefaultsKey.keepOnTop) ? .floating : .normal
        let zoom = defaults.double(forKey: DefaultsKey.pageZoom)
        webView.pageZoom = zoom > 0 ? zoom : 1
        if defaults.object(forKey: DefaultsKey.globalShortcut) == nil {
            defaults.set(true, forKey: DefaultsKey.globalShortcut)
        }
        updateGlobalHotKey()
    }

    private func updateGlobalHotKey() {
        if defaults.bool(forKey: DefaultsKey.globalShortcut) {
            if globalHotKey == nil {
                globalHotKey = GlobalHotKey(keyCode: GlobalHotKey.playPauseKeyCode, modifiers: GlobalHotKey.playPauseModifiers) { [weak self] in
                    self?.send("togglePlay")
                }
            }
        } else {
            globalHotKey = nil
        }
    }

    // MARK: - Window

    override func showWindow(_ sender: Any?) {
        super.showWindow(sender)
        window?.makeKeyAndOrderFront(sender)
        window?.makeFirstResponder(webView)
        NSApp.activate()
    }

    /// Closing hides the window; playback continues and the Dock icon brings
    /// the window back. Quit (⌘Q) ends the app.
    func windowShouldClose(_ sender: NSWindow) -> Bool {
        sender.orderOut(nil)
        return false
    }

    // MARK: - Dock menu

    func makeDockMenu() -> NSMenu {
        let menu = NSMenu()
        let header = NSMenuItem(title: "\(state.tempo) BPM · \(state.mode.title)", action: nil, keyEquivalent: "")
        header.isEnabled = false
        menu.addItem(header)
        menu.addItem(item(state.isPlaying ? "Pause" : "Start", #selector(togglePlay(_:))))
        menu.addItem(.separator())
        menu.addItem(item("Tempo +1", #selector(tempoUp(_:))))
        menu.addItem(item("Tempo −1", #selector(tempoDown(_:))))
        menu.addItem(item("Tempo +10", #selector(tempoUpLarge(_:))))
        menu.addItem(item("Tempo −10", #selector(tempoDownLarge(_:))))
        let presets = NSMenuItem(title: "Tempo", action: nil, keyEquivalent: "")
        presets.submenu = makeTempoPresetMenu()
        menu.addItem(presets)
        let modes = NSMenuItem(title: "Mode", action: nil, keyEquivalent: "")
        modes.submenu = makeModeMenu(withShortcuts: false)
        menu.addItem(modes)
        return menu
    }

    func makeTempoPresetMenu() -> NSMenu {
        let menu = NSMenu(title: "Tempo")
        for bpm in Self.tempoPresets {
            let presetItem = item("\(bpm) BPM", #selector(setTempoPreset(_:)))
            presetItem.tag = bpm
            menu.addItem(presetItem)
        }
        return menu
    }

    func makeModeMenu(withShortcuts: Bool) -> NSMenu {
        let menu = NSMenu(title: "Mode")
        for (index, mode) in MetronomeMode.allCases.enumerated() {
            let modeItem = item(mode.title, #selector(selectMode(_:)), key: withShortcuts ? String(index + 1) : "")
            modeItem.representedObject = mode.rawValue
            menu.addItem(modeItem)
        }
        return menu
    }

    func item(_ title: String, _ action: Selector, key: String = "", modifiers: NSEvent.ModifierFlags = .command) -> NSMenuItem {
        let menuItem = NSMenuItem(title: title, action: action, keyEquivalent: key)
        menuItem.keyEquivalentModifierMask = modifiers
        menuItem.target = self
        return menuItem
    }

    // MARK: - Actions

    @objc func togglePlay(_ sender: Any?) { send("togglePlay") }
    @objc func tapTempo(_ sender: Any?) { send("tapTempo") }
    @objc func tempoUp(_ sender: Any?) { send("adjustTempo", value: 1) }
    @objc func tempoDown(_ sender: Any?) { send("adjustTempo", value: -1) }
    @objc func tempoUpLarge(_ sender: Any?) { send("adjustTempo", value: 10) }
    @objc func tempoDownLarge(_ sender: Any?) { send("adjustTempo", value: -10) }
    @objc func setTempoPreset(_ sender: NSMenuItem) { send("setTempo", value: sender.tag) }
    @objc func setBeats(_ sender: NSMenuItem) { send("setSubdivisions", value: sender.tag) }
    @objc func openSettings(_ sender: Any?) { showWindow(sender); send("toggleSettings") }
    @objc func openHelp(_ sender: Any?) { showWindow(sender); send("toggleInfo") }
    @objc func openWebsite(_ sender: Any?) { NSWorkspace.shared.open(Self.websiteURL) }
    @objc func openSourceCode(_ sender: Any?) { NSWorkspace.shared.open(Self.sourceURL) }

    @objc func selectMode(_ sender: NSMenuItem) {
        guard let mode = sender.representedObject as? String else { return }
        send("setMode", value: mode)
    }

    @objc func zoomIn(_ sender: Any?) { setPageZoom(webView.pageZoom + 0.1) }
    @objc func zoomOut(_ sender: Any?) { setPageZoom(webView.pageZoom - 0.1) }
    @objc func actualSize(_ sender: Any?) { setPageZoom(1) }

    private func setPageZoom(_ zoom: CGFloat) {
        let clamped = min(max((zoom * 10).rounded() / 10, 0.5), 2)
        webView.pageZoom = clamped
        defaults.set(Double(clamped), forKey: DefaultsKey.pageZoom)
    }

    @objc func toggleKeepOnTop(_ sender: Any?) {
        let enabled = !defaults.bool(forKey: DefaultsKey.keepOnTop)
        defaults.set(enabled, forKey: DefaultsKey.keepOnTop)
        window?.level = enabled ? .floating : .normal
    }

    @objc func toggleGlobalShortcut(_ sender: Any?) {
        defaults.set(!defaults.bool(forKey: DefaultsKey.globalShortcut), forKey: DefaultsKey.globalShortcut)
        updateGlobalHotKey()
    }

    @objc func reloadWebApp(_ sender: Any?) {
        isWebAppReady = false
        webView.reload()
    }
}

/// `inactiveSchedulingPolicy = .none` keeps the web process awake, but WebKit
/// still coalesces DOM timers of a hidden page to one per second or slower.
/// The web scheduler fills its Web Audio lookahead from `setInterval`, so a
/// closed, minimized or other-Space window would drop clicks. These WebKit
/// preferences are not public API; each is applied only if WebKit offers it.
@MainActor
private func disableHiddenPageThrottling(_ preferences: WKPreferences) {
    for name in ["_setHiddenPageDOMTimerThrottlingEnabled:",
                 "_setHiddenPageDOMTimerThrottlingAutoIncreases:",
                 "_setPageVisibilityBasedProcessSuppressionEnabled:"] {
        let selector = NSSelectorFromString(name)
        guard preferences.responds(to: selector) else { continue }
        typealias Setter = @convention(c) (AnyObject, Selector, Bool) -> Void
        let setter = unsafeBitCast(preferences.method(for: selector), to: Setter.self)
        setter(preferences, selector, false)
    }
}

// MARK: - Menu validation

extension MetronomeController: NSMenuItemValidation {
    func validateMenuItem(_ menuItem: NSMenuItem) -> Bool {
        switch menuItem.action {
        case #selector(togglePlay(_:)):
            menuItem.title = state.isPlaying ? "Pause" : "Start"
        case #selector(selectMode(_:)):
            menuItem.state = (menuItem.representedObject as? String) == state.mode.rawValue ? .on : .off
        case #selector(setBeats(_:)):
            menuItem.state = menuItem.tag == state.subdivisions ? .on : .off
        case #selector(setTempoPreset(_:)):
            menuItem.state = menuItem.tag == state.tempo ? .on : .off
        case #selector(toggleKeepOnTop(_:)):
            menuItem.state = defaults.bool(forKey: DefaultsKey.keepOnTop) ? .on : .off
        case #selector(toggleGlobalShortcut(_:)):
            menuItem.state = defaults.bool(forKey: DefaultsKey.globalShortcut) ? .on : .off
        case #selector(tempoUp(_:)), #selector(tempoUpLarge(_:)):
            return state.tempo < Self.tempoRange.upperBound
        case #selector(tempoDown(_:)), #selector(tempoDownLarge(_:)):
            return state.tempo > Self.tempoRange.lowerBound
        case #selector(zoomIn(_:)):
            return webView.pageZoom < 2
        case #selector(zoomOut(_:)):
            return webView.pageZoom > 0.5
        default:
            break
        }
        return true
    }
}

// MARK: - Navigation

extension MetronomeController: WKNavigationDelegate, WKUIDelegate {
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping @MainActor (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url else {
            decisionHandler(.cancel)
            return
        }
        if url.scheme == WebBundleSchemeHandler.scheme || url.scheme == "about" {
            decisionHandler(.allow)
            return
        }
        // Support links, the website and anything else open in the browser.
        if navigationAction.targetFrame?.isMainFrame ?? true {
            NSWorkspace.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.allow)
        }
    }

    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            NSWorkspace.shared.open(url)
        }
        return nil
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        isWebAppReady = false
        state.isPaused = true
        updateSystemIntegration()
        webView.reload()
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptAlertPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping @MainActor () -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = message
        alert.runModal()
        completionHandler()
    }

    func webView(
        _ webView: WKWebView,
        runJavaScriptConfirmPanelWithMessage message: String,
        initiatedByFrame frame: WKFrameInfo,
        completionHandler: @escaping @MainActor (Bool) -> Void
    ) {
        let alert = NSAlert()
        alert.messageText = message
        alert.addButton(withTitle: "OK")
        alert.addButton(withTitle: "Cancel")
        completionHandler(alert.runModal() == .alertFirstButtonReturn)
    }
}

// MARK: - Script messages

/// Receives `libreMetronome` messages without the content controller
/// retaining the window controller.
private final class WebBridge: NSObject, WKScriptMessageHandler {
    static let handlerName = "libreMetronome"
    weak var controller: MetronomeController?

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.frameInfo.securityOrigin.protocol == WebBundleSchemeHandler.scheme,
              let body = message.body as? [String: Any],
              body["type"] as? String == "state" else { return }
        MainActor.assumeIsolated {
            controller?.receiveState(body)
        }
    }
}
