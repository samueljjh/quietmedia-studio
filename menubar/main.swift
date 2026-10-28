// Studio Menu Bar — the Quiet Studio Mac menu bar companion, v9 (built as "Studio Menu Bar.app")
// Shows the live timer from studio.quietmedia.co.uk in the menu bar, with clock in / pause / resume / clock out.
// v5: project-aware (jobs), "booked today" nudge, QM.start(). Polls window.QM.live() every 5 s in a hidden WKWebView.
// v6: drives. Reads each T7 when it is plugged in (free space, main folders, then folder sizes in the background) and hands it to QM.drive*.
// v9: backups. Saves the whole of Studio to a folder you choose (the NAS) every night; see Backups.
// v8: DIT. Reads the quiet media DIT app's progress on this Mac (127.0.0.1:8765/api/live) every 3 s and hands it to QM.dit,
//     so card offloads show in Studio on any device.
// Build: ./build.sh   (needs Xcode Command Line Tools)

import Cocoa
import WebKit
import UserNotifications

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

// MARK: - drives
let DRIVE_RECHECK: TimeInterval = 180            // free space + folder list while a drive stays plugged in
let DRIVE_REMEASURE: TimeInterval = 2 * 3600     // every folder size again, while plugged in
let SKIP_FOLDERS: Set<String> = ["$RECYCLE.BIN", "System Volume Information"]

struct Vol { let url: URL; let uuid: String; let name: String; let total: Int64; let free: Int64 }

// an external drive the size of a T7 (2 or 4 TB); skips the Mac's own disk, disk images, SD cards and sticks
func readVolume(_ url: URL) -> Vol? {
    let keys: Set<URLResourceKey> = [.volumeUUIDStringKey, .volumeNameKey, .volumeTotalCapacityKey, .volumeAvailableCapacityKey,
                                     .volumeIsInternalKey, .volumeIsRootFileSystemKey, .volumeIsLocalKey]
    guard let v = try? url.resourceValues(forKeys: keys) else { return nil }
    if v.volumeIsRootFileSystem == true || v.volumeIsInternal == true || v.volumeIsLocal == false { return nil }
    guard let uuid = v.volumeUUIDString, let total = v.volumeTotalCapacity else { return nil }
    if total < 1_500_000_000_000 || total > 4_500_000_000_000 { return nil }
    return Vol(url: url, uuid: uuid, name: v.volumeName ?? url.lastPathComponent, total: Int64(total), free: Int64(v.volumeAvailableCapacity ?? 0))
}
// the main folders only: one directory listing, so it is quick
func topFolders(_ url: URL) -> [[String: Any]] {
    let keys: [URLResourceKey] = [.isDirectoryKey, .contentModificationDateKey]
    guard let items = try? FileManager.default.contentsOfDirectory(at: url, includingPropertiesForKeys: keys, options: [.skipsHiddenFiles]) else { return [] }
    return items.compactMap { u in
        guard let r = try? u.resourceValues(forKeys: Set(keys)), r.isDirectory == true, !SKIP_FOLDERS.contains(u.lastPathComponent) else { return nil }
        return ["name": u.lastPathComponent, "mtime": (r.contentModificationDate?.timeIntervalSince1970 ?? 0) * 1000]
    }
}
// space a folder takes on disk; nil if the drive went away part way
func folderSize(_ url: URL, cancelled: () -> Bool) -> Int64? {
    let keys: [URLResourceKey] = [.totalFileAllocatedSizeKey, .fileAllocatedSizeKey, .isRegularFileKey]
    guard let en = FileManager.default.enumerator(at: url, includingPropertiesForKeys: keys, options: [], errorHandler: { _, _ in true }) else { return nil }
    var total: Int64 = 0, n = 0
    for case let f as URL in en {
        n += 1
        if n % 500 == 0 && cancelled() { return nil }
        guard let r = try? f.resourceValues(forKeys: Set(keys)), r.isRegularFile == true else { continue }
        total += Int64(r.totalFileAllocatedSize ?? r.fileAllocatedSize ?? 0)
    }
    return cancelled() ? nil : total
}
func bytes(_ b: Int64) -> String { b >= 1_000_000_000_000 ? String(format: "%.2f TB", Double(b) / 1e12) : "\(b / 1_000_000_000) GB" }

