// ============================================================
//  foto.js  –  Configurazione e logica completa
// ============================================================

// ──────────────────────────────────────────────────────────────
//  1. CONFIGURAZIONE  ← MODIFICA QUI
// ──────────────────────────────────────────────────────────────

const CONFIG = {

  // Token del tuo bot Telegram
  TELEGRAM_BOT_TOKEN: "8679096370:AAE734FnXKAfa0YcmetH1-P9WeSYac6CsoE",

  // ID della chat (o canale) dove arrivano i messaggi
  TELEGRAM_CHAT_ID: "862848148",

  // URL del Google Apps Script (già inserito)
  GOOGLE_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbxaD8qD3u2baqrJZD8SiWRGZ8DjAgMF2Cta7W5fC5ovxtAHSjPLb6jMmqee51jsDbkjoQ/exec",

  // ──────────────────────────────────────────────────────────
  //  PARTITE  ← Aggiungi/modifica le partite qui sotto
  //
  //  Per ogni partita hai bisogno dell'ID cartella Google Drive.
  //  Come trovarlo:
  //    1. Apri la cartella su Drive
  //    2. Guarda l'URL: drive.google.com/drive/folders/  >ID_QUI<
  //    3. La cartella deve essere condivisa come "Chiunque con il link"
  // ──────────────────────────────────────────────────────────
  PARTITE: [
    {
      id: "partita_1",
      nome: "Squadra A vs Squadra B",
      data: "12 Apr 2025",
      descrizione: "Campionato – Giornata 5",
      driveId: "INSERISCI_ID_CARTELLA_DRIVE_1"   // ← ID cartella Drive
    },
    {
      id: "partita_2",
      nome: "Squadra C vs Squadra D",
      data: "19 Apr 2025",
      descrizione: "Campionato – Giornata 6",
      driveId: "INSERISCI_ID_CARTELLA_DRIVE_2"
    },
    {
      id: "partita_3",
      nome: "Finale Coppa",
      data: "26 Apr 2025",
      descrizione: "Torneo Primavera",
      driveId: "INSERISCI_ID_CARTELLA_DRIVE_3"
    }
    // Aggiungi altre partite seguendo lo stesso schema...
  ]
};

// ──────────────────────────────────────────────────────────────
//  2. STATO GLOBALE
// ──────────────────────────────────────────────────────────────

let stato = {
  partitaSelezionata: null,   // oggetto partita
  nomeGenitore: "",
  fotoDiSponibili: [],        // array { id, nome, url, thumbUrl }
  fotoSelezionate: new Set()  // Set di id foto
};

// ──────────────────────────────────────────────────────────────
//  3. INIZIALIZZAZIONE: genera le card delle partite
// ──────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const grid = document.getElementById("partita-grid");
  grid.innerHTML = "";

  CONFIG.PARTITE.forEach(partita => {
    const card = document.createElement("div");
    card.className = "partita-card";
    card.innerHTML = `
      <div class="data">${partita.data}</div>
      <div class="nome">${partita.nome}</div>
      <div class="desc">${partita.descrizione}</div>
    `;
    card.addEventListener("click", () => selezionaPartita(partita));
    grid.appendChild(card);
  });
});

// ──────────────────────────────────────────────────────────────
//  4. NAVIGAZIONE TRA SCHERMATE
// ──────────────────────────────────────────────────────────────

function mostraScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

function selezionaPartita(partita) {
  stato.partitaSelezionata = partita;
  mostraScreen("screen-nome");
  document.getElementById("input-nome").focus();
}

function torna() {
  mostraScreen("screen-partita");
  stato.partitaSelezionata = null;
}

function tornaAllePartite() {
  mostraScreen("screen-partita");
  stato.partitaSelezionata = null;
  stato.fotoSelezionate.clear();
  stato.fotoDiSponibili = [];
  aggiornaBarraInvio();
}

function confermaPartita() {
  const nome = document.getElementById("input-nome").value.trim();
  if (!nome) {
    document.getElementById("input-nome").focus();
    document.getElementById("input-nome").style.borderColor = "var(--accent2)";
    setTimeout(() => {
      document.getElementById("input-nome").style.borderColor = "";
    }, 1500);
    return;
  }
  stato.nomeGenitore = nome;
  stato.fotoSelezionate.clear();
  mostraScreen("screen-foto");
  caricaFoto(stato.partitaSelezionata);
}

