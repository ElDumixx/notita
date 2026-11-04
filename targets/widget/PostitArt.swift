import SwiftUI

// Misma geometría que src/lib/postit-art.ts para que el widget sea idéntico a la vista previa.

extension Color {
  init(hex: String, opacity: Double = 1) {
    var v: UInt64 = 0
    Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
    self.init(.sRGB, red: Double((v >> 16) & 255) / 255, green: Double((v >> 8) & 255) / 255, blue: Double(v & 255) / 255, opacity: opacity)
  }
}

func mixHex(_ a: String, _ b: String, _ t: Double) -> Color {
  func comps(_ h: String) -> (Double, Double, Double) {
    var v: UInt64 = 0
    Scanner(string: h.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
    return (Double((v >> 16) & 255), Double((v >> 8) & 255), Double(v & 255))
  }
  let (r1, g1, b1) = comps(a), (r2, g2, b2) = comps(b)
  return Color(.sRGB, red: (r1 + (r2 - r1) * t) / 255, green: (g1 + (g2 - g1) * t) / 255, blue: (b1 + (b2 - b1) * t) / 255)
}

struct PostitLayout {
  let full: Bool
  let body: CGRect
  let content: CGRect
  let radius: CGFloat
  let fold: CGFloat
  let tear: CGFloat
  let tape: CGSize?
  let fontSize: CGFloat
  let headerSize: CGFloat
  let rowHeight: CGFloat
  let headerHeight: CGFloat
  let maxRows: Int

  init(size: CGSize, design: SDesign) {
    let minSide = min(size.width, size.height)
    let isFull = design.board == "completo"
    let margin = isFull ? 0 : (minSide * 0.075).rounded()
    let b = CGRect(x: margin, y: margin, width: size.width - margin * 2, height: size.height - margin * 2)
    let f = design.shape == "doblado" ? (minSide * 0.17).rounded() : 0
    let t = design.shape == "rasgado" ? max(3, minSide * 0.028) : 0
    let tp: CGSize? = design.shape == "cinta" ? CGSize(width: b.width * 0.36, height: max(14, minSide * 0.1)) : nil
    let fs = (min(15.5, max(11.5, minSide * 0.083)) * design.font.scale * 10).rounded() / 10
    let hs = (fs * 1.14 * 10).rounded() / 10
    let rh = (fs * 1.72 * 10).rounded() / 10
    let pad = max(10, minSide * 0.08).rounded()
    let top = b.minY + pad + (tp.map { $0.height * (isFull ? 0.75 : 0.45) } ?? 0) + t
    let bottom = b.maxY - pad - (f > 0 ? f * 0.3 : 0)
    let c = CGRect(x: b.minX + pad, y: top, width: b.width - pad * 2, height: max(0, bottom - top))
    let hh = design.showHeader ? (hs * 1.75 * 10).rounded() / 10 : 0

    full = isFull
    body = b
    radius = design.shape == "redondo" ? minSide * 0.11 : minSide * 0.022
    fold = f
    tear = t
    tape = tp
    fontSize = fs
    headerSize = hs
    rowHeight = rh
    content = c
    headerHeight = hh
    maxRows = max(1, Int(floor((c.height - hh + rh * 0.15) / rh)))
  }
}

/// Generador determinista idéntico al de JS (el borde rasgado coincide en ambas plataformas).
struct SeededRandom {
  var s: Int64
  init(seed: Int64) { s = seed % 2_147_483_647; if s <= 0 { s = 1 } }
  mutating func next() -> CGFloat {
    s = (s * 16807) % 2_147_483_647
    return CGFloat(s - 1) / 2_147_483_646
  }
}

struct PostitShape: Shape {
  let radius: CGFloat
  let fold: CGFloat
  let tear: CGFloat

  func path(in r: CGRect) -> Path {
    var p = Path()
    if tear > 0 {
      var rnd = SeededRandom(seed: Int64((r.width * 31 + r.height).rounded()))
      let n = max(10, Int((r.width / 8).rounded()))
      p.move(to: CGPoint(x: r.minX, y: r.minY + tear))
      for i in 1...n {
        let x = r.minX + r.width * CGFloat(i) / CGFloat(n)
        let y = r.minY + (i % 2 == 1 ? rnd.next() * tear * 0.5 : tear * (0.65 + rnd.next() * 0.35))
        p.addLine(to: CGPoint(x: x, y: y))
      }
      p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - (fold > 0 ? fold : radius)))
    } else {
      p.move(to: CGPoint(x: r.minX + radius, y: r.minY))
      p.addLine(to: CGPoint(x: r.maxX - radius, y: r.minY))
      p.addQuadCurve(to: CGPoint(x: r.maxX, y: r.minY + radius), control: CGPoint(x: r.maxX, y: r.minY))
      p.addLine(to: CGPoint(x: r.maxX, y: r.maxY - (fold > 0 ? fold : radius)))
    }
    if fold > 0 {
      p.addLine(to: CGPoint(x: r.maxX - fold, y: r.maxY))
    } else {
      p.addQuadCurve(to: CGPoint(x: r.maxX - radius, y: r.maxY), control: CGPoint(x: r.maxX, y: r.maxY))
    }
    p.addLine(to: CGPoint(x: r.minX + radius, y: r.maxY))
    p.addQuadCurve(to: CGPoint(x: r.minX, y: r.maxY - radius), control: CGPoint(x: r.minX, y: r.maxY))
    if tear > 0 {
      p.addLine(to: CGPoint(x: r.minX, y: r.minY + tear))
    } else {
      p.addLine(to: CGPoint(x: r.minX, y: r.minY + radius))
      p.addQuadCurve(to: CGPoint(x: r.minX + radius, y: r.minY), control: CGPoint(x: r.minX, y: r.minY))
    }
    p.closeSubpath()
    return p
  }
}