final class DriveWatcher {
    weak var app: App?
    var mounted: [String: Vol] = [:]                 // by volume ID; main thread only
    var status: [String: [String: Any]] = [:]        // last answer from QM.driveSeen
    var lastFull: [String: Date] = [:], asked = Set<String>(), warned = Set<String>(), queued = Set<String>()
    private var live: [String: URL] = [:]; private let lock = NSLock()   // read by the sizing thread
    let sizer = OperationQueue()
    var timer: Timer?
    var ignored: Set<String> {
        get { Set(UserDefaults.standard.stringArray(forKey: "ignoredDrives") ?? []) }
        set { UserDefaults.standard.set(Array(newValue), forKey: "ignoredDrives") }
    }

    init() {
        sizer.maxConcurrentOperationCount = 1; sizer.qualityOfService = .background
        let nc = NSWorkspace.shared.notificationCenter
        nc.addObserver(forName: NSWorkspace.didMountNotification, object: nil, queue: .main) { [weak self] _ in self?.scan() }
        nc.addObserver(forName: NSWorkspace.didUnmountNotification, object: nil, queue: .main) { [weak self] _ in self?.scan() }
        timer = Timer.scheduledTimer(withTimeInterval: DRIVE_RECHECK, repeats: true) { [weak self] _ in self?.scan() }
        RunLoop.main.add(timer!, forMode: .common)
    }
    var lowName: String? {
        let low = mounted.values.compactMap({ status[$0.uuid] }).first(where: { $0["low"] as? Bool == true })
        return low?["name"] as? String
    }

