import AppKit

/// Builds the menu bar. Custom items target the metronome controller; the
/// standard items use the responder chain.
@MainActor
enum MainMenu {
    static func build(controller: MetronomeController) -> NSMenu {
        let mainMenu = NSMenu()
        mainMenu.addItem(submenu(appMenu(controller)))
        mainMenu.addItem(submenu(editMenu()))
        mainMenu.addItem(submenu(metronomeMenu(controller)))
        mainMenu.addItem(submenu(viewMenu(controller)))
        let windowMenu = windowMenu(controller)
        mainMenu.addItem(submenu(windowMenu))
        let helpMenu = helpMenu(controller)
        mainMenu.addItem(submenu(helpMenu))
        NSApp.windowsMenu = windowMenu
        NSApp.helpMenu = helpMenu
        return mainMenu
    }

    private static func submenu(_ menu: NSMenu) -> NSMenuItem {
        let item = NSMenuItem(title: menu.title, action: nil, keyEquivalent: "")
        item.submenu = menu
        return item
    }

    private static func appMenu(_ controller: MetronomeController) -> NSMenu {
        let menu = NSMenu(title: "LibreMetronome")
        menu.addItem(withTitle: "About LibreMetronome", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        menu.addItem(.separator())
        menu.addItem(controller.item("Settings…", #selector(MetronomeController.openSettings(_:)), key: ","))
        menu.addItem(.separator())
        let services = NSMenuItem(title: "Services", action: nil, keyEquivalent: "")
        services.submenu = NSMenu(title: "Services")
        NSApp.servicesMenu = services.submenu
        menu.addItem(services)
        menu.addItem(.separator())
        menu.addItem(withTitle: "Hide LibreMetronome", action: #selector(NSApplication.hide(_:)), keyEquivalent: "h")
        let hideOthers = menu.addItem(withTitle: "Hide Others", action: #selector(NSApplication.hideOtherApplications(_:)), keyEquivalent: "h")
        hideOthers.keyEquivalentModifierMask = [.command, .option]
        menu.addItem(withTitle: "Show All", action: #selector(NSApplication.unhideAllApplications(_:)), keyEquivalent: "")
        menu.addItem(.separator())
        menu.addItem(withTitle: "Quit LibreMetronome", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        return menu
    }

    private static func editMenu() -> NSMenu {
        let menu = NSMenu(title: "Edit")
        menu.addItem(withTitle: "Undo", action: Selector(("undo:")), keyEquivalent: "z")
        let redo = menu.addItem(withTitle: "Redo", action: Selector(("redo:")), keyEquivalent: "z")
        redo.keyEquivalentModifierMask = [.command, .shift]
        menu.addItem(.separator())
        menu.addItem(withTitle: "Cut", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
        menu.addItem(withTitle: "Copy", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
        menu.addItem(withTitle: "Paste", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
        menu.addItem(withTitle: "Select All", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
        return menu
    }

    private static func metronomeMenu(_ controller: MetronomeController) -> NSMenu {
        let menu = NSMenu(title: "Metronome")
        menu.addItem(controller.item("Start", #selector(MetronomeController.togglePlay(_:)), key: "\r"))
        menu.addItem(controller.item("Tap Tempo", #selector(MetronomeController.tapTempo(_:)), key: "t"))
        menu.addItem(.separator())
        menu.addItem(controller.item("Tempo +1", #selector(MetronomeController.tempoUp(_:)), key: "]"))
        menu.addItem(controller.item("Tempo −1", #selector(MetronomeController.tempoDown(_:)), key: "["))
        menu.addItem(controller.item("Tempo +10", #selector(MetronomeController.tempoUpLarge(_:)), key: "]", modifiers: [.command, .shift]))
        menu.addItem(controller.item("Tempo −10", #selector(MetronomeController.tempoDownLarge(_:)), key: "[", modifiers: [.command, .shift]))
        let presets = NSMenuItem(title: "Tempo", action: nil, keyEquivalent: "")
        presets.submenu = controller.makeTempoPresetMenu()
        menu.addItem(presets)
        menu.addItem(.separator())
        let beats = NSMenuItem(title: "Beats per Bar", action: nil, keyEquivalent: "")
        let beatsMenu = NSMenu(title: "Beats per Bar")
        for count in 1...9 {
            let item = controller.item(String(count), #selector(MetronomeController.setBeats(_:)))
            item.tag = count
            beatsMenu.addItem(item)
        }
        beats.submenu = beatsMenu
        menu.addItem(beats)
        menu.addItem(.separator())
        menu.addItem(controller.item(
            "Global Start/Pause Shortcut (\(GlobalHotKey.playPauseDisplay))",
            #selector(MetronomeController.toggleGlobalShortcut(_:))
        ))
        return menu
    }

    private static func viewMenu(_ controller: MetronomeController) -> NSMenu {
        let menu = NSMenu(title: "View")
        for item in controller.makeModeMenu(withShortcuts: true).items {
            item.menu?.removeItem(item)
            menu.addItem(item)
        }
        menu.addItem(.separator())
        menu.addItem(controller.item("Actual Size", #selector(MetronomeController.actualSize(_:)), key: "0"))
        menu.addItem(controller.item("Zoom In", #selector(MetronomeController.zoomIn(_:)), key: "+"))
        menu.addItem(controller.item("Zoom Out", #selector(MetronomeController.zoomOut(_:)), key: "-"))
        menu.addItem(.separator())
        menu.addItem(controller.item("Reload", #selector(MetronomeController.reloadWebApp(_:)), key: "r"))
        let fullScreen = menu.addItem(withTitle: "Enter Full Screen", action: #selector(NSWindow.toggleFullScreen(_:)), keyEquivalent: "f")
        fullScreen.keyEquivalentModifierMask = [.command, .control]
        return menu
    }

    private static func windowMenu(_ controller: MetronomeController) -> NSMenu {
        let menu = NSMenu(title: "Window")
        menu.addItem(withTitle: "Minimize", action: #selector(NSWindow.performMiniaturize(_:)), keyEquivalent: "m")
        menu.addItem(withTitle: "Zoom", action: #selector(NSWindow.performZoom(_:)), keyEquivalent: "")
        menu.addItem(.separator())
        menu.addItem(controller.item("Keep on Top", #selector(MetronomeController.toggleKeepOnTop(_:))))
        menu.addItem(controller.item("Metronome", #selector(MetronomeController.showWindow(_:)), key: "1", modifiers: [.command, .option]))
        menu.addItem(.separator())
        menu.addItem(withTitle: "Bring All to Front", action: #selector(NSApplication.arrangeInFront(_:)), keyEquivalent: "")
        return menu
    }

    private static func helpMenu(_ controller: MetronomeController) -> NSMenu {
        let menu = NSMenu(title: "Help")
        menu.addItem(controller.item("LibreMetronome Help", #selector(MetronomeController.openHelp(_:)), key: "?"))
        menu.addItem(.separator())
        menu.addItem(controller.item("LibreMetronome Website", #selector(MetronomeController.openWebsite(_:))))
        menu.addItem(controller.item("Source Code on GitHub", #selector(MetronomeController.openSourceCode(_:))))
        return menu
    }
}
