// Los widgets de CARYMO para la pantalla de inicio y la de bloqueo del iPhone.
// Carlos, 14 nov: «widgets donde salga la mascota en su cuarto, cómo está, estadísticas, la racha, como las de Duolingo».
// La app (carymo/widget.js → CarymoWidgetPlugin) deja en el App Group la foto del cuarto y los datos; aquí sólo se pintan.
import WidgetKit
import SwiftUI

let GRUPO = "group.mx.grupomazi.carymo"

// MARK: - lo que deja la app

struct Datos: Codable {
    var racha: Int = 0
    var rachaViva: Bool = false
    var dia: String? = nil
    var mejorRacha: Int = 0
    var xp: Int = 0
    var cubos: Int = 0
    var mascota: String = ""
    var nivel: Int = 1
    var etapa: String = ""
    var estado: String = "ninguna"
    var frase: String = "Abre CARYMO"
    var hambre: Int = 80
    var limpieza: Int = 80
    var animo: Int = 80

    /// La racha «viva» se guarda al abrir la app; si ya cambió el día, el widget sola sabe que hoy todavía no estudias.
    var estudioHoy: Bool {
        guard rachaViva, let dia = dia else { return false }
        return dia == Datos.hoy()
    }
    static func hoy() -> String {
        let f = DateFormatter(); f.locale = Locale(identifier: "en_US_POSIX"); f.dateFormat = "yyyy-MM-dd"
        return f.string(from: Date())
    }
}

func carpeta() -> URL? { FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: GRUPO) }

func leerDatos() -> Datos? {
    guard let url = carpeta()?.appendingPathComponent("widget-datos.json"), let d = try? Data(contentsOf: url) else { return nil }
    return try? JSONDecoder().decode(Datos.self, from: d)
}

func leerFoto() -> UIImage? {
    guard let url = carpeta()?.appendingPathComponent("widget-cuarto.png"), let d = try? Data(contentsOf: url) else { return nil }
    return UIImage(data: d)
}

// MARK: - el reloj del widget

struct Entrada: TimelineEntry {
    let date: Date
    let datos: Datos?
    let foto: UIImage?
}

struct Proveedor: TimelineProvider {
    func placeholder(in context: Context) -> Entrada {
        Entrada(date: Date(), datos: Datos(racha: 12, rachaViva: true, dia: Datos.hoy(), mascota: "Tigre", nivel: 4, estado: "feliz", frase: "¡Hoy me siento genial!"), foto: nil)
    }
    func getSnapshot(in context: Context, completion: @escaping (Entrada) -> Void) {
        completion(Entrada(date: Date(), datos: leerDatos() ?? placeholder(in: context).datos, foto: leerFoto()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<Entrada>) -> Void) {
        let ahora = Date(), d = leerDatos(), f = leerFoto()
        // una entrada ahora y otra a medianoche, para que el aviso de «estudia hoy» cambie solo al empezar el día
        let medianoche = Calendar.current.startOfDay(for: ahora.addingTimeInterval(86_400))
        completion(Timeline(entries: [Entrada(date: ahora, datos: d, foto: f), Entrada(date: medianoche, datos: d, foto: f)], policy: .after(medianoche)))
    }
}

// MARK: - colores y piezas

extension Color {
    static let fondo = Color(red: 0x17 / 255, green: 0x0A / 255, blue: 0x26 / 255)
    static let vino = Color(red: 0x7E / 255, green: 0x17 / 255, blue: 0x35 / 255)
    static let morado = Color(red: 0xC7 / 255, green: 0x7D / 255, blue: 0xFF / 255)
    static let flama = Color(red: 1, green: 0x9F / 255, blue: 0x45 / 255)
    static let lila = Color(red: 0xF3 / 255, green: 0xE8 / 255, blue: 0xFF / 255)
}

struct Flama: View {
    var tam: CGFloat = 16
    var body: some View { Image(systemName: "flame.fill").font(.system(size: tam, weight: .bold)).foregroundStyle(Color.flama) }
}

struct Barra: View {
    let valor: Int; let color: Color
    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.18))
                Capsule().fill(color).frame(width: max(4, g.size.width * CGFloat(min(100, max(0, valor))) / 100))
            }
        }.frame(height: 5)
    }
}

struct FotoCuarto: View {
    let foto: UIImage?
    var body: some View {
        if let foto = foto { Image(uiImage: foto).resizable().scaledToFill() }
        else { LinearGradient(colors: [Color(red: 0x3A / 255, green: 0x18 / 255, blue: 0x58 / 255), Color.fondo], startPoint: .top, endPoint: .bottom) }
    }
}

extension View {
    /// iOS 17 pide declarar el fondo del widget (los widgets piden iOS 17 o más nuevo)
    func fondoWidget<V: View>(@ViewBuilder _ fondo: () -> V) -> some View { self.containerBackground(for: .widget) { fondo() } }
}

// MARK: - chico: la mascota en su cuarto

