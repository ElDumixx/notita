import AppIntents
import SwiftUI
import WidgetKit

// Widget «Importantes»: pósits clavados en una aguja (pincho de notas). El de delante es el
// recordatorio que toca; detrás asoman los siguientes, cada uno girado a su manera y con el color
// de su libreta. Al marcarlo como hecho sale de la aguja y aparece el siguiente; sin importantes
// queda solo la aguja. El fondo, la forma, el papel, la letra y la tinta salen del diseño elegido.
// Misma geometría que src/lib/spike-art.ts.

// MARK: - Configuración: el usuario elige uno de sus diseños de aguja

struct SpikeDesignEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Aguja"
  static var defaultQuery = SpikeDesignQuery()
  var id: String
  var name: String
  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct SpikeDesignQuery: EntityQuery {
  private func all() -> [SpikeDesignEntity] {
    let designs = (SharedStore.load()?.designs ?? []).filter(\.isSpike)
    return (designs.isEmpty ? [SDesign.spikeFallback] : designs).map { SpikeDesignEntity(id: $0.id, name: $0.name) }
  }
  func entities(for identifiers: [String]) async throws -> [SpikeDesignEntity] { all().filter { identifiers.contains($0.id) } }
  func suggestedEntities() async throws -> [SpikeDesignEntity] { all() }
  func defaultResult() async -> SpikeDesignEntity? { all().first }
}

struct SelectSpikeIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Elegir aguja"
  static var description = IntentDescription("Elige qué diseño de aguja muestra este widget.")
  @Parameter(title: "Aguja") var design: SpikeDesignEntity?
}

extension SDesign {
  static let spikeFallback = SDesign(
    id: "aguja", kind: "aguja", name: "Aguja clásica", source: "importantes", title: "Importantes", board: "blanco", shape: "doblado", paper: "liso",
    showTime: true, showHeader: true,
    font: SFont(key: "mano", regular: "Caveat-Medium", bold: "Caveat-Bold", scale: 1.28),
    colors: SColors(paper: "#FFF1A8", ink: "#5B4A0E", line: "#EAD27C", fold: "#F3D97A", strong: "#EFC94C", board: "#FFFFFF", boardOpacity: 1),
    color: "auto"
  )
}

// MARK: - Geometría y colores

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
    step = 9
    ph = h - 17 - 3 * 9 - 32
    baseY = h - 13
    baseRX = min(48, max(26, w * 0.16))
    baseRY = 7
  }
}

struct SpikeNoteColors {
  let paper: String, fold: String, line: String, ink: String
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
    let deg = 3 + Double(r.next()) * 4.5
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

  /// Con el color «Libreta» cada pósit lleva el de su libreta; si no, todos el del diseño.
  static func colors(_ r: SReminder, _ snap: Snapshot?, _ d: SDesign) -> SpikeNoteColors {
    if let fixed = d.color, fixed != "auto" {
      return SpikeNoteColors(paper: d.colors.paper, fold: d.colors.fold, line: d.colors.line, ink: d.colors.ink)
    }
    let nb = snap?.notebooks.first { $0.id == r.notebookId }
    return SpikeNoteColors(paper: nb?.paper ?? "#FFF1A8", fold: nb?.fold ?? "#F3D97A", line: nb?.line ?? "#EAD27C", ink: d.inkColor ?? nb?.ink ?? "#5B4A0E")
  }

  /// "★ Trabajo", o "★ 💼" si no cabe el nombre de la libreta.
  static func label(_ r: SReminder, _ snap: Snapshot?, short: Bool) -> String {
    guard let nb = snap?.notebooks.first(where: { $0.id == r.notebookId }) else { return short ? "★" : "★ Importante" }
    return short ? "★ \(nb.emoji)" : "★ \(nb.name)"
  }

  /// Esquinas, pliegue y borde rasgado según la forma del diseño.
  static func shape(_ d: SDesign, _ m: SpikeMetrics) -> (radius: CGFloat, fold: CGFloat, tear: CGFloat) {
    let side = min(m.pw, m.ph)
    return (d.shape == "redondo" ? (side * 0.09).rounded() : 3, d.shape == "doblado" ? (side * 0.16).rounded() : 0, d.shape == "rasgado" ? 3.5 : 0)
  }

  /// Tamaño del título (la letra «A mano» es pequeña: las demás se reducen).
  static func titleSize(_ s: CGSize, _ d: SDesign) -> CGFloat {
    let wide = s.width > s.height * 1.5
    let large = !wide && s.width > 250 && s.height > 250
    let base: CGFloat = large ? 28 : (wide ? 22 : 19)
    return (base * CGFloat(d.font.scale) / 1.28).rounded()
  }

  static func board(_ d: SDesign) -> SSpikeBoard {
    d.spikeBoard ?? SSpikeBoard(top: "#FBF8F3", bottom: "#F0E8DC", opacity: 1, dark: false)
  }
}