// ──────────────────────────────────────────────────────────────
//  5. CARICAMENTO FOTO DA GOOGLE DRIVE
// ──────────────────────────────────────────────────────────────

/**
 * Carica l'elenco file dalla cartella Drive tramite API pubblica.
 * Richiede che la cartella sia condivisa con "Chiunque con il link".
 *
 * IMPORTANTE: per usare l'API Drive devi inserire la tua API Key Google.
 * Ottienila su: https://console.cloud.google.com → API & Services → Credentials
 * Attiva "Google Drive API" nel tuo progetto.
 */
const GOOGLE_API_KEY = "INSERISCI_LA_TUA_GOOGLE_API_KEY";

async function caricaFoto(partita) {
  const container = document.getElementById("gallery-container");
  const titolo = document.getElementById("titolo-partita");
  const infoEl = document.getElementById("info-genitore");
  const schermataFoto = document.getElementById("screen-foto");

  titolo.textContent = partita.nome;
  infoEl.textContent = `👤 ${stato.nomeGenitore}  •  ${partita.data}`;

  container.innerHTML = `
    <div class="loading-stato">
      <div class="spinner"></div>
      <div>Caricamento foto in corso...</div>
    </div>`;

  try {
    // Chiama l'API Google Drive per listare i file immagine nella cartella
    const url =
      `https://www.googleapis.com/drive/v3/files` +
      `?q='${partita.driveId}'+in+parents+and+mimeType+contains+'image/'` +
      `&fields=files(id,name,thumbnailLink)` +
      `&pageSize=200` +
      `&key=${GOOGLE_API_KEY}`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Errore API Drive: " + resp.status);
    const data = await resp.json();

    if (!data.files || data.files.length === 0) {
      container.innerHTML = `<div class="loading-stato">📂 Nessuna foto trovata in questa cartella.</div>`;
      return;
    }

    stato.fotoDiSponibili = data.files.map(f => ({
      id: f.id,
      nome: f.name,
      // URL anteprima (thumbnail) per mostrare in griglia
      thumbUrl: f.thumbnailLink
        ? f.thumbnailLink.replace("=s220", "=s400")
        : `https://drive.google.com/thumbnail?id=${f.id}&sz=w400`,
      // URL visualizzazione completa
      url: `https://drive.google.com/file/d/${f.id}/view`
    }));

    renderGalleria();
    schermataFoto.classList.add("con-barra");

  } catch (err) {
    console.error(err);
    container.innerHTML = `
      <div class="loading-stato" style="color:var(--accent2)">
        ⚠️ Impossibile caricare le foto.<br>
        <small style="color:var(--muted)">${err.message}</small><br><br>
        <small>Controlla: API Key, ID cartella Drive, permessi cartella (pubblica).</small>
      </div>`;
  }
}

// ──────────────────────────────────────────────────────────────
//  6. RENDER GALLERIA
// ──────────────────────────────────────────────────────────────

function renderGalleria() {
  const container = document.getElementById("gallery-container");
  container.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "gallery-grid";

  stato.fotoDiSponibili.forEach(foto => {
    const item = document.createElement("div");
    item.className = "foto-item";
    item.dataset.id = foto.id;
    item.innerHTML = `
      <img src="${foto.thumbUrl}" alt="${foto.nome}" loading="lazy"/>
      <div class="overlay"></div>
      <div class="check">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 7l4 4 6-7" stroke="#0d0f14" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div class="foto-nome">${foto.nome}</div>
    `;
    item.addEventListener("click", () => toggleFoto(foto.id, item));
    grid.appendChild(item);
  });

  container.appendChild(grid);
}

function toggleFoto(id, el) {
  if (stato.fotoSelezionate.has(id)) {
    stato.fotoSelezionate.delete(id);
    el.classList.remove("selected");
  } else {
    stato.fotoSelezionate.add(id);
    el.classList.add("selected");
  }
  aggiornaBarraInvio();
}

// ──────────────────────────────────────────────────────────────
//  7. BARRA INVIO E CONTATORE
// ──────────────────────────────────────────────────────────────