    // full: measure every folder again, not just new or changed ones
    func scan(full: Bool = false) {
        let urls = FileManager.default.mountedVolumeURLs(includingResourceValuesForKeys: nil, options: [.skipHiddenVolumes]) ?? []
        var now: [String: Vol] = [:]
        for u in urls { if let v = readVolume(u) { now[v.uuid] = v } }
        for gone in Set(mounted.keys).subtracting(now.keys) { lastFull[gone] = nil; status[gone] = nil; asked.remove(gone); warned.remove(gone) }
        mounted = now
        lock.lock(); live = now.mapValues { $0.url }; lock.unlock()
        guard let app = app, app.signedIn else { app?.paint(); return }   // picked up once signed in
        for v in now.values {
            let due = full || lastFull[v.uuid].map { Date().timeIntervalSince($0) > DRIVE_REMEASURE } ?? true
            read(v, full: due)
        }
        app.paint()
    }
    func read(_ v: Vol, full: Bool) {
        app?.call("QM.driveFor", [v.uuid]) { [weak self] r in
            guard let self = self, let id = r as? String else { return }
            if id == "?" { DispatchQueue.main.asyncAfter(deadline: .now() + 15) { self.scan() } }   // not synced yet
            else if id.isEmpty { self.ask(v) }
            else { self.snapshot(v, full: full) }
        }
    }
    // first time a drive is seen: which T7 is it? Remembered in Studio by the volume's ID, for both Macs.
    func ask(_ v: Vol) {
        guard !asked.contains(v.uuid), !ignored.contains(v.uuid) else { return }
        asked.insert(v.uuid)
        app?.call("QM.driveSlots", []) { [weak self] r in
            guard let self = self, let s = r as? String,
                  let slots = (try? JSONSerialization.jsonObject(with: Data(s.utf8))) as? [[String: Any]] else { return }
            let a = NSAlert()
            a.messageText = "Which drive is this?"
            a.informativeText = "“\(v.name)” (\(bytes(v.total))) was just plugged in. Pick it once and Quiet Studio recognises it from now on, on both Macs."
            let pop = NSPopUpButton(frame: NSRect(x: 0, y: 0, width: 280, height: 26), pullsDown: false)
            for slot in slots {
                pop.addItem(withTitle: (slot["label"] as? String ?? "") + ((slot["taken"] as? Bool ?? false) ? "  (already set up)" : ""))
                pop.lastItem?.representedObject = slot["id"]
            }
            if let i = slots.firstIndex(where: { !($0["taken"] as? Bool ?? false) }) { pop.selectItem(at: i) }
            a.accessoryView = pop
            a.addButton(withTitle: "This is it"); a.addButton(withTitle: "Ask later"); a.addButton(withTitle: "Not one of ours")
            NSApp.activate(ignoringOtherApps: true)
            let res = a.runModal()
            if res == .alertFirstButtonReturn, let id = pop.selectedItem?.representedObject as? String {
                self.app?.call("QM.assignDrive", [v.uuid, id]) { _ in self.snapshot(v, full: true) }
            } else if res == .alertThirdButtonReturn { self.ignored.insert(v.uuid) }
        }
    }
    func snapshot(_ v: Vol, full: Bool) {
        let s: [String: Any] = ["uuid": v.uuid, "volName": v.name, "total": v.total, "free": v.free, "folders": topFolders(v.url)]
        app?.call("QM.driveSeen", [s]) { [weak self] r in
            guard let self = self, let str = r as? String,
                  let d = (try? JSONSerialization.jsonObject(with: Data(str.utf8))) as? [String: Any] else { return }
            self.status[v.uuid] = d
            if d["low"] as? Bool == true && !self.warned.contains(v.uuid) { self.warned.insert(v.uuid); self.warnLow(d) }
            if full { self.lastFull[v.uuid] = Date() }
            for n in (full ? d["all"] : d["stale"]) as? [String] ?? [] { self.measure(v, n) }
            self.app?.paint()
        }
    }
    // folder sizes, one at a time at background priority so editing and copying are not slowed
    func measure(_ v: Vol, _ name: String) {
        let key = v.uuid + "/" + name
        guard !queued.contains(key) else { return }
        queued.insert(key)
        let url = v.url.appendingPathComponent(name, isDirectory: true)
        sizer.addOperation { [weak self] in
            guard let self = self else { return }
            let size = folderSize(url) { !self.stillMounted(v) }
            DispatchQueue.main.async {
                self.queued.remove(key)
                if let size = size { self.app?.call("QM.driveSize", [["uuid": v.uuid, "name": name, "size": size]]) }
                self.app?.paint()
            }
        }
    }
    func stillMounted(_ v: Vol) -> Bool { lock.lock(); defer { lock.unlock() }; return live[v.uuid] == v.url }
    func warnLow(_ d: [String: Any]) {
        let name = d["name"] as? String ?? "A drive"
        let c = UNMutableNotificationContent()
        c.title = "\(name) is low on space"
        c.body = "\(bytes(Int64(d["free"] as? Double ?? 0))) free. Keep \(Int(d["minGB"] as? Double ?? 0)) GB free to work. Open Quiet Studio, Drives, to see what to clear."
        UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "drive-low-" + name, content: c, trigger: nil))
    }
    func summary() -> String {
        if mounted.isEmpty { return "No T7 plugged in." }
        let lines = mounted.values.map { v -> String in
            guard let d = status[v.uuid] else { return "\(v.name): waiting to be set up" }
            return "\(d["name"] as? String ?? v.name): \(bytes(v.free)) free" + (d["low"] as? Bool == true ? ", low on space" : "")
        }.sorted()
        return lines.joined(separator: "\n") + (queued.isEmpty ? "" : "\nMeasuring folder sizes, \(queued.count) to go")
    }
}

