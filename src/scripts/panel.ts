import { classify, statusIcon, type Station, type Status, BASE_URL } from "./utils";

const panel = document.getElementById("info-panel");
const closeBtn = document.getElementById("close-panel");
const mapHint = document.getElementById("map-hint");

// ─── Portal: mueve los tooltip-box al <body> para escapar de overflow/transform ──
document.querySelectorAll<HTMLElement>(".tooltip-wrap").forEach((wrap) => {
    const trigger = wrap.querySelector<HTMLElement>(".tooltip-trigger");
    const box = wrap.querySelector<HTMLElement>(".tooltip-box");
    if (!trigger || !box) return;

    // Mueve el box al body (fuera de cualquier contenedor clipeado)
    document.body.appendChild(box);

    trigger.addEventListener("mouseenter", () => {
        const r = trigger.getBoundingClientRect();
        // Mostrar invisible para medir altura real
        box.style.visibility = "hidden";
        box.style.display = "block";
        const bh = box.offsetHeight;
        const bw = box.offsetWidth;
        // Centrar horizontalmente sobre el trigger, aparecer encima
        let left = r.left + r.width / 2 - bw / 2;
        let top = r.top - bh - 10;
        // Evitar que salga por los bordes de la pantalla
        left = Math.max(8, Math.min(left, window.innerWidth - bw - 8));
        top = Math.max(8, top);
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;
        box.style.visibility = "visible";
    });

    trigger.addEventListener("mouseleave", () => {
        box.style.display = "none";
    });
});

if (closeBtn && panel && mapHint) {
    // ─── Cerrar panel ─────────────────────────────────────────────
    closeBtn.addEventListener("click", () => {
        panel.classList.remove("visible");
        mapHint.classList.remove("hidden");
        // Pausar audio enviando evento
        window.dispatchEvent(new CustomEvent("audio-pause"));
    });

    // ─── Tabs ─────────────────────────────────────────────────────
    document.querySelectorAll(".tab-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
            const target = (btn as HTMLElement).dataset.tab!;
            document.querySelectorAll(".tab-btn").forEach((b) => {
                b.classList.toggle("active", b === btn);
                b.setAttribute("aria-selected", b === btn ? "true" : "false");
            });
            document.querySelectorAll(".tab-panel").forEach((p) => {
                p.classList.toggle("active", p.id === `panel-${target}`);
            });
        });
    });

    // ─── Actualizar Métricas ──────────────────────────────────────
    window.addEventListener("station-select", (e: Event) => {
        const station = (e as CustomEvent<Station>).detail;

        // Cabecera
        (document.getElementById("station-name") as HTMLElement).textContent = station.nombre;
        (document.getElementById("station-coords") as HTMLElement).textContent =
            `${station.coordenadas[0].toFixed(4)}°S, ${station.coordenadas[1].toFixed(4)}°O`;

        // Métricas simples (valor directo)
        (document.getElementById("val-l10") as HTMLElement).textContent = String(station.l10);
        (document.getElementById("val-l90") as HTMLElement).textContent = String(station.l90);
        (document.getElementById("val-leqz") as HTMLElement).textContent = String(station.leqz);

        // Métricas con clasificación
        setMetric("laeq", station.laeq, classify.laeq(station.laeq));
        setMetric("ndsi", station.ndsi, classify.ndsi(station.ndsi));

        // Reset tab a "métricas"
        const metricsTab = document.querySelector('[data-tab="metrics"]');
        if (metricsTab) {
            metricsTab.dispatchEvent(new Event("click"));
        }

        // Lógica de Foto
        const photoEl = document.getElementById("station-photo") as HTMLImageElement;
        const fallbackEl = document.getElementById("photo-fallback");
        if (photoEl && fallbackEl) {
            if (station.foto) {
                photoEl.src = `${BASE_URL}${station.foto}`;
                photoEl.style.display = "block";
                fallbackEl.classList.add("hidden");
            } else {
                photoEl.style.display = "none";
                fallbackEl.classList.remove("hidden");
            }
        }

        // Lógica de Notas
        const notesEl = document.getElementById("station-notes") as HTMLElement;
        const notesFallbackEl = document.getElementById("notes-fallback");
        if (notesEl && notesFallbackEl) {
            if (station.notas) {
                notesEl.textContent = station.notas;
                notesEl.style.display = "block";
                notesFallbackEl.classList.add("hidden");
            } else {
                notesEl.style.display = "none";
                notesFallbackEl.classList.remove("hidden");
            }
        }

        // Mostrar panel
        panel.classList.add("visible");
        mapHint.classList.add("hidden");
    });
}

/** Actualiza valor, badge, card color e icono de una métrica */
function setMetric(key: string, value: number, result: { status: Status; label: string; desc: string }) {
    const valEl = document.getElementById(`val-${key}`);
    const badgeEl = document.getElementById(`badge-${key}`);
    const descEl = document.getElementById(`desc-${key}`);
    const cardEl = document.getElementById(`card-${key}`);
    const iconEl = document.getElementById(`icon-${key}`);

    if (!valEl || !badgeEl || !descEl || !cardEl || !iconEl) return;

    valEl.textContent = String(value);
    descEl.textContent = result.desc;
    badgeEl.textContent = result.label;

    badgeEl.className = `status-badge ${result.status}`;
    cardEl.className = cardEl.className.replace(/status-(good|mod|bad)/g, "").trim() + ` status-${result.status}`;
    iconEl.textContent = statusIcon[result.status];
}
