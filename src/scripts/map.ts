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
        const [jsonRes, csvRes, audioRes, photoRes] = await Promise.all([
            fetch(`${BASE_URL}/resultados_acusticos.json`),
            fetch(`${BASE_URL}/coords.csv`),
            fetch(`${BASE_URL}/audios_index.json`),
            fetch(`${BASE_URL}/photos_index.json`),
        ]);

        const resultados: any[] = await jsonRes.json();
        const csvText: string = await csvRes.text();
        const audioIndex: Record<string, string> = await audioRes.json();
        const photoIndex: Record<string, string> = await photoRes.json().catch(() => ({})); // En caso de que no exista aún

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
                filename: r.filename,
                nombre: r.filename
                    .replace("Largo", " (10 min)")
                    .replace("Corto", " (1 min)"),
                coordenadas: coordMap[r.filename] ?? null,
                duracion_min: (r.filename.includes("Largo") ? 10 : 1) as 1 | 10,
                audio: audioIndex[r.filename] ?? "",
                foto: photoIndex[r.filename] ?? null,
                // Renombrar a los IDs que usa el panel HTML
                laeq: r.LeqA,
                leqz: r.LeqZ,
                ndsi: r.NDSI,
                l10: r.L10,
                l90: r.L90,
            }))
            .filter((e) => e.coordenadas !== null) as Station[];

        if (estaciones.length === 0) {
            console.warn("No se pudo unir ningún punto. Revisa que filename y Name coincidan.");
        }

        // Configuración del parámetro de color actual (puede cambiarse en el futuro)
        type ColorParam = "duracion_min" | "ndsi" | "laeq";
        let colorParameter: ColorParam = "ndsi";

        // Función para obtener el color dinámicamente según el parámetro
        const getMarkerColor = (station: Station, param: ColorParam): { fill: string, border: string } => {
            if (param === "ndsi") {
                // NDSI va de -1 (antropofonía) a +1 (biofonía). Usaremos una escala simple de colores.
                const ndsi = station.ndsi ?? 0;
                if (ndsi > 0.3) return { fill: "#22c55e", border: "#14532d" }; // Verde (Mucha Biofonía)
                if (ndsi < -0.3) return { fill: "#ef4444", border: "#7f1d1d" }; // Rojo (Mucha Antropofonía)
                return { fill: "#eab308", border: "#713f12" }; // Amarillo (Mixto)
            } 
            else if (param === "duracion_min") {
                // Comportamiento original
                return {
                    fill: station.duracion_min === 10 ? "#f97316" : "#7c3aed",
                    border: station.duracion_min === 10 ? "#7c2d12" : "#3b0764"
                };
            }
            // Fallback por defecto
            return { fill: "#3b82f6", border: "#1e3a8a" }; // Azul
        };

        // Colocar marcadores con colores dinámicos
        estaciones.forEach((station) => {
            const colors = getMarkerColor(station, colorParameter);
            
            const marker = L.circleMarker(station.coordenadas, {
                radius: 9,
                fillColor: colors.fill,
                color: colors.border,
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

/*

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
*/

function initMap() {
    const container = document.getElementById("map-container");
    if (!container) return;

    map = L.map("map-container").setView([-39.845, -73.228], 14);

    // 1. Definir la capa de OpenStreetMap
    const osmLayer = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
    });

    // 2. Definir la capa Satelital (usando Esri World Imagery)
    const satelliteLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: 'Tiles &copy; ',
        maxZoom: 19,
    });

    // 3. Añadir la capa por defecto al mapa (OSM)
    satelliteLayer.addTo(map);

    // 4. Crear un objeto con las capas base
    const baseMaps = {
        "Satélite (Esri)": satelliteLayer,
        "Mapa Humedales (OSM)": osmLayer,
    };

    // 5. Añadir el control de capas al mapa
    L.control.layers(baseMaps).addTo(map);

    cargarEstaciones();
}


if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMap);
} else {
    initMap();
}
