import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Configuración: el usuario elige uno de los diseños creados en la app

struct DesignEntity: AppEntity {
  static var typeDisplayRepresentation: TypeDisplayRepresentation = "Diseño"
  static var defaultQuery = DesignQuery()
  var id: String
  var name: String
  var displayRepresentation: DisplayRepresentation { DisplayRepresentation(title: "\(name)") }
}

struct DesignQuery: EntityQuery {
  // Solo los pósits: las agujas se eligen en el widget «Importantes».
  private func all() -> [DesignEntity] {
    let designs = (SharedStore.load()?.designs ?? []).filter { !$0.isSpike }
    return (designs.isEmpty ? [SDesign.fallback] : designs).map { DesignEntity(id: $0.id, name: $0.name) }
  }
  func entities(for identifiers: [String]) async throws -> [DesignEntity] { all().filter { identifiers.contains($0.id) } }
  func suggestedEntities() async throws -> [DesignEntity] { all() }
  func defaultResult() async -> DesignEntity? { all().first }
}

struct SelectDesignIntent: WidgetConfigurationIntent {
  static var title: LocalizedStringResource = "Elegir pósit"
  static var description = IntentDescription("Elige qué diseño de pósit muestra este widget.")
  @Parameter(title: "Diseño") var design: DesignEntity?
}

struct CompleteReminderIntent: AppIntent {
  static var title: LocalizedStringResource = "Marcar como hecho"
  static var isDiscoverable = false
  @Parameter(title: "Recordatorio") var reminderId: String

  init() {}
  init(reminderId: String) { self.reminderId = reminderId }

  func perform() async throws -> some IntentResult {
    SharedStore.markDone(reminderId)
    return .result()
  }
}

// MARK: - Línea de tiempo

struct PostitEntry: TimelineEntry {
  let date: Date
  let design: SDesign
  let snapshot: Snapshot?
}

struct Provider: AppIntentTimelineProvider {
  func placeholder(in context: Context) -> PostitEntry {
    PostitEntry(date: .now, design: .fallback, snapshot: nil)
  }

  func snapshot(for configuration: SelectDesignIntent, in context: Context) async -> PostitEntry {
    entry(for: configuration, at: .now)
  }

  func timeline(for configuration: SelectDesignIntent, in context: Context) async -> Timeline<PostitEntry> {
    let now = Date.now
    let midnight = Calendar.current.startOfDay(for: now).addingTimeInterval(86_400 + 30)
    // Se redibuja a medianoche para que "hoy", "mañana" y "atrasado" sean correctos.
    return Timeline(entries: [entry(for: configuration, at: now), entry(for: configuration, at: midnight)], policy: .after(midnight))
  }

  private func entry(for configuration: SelectDesignIntent, at date: Date) -> PostitEntry {
    let snap = SharedStore.load()
    let designs = (snap?.designs ?? []).filter { !$0.isSpike }
    let design = designs.first { $0.id == configuration.design?.id } ?? designs.first ?? .fallback
    return PostitEntry(date: date, design: design, snapshot: snap)
  }
}

// MARK: - Vista

struct PostitEntryView: View {
  let entry: PostitEntry
  @Environment(\.widgetFamily) private var family
  @Environment(\.widgetRenderingMode) private var renderingMode

  private var design: SDesign { entry.design }
  private var accented: Bool { renderingMode != .fullColor }
  private var items: [SReminder] {
    guard let snap = entry.snapshot else { return [] }
    return ReminderLogic.items(for: design, in: snap, now: entry.date)
  }
  private var ink: Color { accented ? .primary : Color(hex: design.colors.ink) }

  private func font(_ size: CGFloat, bold: Bool = false) -> Font {
    let name = bold ? design.font.bold : design.font.regular
    if name.isEmpty { return .system(size: size, weight: bold ? .bold : .medium) }
    return .custom(name, size: size)
  }

  @ViewBuilder
  private var board: some View {
    if accented {
      Color.clear
    } else if design.board == "cristal" {
      // La opacidad del cristal la decide el diseño (deslizador «Transparencia» en la app).
      let o = design.colors.boardOpacity
      LinearGradient(colors: [Color.white.opacity(min(1, o + 0.18)), Color.white.opacity(o)], startPoint: .topLeading, endPoint: .bottomTrailing)
    } else {
      Color(hex: design.colors.board, opacity: design.colors.boardOpacity)
    }
  }

