"""
genera_config.py
Scarica la lista delle foto da Cloudinary tramite TAG e genera partite-config.js
Lancialo ogni volta che carichi nuove foto su Cloudinary.

Uso: python genera_config.py
"""

import json
import os

import cloudinary
import cloudinary.api

# --- CONFIGURAZIONE ---
CLOUD_NAME = "dsl5rkm7q"
API_KEY    = "676393468862415"
API_SECRET = "W00A6Sh9QRfGf7xZ6SXKmYmuw1M"
NUM_PARTITE = 25
# ----------------------

cloudinary.config(
    cloud_name=CLOUD_NAME,
    api_key=API_KEY,
    api_secret=API_SECRET,
)

def main():
    print("🔍 Connessione a Cloudinary...")

    partite = {}

    for num in range(1, NUM_PARTITE + 1):
        tag = f"partita-{num}"
        try:
            r = cloudinary.api.resources_by_tag(tag, max_results=500)
            risorse = r.get("resources", [])
            if risorse:
                partite[num] = []
                for foto in risorse:
                    public_id = foto["public_id"]
                    partite[num].append({
                        "publicId": public_id,
                        "thumb": f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/w_300,h_200,c_fill,q_auto,f_auto/{public_id}",
                        "full":  f"https://res.cloudinary.com/{CLOUD_NAME}/image/upload/w_1400,q_auto,f_auto/{public_id}",
                    })
                print(f"   ✅ Partita {num}: {len(risorse)} foto")
            else:
                print(f"   ⬜ Partita {num}: nessuna foto")
        except Exception as e:
            print(f"   ⚠️  Partita {num}: errore — {e}")

    if not partite:
        print("\n⚠️  Nessuna foto trovata. Aggiungi i tag 'partita-1', 'partita-2'... su Cloudinary.")
        return

    js_content  = "// Auto-generato da genera_config.py — non modificare manualmente\n"
    js_content += "// Lanciare 'python genera_config.py' per aggiornare\n\n"
    js_content += "const FOTO_CONFIG = " + json.dumps(partite, indent=2, ensure_ascii=False) + ";\n"

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "partite-config.js")
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(js_content)

    print(f"\n✅ File generato: partite-config.js")
    print("   Carica partite-config.js su Netlify insieme agli altri file.")

if __name__ == "__main__":
    main()