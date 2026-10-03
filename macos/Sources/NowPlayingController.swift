import AppKit
import MediaPlayer

/// Publishes the metronome as the system's Now Playing item so the keyboard
/// play/pause key, headphone buttons and Control Center can start and stop it.
@MainActor
final class NowPlayingController {
    /// Receives `togglePlay`, `play` or `pause`.
    var onCommand: ((String) -> Void)?

    func activate() {
        let center = MPRemoteCommandCenter.shared()
        let commands: [(MPRemoteCommand, String)] = [
            (center.togglePlayPauseCommand, "togglePlay"),
            (center.playCommand, "play"),
            (center.pauseCommand, "pause"),
            (center.stopCommand, "pause"),
        ]
        for (remoteCommand, name) in commands {
            remoteCommand.isEnabled = true
            remoteCommand.addTarget { [weak self] _ in
                DispatchQueue.main.async {
                    self?.onCommand?(name)
                }
                return .success
            }
        }
        for unsupported in [center.nextTrackCommand, center.previousTrackCommand,
                            center.skipForwardCommand, center.skipBackwardCommand,
                            center.changePlaybackPositionCommand] {
            unsupported.isEnabled = false
        }
    }

    func update(with state: MetronomeState) {
        let center = MPNowPlayingInfoCenter.default()
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: "\(state.tempo) BPM",
            MPMediaItemPropertyArtist: "LibreMetronome",
            MPMediaItemPropertyAlbumTitle: state.mode.title,
            MPNowPlayingInfoPropertyIsLiveStream: true,
            MPNowPlayingInfoPropertyPlaybackRate: state.isPlaying ? 1.0 : 0.0,
        ]
        if let icon = NSApp.applicationIconImage {
            info[MPMediaItemPropertyArtwork] = MPMediaItemArtwork(boundsSize: icon.size) { _ in icon }
        }
        center.nowPlayingInfo = info
        center.playbackState = state.isPlaying ? .playing : .paused
    }
}
