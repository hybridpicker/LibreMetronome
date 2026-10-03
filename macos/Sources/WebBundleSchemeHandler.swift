import Foundation
import UniformTypeIdentifiers
import WebKit

/// Serves the bundled React build under `libremetronome://app/`.
///
/// A custom scheme (instead of `file://`) gives the page a stable origin, so
/// absolute asset paths, `fetch()` of audio samples and `localStorage` behave
/// as they do on the web. Unknown paths answer 404, which lets the sound-set
/// service fall back to its built-in sounds without a backend.
final class WebBundleSchemeHandler: NSObject, WKURLSchemeHandler {
    static let scheme = "libremetronome"
    static let host = "app"
    static var startURL: URL { URL(string: "\(scheme)://\(host)/index.html")! }

    private let root: URL

    init(root: URL) {
        self.root = root.standardizedFileURL
    }

    func webView(_ webView: WKWebView, start urlSchemeTask: WKURLSchemeTask) {
        guard let url = urlSchemeTask.request.url else {
            urlSchemeTask.didFailWithError(URLError(.badURL))
            return
        }

        guard let fileURL = resolve(url), let data = try? Data(contentsOf: fileURL) else {
            respond(urlSchemeTask, url: url, status: 404, mimeType: "text/plain", data: Data())
            return
        }

        respond(urlSchemeTask, url: url, status: 200, mimeType: Self.mimeType(for: fileURL), data: data)
    }

    func webView(_ webView: WKWebView, stop urlSchemeTask: WKURLSchemeTask) {
        // Responses are delivered synchronously; nothing to cancel.
    }

    private func resolve(_ url: URL) -> URL? {
        var path = url.path
        if path.isEmpty || path == "/" {
            path = "/index.html"
        }

        let candidate = root.appendingPathComponent(String(path.dropFirst())).standardizedFileURL
        guard candidate.path.hasPrefix(root.path + "/") else { return nil }

        var isDirectory: ObjCBool = false
        if FileManager.default.fileExists(atPath: candidate.path, isDirectory: &isDirectory), !isDirectory.boolValue {
            return candidate
        }

        // Client-side routes without a file extension render the app shell.
        if candidate.pathExtension.isEmpty, !path.hasPrefix("/api/") {
            return root.appendingPathComponent("index.html")
        }
        return nil
    }

    private func respond(_ task: WKURLSchemeTask, url: URL, status: Int, mimeType: String, data: Data) {
        let headers = [
            "Content-Type": mimeType,
            "Content-Length": String(data.count),
            "Cache-Control": "no-cache",
        ]
        guard let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: "HTTP/1.1", headerFields: headers) else {
            task.didFailWithError(URLError(.cannotParseResponse))
            return
        }
        task.didReceive(response)
        task.didReceive(data)
        task.didFinish()
    }

    private static func mimeType(for fileURL: URL) -> String {
        switch fileURL.pathExtension.lowercased() {
        case "html": return "text/html; charset=utf-8"
        case "js", "mjs": return "text/javascript; charset=utf-8"
        case "css": return "text/css; charset=utf-8"
        case "json", "map": return "application/json"
        case "svg": return "image/svg+xml"
        case "mp3": return "audio/mpeg"
        case "wav": return "audio/wav"
        default:
            return UTType(filenameExtension: fileURL.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
        }
    }
}
