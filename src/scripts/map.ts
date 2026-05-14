import L from "leaflet";
import { BASE_URL, type Station } from "./utils";

let map: any;

// "LargoP1.1330" → "P1Largo" | "CortoP2.1400" → "P2Corto"
function normalizarNombre(csvName: string): string {
    const match = csvName.trim().match(/^(Largo|Corto)P(\d+)/i);
    if (!match) return "";
    return `P${match[2]}${match[1]}`; // coincide con filename en el JSON
}

async function cargarEstaciones(): Promise<void> {
    try {
        const [jsonRes, csvRes, audioRes] = await Promise.all([
            fetch(`${BASE_URL}/resultados_acusticos.json`),
            fetch(`${BASE_URL}/coords.csv`),
            fetch(`${BASE_URL}/audios_index.json`),
        ]);

        const resultados: any[]                      = await jsonRes.json();
        const csvText: string                         = await csvRes.text();
        const audioIndex: Record<string, string>      = await audioRes.json();

        // Parsear CSV → mapa filename → [lat, lng]
        const lineas = csvText.trim().split("\n").slice(1); // saltar header X,Y,Name
        const coordMap: Record<string, [number, number]> = {};
        for (const linea of lineas) {
            const [x, y, name] = linea.split(",");
            const key = normalizarNombre(name);
            if (key) coordMap[key] = [parseFloat(y), parseFloat(x)]; // Leaflet: [lat, lng]
        }

        // Unir JSON + CSV + audio index, derivar campos y normalizar nombres
        const estaciones: Station[] = resultados
            .map((r) => ({
                filename:     r.filename,
                nombre:       r.filename
                                  .replace("Largo", " (10 min)")
                                  .replace("Corto", " (1 min)"),
                coordenadas:  coordMap[r.filename] ?? null,
                duracion_min: (r.filename.includes("Largo") ? 10 : 1) as 1 | 10,
                audio:        audioIndex[r.filename] ?? "",
                // Renombrar a los IDs que usa el panel HTML
                laeq: r.LeqA,
                leqz: r.LeqZ,
                ndsi: r.NDSI,
                l10:  r.L10,
                l90:  r.L90,
            }))
            .filter((e) => e.coordenadas !== null) as Station[];

        if (estaciones.length === 0) {
            console.warn("No se pudo unir ningún punto. Revisa que filename y Name coincidan.");
        }

        // Colocar marcadores con colores de alto contraste sobre OSM Naturaleza
        estaciones.forEach((station) => {
            // Naranja para Largo (10 min), violeta para Corto (1 min)
            const color  = station.duracion_min === 10 ? "#f97316" : "#7c3aed";
            const border = station.duracion_min === 10 ? "#7c2d12" : "#3b0764";
            const marker = L.circleMarker(station.coordenadas, {
                radius: 9,
                fillColor: color,
                color: border,
                weight: 2,
                opacity: 1,
                fillOpacity: 0.9,
            }).addTo(map);

            marker.bindTooltip(station.nombre, { sticky: true });
            marker.on("click", () => {
                window.dispatchEvent(
                    new CustomEvent("station-select", { detail: station })
                );
            });
        });

        console.log(`✅ ${estaciones.length} estaciones cargadas.`);
    } catch (err) {
        console.error("Error cargando datos:", err);
    }
}

function initMap() {
    const container = document.getElementById("map-container");
    if (!container) return;

    map = L.map("map-container").setView([-39.845, -73.228], 14);

    // OSM estándar: renderiza humedales, bosques y naturaleza nativamente
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    }).addTo(map);

    cargarEstaciones();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMap);
} else {
    initMap();
}
