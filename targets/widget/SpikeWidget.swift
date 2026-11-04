import AppIntents
import SwiftUI
import WidgetKit

// Widget «Importantes»: pósits clavados en una aguja (pincho de notas). El de delante es el
// recordatorio que toca; detrás asoman los siguientes, cada uno girado a su manera. Al marcarlo
// como hecho sale de la aguja y aparece el siguiente. Misma geometría que src/lib/spike-art.ts.

struct SpikeMetrics {
  let cx: CGFloat, x0: CGFloat, y0: CGFloat, pw: CGFloat, ph: CGFloat, step: CGFloat
  let baseY: CGFloat, baseRX: CGFloat, baseRY: CGFloat

  init(_ s: CGSize) {
    let w = s.width, h = s.height
    let pad: CGFloat = w > h * 1.5 ? (w * 0.1).rounded() : (w > 250 ? 26 : 17)
    cx = w / 2
    x0 = pad
    y0 = 17
    pw = w - pad * 2
    step = 7
    ph = h - 17 - 3 * 7 - 32
    baseY = h - 13
    baseRX = min(48, max(26, w * 0.16))
    baseRY = 7
  }
}

enum SpikeLogic {
  static func hash(_ s: String) -> Int64 {
    var h: Int64 = 7
    for c in s.utf16 { h = (h * 31 + Int64(c)) % 2_147_483_647 }
    return h == 0 ? 1 : h
  }

  /// Giro de cada pósit de detrás: distinto para cada recordatorio y alternando el lado.
  static func tilt(_ id: String, _ index: Int) -> Double {
    var r = SeededRandom(seed: hash(id))
    let deg = 2.5 + Double(r.next()) * 4.5
    return index % 2 == 1 ? -deg : deg
  }

  static func widthJitter(_ id: String) -> CGFloat {
    var r = SeededRandom(seed: hash(id) + 11)
    _ = r.next()
    return -4 + r.next() * 8
  }

  static func items(_ snap: Snapshot?) -> [SReminder] {
    (snap?.reminders ?? []).filter { $0.important }.sorted(by: ReminderLogic.byDue)
  }

  static func colors(_ r: SReminder, _ snap: Snapshot?) -> (paper: Color, fold: Color, ink: Color) {
    let nb = snap?.notebooks.first { $0.id == r.notebookId }
    return (Color(hex: nb?.paper ?? "#FFF1A8"), Color(hex: nb?.fold ?? "#F3D97A"), Color(hex: nb?.ink ?? "#5B4A0E"))
  }

  /// "★ Trabajo", o "★ 💼" si no cabe el nombre de la libreta.
  static func label(_ r: SReminder, _ snap: Snapshot?, short: Bool) -> String {
    guard let nb = snap?.notebooks.first(where: { $0.id == r.notebookId }) else { return short ? "★" : "★ Importante" }
    return short ? "★ \(nb.emoji)" : "★ \(nb.name)"
  }
}

private let steel = LinearGradient(colors: [Color(hex: "#8C939C"), Color(hex: "#E6E9ED"), Color(hex: "#969DA6")], startPoint: .leading, endPoint: .trailing)

/// Aguja entera, base y pósits de detrás.
struct SpikeBackdrop: View {
  let m: SpikeMetrics
  let back: [(id: String, paper: Color)]
  let tip: CGFloat
  let dark: Bool

