// MAZI'S ARE 1 · Core · orientación
// Matemática pura (sin frameworks de Apple): se prueba en Linux con `swift test` desde are/.
import Foundation

/// Cuaternión unitario (x, y, z, w). Es lo que entregan CoreMotion (`attitude.quaternion`) y el DualShock 4 (`GCMotion.attitude`).
public struct Cuaternion: Equatable {
    public var x: Double, y: Double, z: Double, w: Double
    public init(x: Double, y: Double, z: Double, w: Double) { self.x = x; self.y = y; self.z = z; self.w = w }
    public static let identidad = Cuaternion(x: 0, y: 0, z: 0, w: 1)

    public var norma: Double { (x * x + y * y + z * z + w * w).squareRoot() }
    public var normalizado: Cuaternion {
        let n = norma
        return n > 0 ? Cuaternion(x: x / n, y: y / n, z: z / n, w: w / n) : .identidad
    }
    public var conjugado: Cuaternion { Cuaternion(x: -x, y: -y, z: -z, w: w) }

    /// Producto de Hamilton: aplica `b` y luego `a`.
    public static func * (a: Cuaternion, b: Cuaternion) -> Cuaternion {
        Cuaternion(
            x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
            y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
            z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
            w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z)
    }

    /// Giro de `angulo` radianes alrededor de un eje (el eje se normaliza).
    public static func eje(_ ex: Double, _ ey: Double, _ ez: Double, angulo: Double) -> Cuaternion {
        let n = (ex * ex + ey * ey + ez * ez).squareRoot()
        guard n > 0 else { return .identidad }
        let s = sin(angulo / 2) / n
        return Cuaternion(x: ex * s, y: ey * s, z: ez * s, w: cos(angulo / 2))
    }
}

/// Ángulos en GRADOS. Convención aeroespacial Z-Y-X (yaw, luego pitch, luego roll).
public struct Euler: Equatable {
    public var roll: Double, pitch: Double, yaw: Double
    public init(roll: Double, pitch: Double, yaw: Double) { self.roll = roll; self.pitch = pitch; self.yaw = yaw }
}

public enum Orientacion {
    static let grados = 180.0 / Double.pi

    /// Cuaternión → roll/pitch/yaw en grados. El pitch se topa en ±90° (bloqueo de cardán) en vez de dar NaN.
    public static func euler(_ q0: Cuaternion) -> Euler {
        let q = q0.normalizado
        let roll = atan2(2 * (q.w * q.x + q.y * q.z), 1 - 2 * (q.x * q.x + q.y * q.y))
        let s = max(-1, min(1, 2 * (q.w * q.y - q.z * q.x)))
        let pitch = asin(s)
        let yaw = atan2(2 * (q.w * q.z + q.x * q.y), 1 - 2 * (q.y * q.y + q.z * q.z))
        return Euler(roll: roll * grados, pitch: pitch * grados, yaw: yaw * grados)
    }

    /// Ángulo (grados, 0…180) entre dos orientaciones: «cuánto giró», sin pelearse con el corte de ±180°.
    public static func angulo(_ a0: Cuaternion, _ b0: Cuaternion) -> Double {
        let a = a0.normalizado, b = b0.normalizado
        let d = abs(a.x * b.x + a.y * b.y + a.z * b.z + a.w * b.w)
        return 2 * acos(min(1, d)) * grados
    }
}
