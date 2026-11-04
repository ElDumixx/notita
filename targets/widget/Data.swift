import Foundation
import UserNotifications
import WidgetKit

let appGroup = "group.com.paulbumb.notita"

// MARK: - Instantánea que escribe la app (src/lib/widget-data.ts → buildSnapshot)

struct Snapshot: Codable {
  var version: Int
  var generatedAt: Double
  var notebooks: [SNotebook]
  var reminders: [SReminder]
  var designs: [SDesign]
  var anniversaries: [SAnniversary]?
}

struct SNotebook: Codable {
  var id: String
  var name: String
  var emoji: String
  var paper: String?
  var fold: String?
  var ink: String?
}

struct SAnniversary: Codable, Identifiable {
  var id: String
  var kind: String
  var name: String
  /// Mes 0–11, como en JavaScript.
  var month: Int
  var day: Int
  var year: Int?
  var emoji: String
}

struct SReminder: Codable, Identifiable {
  var id: String
  var notebookId: String
  var title: String
  var dueAt: Double?
  var hasTime: Bool
  var important: Bool
  var createdAt: Double
}

struct SFont: Codable {
  var key: String
  var regular: String
  var bold: String
  var scale: Double
}

struct SColors: Codable {
  var paper: String
  var ink: String
  var line: String
  var fold: String
  var strong: String
  var board: String
  var boardOpacity: Double
}

struct SDesign: Codable {
  var id: String
  var name: String
  var source: String
  var title: String
  var board: String
  var shape: String
  var paper: String
  var showTime: Bool
  var showHeader: Bool
  var font: SFont
  var colors: SColors
}

extension SDesign {
  static let fallback = SDesign(
    id: "default", name: "Pósit clásico", source: "hoy", title: "Hoy", board: "blanco", shape: "doblado", paper: "rayas",
    showTime: true, showHeader: true,
    font: SFont(key: "comic", regular: "ComicNeue-Regular", bold: "ComicNeue-Bold", scale: 1),
    colors: SColors(paper: "#FFF1A8", ink: "#5B4A0E", line: "#EAD27C", fold: "#F3D97A", strong: "#EFC94C", board: "#FFFFFF", boardOpacity: 1)
  )
}

// MARK: - Almacenamiento compartido (App Group)

enum SharedStore {
  static var defaults: UserDefaults? { UserDefaults(suiteName: appGroup) }

  static func load() -> Snapshot? {
    guard let raw = defaults?.string(forKey: "snapshot"), let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(Snapshot.self, from: data)
  }

  private static func save(_ snapshot: Snapshot) {
    guard let data = try? JSONEncoder().encode(snapshot), let raw = String(data: data, encoding: .utf8) else { return }
    defaults?.set(raw, forKey: "snapshot")
  }

  /// Marca un recordatorio como hecho desde el widget. La app aplica el cambio al abrirse.
  static func markDone(_ id: String) {
    guard let d = defaults else { return }
    var ids: [String] = []
    if let raw = d.string(forKey: "completedFromWidget"), let data = raw.data(using: .utf8),
       let arr = try? JSONDecoder().decode([String].self, from: data) {
      ids = arr
    }
    if !ids.contains(id) { ids.append(id) }
    if let data = try? JSONEncoder().encode(ids), let raw = String(data: data, encoding: .utf8) {
      d.set(raw, forKey: "completedFromWidget")
    }
    if var snap = load() {
      snap.reminders.removeAll { $0.id == id }
      save(snap)
    }
    // El resto de widgets (pósits, aguja) también lo quitan.
    WidgetCenter.shared.reloadAllTimelines()
    // Evita que llegue el aviso de algo que ya está hecho.
    let center = UNUserNotificationCenter.current()
    center.getPendingNotificationRequests { requests in
      let ids = requests.map(\.identifier).filter { $0.hasSuffix("-\(id)") }
      center.removePendingNotificationRequests(withIdentifiers: ids)
    }
  }
}

// MARK: - Filtro y orden (misma lógica que src/store/selectors.ts)

enum ReminderLogic {
  static func items(for design: SDesign, in snap: Snapshot, now: Date) -> [SReminder] {
    let cal = Calendar.current
    let endToday = (cal.startOfDay(for: now).timeIntervalSince1970 + 86_400) * 1000 - 1
    var list = snap.reminders
    switch design.source {
    case "hoy": list = list.filter { ($0.dueAt ?? .infinity) <= endToday }
    case "proximos": list = list.filter { $0.dueAt != nil }
    case "importantes": list = list.filter { $0.important }
    case "todos": break
    default:
      if design.source.hasPrefix("libreta:") {
        let id = String(design.source.dropFirst("libreta:".count))
        list = list.filter { $0.notebookId == id }
      }
    }
    return list.sorted(by: byDue)
  }