  var body: some View {
    Canvas { ctx, _ in
      // Aguja (detrás de todo), clavada en la base
      ctx.fill(Path(CGRect(x: m.cx - 1.5, y: tip + 8.5, width: 3, height: max(0, m.baseY - 1 - tip - 8.5))), with: .linearGradient(Gradient(colors: [Color(hex: "#8C939C"), Color(hex: "#E6E9ED"), Color(hex: "#969DA6")]), startPoint: CGPoint(x: m.cx - 1.5, y: 0), endPoint: CGPoint(x: m.cx + 1.5, y: 0)))
      var point = Path()
      point.move(to: CGPoint(x: m.cx - 1.5, y: tip + 9)); point.addLine(to: CGPoint(x: m.cx + 1.5, y: tip + 9)); point.addLine(to: CGPoint(x: m.cx, y: tip)); point.closeSubpath()
      ctx.fill(point, with: .color(Color(hex: "#AEB4BC")))

      ctx.fill(Path(ellipseIn: CGRect(x: m.cx - m.baseRX * 1.12, y: m.baseY + 3 - m.baseRY * 1.3, width: m.baseRX * 2.24, height: m.baseRY * 2.6)), with: .color(.black.opacity(dark ? 0.3 : 0.1)))
      ctx.fill(Path(ellipseIn: CGRect(x: m.cx - m.baseRX, y: m.baseY - m.baseRY, width: m.baseRX * 2, height: m.baseRY * 2)), with: .linearGradient(Gradient(colors: [Color(hex: "#7A7067"), Color(hex: "#3E3934")]), startPoint: CGPoint(x: 0, y: m.baseY - m.baseRY), endPoint: CGPoint(x: 0, y: m.baseY + m.baseRY)))
      ctx.fill(Path(ellipseIn: CGRect(x: m.cx - m.baseRX * 0.84, y: m.baseY - 2 - m.baseRY * 0.5, width: m.baseRX * 1.68, height: m.baseRY)), with: .color(Color(hex: "#958A80").opacity(0.55)))
      ctx.fill(Path(ellipseIn: CGRect(x: m.cx - 2.6, y: m.baseY - 3.2, width: 5.2, height: 2.4)), with: .color(Color(hex: "#2E2A26").opacity(0.7)))

      // Pósits de detrás, del más bajo al más alto; cada uno girado sobre su agujero
      for i in stride(from: back.count, through: 1, by: -1) {
        let n = back[i - 1]
        let bw = m.pw + SpikeLogic.widthJitter(n.id)
        let y = m.y0 + CGFloat(i) * m.step
        let pierce = CGPoint(x: m.cx, y: y + 10)
        var c = ctx
        c.translateBy(x: pierce.x, y: pierce.y)
        c.rotate(by: .degrees(SpikeLogic.tilt(n.id, i)))
        c.translateBy(x: -pierce.x, y: -pierce.y)
        let rect = CGRect(x: m.cx - bw / 2, y: y, width: bw, height: m.ph)
        c.fill(Path(roundedRect: rect.offsetBy(dx: 0, dy: 1.8), cornerRadius: 3), with: .color(.black.opacity(0.07)))
        c.fill(Path(roundedRect: rect.offsetBy(dx: 0, dy: 0.7), cornerRadius: 3), with: .color(.black.opacity(0.05)))
        c.fill(Path(roundedRect: rect, cornerRadius: 3), with: .color(n.paper))
        c.fill(Path(roundedRect: CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: min(15, m.ph * 0.13)), cornerRadius: 3), with: .color(.black.opacity(0.035)))
        c.fill(Path(ellipseIn: CGRect(x: pierce.x - 3.6, y: pierce.y - 3.6, width: 7.2, height: 7.2)), with: .color(.black.opacity(0.08)))
        c.fill(Path(ellipseIn: CGRect(x: pierce.x - 2.2, y: pierce.y - 2.2, width: 4.4, height: 4.4)), with: .color(Color(hex: "#3B3632").opacity(0.6)))
      }
    }
  }
}

/// El pósit de delante, recto para que se lea, con el círculo para marcarlo como hecho.
struct FrontPost: View {
  let reminder: SReminder
  let colors: (paper: Color, fold: Color, ink: Color)
  let label: String
  let when: String
  let overdue: Bool
  let m: SpikeMetrics
  let titleSize: CGFloat
  let lines: Int

  var body: some View {
    let f = (min(m.pw, m.ph) * 0.16).rounded()
    let shape = PostitShape(radius: 3, fold: f, tear: 0)
    ZStack(alignment: .topLeading) {
      shape.fill(Color.black.opacity(0.07)).offset(y: 1.8)
      shape.fill(Color.black.opacity(0.05)).offset(y: 0.7)
      shape.fill(colors.paper)
      UnevenRoundedRectangle(topLeadingRadius: 3, topTrailingRadius: 3).fill(Color.black.opacity(0.035)).frame(height: min(15, m.ph * 0.13))
      Path { p in
        let fx = m.pw - f, fy = m.ph - f
        p.move(to: CGPoint(x: fx, y: m.ph))
        p.addLine(to: CGPoint(x: m.pw, y: fy))
        p.addLine(to: CGPoint(x: fx + f * 0.08, y: fy))
        p.addQuadCurve(to: CGPoint(x: fx, y: fy + f * 0.08), control: CGPoint(x: fx, y: fy))
        p.closeSubpath()
      }
      .fill(colors.fold)
      Circle().fill(Color.black.opacity(0.08)).frame(width: 7.2, height: 7.2).offset(x: m.pw / 2 - 3.6, y: 10 - 3.6)
      Circle().fill(Color(hex: "#3B3632").opacity(0.6)).frame(width: 4.4, height: 4.4).offset(x: m.pw / 2 - 2.2, y: 10 - 2.2)

      // Etiqueta en la franja adhesiva, a la izquierda de la aguja
      Text(label).font(.system(size: 10, weight: .bold)).foregroundStyle(colors.ink.opacity(0.6)).lineLimit(1)
        .frame(width: max(0, m.pw / 2 - 20), height: 13, alignment: .leading)
        .offset(x: 12, y: 2)

      Text(reminder.title).font(.custom("Caveat-Bold", size: titleSize)).foregroundStyle(colors.ink).lineLimit(lines)
        .frame(width: m.pw - 24, height: max(0, m.ph - 8 - 20 - 3 - 17), alignment: .topLeading)
        .offset(x: 12, y: 17)

      HStack(spacing: 8) {
        Button(intent: CompleteReminderIntent(reminderId: reminder.id)) {
          Circle()
            .strokeBorder(colors.ink.opacity(0.65), lineWidth: 1.8)
            .frame(width: 20, height: 20)
            .contentShape(Circle().inset(by: -8))
        }
        .buttonStyle(.plain)
        if !when.isEmpty {
          Text(when).font(.system(size: 12, weight: .semibold)).foregroundStyle(overdue ? Color(hex: "#C2413A") : colors.ink.opacity(0.7))
        }
      }
      .offset(x: 12, y: m.ph - 8 - 20)
    }
    .frame(width: m.pw, height: m.ph, alignment: .topLeading)
  }
}