/// Papel del pósit: sombra, forma, patrón, pliegue y cinta.
struct PostitPaper: View {
  let design: SDesign
  let layout: PostitLayout
  let size: CGSize
  let accented: Bool

  var body: some View {
    let c = design.colors
    let L = layout
    let shape = PostitShape(radius: L.radius, fold: L.fold, tear: L.tear)
    let paperColor = accented ? Color.white.opacity(0.14) : Color(hex: c.paper)

    ZStack(alignment: .topLeading) {
      if !L.full && !accented {
        let alpha = design.board == "oscuro" ? 0.22 : 0.05
        ForEach(Array([1.0, 2.5, 4.5].enumerated()), id: \.offset) { i, dy in
          shape.fill(Color.black.opacity(alpha * (1 - Double(i) * 0.25)))
            .frame(width: L.body.width, height: L.body.height)
            .offset(x: L.body.minX, y: L.body.minY + dy)
        }
      }

      shape.fill(paperColor)
        .frame(width: L.body.width, height: L.body.height)
        .offset(x: L.body.minX, y: L.body.minY)
        .widgetAccentable(accented)

      if design.paper != "liso" && !accented {
        Canvas { ctx, _ in
          let line = Color(hex: c.line)
          let step = (L.fontSize * 1.05 * 10).rounded() / 10
          let b = CGRect(origin: .zero, size: L.body.size)
          if design.paper == "rayas" {
            var y = L.content.minY - L.body.minY + L.headerHeight + L.rowHeight * 0.96
            while y < b.maxY - 2 {
              var p = Path(); p.move(to: CGPoint(x: 0, y: y)); p.addLine(to: CGPoint(x: b.maxX, y: y))
              ctx.stroke(p, with: .color(line), lineWidth: 1)
              y += L.rowHeight
            }
            if design.showHeader {
              let hy = L.content.minY - L.body.minY + L.headerHeight - L.rowHeight * 0.32
              var p = Path(); p.move(to: CGPoint(x: 0, y: hy)); p.addLine(to: CGPoint(x: b.maxX, y: hy))
              ctx.stroke(p, with: .color(Color(hex: c.strong, opacity: 0.55)), lineWidth: 1.2)
            }
          } else if design.paper == "cuadricula" {
            var x = step
            while x < b.maxX { var p = Path(); p.move(to: CGPoint(x: x, y: 0)); p.addLine(to: CGPoint(x: x, y: b.maxY)); ctx.stroke(p, with: .color(line.opacity(0.7)), lineWidth: 0.7); x += step }
            var y = step
            while y < b.maxY { var p = Path(); p.move(to: CGPoint(x: 0, y: y)); p.addLine(to: CGPoint(x: b.maxX, y: y)); ctx.stroke(p, with: .color(line.opacity(0.7)), lineWidth: 0.7); y += step }
          } else {
            var x = step / 2
            while x < b.maxX {
              var y = step / 2
              while y < b.maxY { ctx.fill(Path(ellipseIn: CGRect(x: x - 1, y: y - 1, width: 2, height: 2)), with: .color(line)); y += step }
              x += step
            }
          }
        }
        .frame(width: L.body.width, height: L.body.height)
        .clipShape(shape)
        .offset(x: L.body.minX, y: L.body.minY)
      }

      if L.fold > 0 {
        let fx = L.body.maxX - L.fold, fy = L.body.maxY - L.fold
        Path { p in
          p.move(to: CGPoint(x: fx, y: L.body.maxY))
          p.addLine(to: CGPoint(x: L.body.maxX, y: fy))
          p.addLine(to: CGPoint(x: fx + L.fold * 0.08, y: fy))
          p.addQuadCurve(to: CGPoint(x: fx, y: fy + L.fold * 0.08), control: CGPoint(x: fx, y: fy))
          p.closeSubpath()
        }
        .fill(accented ? Color.white.opacity(0.25) : Color(hex: c.fold))
        Path { p in
          p.move(to: CGPoint(x: fx, y: L.body.maxY))
          p.addLine(to: CGPoint(x: L.body.maxX, y: fy))
        }
        .stroke(Color.black.opacity(0.07), lineWidth: 1.5)
      }

      if let tape = L.tape, !accented {
        let ty = L.full ? L.body.minY + 4 : L.body.minY - tape.height * 0.45
        ZStack(alignment: .top) {
          RoundedRectangle(cornerRadius: 2).fill(mixHex(c.strong, "#FFFFFF", 0.45).opacity(0.82))
          Rectangle().fill(Color.white.opacity(0.25)).frame(height: tape.height * 0.35)
        }
        .frame(width: tape.width, height: tape.height)
        .rotationEffect(.degrees(-3))
        .position(x: L.body.midX, y: ty + tape.height / 2)
      }
    }
    .frame(width: size.width, height: size.height, alignment: .topLeading)
  }
}