  static func byDue(_ a: SReminder, _ b: SReminder) -> Bool {
    switch (a.dueAt, b.dueAt) {
    case (nil, nil): return a.createdAt < b.createdAt
    case (nil, _): return false
    case (_, nil): return true
    case let (x?, y?):
      let cal = Calendar.current
      let dx = Date(timeIntervalSince1970: x / 1000), dy = Date(timeIntervalSince1970: y / 1000)
      if cal.isDate(dx, inSameDayAs: dy) && a.hasTime != b.hasTime { return !a.hasTime }
      return x == y ? a.createdAt < b.createdAt : x < y
    }
  }

  private static let days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
  private static let months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"]

  /// "18:00", "mañana", "jue 9:00", "10 nov" (como compactWhen en widget-data.ts)
  static func when(_ r: SReminder, now: Date) -> String {
    guard let ms = r.dueAt else { return "" }
    let cal = Calendar.current
    let date = Date(timeIntervalSince1970: ms / 1000)
    let diff = cal.dateComponents([.day], from: cal.startOfDay(for: now), to: cal.startOfDay(for: date)).day ?? 0
    let c = cal.dateComponents([.hour, .minute, .weekday, .day, .month], from: date)
    let time = r.hasTime ? "\(c.hour ?? 0):\(String(format: "%02d", c.minute ?? 0))" : ""
    if diff == 0 { return time.isEmpty ? "hoy" : time }
    if diff == 1 { return r.hasTime ? "mañ. \(time)" : "mañana" }
    if diff > 1 && diff < 7 { return days[(c.weekday ?? 1) - 1] + (time.isEmpty ? "" : " \(time)") }
    return "\(c.day ?? 1) \(months[(c.month ?? 1) - 1])"
  }

  static func isOverdue(_ r: SReminder, now: Date) -> Bool {
    guard let ms = r.dueAt else { return false }
    let date = Date(timeIntervalSince1970: ms / 1000)
    return date < Calendar.current.startOfDay(for: now)
  }
}

// MARK: - Aniversarios (misma lógica que src/lib/anniversaries.ts)

enum AnniversaryLogic {
  static let monthsShort = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"]

  private static func isLeap(_ y: Int) -> Bool { (y % 4 == 0 && y % 100 != 0) || y % 400 == 0 }

  /// El 29 de febrero se celebra el 28 en los años no bisiestos.
  static func date(_ a: SAnniversary, year: Int) -> Date {
    let day = a.month == 1 && a.day == 29 && !isLeap(year) ? 28 : a.day
    return Calendar.current.date(from: DateComponents(year: year, month: a.month + 1, day: day)) ?? .now
  }

  static func next(_ a: SAnniversary, now: Date) -> Date {
    let cal = Calendar.current
    let year = cal.component(.year, from: now)
    let d = date(a, year: year)
    return d >= cal.startOfDay(for: now) ? d : date(a, year: year + 1)
  }

  static func days(_ a: SAnniversary, now: Date) -> Int {
    let cal = Calendar.current
    return cal.dateComponents([.day], from: cal.startOfDay(for: now), to: next(a, now: now)).day ?? 0
  }

  static func countdown(_ days: Int) -> String {
    if days <= 0 { return "¡Hoy!" }
    if days == 1 { return "Mañana" }
    if days < 60 { return "En \(days) días" }
    return "En \(Int(Double(days) / 30.4)) meses"
  }

  /// Versión corta para listas: "Hoy", "Mañana", "12 días", "2 meses".
  static func shortCountdown(_ days: Int) -> String {
    if days <= 0 { return "Hoy" }
    if days == 1 { return "Mañana" }
    if days < 60 { return "\(days) días" }
    return "\(Int(Double(days) / 30.4)) meses"
  }

  static func kindLabel(_ a: SAnniversary) -> String {
    switch a.kind {
    case "cumple": return "Cumpleaños"
    case "aniversario": return "Aniversario"
    default: return "Otra fecha"
    }
  }

  /// "Cumple 31 años · 12 nov"
  static func detail(_ a: SAnniversary, now: Date) -> String {
    var first = kindLabel(a)
    if let y = a.year {
      let n = Calendar.current.component(.year, from: next(a, now: now)) - y
      if n > 0 { first = a.kind == "cumple" ? "Cumple \(n) \(n == 1 ? "año" : "años")" : "\(n) \(n == 1 ? "año" : "años")" }
    }
    return "\(first) · \(a.day) \(monthsShort[max(0, min(11, a.month))])"
  }

  static func upcoming(_ snap: Snapshot?, now: Date) -> [SAnniversary] {
    (snap?.anniversaries ?? []).sorted {
      let x = next($0, now: now), y = next($1, now: now)
      return x == y ? $0.name < $1.name : x < y
    }
  }
}