// MARK: - Línea de tiempo

struct SpikeEntry: TimelineEntry {
  let date: Date
  let snapshot: Snapshot?
}

struct SpikeProvider: TimelineProvider {
  func placeholder(in context: Context) -> SpikeEntry { SpikeEntry(date: .now, snapshot: nil) }

  func getSnapshot(in context: Context, completion: @escaping (SpikeEntry) -> Void) {
    completion(SpikeEntry(date: .now, snapshot: SharedStore.load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<SpikeEntry>) -> Void) {
    let now = Date.now
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(86_400 + 30)
    let snap = SharedStore.load()
    completion(Timeline(entries: [SpikeEntry(date: now, snapshot: snap), SpikeEntry(date: midnight, snapshot: snap)], policy: .after(midnight)))
  }
}

// MARK: - Vista

struct SpikeEntryView: View {
  let entry: SpikeEntry
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var scheme

  var body: some View {
    let items = SpikeLogic.items(entry.snapshot)
    switch family {
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        Text("★ Importantes").font(.headline).widgetAccentable()
        if let r = items.first {
          Text(r.title).font(.caption).lineLimit(2)
          if items.count > 1 { Text("+\(items.count - 1) más").font(.caption2) }
        } else {
          Text("No hay recordatorios importantes").font(.caption).lineLimit(2)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .containerBackground(for: .widget) { Color.clear }
    default:
      GeometryReader { geo in
        let m = SpikeMetrics(geo.size)
        let empty = items.isEmpty
        let tip: CGFloat = empty ? (geo.size.height * 0.44).rounded() : 6
        let back = items.dropFirst().prefix(3).map { (id: $0.id, paper: SpikeLogic.colors($0, entry.snapshot).paper) }
        let wide = geo.size.width > geo.size.height * 1.5
        let large = !wide && geo.size.width > 250 && geo.size.height > 250
        ZStack(alignment: .topLeading) {
          SpikeBackdrop(m: m, back: back, tip: tip, dark: scheme == .dark)

          if empty {
            Text("No hay recordatorios importantes")
              .font(.custom("Caveat-Bold", size: 21))
              .foregroundStyle(Color(hex: "#8A7F74"))
              .multilineTextAlignment(.center)
              .frame(width: geo.size.width - 28, height: max(0, tip - 14))
              .offset(x: 14, y: 10)
          }

          if let r = items.first {
            FrontPost(
              reminder: r,
              colors: SpikeLogic.colors(r, entry.snapshot),
              label: SpikeLogic.label(r, entry.snapshot, short: m.pw / 2 - 20 < 70),
              when: ReminderLogic.when(r, now: entry.date),
              overdue: ReminderLogic.isOverdue(r, now: entry.date),
              m: m,
              titleSize: large ? 28 : (wide ? 22 : 19),
              lines: large ? 7 : 2
            )
            .offset(x: m.x0, y: m.y0)
            .id(r.id)
            .transition(.asymmetric(insertion: .opacity, removal: .move(edge: .top).combined(with: .opacity)))

            // La aguja asoma por el agujero del pósit de delante.
            Rectangle().fill(steel).frame(width: 3, height: m.y0 + 10 - (tip + 8.5)).offset(x: m.cx - 1.5, y: tip + 8.5)
            Path { p in
              p.move(to: CGPoint(x: m.cx - 1.5, y: tip + 9)); p.addLine(to: CGPoint(x: m.cx + 1.5, y: tip + 9)); p.addLine(to: CGPoint(x: m.cx, y: tip)); p.closeSubpath()
            }
            .fill(Color(hex: "#AEB4BC"))
          }

          if items.count > 1 {
            Text("+\(items.count - 1)")
              .font(.system(size: 11, weight: .bold))
              .foregroundStyle(.white)
              .padding(.horizontal, 7)
              .frame(height: 18)
              .background(Capsule().fill(Color(hex: "#3E3934")))
              .offset(x: m.cx + m.baseRX + 8, y: m.baseY - 9)
          }
        }
        .animation(.spring(duration: 0.45), value: items.first?.id)
      }
      .containerBackground(for: .widget) {
        LinearGradient(colors: scheme == .dark ? [Color(hex: "#2C2926"), Color(hex: "#1E1C1A")] : [Color(hex: "#FBF8F3"), Color(hex: "#F0E8DC")], startPoint: .top, endPoint: .bottom)
      }
      .widgetURL(URL(string: items.first.map { "notita://reminder/\($0.id)" } ?? "notita://libretas/importantes"))
    }
  }
}

struct SpikeWidget: Widget {
  let kind = "NotitaImportantes"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: SpikeProvider()) { entry in
      SpikeEntryView(entry: entry)
    }
    .configurationDisplayName("Importantes")
    .description("Tus recordatorios importantes clavados en una aguja. Márcalo como hecho y aparece el siguiente.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
    .contentMarginsDisabled()
  }
}