private let steel = LinearGradient(colors: [Color(hex: "#8C939C"), Color(hex: "#E6E9ED"), Color(hex: "#969DA6")], startPoint: .leading, endPoint: .trailing)

/// Aguja entera, base y pósits de detrás.
struct SpikeBackdrop: View {
  let m: SpikeMetrics
  let back: [(id: String, paper: Color)]
  let tip: CGFloat
  let dark: Bool
  let radius: CGFloat
  let tear: CGFloat

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
        let outline = PostitShape(radius: radius, fold: 0, tear: tear)
        c.fill(outline.path(in: rect.offsetBy(dx: 0, dy: 1.8)), with: .color(.black.opacity(0.07)))
        c.fill(outline.path(in: rect.offsetBy(dx: 0, dy: 0.7)), with: .color(.black.opacity(0.05)))
        c.fill(outline.path(in: rect), with: .color(n.paper))
        c.fill(Path(roundedRect: CGRect(x: rect.minX, y: rect.minY + tear, width: rect.width, height: min(15, m.ph * 0.13)), cornerRadius: min(3, radius)), with: .color(.black.opacity(0.035)))
        c.fill(Path(ellipseIn: CGRect(x: pierce.x - 3.6, y: pierce.y - 3.6, width: 7.2, height: 7.2)), with: .color(.black.opacity(0.08)))
        c.fill(Path(ellipseIn: CGRect(x: pierce.x - 2.2, y: pierce.y - 2.2, width: 4.4, height: 4.4)), with: .color(Color(hex: "#3B3632").opacity(0.6)))
      }
    }
  }
}

/// Renglones, cuadros o puntos del papel del pósit de delante.
struct SpikePaperPattern: View {
  let paper: String
  let line: Color
  let gap: CGFloat

  var body: some View {
    Canvas { ctx, size in
      let w = size.width, h = size.height
      func stroke(_ a: CGPoint, _ b: CGPoint, _ color: Color, _ width: CGFloat) {
        var p = Path(); p.move(to: a); p.addLine(to: b); ctx.stroke(p, with: .color(color), lineWidth: width)
      }
      switch paper {
      case "rayas":
        var y = 17 + gap
        while y < h - 4 { stroke(CGPoint(x: 0, y: y), CGPoint(x: w, y: y), line, 1); y += gap }
      case "cuadricula":
        var x: CGFloat = 9
        while x < w { stroke(CGPoint(x: x, y: 0), CGPoint(x: x, y: h), line.opacity(0.7), 0.7); x += 9 }
        var y: CGFloat = 9
        while y < h { stroke(CGPoint(x: 0, y: y), CGPoint(x: w, y: y), line.opacity(0.7), 0.7); y += 9 }
      case "puntos":
        var x: CGFloat = 5
        while x < w {
          var y: CGFloat = 5
          while y < h { ctx.fill(Path(ellipseIn: CGRect(x: x - 1, y: y - 1, width: 2, height: 2)), with: .color(line)); y += 10 }
          x += 10
        }
      default:
        break
      }
    }
  }
}

/// El pósit de delante, recto para que se lea, con el círculo para marcarlo como hecho.
struct FrontPost: View {
  let reminder: SReminder
  let design: SDesign
  let colors: SpikeNoteColors
  let label: String
  let when: String
  let overdue: Bool
  let m: SpikeMetrics
  let titleSize: CGFloat
  let lines: Int

  private func titleFont() -> Font {
    design.font.bold.isEmpty ? .system(size: titleSize, weight: .bold) : .custom(design.font.bold, size: titleSize)
  }

