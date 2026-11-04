import SwiftUI
import WidgetKit

// Widget «Aniversarios»: globos, banderines y confeti con la cuenta atrás.
// Misma geometría que src/lib/festive-art.ts (vista previa de la app y widget de Android).

private let confettiColors = ["#F37FA6", "#9C8DF0", "#5CC48E", "#F5C542", "#6FAEEB", "#F29A6E"].map { Color(hex: $0) }
private let balloonColors: [(Color, Color)] = [
  (Color(hex: "#F589B0"), Color(hex: "#DE6A93")),
  (Color(hex: "#A897F4"), Color(hex: "#8877E3")),
  (Color(hex: "#F7CC55"), Color(hex: "#E2B030")),
]
private let festiveInk = Color(hex: "#4A2F45")

struct FestiveLayout {
  enum Size { case small, medium, large }
  let size: Size
  let hero: CGRect
  let list: CGRect?
  let scene: CGRect
  let r: CGFloat

  init(_ s: CGSize) {
    let w = s.width, h = s.height
    if w > h * 1.5 {
      size = .medium
      hero = CGRect(x: 16, y: (h * 0.4).rounded(), width: (w * 0.45).rounded() - 16, height: (h * 0.6).rounded() - 14)
      list = CGRect(x: (w * 0.47).rounded(), y: 12, width: (w * 0.53).rounded() - 12, height: h - 24)
      scene = CGRect(x: 0, y: 0, width: (w * 0.46).rounded(), height: (h * 0.42).rounded())
      r = min(w, h) * 0.1
    } else if w > 250 && h > 250 {
      size = .large
      hero = CGRect(x: 18, y: (h * 0.25).rounded(), width: (w * 0.62).rounded(), height: (h * 0.21).rounded())
      list = CGRect(x: 12, y: (h * 0.5).rounded(), width: w - 24, height: (h * 0.5).rounded() - 12)
      scene = CGRect(x: 0, y: 0, width: w, height: (h * 0.47).rounded())
      r = min(w, h) * 0.075
    } else {
      size = .small
      hero = CGRect(x: 14, y: (h * 0.47).rounded(), width: w - 28, height: (h * 0.53).rounded() - 12)
      list = nil
      scene = CGRect(x: 0, y: 0, width: w, height: (h * 0.44).rounded())
      r = min(w, h) * 0.105
    }
  }
}

/// Fondo festivo dibujado con Canvas (banderines, confeti, globos y la tarjeta de la lista).
struct FestiveArt: View {
  let layout: FestiveLayout
  let party: Bool
  let dark: Bool

