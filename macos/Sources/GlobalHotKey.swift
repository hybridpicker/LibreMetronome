import Carbon.HIToolbox

/// A system-wide keyboard shortcut that works while another app is active.
/// Carbon hot keys need no Accessibility permission.
final class GlobalHotKey {
    /// ⌃⌥⌘P starts or pauses the metronome from any app.
    static let playPauseKeyCode = UInt32(kVK_ANSI_P)
    static let playPauseModifiers = UInt32(controlKey | optionKey | cmdKey)
    static let playPauseDisplay = "⌃⌥⌘P"

    private static let signature: OSType = 0x4C4D_5452 // "LMTR"

    private let action: () -> Void
    private var hotKeyRef: EventHotKeyRef?
    private var handlerRef: EventHandlerRef?

    init?(keyCode: UInt32, modifiers: UInt32, action: @escaping () -> Void) {
        self.action = action

        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))
        let installStatus = InstallEventHandler(
            GetApplicationEventTarget(),
            { _, _, userData in
                guard let userData else { return OSStatus(eventNotHandledErr) }
                Unmanaged<GlobalHotKey>.fromOpaque(userData).takeUnretainedValue().action()
                return noErr
            },
            1,
            &eventType,
            Unmanaged.passUnretained(self).toOpaque(),
            &handlerRef
        )
        guard installStatus == noErr else { return nil }

        let hotKeyID = EventHotKeyID(signature: Self.signature, id: 1)
        let registerStatus = RegisterEventHotKey(keyCode, modifiers, hotKeyID, GetApplicationEventTarget(), 0, &hotKeyRef)
        guard registerStatus == noErr else {
            if let handlerRef { RemoveEventHandler(handlerRef) }
            return nil
        }
    }

    deinit {
        if let hotKeyRef { UnregisterEventHotKey(hotKeyRef) }
        if let handlerRef { RemoveEventHandler(handlerRef) }
    }
}
