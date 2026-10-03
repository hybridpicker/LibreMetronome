// Renders the square iOS app icon as a macOS icon: a rounded tile on the
// standard 1024 px grid (824 px body, 100 px margin) with a soft shadow.
//
// Usage: swift make-icon.swift <source.png> <output-1024.png>

import AppKit

let arguments = CommandLine.arguments
guard arguments.count == 3, let source = NSImage(contentsOfFile: arguments[1]) else {
    FileHandle.standardError.write("usage: make-icon.swift <source.png> <output.png>\n".data(using: .utf8)!)
    exit(1)
}

let canvas = 1024
let body = CGRect(x: 100, y: 100, width: 824, height: 824)
let radius: CGFloat = 185

guard let context = CGContext(
    data: nil, width: canvas, height: canvas, bitsPerComponent: 8, bytesPerRow: 0,
    space: CGColorSpace(name: CGColorSpace.sRGB)!,
    bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
), let sourceImage = source.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    exit(1)
}

let tile = CGPath(roundedRect: body, cornerWidth: radius, cornerHeight: radius, transform: nil)

context.saveGState()
context.setShadow(offset: CGSize(width: 0, height: -10), blur: 24, color: CGColor(gray: 0, alpha: 0.3))
context.addPath(tile)
context.setFillColor(CGColor(red: 0.98, green: 0.96, blue: 0.93, alpha: 1))
context.fillPath()
context.restoreGState()

context.saveGState()
context.addPath(tile)
context.clip()
context.interpolationQuality = .high
context.draw(sourceImage, in: body)
context.restoreGState()

guard let output = context.makeImage(),
      let png = NSBitmapImageRep(cgImage: output).representation(using: .png, properties: [:]) else {
    exit(1)
}
try png.write(to: URL(fileURLWithPath: arguments[2]))
