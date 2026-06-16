export type Status = "good" | "mod" | "bad";

/** Datos unidos de resultados_acusticos.json + coords.csv */
export interface Station {
    filename: string;
    nombre: string;
    coordenadas: [number, number];
    duracion_min: 1 | 10;
    audio: string;      // ruta al .wav, e.g. "/audios/P1Largo_260422_1670.wav"
    foto: string | null; // ruta a la imagen, e.g. "/photos/P1Largo.jpg"
    notas: string | null; // texto de las notas de la estación
    laeq: number;   // LeqA ponderado A
    leqz: number;   // LeqZ ponderado Z (lineal)
    ndsi: number;   // Índice Paisaje Sonoro Natural
    l10: number;
    l90: number;
}

export const BASE_URL = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL;

/**
 * Devuelve { status, label, desc } para cada parámetro.
 * Basado en directrices OMS y literatura de soundscape ecology.
 */
export const classify = {
    laeq(v: number): { status: Status; label: string; desc: string } {
        if (v < 55) return { status: "good", label: "Bueno", desc: "Dentro del rango OMS exterior" };
        if (v < 65) return { status: "mod", label: "Moderado", desc: "Sobre límite OMS diurno" };
        return { status: "bad", label: "Crítico", desc: "Nivel de ruido elevado" };
    },
    ndsi(v: number): { status: Status; label: string; desc: string } {
        if (v >= 0.5) return { status: "good", label: "Natural", desc: "Dominancia biofónica" };
        if (v >= 0) return { status: "mod", label: "Mixto", desc: "Balance bio/antropofónico" };
        return { status: "bad", label: "Antropofónico", desc: "Dominancia antropofónica" };
    },
};

export const statusIcon: Record<Status, string> = {
    good: "✅",
    mod: "⚠️",
    bad: "🔴",
};

export function formatTime(s: number) {
    return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}
