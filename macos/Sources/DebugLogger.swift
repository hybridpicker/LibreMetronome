#if DEBUG
import Foundation
import WebKit

/// Debug builds only: prints page errors and a once-per-second animation
/// frame count to stderr, since the production bundle silences console output.
final class DebugLogger: NSObject, WKScriptMessageHandler {
    static let handlerName = "libreMetronomeDebug"
    static let script = """
        (() => {
          const post = (text) => window.webkit.messageHandlers.\(handlerName).postMessage(String(text));
          window.addEventListener('error', (e) => post(`error: ${e.message} @ ${e.filename}:${e.lineno}`));
          window.addEventListener('unhandledrejection', (e) => post(`rejection: ${e.reason}`));
          let clicks = 0;
          const start = AudioBufferSourceNode.prototype.start;
          AudioBufferSourceNode.prototype.start = function (...args) { clicks += 1; return start.apply(this, args); };
          let frames = 0;
          const tick = () => { frames += 1; requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
          setInterval(() => {
            const audio = window._audioContextInit || window._audioContext;
            post(`frames/s: ${frames} hidden: ${document.hidden} audio: ${audio ? `${audio.state} t=${audio.currentTime.toFixed(2)}` : 'none'} clicks/s: ${clicks}`);
            frames = 0;
            clicks = 0;
          }, 1000);
        })();
        """

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        FileHandle.standardError.write("[web] \(message.body)\n".data(using: .utf8)!)
    }
}
#endif