  var body: some View {
    Canvas { ctx, size in
      let L = layout
      let w = size.width, h = size.height

      // Banderines
      let flag = max(8, (L.r * 0.62).rounded())
      let x0: CGFloat = -2, y0: CGFloat = 7, x1 = L.scene.width * (L.size == .small ? 0.52 : 0.6), y1: CGFloat = 5
      let qx = (x0 + x1) / 2, qy = (y0 + y1) / 2 + flag * 1.25
      func at(_ t: CGFloat) -> CGPoint {
        CGPoint(x: (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * qx + t * t * x1, y: (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * qy + t * t * y1)
      }
      var rope = Path()
      rope.move(to: CGPoint(x: x0, y: y0))
      rope.addQuadCurve(to: CGPoint(x: x1, y: y1), control: CGPoint(x: qx, y: qy))
      ctx.stroke(rope, with: .color(Color(hex: "#C9BFD6")), lineWidth: 1.2)
      let n = max(4, Int(floor(hypot(x1 - x0, y1 - y0) / (flag * 2))))
      for i in 0..<n {
        let p = at((CGFloat(i) + 0.15) / CGFloat(n)), q = at((CGFloat(i) + 0.85) / CGFloat(n)), m = at((CGFloat(i) + 0.5) / CGFloat(n))
        var tri = Path()
        tri.move(to: p); tri.addLine(to: q); tri.addLine(to: CGPoint(x: m.x, y: m.y + flag * 1.15)); tri.closeSubpath()
        ctx.fill(tri, with: .color(confettiColors[i % confettiColors.count]))
      }

      // Confeti (mismo generador y orden que en JS), esquivando los textos
      let avoid = [L.hero] + (L.list.map { [$0] } ?? [])
      let count = Int(((w * h) / (party ? 520 : 900)).rounded())
      var rnd = SeededRandom(seed: Int64((w * 7 + h).rounded()))
      var placed = 0, tries = 0
      while placed < count && tries < count * 8 {
        tries += 1
        let x = 4 + rnd.next() * (w - 8), y = 4 + rnd.next() * (h - 8)
        let kind = rnd.next()
        let color = confettiColors[min(confettiColors.count - 1, Int(rnd.next() * CGFloat(confettiColors.count)))]
        let rot = Angle.degrees(Double((rnd.next() * 180).rounded()))
        if avoid.contains(where: { x > $0.minX - 4 && x < $0.maxX + 4 && y > $0.minY - 4 && y < $0.maxY + 4 }) { continue }
        placed += 1
        var c = ctx
        c.translateBy(x: x, y: y)
        if kind < 0.5 {
          c.rotate(by: rot)
          c.fill(Path(roundedRect: CGRect(x: -1.6, y: -3.5, width: 3.2, height: 7), cornerRadius: 1), with: .color(color))
        } else if kind < 0.82 {
          let rad = 1.5 + rnd.next() * 1.3
          c.fill(Path(ellipseIn: CGRect(x: -rad, y: -rad, width: rad * 2, height: rad * 2)), with: .color(color))
        } else {
          c.rotate(by: rot)
          var s = Path()
          s.move(to: CGPoint(x: -4, y: 0))
          s.addQuadCurve(to: CGPoint(x: 0, y: 0), control: CGPoint(x: -2, y: -3))
          s.addQuadCurve(to: CGPoint(x: 4, y: 0), control: CGPoint(x: 2, y: 3))
          c.stroke(s, with: .color(color), style: StrokeStyle(lineWidth: 1.6, lineCap: .round))
        }
      }

      // Racimo de globos
      let right = L.scene.maxX, r = L.r
      let tie = CGPoint(x: right - r * 2.3, y: L.scene.maxY + r * 0.05)
      func balloon(_ cx: CGFloat, _ cy: CGFloat, _ rr: CGFloat, _ color: (Color, Color), _ deg: Double) {
        let ry = rr * 1.2
        let a = deg * .pi / 180
        let kx = cx - (ry + 3) * CGFloat(sin(a)), ky = cy + (ry + 3) * CGFloat(cos(a))
        let midY = (ky + tie.y) / 2
        var string = Path()
        string.move(to: CGPoint(x: kx, y: ky))
        string.addCurve(to: tie, control1: CGPoint(x: kx - rr * 0.6, y: midY), control2: CGPoint(x: tie.x + rr * 0.6, y: midY))
        ctx.stroke(string, with: .color(Color(hex: "#B9AFC9")), lineWidth: 1)
        var b = ctx
        b.translateBy(x: cx, y: cy)
        b.rotate(by: .degrees(deg))
        b.fill(Path(ellipseIn: CGRect(x: -rr, y: -ry, width: rr * 2, height: ry * 2)), with: .color(color.0))
        var knot = Path()
        knot.move(to: CGPoint(x: -3, y: ry + 3.5)); knot.addLine(to: CGPoint(x: 3, y: ry + 3.5)); knot.addLine(to: CGPoint(x: 0, y: ry - 1)); knot.closeSubpath()
        b.fill(knot, with: .color(color.1))
        var shine = b
        shine.translateBy(x: -rr * 0.38, y: -ry * 0.38)
        shine.rotate(by: .degrees(-28))
        shine.fill(Path(ellipseIn: CGRect(x: -rr * 0.2, y: -ry * 0.3, width: rr * 0.4, height: ry * 0.6)), with: .color(.white.opacity(0.5)))
      }
      balloon(right - r * 3.4, L.scene.minY + r * 2.0, r * 0.82, balloonColors[1], -12)
      balloon(right - r * 1.35, L.scene.minY + r * 2.6, r * 0.78, balloonColors[2], 10)
      balloon(right - r * 2.35, L.scene.minY + r * 1.55, r, balloonColors[0], 0)
      var bow = Path()
      bow.move(to: tie); bow.addLine(to: CGPoint(x: tie.x - 4, y: tie.y - 3)); bow.addLine(to: CGPoint(x: tie.x - 4, y: tie.y + 3)); bow.closeSubpath()
      bow.move(to: tie); bow.addLine(to: CGPoint(x: tie.x + 4, y: tie.y - 3)); bow.addLine(to: CGPoint(x: tie.x + 4, y: tie.y + 3)); bow.closeSubpath()
      ctx.fill(bow, with: .color(Color(hex: "#F37FA6")))

      if let list = L.list {
        ctx.fill(Path(roundedRect: list, cornerRadius: 16, style: .continuous), with: .color(dark ? .black.opacity(0.28) : .white.opacity(0.62)))
      }
    }
  }
}

// MARK: - Línea de tiempo

struct AnniversaryEntry: TimelineEntry {
  let date: Date
  let snapshot: Snapshot?
}

struct AnniversaryProvider: TimelineProvider {
  func placeholder(in context: Context) -> AnniversaryEntry { AnniversaryEntry(date: .now, snapshot: nil) }

  func getSnapshot(in context: Context, completion: @escaping (AnniversaryEntry) -> Void) {
    completion(AnniversaryEntry(date: .now, snapshot: SharedStore.load()))
  }

  func getTimeline(in context: Context, completion: @escaping (Timeline<AnniversaryEntry>) -> Void) {
    let now = Date.now
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(86_400 + 30)
    let snap = SharedStore.load()
    // A medianoche cambia la cuenta atrás.
    completion(Timeline(entries: [AnniversaryEntry(date: now, snapshot: snap), AnniversaryEntry(date: midnight, snapshot: snap)], policy: .after(midnight)))
  }
}

// MARK: - Vista

struct AnniversaryEntryView: View {
  let entry: AnniversaryEntry
  @Environment(\.widgetFamily) private var family
  @Environment(\.colorScheme) private var scheme

  private var items: [SAnniversary] { AnniversaryLogic.upcoming(entry.snapshot, now: entry.date) }

  var body: some View {
    switch family {
    case .accessoryInline:
      if let a = items.first {
        Text("\(a.emoji) \(a.name) · \(AnniversaryLogic.countdown(AnniversaryLogic.days(a, now: entry.date)))")
      } else {
        Text("Sin fechas especiales")
      }
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        if let a = items.first {
          Text("\(a.emoji) \(a.name)").font(.headline).lineLimit(1).widgetAccentable()
          Text(AnniversaryLogic.countdown(AnniversaryLogic.days(a, now: entry.date))).font(.caption).bold()
          Text(AnniversaryLogic.detail(a, now: entry.date)).font(.caption2).lineLimit(1)
        } else {
          Text("Aniversarios").font(.headline).widgetAccentable()
          Text("Sin fechas especiales").font(.caption)
        }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .containerBackground(for: .widget) { Color.clear }
    default:
      GeometryReader { geo in
        let L = FestiveLayout(geo.size)
        let first = items.first
        ZStack(alignment: .topLeading) {
          FestiveArt(layout: L, party: first.map { AnniversaryLogic.days($0, now: entry.date) == 0 } ?? false, dark: scheme == .dark)
          hero(first, L)
            .frame(width: L.hero.width, height: L.hero.height, alignment: .bottomLeading)
            .offset(x: L.hero.minX, y: L.hero.minY)
          if let list = L.list {
            listView(Array(items.dropFirst().prefix(L.size == .large ? 5 : 3)))
              .frame(width: list.width - 24, height: list.height - 20, alignment: .topLeading)
              .offset(x: list.minX + 12, y: list.minY + 10)
          }
        }
      }
      .containerBackground(for: .widget) {
        LinearGradient(
          stops: scheme == .dark
            ? [.init(color: Color(hex: "#3A2433"), location: 0), .init(color: Color(hex: "#2A2645"), location: 0.55), .init(color: Color(hex: "#3A3122"), location: 1)]
            : [.init(color: Color(hex: "#FFE4EE"), location: 0), .init(color: Color(hex: "#F1E9FF"), location: 0.55), .init(color: Color(hex: "#FFF4D8"), location: 1)],
          startPoint: .topLeading, endPoint: .bottomTrailing)
      }
      .widgetURL(URL(string: "notita://calendario?modo=aniversarios"))
    }
  }

  private var ink: Color { scheme == .dark ? Color(hex: "#FBE3F0") : festiveInk }

  @ViewBuilder
  private func hero(_ a: SAnniversary?, _ L: FestiveLayout) -> some View {
    VStack(alignment: .leading, spacing: 1) {
      if let a {
        Text("\(a.emoji) \(AnniversaryLogic.countdown(AnniversaryLogic.days(a, now: entry.date)))")
          .font(.system(size: L.size == .large ? 28 : 24, weight: .heavy))
          .lineLimit(1).minimumScaleFactor(0.7)
        Text(a.name).font(.system(size: 16, weight: .bold)).lineLimit(1)
        Text(AnniversaryLogic.detail(a, now: entry.date)).font(.system(size: 12, weight: .medium)).opacity(0.7).lineLimit(1).minimumScaleFactor(0.85)
      } else {
        Text(entry.snapshot == nil ? "Abre Notita para empezar ✨" : "Sin fechas especiales").font(.system(size: 17, weight: .heavy)).lineLimit(2)
        Text("Añade cumpleaños y aniversarios en el Calendario de Notita.").font(.system(size: 12)).opacity(0.7).lineLimit(2)
      }
    }
    .foregroundStyle(ink)
  }

  @ViewBuilder
  private func listView(_ rest: [SAnniversary]) -> some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("PRÓXIMAS FECHAS").font(.system(size: 11, weight: .bold)).tracking(0.5).opacity(0.55)
      if rest.isEmpty {
        Text("Nada más a la vista 🎈").font(.system(size: 12)).opacity(0.6)
      }
      ForEach(rest) { a in
        HStack(spacing: 6) {
          Text(a.emoji).font(.system(size: 14))
          Text(a.name).font(.system(size: 13, weight: .semibold)).lineLimit(1)
          Spacer(minLength: 4)
          Text(AnniversaryLogic.shortCountdown(AnniversaryLogic.days(a, now: entry.date))).font(.system(size: 12)).opacity(0.65)
        }
        .frame(height: 22)
      }
    }
    .foregroundStyle(ink)
  }
}

struct AnniversaryWidget: Widget {
  let kind = "NotitaAniversarios"

  var body: some WidgetConfiguration {
    StaticConfiguration(kind: kind, provider: AnniversaryProvider()) { entry in
      AnniversaryEntryView(entry: entry)
    }
    .configurationDisplayName("Aniversarios")
    .description("Cuenta atrás para cumpleaños y aniversarios, con globos y confeti.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .accessoryRectangular, .accessoryInline])
    .contentMarginsDisabled()
  }
}