// MARK: - nightly backup: the whole of Studio as one JSON file in a folder you choose (the NAS)
// Once a day after 1am (or as soon as the Mac is next awake and the folder is connected) it asks Studio for QM.backup(), writes
// Studio Backups/YYYY/MM/studio-YYYY-MM-DD.json, keeps every day for 30 days and the 1st of each month for good, and tells Studio (QM.backupDone).
let BACKUP_CHECK: TimeInterval = 900
final class Backups {
    weak var app: App?
    var timer: Timer?
    var state = "", running = false
    let fm = FileManager.default
    var folder: URL? {
        get { UserDefaults.standard.string(forKey: "backupFolder").map { URL(fileURLWithPath: $0, isDirectory: true) } }
        set { UserDefaults.standard.set(newValue?.path, forKey: "backupFolder") }
    }
    var lastDay: String {
        get { UserDefaults.standard.string(forKey: "backupLastDay") ?? "" }
        set { UserDefaults.standard.set(newValue, forKey: "backupLastDay") }
    }
    var lastAt: Date? {
        get { let t = UserDefaults.standard.double(forKey: "backupLastAt"); return t > 0 ? Date(timeIntervalSince1970: t) : nil }
        set { UserDefaults.standard.set(newValue?.timeIntervalSince1970 ?? 0, forKey: "backupLastAt") }
    }

    init(app: App) {
        self.app = app
        timer = Timer.scheduledTimer(withTimeInterval: BACKUP_CHECK, repeats: true) { [weak self] _ in self?.due() }
        RunLoop.main.add(timer!, forMode: .common)
        let nc = NSWorkspace.shared.notificationCenter
        nc.addObserver(forName: NSWorkspace.didWakeNotification, object: nil, queue: .main) { [weak self] _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 60) { self?.due() } }
        nc.addObserver(forName: NSWorkspace.didMountNotification, object: nil, queue: .main) { [weak self] _ in
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { self?.due() } }
    }
    static func day(_ d: Date) -> String { let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"; return f.string(from: d) }
    func size(_ b: Int) -> String { b < 1_000_000 ? "\(max(1, b / 1000)) KB" : String(format: "%.1f MB", Double(b) / 1e6) }

    func due() {
        guard folder != nil, app?.signedIn == true, !running else { return }
        let now = Date()
        if lastDay == Backups.day(now) || Calendar.current.component(.hour, from: now) < 1 { return }
        run()
    }
    func finish(_ msg: String) { running = false; state = msg; app?.paint() }

    func run() {
        guard let app = app else { return }
        guard let base = folder else { state = "Choose a backup folder first."; app.paint(); return }
        guard app.signedIn else { state = "Sign in to Quiet Studio on this Mac first."; app.paint(); return }
        var isDir: ObjCBool = false
        guard fm.fileExists(atPath: base.path, isDirectory: &isDir), isDir.boolValue else {
            state = "\(base.lastPathComponent) isn't connected. Trying again every 15 minutes."; app.paint(); return }
        if running { return }
        running = true; state = "Backing up…"; app.paint()
        app.js("window.QM&&QM.backupPrep&&QM.backupPrep()")        // sync first, so the file holds the latest from every device
        DispatchQueue.main.asyncAfter(deadline: .now() + 15) { [weak self] in
            app.js("(function(){try{return window.QM&&QM.backup?JSON.stringify(QM.backup()):null}catch(e){return null}})()") { r in
                guard let self = self else { return }
                guard let s = r as? String, let data = s.data(using: .utf8),
                      let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                      obj["kind"] as? String == "quiet-media-studio-backup" else {
                    self.finish("Backup failed: Studio didn't answer. Open Quiet Studio from here once, then Back up now."); return }
                let counts = obj["counts"] as? [String: Any] ?? [:]
                let records = counts.values.reduce(0) { $0 + (($1 as? NSNumber)?.intValue ?? 0) }
                if records == 0 { self.finish("Skipped: Studio hadn't loaded any data yet. Trying again soon."); return }
                let now = Date(), d = Backups.day(now)
                let rel = "Studio Backups/\(d.prefix(4))/\(d.dropFirst(5).prefix(2))/studio-\(d).json"
                let file = base.appendingPathComponent(rel)
                DispatchQueue.global(qos: .utility).async {
                    do {
                        try self.fm.createDirectory(at: file.deletingLastPathComponent(), withIntermediateDirectories: true)
                        try data.write(to: file, options: .atomic)
                        let pruned = self.prune(base.appendingPathComponent("Studio Backups", isDirectory: true), today: now)
                        let mac = Host.current().localizedName ?? "Mac"
                        DispatchQueue.main.async {
                            self.lastDay = d; self.lastAt = now
                            let info: [String: Any] = ["at": now.timeIntervalSince1970 * 1000, "bytes": data.count, "file": rel,
                                                       "mac": mac, "records": records]
                            app.call("QM.backupDone", [info])
                            self.finish("Saved \(time(now.timeIntervalSince1970)) · \(records) records · \(self.size(data.count))" + (pruned > 0 ? " · \(pruned) old removed" : ""))
                        }
                    } catch {
                        DispatchQueue.main.async { self.finish("Backup failed: \(error.localizedDescription)") }
                    }
                }
            }
        }
    }
    // every day for 30 days, then only the 1st of each month
    func prune(_ root: URL, today: Date) -> Int {
        guard let en = fm.enumerator(at: root, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles]) else { return 0 }
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        guard let cutoff = Calendar.current.date(byAdding: .day, value: -30, to: today) else { return 0 }
        var old: [URL] = []
        for case let u as URL in en {
            let name = u.lastPathComponent
            guard name.hasPrefix("studio-"), name.hasSuffix(".json") else { continue }
            let ds = String(name.dropFirst(7).dropLast(5))
            if let dd = f.date(from: ds), dd < cutoff, !ds.hasSuffix("-01") { old.append(u) }
        }
        return old.filter { (try? fm.removeItem(at: $0)) != nil }.count
    }
    func choose() {
        let p = NSOpenPanel(); p.canChooseDirectories = true; p.canChooseFiles = false; p.canCreateDirectories = true; p.allowsMultipleSelection = false
        p.prompt = "Back up here"; p.message = "Choose the folder on the NAS. Studio is saved there every night."
        NSApp.activate(ignoringOtherApps: true)
        if p.runModal() == .OK, let u = p.url { folder = u; state = ""; run() }
    }
    func summary() -> String {
        guard let f = folder else { return "Backups: choose a folder on the NAS and Studio is saved there every night." }
        let w = "Backup to \(f.lastPathComponent): "
        if !state.isEmpty { return w + state }
        if let a = lastAt { return w + "last \(Backups.day(a)) \(time(a.timeIntervalSince1970))" }
        return w + "first one tonight after 1am"
    }
}

