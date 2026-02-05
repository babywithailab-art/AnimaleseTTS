import Foundation
import Cocoa

func keyCallback(proxy: CGEventTapProxy, type: CGEventType, event: CGEvent, refcon: UnsafeMutableRawPointer?) -> Unmanaged<CGEvent>? {
    if type == .keyDown || type == .keyUp {
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
        let flags = event.flags
        let isShiftPressed = flags.contains(.maskShift) || flags.contains(.maskAlphaShift)
        let isCtrlPressed = flags.contains(.maskControl)
        let isAltPressed = flags.contains(.maskAlternate)

        let eventData: [String: Any] = [
            "type": type == .keyDown ? "keydown" : "keyup",
            "keycode": keyCode,
            "shift": isShiftPressed,
            "ctrl": isCtrlPressed,
            "alt": isAltPressed
        ]

        if let jsonData = try? JSONSerialization.data(withJSONObject: eventData),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            print(jsonString)
            fflush(stdout)
        }
    }
    return Unmanaged.passUnretained(event)
}

let eventMask = (1 << CGEventType.keyDown.rawValue) | (1 << CGEventType.keyUp.rawValue)
guard let eventTap = CGEvent.tapCreate(
    tap: .cgSessionEventTap,
    place: .headInsertEventTap,
    options: .defaultTap,
    eventsOfInterest: CGEventMask(eventMask),
    callback: keyCallback,
    userInfo: nil
) else {
    print("Failed to create event tap")
    exit(1)
}

let runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
CGEvent.tapEnable(tap: eventTap, enable: true)
CFRunLoopRun()