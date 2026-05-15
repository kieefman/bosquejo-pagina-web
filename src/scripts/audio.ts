import { BASE_URL, formatTime, type Station } from "./utils";
// @ts-ignore
import WaveSurfer from "https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js";
// @ts-ignore
import Spectrogram from "https://unpkg.com/wavesurfer.js@7/dist/plugins/spectrogram.esm.js";

let wavesurfer: any = null;

const playBtn = document.getElementById("play-pause") as HTMLButtonElement | null;
const timeDisplay = document.getElementById("time-display");
const specContainer = document.getElementById("spectrogram");
const cursor = document.getElementById("spec-cursor");
const volumeSlider = document.getElementById("volume-slider") as HTMLInputElement | null;
const volumeLabel = document.getElementById("volume-label");

if (playBtn) {
    playBtn.addEventListener("click", () => {
        if (wavesurfer) wavesurfer.playPause();
    });
}

// ─── Control de volumen ───────────────────────────────────────────────────────
if (volumeSlider && volumeLabel) {
    volumeSlider.addEventListener("input", () => {
        const vol = parseInt(volumeSlider.value) / 100;
        if (wavesurfer) wavesurfer.setVolume(vol);
        volumeLabel.textContent = `${volumeSlider.value}%`;
        // Cambiar icono según nivel
        const icon = document.querySelector(".volume-icon");
        if (icon) {
            if (vol === 0) icon.textContent = "🔇";
            else if (vol < 0.4) icon.textContent = "🔈";
            else if (vol < 0.7) icon.textContent = "🔉";
            else icon.textContent = "🔊";
        }
    });
}

function loadAudio(audioUrl: string) {
    if (!playBtn) return;

    playBtn.disabled = true;
    playBtn.textContent = "…";

    if (wavesurfer) {
        wavesurfer.destroy();
        wavesurfer = null;
    }

    // 1. Calcular altura: usar innerWidth porque offsetHeight da 0 cuando la pestaña de audio está oculta.
    const spectroHeight = window.innerWidth >= 1280 ? 260 : 200;

    wavesurfer = WaveSurfer.create({
        container: "#waveform",
        height: 1, // Oculto — mínimo para que WaveSurfer no falle
        normalize: true,
        sampleRate: 44100, // ⬅️ IMPORTANTE: Fuerza a Web Audio a usar 44.1kHz. Si tu Mac/OS usa 48kHz, el navegador hace upsampling y rellena con "cero energía" las frecuencias de 22kHz a 24kHz (creando el bloque vacío arriba).
        plugins: [
            Spectrogram.create({
                container: "#spectrogram",
                labels: true,
                labelsColor: "#94a3b8",
                labelsBackground: "transparent",
                fftSamples: 512,
                height: spectroHeight,
                splitChannels: false,
                useWebWorker: true,
                frequencyMin: 20,
                //scale: "bark",
                scale: "mel",
                windowFunc: "hann",
                gainDB: 20,
                rangeDB: 80,
            }),
        ],
    });

    wavesurfer.load(audioUrl);

    wavesurfer.on("ready", () => {
        playBtn.disabled = false;
        playBtn.textContent = "\u25B6";
        // Aplicar volumen actual del slider
        if (volumeSlider) wavesurfer.setVolume(parseInt(volumeSlider.value) / 100);
        updateTime();
        updateSpecCursor(0);
        fixSpectrogramBackground();
    });

    wavesurfer.on("timeupdate", (t: number) => {
        updateTime();
        updateSpecCursor(t);
    });

    wavesurfer.on("play", () => {
        playBtn.textContent = "\u23F8";
    });

    wavesurfer.on("pause", () => {
        playBtn.textContent = "\u25B6";
    });

    wavesurfer.on("finish", () => {
        playBtn.textContent = "\u25B6";
        updateSpecCursor(0);
    });
}

function updateTime() {
    if (!wavesurfer || !timeDisplay) return;
    timeDisplay.textContent = `${formatTime(wavesurfer.getCurrentTime())} / ${formatTime(
        wavesurfer.getDuration()
    )}`;
}

function updateSpecCursor(currentTime: number) {
    if (!cursor || !specContainer || !wavesurfer) return;
    const duration = wavesurfer.getDuration();
    if (!duration) return;
    const pct = currentTime / duration;
    cursor.style.left = `${pct * specContainer.offsetWidth}px`;
}

function fixSpectrogramBackground() {
    if (!specContainer) return;
    specContainer.querySelectorAll("canvas").forEach((canvas) => {
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        const prev = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = "destination-over";
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = prev;
    });
}

// ─── Interacción con el Espectrograma ────────────────────────────────────────

let isDraggingSpec = false;

function handleSpecSeek(e: MouseEvent | PointerEvent) {
    if (!wavesurfer || !specContainer) return;
    const rect = specContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    wavesurfer.seekTo(Math.max(0, Math.min(1, pct)));
}

if (specContainer) {
    specContainer.addEventListener("pointerdown", (e) => {
        isDraggingSpec = true;
        handleSpecSeek(e);
        e.preventDefault();
    });
}

window.addEventListener("pointermove", (e) => {
    if (isDraggingSpec) {
        handleSpecSeek(e);
    }
});

window.addEventListener("pointerup", () => {
    isDraggingSpec = false;
});

// ─── Eventos Globales ────────────────────────────────────────────────────────

window.addEventListener("station-select", (e: Event) => {
    const station = (e as CustomEvent<Station>).detail;
    loadAudio(`${BASE_URL}${station.audio}`);
});

window.addEventListener("audio-pause", () => {
    if (wavesurfer) wavesurfer.pause();
});