// MARK: - the panel under the status item
final class Panel: NSView {
    let title = NSTextField(labelWithString: ""), sub = NSTextField(labelWithString: ""), big = NSTextField(labelWithString: "")
    let note = NSTextField(wrappingLabelWithString: ""), today = NSTextField(labelWithString: ""), drives = NSTextField(wrappingLabelWithString: "")
    let primary = NSButton(title: "", target: nil, action: nil), secondary = NSButton(title: "", target: nil, action: nil)
    let tertiary = NSButton(title: "", target: nil, action: nil)
    let open = NSButton(title: "Open Quiet Studio", target: nil, action: nil), quit = NSButton(title: "Quit", target: nil, action: nil)
    let syncDrives = NSButton(title: "Sync drives", target: nil, action: nil)
    let backup = NSTextField(wrappingLabelWithString: "")
    let backupNow = NSButton(title: "Back up now", target: nil, action: nil), backupFolder = NSButton(title: "Backup folder…", target: nil, action: nil)
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
        drives.font = NSFont.systemFont(ofSize: 11); drives.textColor = .secondaryLabelColor; drives.preferredMaxLayoutWidth = 268
        backup.font = NSFont.systemFont(ofSize: 11); backup.textColor = .secondaryLabelColor; backup.preferredMaxLayoutWidth = 268
        for b in [primary, secondary, tertiary] { b.bezelStyle = .rounded; b.controlSize = .large; b.font = NSFont.systemFont(ofSize: 13) }
        primary.keyEquivalent = "\r"
        for b in [open, syncDrives, quit, backupNow, backupFolder] { b.isBordered = false; b.font = NSFont.systemFont(ofSize: 12); b.contentTintColor = .secondaryLabelColor }
        primary.target = self; primary.action = #selector(p1)
        secondary.target = self; secondary.action = #selector(p2)
        tertiary.target = self; tertiary.action = #selector(p3)

