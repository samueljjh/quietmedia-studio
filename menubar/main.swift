// Quiet Studio — Mac menu bar companion, v5
// Shows the live timer from studio.quietmedia.co.uk in the menu bar, with clock in / pause / resume / clock out.
// v5: project-aware (jobs), "booked today" nudge, QM.start(). Polls window.QM.live() every 5 s in a hidden WKWebView.
// Build: ./build.sh   (needs Xcode Command Line Tools)

import Cocoa
import WebKit

let APP_URL = URL(string: "https://studio.quietmedia.co.uk/")!
let POLL: TimeInterval = 5

// MARK: - brand mark (ring with a cut, as on the app icon), drawn as a template image
func brandMark(_ size: CGFloat) -> NSImage {
    let img = NSImage(size: NSSize(width: size, height: size), flipped: false) { rect in
        // ring with a diagonal cut at the lower right, like the app icon
        let r = rect.insetBy(dx: size * 0.1, dy: size * 0.1)
        let stroke = size * 0.2
        let ring = NSBezierPath()
        ring.appendArc(withCenter: NSPoint(x: r.midX, y: r.midY), radius: r.width / 2 - stroke / 2, startAngle: -30, endAngle: -60 + 360)
        ring.lineWidth = stroke
        ring.lineCapStyle = .butt
        NSColor.black.setStroke()
        ring.stroke()
        return true
    }
    img.isTemplate = true
    return img
}

// MARK: - state from the web app
struct Job { var client = ""; var project = ""; var category = ""; var task = ""
    var title: String { project.isEmpty ? client : project }
    var subtitle: String { project.isEmpty ? category : "\(client) · \(category)" } }
struct Live {
    var person = ""
    var running: Job? = nil; var since: TimeInterval = 0
    var paused: Job? = nil; var pausedAt: TimeInterval = 0
    var todayHours = 0.0
    var booked: Job? = nil; var bookedStart: TimeInterval = 0; var bookedEnd: TimeInterval = 0; var bookedTitle = ""
    var nudge = false
    static func job(_ d: [String: Any]?) -> Job? {
        guard let d = d else { return nil }
        return Job(client: d["client"] as? String ?? "", project: d["project"] as? String ?? "",
                   category: d["category"] as? String ?? "", task: d["task"] as? String ?? "")
    }
    init() {}
    init(_ d: [String: Any]) {
        person = d["person"] as? String ?? ""
        if let r = d["running"] as? [String: Any] { running = Live.job(r); since = (r["since"] as? Double ?? 0) / 1000 }
        if let p = d["paused"] as? [String: Any] { paused = Live.job(p); pausedAt = (p["at"] as? Double ?? 0) / 1000 }
        todayHours = d["todayHours"] as? Double ?? 0
        if let b = d["booked"] as? [String: Any] { booked = Live.job(b); bookedStart = (b["start"] as? Double ?? 0) / 1000; bookedEnd = (b["end"] as? Double ?? 0) / 1000; bookedTitle = b["title"] as? String ?? "" }
        nudge = d["nudge"] as? Bool ?? false
    }
}
func hm(_ h: Double) -> String { let m = Int((h * 60).rounded()); return "\(m / 60)h \(String(format: "%02d", m % 60))m" }
func clock(_ s: TimeInterval) -> String { let t = max(0, Int(s)); return String(format: "%d:%02d:%02d", t / 3600, (t / 60) % 60, t % 60) }
func time(_ t: TimeInterval) -> String { let f = DateFormatter(); f.dateFormat = "HH:mm"; return f.string(from: Date(timeIntervalSince1970: t)) }

// MARK: - the panel under the status item
final class Panel: NSView {
    let title = NSTextField(labelWithString: ""), sub = NSTextField(labelWithString: ""), big = NSTextField(labelWithString: "")
    let note = NSTextField(wrappingLabelWithString: ""), today = NSTextField(labelWithString: "")
    let primary = NSButton(title: "", target: nil, action: nil), secondary = NSButton(title: "", target: nil, action: nil)
    let tertiary = NSButton(title: "", target: nil, action: nil)
    let open = NSButton(title: "Open Quiet Studio", target: nil, action: nil), quit = NSButton(title: "Quit", target: nil, action: nil)
    var onPrimary: (() -> Void)?, onSecondary: (() -> Void)?, onTertiary: (() -> Void)?