  var body: some View {
    let s = SpikeLogic.shape(design, m)
    let shape = PostitShape(radius: s.radius, fold: s.fold, tear: s.tear)
    let ink = Color(hex: colors.ink)
    ZStack(alignment: .topLeading) {
      shape.fill(Color.black.opacity(0.07)).offset(y: 1.8)
      shape.fill(Color.black.opacity(0.05)).offset(y: 0.7)
      shape.fill(Color(hex: colors.paper))
      if design.paper != "liso" {
        SpikePaperPattern(paper: design.paper, line: Color(hex: colors.line), gap: (titleSize * 1.06 * 10).rounded() / 10).clipShape(shape)
      }
      UnevenRoundedRectangle(topLeadingRadius: min(3, s.radius), topTrailingRadius: min(3, s.radius)).fill(Color.black.opacity(0.035))
        .frame(height: min(15, m.ph * 0.13)).offset(y: s.tear)
      if s.fold > 0 {
        Path { p in
          let f = s.fold, fx = m.pw - f, fy = m.ph - f
          p.move(to: CGPoint(x: fx, y: m.ph))
          p.addLine(to: CGPoint(x: m.pw, y: fy))
          p.addLine(to: CGPoint(x: fx + f * 0.08, y: fy))
          p.addQuadCurve(to: CGPoint(x: fx, y: fy + f * 0.08), control: CGPoint(x: fx, y: fy))
          p.closeSubpath()
        }
        .fill(Color(hex: colors.fold))
      }
      Circle().fill(Color.black.opacity(0.08)).frame(width: 7.2, height: 7.2).offset(x: m.pw / 2 - 3.6, y: 10 - 3.6)
      Circle().fill(Color(hex: "#3B3632").opacity(0.6)).frame(width: 4.4, height: 4.4).offset(x: m.pw / 2 - 2.2, y: 10 - 2.2)

      // Etiqueta en la franja adhesiva, a la izquierda de la aguja
      if design.showHeader {
        Text(label).font(.system(size: 10, weight: .bold)).foregroundStyle(ink.opacity(0.6)).lineLimit(1)
          .frame(width: max(0, m.pw / 2 - 20), height: 13, alignment: .leading)
          .offset(x: 12, y: 2 + s.tear)
      }

      Text(reminder.title).font(titleFont()).foregroundStyle(ink).lineLimit(lines).lineSpacing(0)
        .frame(width: m.pw - 24, height: max(0, m.ph - 8 - 20 - 3 - 17 - s.tear), alignment: .topLeading)
        .offset(x: 12, y: 17 + s.tear)

      HStack(spacing: 8) {
        Button(intent: CompleteReminderIntent(reminderId: reminder.id)) {
          Circle()
            .strokeBorder(ink.opacity(0.65), lineWidth: 1.8)
            .frame(width: 20, height: 20)
            .contentShape(Circle().inset(by: -8))
        }
        .buttonStyle(.plain)
        if design.showTime && !when.isEmpty {
          Text(when).font(.system(size: 12, weight: .semibold)).foregroundStyle(overdue ? Color(hex: "#C2413A") : ink.opacity(0.7))
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
  let design: SDesign
  let snapshot: Snapshot?
}

struct SpikeProvider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> SpikeEntry { SpikeEntry(date: .now, design: .spikeFallback, snapshot: nil) }

  func snapshot(for configuration: SelectSpikeIntent, in context: Context) async -> SpikeEntry {
    entry(for: configuration, at: .now)
  }

  func timeline(for configuration: SelectSpikeIntent, in context: Context) async -> Timeline<SpikeEntry> {
    let now = Date.now
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(86_400 + 30)
    return Timeline(entries: [entry(for: configuration, at: now), entry(for: configuration, at: midnight)], policy: .after(midnight))
  }

  private func entry(for configuration: SelectSpikeIntent, at date: Date) -> SpikeEntry {
    let snap = SharedStore.load()
    let designs = (snap?.designs ?? []).filter(\.isSpike)
    let design = designs.first { $0.id == configuration.design?.id } ?? designs.first ?? .spikeFallback
    return SpikeEntry(date: date, design: design, snapshot: snap)
  }
}

// MARK: - Vista

struct SpikeEntryView: View {
  let entry: SpikeEntry
  @Environment(\.widgetFamily) private var family

  var body: some View {
    let items = SpikeLogic.items(entry.snapshot)
    let design = entry.design
    let board = SpikeLogic.board(design)
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
        // Sin importantes queda solo la aguja, entera.
        let tip: CGFloat = items.isEmpty ? (geo.size.height * 0.12).rounded() : 6
        let back = items.dropFirst().prefix(3).map { (id: $0.id, paper: Color(hex: SpikeLogic.colors($0, entry.snapshot, design).paper)) }
        let wide = geo.size.width > geo.size.height * 1.5
        let large = !wide && geo.size.width > 250 && geo.size.height > 250
        let s = SpikeLogic.shape(design, m)
        ZStack(alignment: .topLeading) {
          SpikeBackdrop(m: m, back: back, tip: tip, dark: board.dark, radius: s.radius, tear: s.tear)

          if let r = items.first {
            FrontPost(
              reminder: r,
              design: design,
              colors: SpikeLogic.colors(r, entry.snapshot, design),
              label: SpikeLogic.label(r, entry.snapshot, short: m.pw / 2 - 20 < 70),
              when: ReminderLogic.when(r, now: entry.date),
              overdue: ReminderLogic.isOverdue(r, now: entry.date),
              m: m,
              titleSize: SpikeLogic.titleSize(geo.size, design),
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
        LinearGradient(colors: [Color(hex: board.top, opacity: board.opacity), Color(hex: board.bottom, opacity: board.opacity)], startPoint: .top, endPoint: .bottom)
      }
      .widgetURL(URL(string: items.first.map { "notita://reminder/\($0.id)" } ?? "notita://libretas/importantes"))
    }
  }
}

struct SpikeWidget: Widget {
  let kind = "NotitaImportantes"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectSpikeIntent.self, provider: SpikeProvider()) { entry in
      SpikeEntryView(entry: entry)
    }
    .configurationDisplayName("Importantes")
    .description("Tus recordatorios importantes clavados en una aguja. Mantén pulsado para elegir el diseño.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular])
    .contentMarginsDisabled()
  }
}