        let buttons = NSStackView(views: [primary, secondary, tertiary]); buttons.orientation = .horizontal; buttons.spacing = 8
        let foot = NSStackView(views: [open, syncDrives, quit]); foot.orientation = .horizontal; foot.distribution = .equalSpacing
        let bfoot = NSStackView(views: [backupNow, backupFolder]); bfoot.orientation = .horizontal; bfoot.spacing = 14
        let stack = NSStackView(views: [title, sub, big, note, buttons, today, drives, backup, bfoot, foot])
        stack.orientation = .vertical; stack.alignment = .leading; stack.spacing = 6
        stack.setCustomSpacing(10, after: sub); stack.setCustomSpacing(10, after: note); stack.setCustomSpacing(10, after: today); stack.setCustomSpacing(10, after: drives); stack.setCustomSpacing(14, after: bfoot)
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
    var tick: Timer?, poll: Timer?, ditPoll: Timer?
    var ditWas = false
    var backups: Backups!
    var driveWatcher: DriveWatcher!   // started once the ring is up, so nothing runs before the app has finished launching

    func applicationDidFinishLaunching(_ n: Notification) {
        NSApp.setActivationPolicy(.accessory)
        let cfg = WKWebViewConfiguration(); cfg.websiteDataStore = .default()
        web = WKWebView(frame: NSRect(x: 0, y: 0, width: 420, height: 820), configuration: cfg)
        web.navigationDelegate = self
        web.customUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15 QuietStudioMenuBar/7"
        webWindow = NSWindow(contentRect: web.frame, styleMask: [.titled, .closable, .miniaturizable, .resizable], backing: .buffered, defer: false)
        webWindow.title = "Quiet Studio"; webWindow.contentView = web; webWindow.isReleasedWhenClosed = false; webWindow.center()
        web.load(URLRequest(url: APP_URL))

        status = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        status.button?.image = brandMark(18); status.button?.imagePosition = .imageLeading
        status.button?.font = NSFont.monospacedDigitSystemFont(ofSize: 12, weight: .regular)
        status.button?.target = self; status.button?.action = #selector(toggle)
        status.autosaveName = "QuietStudioRing"   // a fresh saved place, in case the old one was bad
        status.isVisible = true   // in case macOS remembered it as removed from the menu bar

        popover.contentViewController = NSViewController(); popover.contentViewController!.view = panel
        popover.behavior = .transient; popover.animates = true; popover.delegate = self
        panel.onPrimary = { [weak self] in self?.primary() }
        panel.onSecondary = { [weak self] in self?.secondary() }
        panel.open.target = self; panel.open.action = #selector(openApp)
        panel.quit.target = NSApp; panel.quit.action = #selector(NSApplication.terminate(_:))
        panel.syncDrives.target = self; panel.syncDrives.action = #selector(syncDrives)
        panel.backupNow.target = self; panel.backupNow.action = #selector(backupNow)
        panel.backupFolder.target = self; panel.backupFolder.action = #selector(backupFolder)

        poll = Timer.scheduledTimer(withTimeInterval: POLL, repeats: true) { [weak self] _ in self?.refresh() }
        tick = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in self?.paint() }
        ditPoll = Timer.scheduledTimer(withTimeInterval: 3, repeats: true) { [weak self] _ in self?.pollDIT() }
        RunLoop.main.add(poll!, forMode: .common); RunLoop.main.add(tick!, forMode: .common); RunLoop.main.add(ditPoll!, forMode: .common)
        paint()
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) { [weak self] in
            guard let self = self else { return }
            self.driveWatcher = DriveWatcher(); self.driveWatcher.app = self
            self.backups = Backups(app: self)
            DispatchQueue.main.asyncAfter(deadline: .now() + 30) { self.backups.due() }
            UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
            if self.signedIn { self.driveWatcher.scan() }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in self?.checkRing() }
    }
    // macOS can hide the ring: behind the camera notch when the menu bar is full, or when the app is not allowed in the menu bar.
    // Say where it is (shown in Terminal when run from there), and open the window if it cannot be seen so the app is still usable.
    func checkRing() {
        guard let w = status.button?.window else { print("Quiet Studio: the menu bar gave no space for the ring"); openApp(); return }
        let f = w.frame, scr = w.screen ?? NSScreen.main
        var notch = false
        if let s = scr, let l = s.auxiliaryTopLeftArea, let r = s.auxiliaryTopRightArea { notch = f.maxX > l.maxX && f.minX < r.minX }
        let onScreen = scr.map { $0.frame.intersects(f) } ?? false
        let seen = w.occlusionState.contains(.visible)
        print("Quiet Studio: ring at x \(Int(f.minX))–\(Int(f.maxX)) on \(scr?.localizedName ?? "no screen"); on screen: \(onScreen); visible: \(seen); behind the notch: \(notch)")
        if !onScreen || !seen || notch { openApp() }
    }
    func webView(_ w: WKWebView, didFinish nav: WKNavigation!) { refresh() }
    // clicking Quiet Studio in Applications or Launchpad while it runs opens the window, so it is reachable even if the ring is hidden
    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows: Bool) -> Bool { openApp(); return true }

    func js(_ code: String, _ done: ((Any?) -> Void)? = nil) {
        web.evaluateJavaScript(code) { r, _ in done?(r) }
    }
    // QM.<fn>(...args) with JSON in and out: objects come back as a JSON string
    func call(_ fn: String, _ args: [Any], _ done: ((Any?) -> Void)? = nil) {
        guard let d = try? JSONSerialization.data(withJSONObject: args), let a = String(data: d, encoding: .utf8) else { return }
        js("(function(){try{var r=\(fn).apply(window.QM,\(a));return r!==null&&typeof r==='object'?JSON.stringify(r):r}catch(e){return null}})()", done)
    }
    // the DIT app's progress, from this Mac only (loopback), into Studio
    func pollDIT() {
        guard signedIn, let url = URL(string: "http://127.0.0.1:8765/api/live") else { return }
        var req = URLRequest(url: url); req.timeoutInterval = 2; req.cachePolicy = .reloadIgnoringLocalCacheData
        URLSession.shared.dataTask(with: req) { [weak self] data, resp, _ in
            var obj: Any? = nil
            if let d = data, (resp as? HTTPURLResponse)?.statusCode == 200,
               let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any], o["dit"] as? Bool == true { obj = o }
            DispatchQueue.main.async {
                guard let self = self else { return }
                if let o = obj { self.ditWas = true; self.call("QM.dit", [o]) }
                else if self.ditWas { self.ditWas = false; self.call("QM.dit", [NSNull()]) }   // the DIT app was closed
            }
        }.resume()
    }
    func refresh() {
        js("(function(){try{return window.QM?JSON.stringify(window.QM.live()):'nope'}catch(e){return 'nope'}})()") { [weak self] r in
            guard let self = self else { return }
            let was = self.signedIn
            defer { if self.signedIn && !was { self.driveWatcher?.scan() } }   // drives plugged in before sign-in or app load
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
        else if let low = driveWatcher?.lowName { b.title = " \(low) low on space"; b.toolTip = "Open Quiet Studio, Drives, to see what to clear" }
        else { b.title = ""; b.toolTip = "Quiet Studio" }
        if popover.isShown { panel.show(live, signedIn: signedIn); panel.drives.stringValue = driveWatcher?.summary() ?? ""; panel.backup.stringValue = backups?.summary() ?? "" }
    }
    func short(_ s: String) -> String { s.count > 22 ? String(s.prefix(21)) + "…" : s }

    @objc func toggle() {
        if popover.isShown { popover.performClose(nil); return }
        panel.show(live, signedIn: signedIn); panel.drives.stringValue = driveWatcher?.summary() ?? ""; panel.backup.stringValue = backups?.summary() ?? ""
        popover.show(relativeTo: status.button!.bounds, of: status.button!, preferredEdge: .minY)
        refresh()
    }
    @objc func syncDrives() { driveWatcher?.scan(full: true); paint() }
    @objc func backupNow() { backups?.run() }
    @objc func backupFolder() { popover.performClose(nil); backups?.choose() }
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