    override init(frame: NSRect) {
        super.init(frame: frame)
        let mono = NSFont.monospacedDigitSystemFont(ofSize: 34, weight: .light)
        big.font = mono; big.textColor = .labelColor
        title.font = NSFont.systemFont(ofSize: 15, weight: .medium); title.lineBreakMode = .byTruncatingTail
        sub.font = NSFont.systemFont(ofSize: 12); sub.textColor = .secondaryLabelColor; sub.lineBreakMode = .byTruncatingTail
        note.font = NSFont.systemFont(ofSize: 12); note.textColor = .secondaryLabelColor
        note.preferredMaxLayoutWidth = 268
        today.font = NSFont.systemFont(ofSize: 11); today.textColor = .tertiaryLabelColor
        for b in [primary, secondary, tertiary] { b.bezelStyle = .rounded; b.controlSize = .large; b.font = NSFont.systemFont(ofSize: 13) }
        primary.keyEquivalent = "\r"
        for b in [open, quit] { b.isBordered = false; b.font = NSFont.systemFont(ofSize: 12); b.contentTintColor = .secondaryLabelColor }
        primary.target = self; primary.action = #selector(p1)
        secondary.target = self; secondary.action = #selector(p2)
        tertiary.target = self; tertiary.action = #selector(p3)

        let buttons = NSStackView(views: [primary, secondary, tertiary]); buttons.orientation = .horizontal; buttons.spacing = 8
        let foot = NSStackView(views: [open, NSView(), quit]); foot.orientation = .horizontal; foot.distribution = .equalSpacing
        let stack = NSStackView(views: [title, sub, big, note, buttons, today, foot])
        stack.orientation = .vertical; stack.alignment = .leading; stack.spacing = 6
        stack.setCustomSpacing(10, after: sub); stack.setCustomSpacing(10, after: note); stack.setCustomSpacing(14, after: today)
        stack.edgeInsets = NSEdgeInsets(top: 16, left: 16, bottom: 12, right: 16)
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo: leadingAnchor), stack.trailingAnchor.constraint(equalTo: trailingAnchor),
                                     stack.topAnchor.constraint(equalTo: topAnchor), stack.bottomAnchor.constraint(equalTo: bottomAnchor),
                                     widthAnchor.constraint(equalToConstant: 300), foot.widthAnchor.constraint(equalTo: stack.widthAnchor, constant: -32)])
    }
    required init?(coder: NSCoder) { nil }
    @objc func p1() { onPrimary?() }
    @objc func p2() { onSecondary?() }
    @objc func p3() { onTertiary?() }

    func show(_ l: Live?, signedIn: Bool) {
        guard let l = l, signedIn else {
            title.stringValue = "Quiet Studio"; sub.stringValue = "Not signed in on this Mac"; big.stringValue = "—"
            note.stringValue = "Open Quiet Studio and sign in once. The timer then lives here."
            primary.title = "Open & sign in"; secondary.isHidden = true; tertiary.isHidden = true; today.stringValue = ""; return
        }
        secondary.isHidden = false; tertiary.isHidden = true
        today.stringValue = "\(l.person) · today \(hm(l.todayHours))"
        if let r = l.running {
            title.stringValue = r.title; sub.stringValue = r.subtitle + (r.task.isEmpty ? "" : " · " + r.task)
            big.stringValue = clock(Date().timeIntervalSince1970 - l.since)
            note.stringValue = "Started \(time(l.since)). Clocking out asks in the app whether it was a half or a full day."
            primary.title = "Clock out"; secondary.title = "Pause"
        } else if let p = l.paused {
            title.stringValue = p.title; sub.stringValue = "On hold · " + p.subtitle
            big.stringValue = "On hold"
            note.stringValue = "Paused at \(time(l.pausedAt)). Time so far is logged."
            primary.title = "Resume"; secondary.title = "Done"
        } else if let b = l.booked, l.nudge {
            title.stringValue = "Booked today: \(l.bookedTitle)"; sub.stringValue = "\(b.client) · \(time(l.bookedStart))–\(time(l.bookedEnd))"
            big.stringValue = "0:00:00"
            note.stringValue = "Nothing clocked yet. Clock in and the time goes to \(b.title)."
            primary.title = "Clock in"; secondary.title = "Later"
        } else {
            title.stringValue = "Not clocked in"; sub.stringValue = l.booked.map { "Booked today: \($0.title)" } ?? "Nothing booked today"
            big.stringValue = "0:00:00"
            note.stringValue = "Clock in picks up today's booking, or the last thing you worked on."
            primary.title = "Clock in"; secondary.title = "Pick in app"
        }
    }
}

// MARK: - app
final class App: NSObject, NSApplicationDelegate, WKNavigationDelegate, NSPopoverDelegate {
    var status: NSStatusItem!
    var web: WKWebView!
    var webWindow: NSWindow!
    let popover = NSPopover()
    let panel = Panel(frame: .zero)
    var live: Live? = nil
    var signedIn = false
    var tick: Timer?, poll: Timer?