struct VistaMascota: View {
    let e: Entrada
    var body: some View {
        let d = e.datos
        ZStack(alignment: .topLeading) {
            VStack { Spacer()
                Text(d?.frase ?? "Abre CARYMO").font(.system(size: 12, weight: .semibold)).foregroundStyle(Color.lila)
                    .lineLimit(2).multilineTextAlignment(.center).frame(maxWidth: .infinity)
                    .padding(.horizontal, 8).padding(.vertical, 4).background(Color.fondo.opacity(0.85), in: RoundedRectangle(cornerRadius: 10))
            }
            HStack(spacing: 3) { Flama(tam: 13); Text("\(d?.racha ?? 0)").font(.system(size: 15, weight: .heavy)).foregroundStyle(.white) }
                .padding(.horizontal, 8).padding(.vertical, 3)
                .background((d?.estudioHoy ?? false) ? Color.vino : Color.fondo.opacity(0.8), in: Capsule())
                .overlay(Capsule().stroke(Color.flama.opacity((d?.estudioHoy ?? false) ? 1 : 0.4), lineWidth: 1))
        }
        .padding(8)
        .fondoWidget { FotoCuarto(foto: e.foto) }
        .widgetURL(URL(string: "mx.grupomazi.carymo://abrir"))
    }
}

// MARK: - mediano: racha y cómo está

struct VistaRacha: View {
    let e: Entrada
    var body: some View {
        let d = e.datos
        HStack(spacing: 10) {
            FotoCuarto(foto: e.foto).frame(maxWidth: .infinity, maxHeight: .infinity).clipShape(RoundedRectangle(cornerRadius: 14))
            VStack(alignment: .leading, spacing: 3) {
                HStack(spacing: 4) { Flama(tam: 20); Text("\(d?.racha ?? 0)").font(.system(size: 26, weight: .heavy)).foregroundStyle(.white) }
                Text(aviso(d)).font(.system(size: 11, weight: .semibold)).foregroundStyle(Color.flama).lineLimit(2)
                if let d = d, !d.mascota.isEmpty {
                    Text("\(d.mascota) · nivel \(d.nivel)").font(.system(size: 12, weight: .bold)).foregroundStyle(.white).lineLimit(1).padding(.top, 2)
                    Text(d.frase).font(.system(size: 11)).foregroundStyle(Color.lila.opacity(0.8)).lineLimit(1)
                    Barra(valor: d.hambre, color: Color(red: 1, green: 0x8A / 255, blue: 0x5B / 255))
                    Barra(valor: d.limpieza, color: Color(red: 0x5A / 255, green: 0xB6 / 255, blue: 0xF0 / 255))
                    Barra(valor: d.animo, color: Color.morado)
                } else {
                    Text(d == nil ? "Abre CARYMO" : "Adopta a tu compañero").font(.system(size: 12, weight: .bold)).foregroundStyle(.white).padding(.top, 2)
                }
                HStack {
                    Text("\(d?.xp ?? 0) XP").font(.system(size: 12, weight: .bold)).foregroundStyle(Color.morado)
                    Spacer()
                    Image(systemName: "cube.fill").font(.system(size: 11)).foregroundStyle(Color.morado)
                    Text((d?.cubos ?? 0) < 0 ? "∞" : "\(d?.cubos ?? 0)").font(.system(size: 12, weight: .bold)).foregroundStyle(.white)
                }.padding(.top, 2)
            }.frame(maxWidth: .infinity, alignment: .leading)
        }
        .fondoWidget { Color.fondo }
        .widgetURL(URL(string: "mx.grupomazi.carymo://abrir"))
    }
    func aviso(_ d: Datos?) -> String {
        guard let d = d else { return "Abre CARYMO para empezar" }
        if d.estudioHoy { return d.racha == 1 ? "día de racha" : "días de racha" }
        return d.racha > 0 ? "¡Estudia hoy para no perderla!" : "Estudia hoy y empieza tu racha"
    }
}

// MARK: - pantalla de bloqueo: la racha, como Duolingo

struct VistaBloqueo: View {
    @Environment(\.widgetFamily) var familia
    let e: Entrada
    var body: some View {
        let d = e.datos, n = d?.racha ?? 0
        Group {
            if familia == .accessoryRectangular {
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 3) { Image(systemName: "flame.fill"); Text("\(n) días").font(.headline) }
                    Text((d?.estudioHoy ?? false) ? (d?.frase ?? "") : "¡Estudia hoy!").font(.caption).lineLimit(1)
                }
            } else {
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 0) { Image(systemName: "flame.fill").font(.system(size: 14)); Text("\(n)").font(.system(size: 16, weight: .heavy)) }
                }
            }
        }
        .fondoWidget { Color.clear }
        .widgetURL(URL(string: "mx.grupomazi.carymo://abrir"))
    }
}

// MARK: - los widgets que salen en la galería

struct WidgetMascota: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CarymoMascota", provider: Proveedor()) { VistaMascota(e: $0) }
            .configurationDisplayName("Mascota").description("Tu mascota en su cuarto y tu racha.")
            .supportedFamilies([.systemSmall])
            .contentMarginsDisabled()
    }
}

struct WidgetRacha: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CarymoRacha", provider: Proveedor()) { VistaRacha(e: $0) }
            .configurationDisplayName("Racha y mascota").description("Tu racha, cómo está tu mascota, XP y cubitos.")
            .supportedFamilies([.systemMedium])
    }
}

struct WidgetBloqueo: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "CarymoBloqueo", provider: Proveedor()) { VistaBloqueo(e: $0) }
            .configurationDisplayName("Racha").description("Tu racha en la pantalla de bloqueo.")
            .supportedFamilies([.accessoryCircular, .accessoryRectangular])
    }
}

@main
struct CarymoWidgets: WidgetBundle {
    var body: some Widget {
        WidgetMascota()
        WidgetRacha()
        WidgetBloqueo()
    }
}