  var body: some View {
    switch family {
    case .accessoryInline:
      Text(items.first.map { "✓ \($0.title)" } ?? "Nada pendiente")
    case .accessoryRectangular:
      VStack(alignment: .leading, spacing: 1) {
        Text(design.title).font(.headline).widgetAccentable()
        ForEach(items.prefix(2)) { r in
          Text("○ \(r.title)").font(.caption).lineLimit(1)
        }
        if items.isEmpty { Text("Nada pendiente ✨").font(.caption) }
      }
      .frame(maxWidth: .infinity, alignment: .leading)
      .containerBackground(for: .widget) { Color.clear }
    default:
      GeometryReader { geo in
        let L = PostitLayout(size: geo.size, design: design)
        ZStack(alignment: .topLeading) {
          PostitPaper(design: design, layout: L, size: geo.size, accented: accented)
          content(L)
            .frame(width: L.content.width, height: L.content.height, alignment: .topLeading)
            .offset(x: L.content.minX, y: L.content.minY)
        }
      }
      .containerBackground(for: .widget) { board }
      .widgetURL(URL(string: "notita://"))
    }
  }

  @ViewBuilder
  private func content(_ L: PostitLayout) -> some View {
    let overflow = items.count > L.maxRows
    let shown = Array(items.prefix(overflow ? L.maxRows - 1 : L.maxRows))
    let dot = (L.fontSize * 0.95).rounded()

    VStack(alignment: .leading, spacing: 0) {
      if design.showHeader {
        HStack(alignment: .top, spacing: 4) {
          Text(design.title).font(font(L.headerSize, bold: true)).foregroundStyle(ink).lineLimit(1)
          Spacer(minLength: 0)
          if !items.isEmpty {
            Text("\(items.count)").font(font(L.fontSize * 0.85)).foregroundStyle(ink.opacity(0.55))
          }
        }
        .frame(height: L.headerHeight, alignment: .top)
        .widgetAccentable()
      }

      if items.isEmpty {
        Text(entry.snapshot == nil ? "Abre Notita para empezar ✨" : (design.source == "hoy" ? "¡Todo listo por hoy! ✨" : "Nada pendiente ✨"))
          .font(font(L.fontSize))
          .foregroundStyle(ink.opacity(0.7))
          .multilineTextAlignment(.center)
          .frame(maxWidth: .infinity, maxHeight: .infinity)
      }

      ForEach(shown) { r in
        HStack(spacing: 0) {
          Button(intent: CompleteReminderIntent(reminderId: r.id)) {
            Circle()
              .strokeBorder(ink.opacity(0.7), lineWidth: 1.6)
              .frame(width: dot, height: dot)
              .frame(width: dot + 10, height: L.rowHeight, alignment: .leading)
              .contentShape(Rectangle())
          }
          .buttonStyle(.plain)

          Link(destination: URL(string: "notita://reminder/\(r.id)")!) {
            HStack(spacing: 6) {
              Text(r.title).font(font(L.fontSize)).foregroundStyle(ink).lineLimit(1)
              Spacer(minLength: 0)
              if design.showTime {
                let when = ReminderLogic.when(r, now: entry.date)
                if !when.isEmpty {
                  Text(when)
                    .font(font(L.fontSize * 0.8))
                    .foregroundStyle(ReminderLogic.isOverdue(r, now: entry.date) && !accented ? Color(hex: "#C2413A") : ink.opacity(0.6))
                }
              }
            }
          }
        }
        .frame(height: L.rowHeight)
      }

      if overflow {
        Text("+\(items.count - shown.count) más")
          .font(font(L.fontSize * 0.85))
          .foregroundStyle(ink.opacity(0.55))
          .padding(.leading, dot + 10)
      }
    }
  }
}

// MARK: - Widget

struct PostitWidget: Widget {
  let kind = "NotitaPostit"

  var body: some WidgetConfiguration {
    AppIntentConfiguration(kind: kind, intent: SelectDesignIntent.self, provider: Provider()) { entry in
      PostitEntryView(entry: entry)
    }
    .configurationDisplayName("Pósit de Notita")
    .description("Tus recordatorios en un pósit a tu gusto. Mantén pulsado para elegir el diseño.")
    .supportedFamilies([.systemSmall, .systemMedium, .systemLarge, .systemExtraLarge, .accessoryRectangular, .accessoryInline])
    .contentMarginsDisabled()
  }
}

@main
struct NotitaWidgets: WidgetBundle {
  var body: some Widget {
    PostitWidget()
    SpikeWidget()
    AnniversaryWidget()
  }
}