    func applicationDidFinishLaunching(_ n: Notification) {
        NSApp.setActivationPolicy(.accessory)
        let cfg = WKWebViewConfiguration(); cfg.websiteDataStore = .default()
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 420, height: 820), configuration: cfg)
        web.navigationDelegate = self
        web.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 QuietStudioMenuBar/5"
        webWindow = NSWindow(contentRect: web.frame, styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        webWindow.title = "Quiet Studio"; webWindow.contentView = web; webWindow.isReleasedWhenClosed = false; webWindow.center()
        web.load(URLRequest(url: APP_URL))

        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        status.button?.image = brandMark(18); status.button?.imagePosition = .imageLeading
        status.button?.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .regular)
        status.button?.target = self; status.button?.action = #selector(toggle)

        popover.contentViewController = NSViewController(); popover.contentViewController!.view = panel
        popover.behavior = .transient; popover.animates = true; popover.delegate = self
        panel.onPrimary = { [weak self] in self?.primary() }
        panel.onSecondary = { [weak self] in self?.secondary() }
        panel.open.target = self; panel.open.action = #selector(openApp)
        panel.quit.target = NSApp; panel.quit.action = #selector(NSApplication.terminate(_:))

        poll = Timer.scheduledTimer(withTimeInterval: POLL, repeats: true) { [weak self] _ in self?.refresh() }
        tick = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.paint() }
        RunLoop.main.add(poll!, forMode: .common); RunLoop.main.add(tick!, forMode: .common)
        paint()
    }
    func webView(_ w: WKWebView, didFinish nav: WKNavigation!) { refresh() }

    func js(_ code: String, _ done: ((Any?) -> Void)? = nil) {
        web.evaluateJavaScript(code) { r, _ in done?(r) }
    }
    func refresh() {
        js("(function(){try{return window.QM?JSON.stringify(window.QM.live()):'nope'}catch(e){return 'nope'}})()") { [weak self] r in
            guard let self = self else { return }
            if let s = r as? String, s != "nope", let d = try? JSONSerialization.jsonObject(with: Data(s.utf8)) as? [String: Any] {
                self.live = Live(d); self.signedIn = true
            } else { self.live = nil; self.signedIn = false }
            self.paint()
        }
    }
    // status bar text + panel
    func paint() {
        let b = status.button!
        if !signedIn { b.title = "" ; b.toolTip = "Quiet Studio — sign in" }
        else if let l = live, let r = l.running { b.title = " \(clock(Date().timeIntervalSince1970 - l.since)) · \(short(r.title))"; b.toolTip = r.subtitle }
        else if let l = live, l.paused != nil { b.title = " On hold"; b.toolTip = l.paused!.title }
        else if let l = live, l.nudge { b.title = " Booked · clock in"; b.toolTip = l.bookedTitle }
        else { b.title = ""; b.toolTip = "Quiet Studio" }
        if popover.isShown { panel.show(live, signedIn: signedIn) }
    }
    func short(_ s: String) -> String { s.count > 22 ? String(s.prefix(21)) + "…" : s }

    @objc func toggle() {
        if popover.isShown { popover.performClose(nil); return }
        panel.show(live, signedIn: signedIn)
        popover.show(relativeTo: status.button!.bounds, of: status.button!, preferredEdge: .minY)
        refresh()
    }
    @objc func openApp() { popover.performClose(nil); NSApp.activate(ignoringOtherApps: true); webWindow.makeKeyAndOrderFront(nil) }

    func primary() {
        guard signedIn, let l = live else { openApp(); return }
        if l.running != nil { js("QM.stop()"); popover.performClose(nil); openAfter() }
        else if l.paused != nil { js("QM.resume()") }
        else { js("QM.start()") }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { self.refresh() }
    }
    func secondary() {
        guard signedIn, let l = live else { return }
        if l.running != nil { js("QM.pause()") }
        else if l.paused != nil { js("QM.go('today')"); openApp() }
        else if l.nudge { popover.performClose(nil) }
        else { js("QM.go('today')"); openApp() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { self.refresh() }
    }
    // clocking out opens the app so the half-day / full-day question can be answered
    func openAfter() { DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) { NSApp.activate(ignoringOtherApps: true); self.webWindow.makeKeyAndOrderFront(nil) } }
    func popoverDidClose(_ n: Notification) { paint() }
}

let app = NSApplication.shared
let delegate = App()
app.delegate = delegate
app.run()
