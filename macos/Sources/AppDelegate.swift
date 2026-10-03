import AppKit

@MainActor
final class AppDelegate: NSObject, NSApplicationDelegate {
    private var controller: MetronomeController?

    func applicationDidFinishLaunching(_ notification: Notification) {
        let controller = MetronomeController()
        self.controller = controller
        NSApp.mainMenu = MainMenu.build(controller: controller)
        controller.showWindow(nil)
        NSApp.activate()
    }

    /// Clicking the Dock icon brings back a window that was closed; the
    /// metronome keeps running while the window is hidden.
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            controller?.showWindow(nil)
        }
        return true
    }

    func application(_ application: NSApplication, open urls: [URL]) {
        urls.forEach { controller?.handleControlURL($0) }
    }

    func applicationDockMenu(_ sender: NSApplication) -> NSMenu? {
        controller?.makeDockMenu()
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func applicationSupportsSecureRestorableState(_ app: NSApplication) -> Bool {
        true
    }
}