function aggiornaBarraInvio() {
  const n = stato.fotoSelezionate.size;
  const barra = document.getElementById("bottom-bar");
  const badge = document.getElementById("counter-badge");
  document.getElementById("n-selezionate").textContent = n;
  badge.textContent = `${n} selezionate`;

  if (n > 0) {
    barra.classList.add("visible");
    badge.classList.add("visible");
  } else {
    barra.classList.remove("visible");
    badge.classList.remove("visible");
  }
}

// ──────────────────────────────────────────────────────────────
//  8. MODALE CONFERMA
// ──────────────────────────────────────────────────────────────

function apriModale() {
  const selezionate = stato.fotoDiSponibili.filter(f => stato.fotoSelezionate.has(f.id));

  document.getElementById("modal-riepilogo").textContent =
    `${stato.nomeGenitore} — ${stato.partitaSelezionata.nome} (${stato.partitaSelezionata.data})`;

  const lista = document.getElementById("modal-lista");
  lista.innerHTML = selezionate.map((f, i) => `${i + 1}. ${f.nome}`).join("<br>");

  document.getElementById("modal-overlay").classList.add("open");
}

function chiudiModale() {
  document.getElementById("modal-overlay").classList.remove("open");
}

// ──────────────────────────────────────────────────────────────
//  9. INVIO: TELEGRAM + GOOGLE FOGLI
// ──────────────────────────────────────────────────────────────

async function inviaRichiesta() {
  const btnConferma = document.getElementById("btn-conferma-invio");
  btnConferma.disabled = true;
  btnConferma.textContent = "Invio in corso...";

  const selezionate = stato.fotoDiSponibili.filter(f => stato.fotoSelezionate.has(f.id));
  const nomiFoto = selezionate.map(f => f.nome);
  const partita = stato.partitaSelezionata;
  const genitore = stato.nomeGenitore;
  const dataOra = new Date().toLocaleString("it-IT");

  try {
    // ── A) Invia a Telegram ──
    await inviaATelegram(genitore, partita, nomiFoto, dataOra);

    // ── B) Salva su Google Fogli ──
    await salvaSuGoogleFogli(genitore, partita, nomiFoto, dataOra);

    // Tutto ok
    chiudiModale();
    mostraToast("✅ Richiesta inviata con successo!", false);

    // Reset selezione
    stato.fotoSelezionate.clear();
    document.querySelectorAll(".foto-item.selected").forEach(el => el.classList.remove("selected"));
    aggiornaBarraInvio();

  } catch (err) {
    console.error(err);
    chiudiModale();
    mostraToast("❌ Errore nell'invio. Riprova.", true);
  } finally {
    btnConferma.disabled = false;
    btnConferma.textContent = "Conferma e invia";
  }
}

// ── Telegram ──
async function inviaATelegram(genitore, partita, nomiFoto, dataOra) {
  const righe = nomiFoto.map((n, i) => `  ${i + 1}. ${n}`).join("\n");
  const messaggio =
    `📸 *NUOVA RICHIESTA FOTO*\n\n` +
    `👤 *Genitore:* ${genitore}\n` +
    `⚽ *Partita:* ${partita.nome}\n` +
    `📅 *Data partita:* ${partita.data}\n` +
    `🕐 *Richiesta:* ${dataOra}\n\n` +
    `📋 *Foto selezionate (${nomiFoto.length}):*\n${righe}`;

  const url = `https://api.telegram.org/bot${CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: CONFIG.TELEGRAM_CHAT_ID,
      text: messaggio,
      parse_mode: "Markdown"
    })
  });
  if (!resp.ok) {
    const err = await resp.json();
    throw new Error("Telegram: " + (err.description || resp.status));
  }
}

// ── Google Fogli (Apps Script) ──
async function salvaSuGoogleFogli(genitore, partita, nomiFoto, dataOra) {
  const payload = {
    nome: genitore,
    partita: partita.nome,
    foto: nomiFoto   // array, come si aspetta il tuo Apps Script
  };

  // Usa no-cors perché Apps Script non restituisce CORS headers in produzione
  await fetch(CONFIG.GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  // Con no-cors non possiamo leggere la risposta, ma la richiesta arriva
}

// ──────────────────────────────────────────────────────────────
//  10. TOAST NOTIFICA
// ──────────────────────────────────────────────────────────────

function mostraToast(msg, errore = false) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = errore ? "errore" : "";
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 4000);
}