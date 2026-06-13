# ChromePeps Designsystem — „Chromatogramm"

Stand: Juni 2026. Löst das „Cinematic Lab"-Design (Gold/Amber + warmes
Creme, Comfortaa) vollständig ab.

## Idee

ChromePeps verkauft unabhängig geprüfte Reinheit. Das Design übersetzt
das wörtlich: Die Website liest sich wie ein hochwertiges
**Analyse-Protokoll** — kaltes Papier, präzise Haarlinien, Messdaten in
Mono, ein einziger entschiedener Akzent. Der Markenclaim bleibt:
*„Gemessen, nicht versprochen."*

## Farben (Tokens in `src/app/globals.css`)

| Token | Light | Bedeutung |
| --- | --- | --- |
| `--background` | `210 30% 98%` | kaltes Papierweiß |
| `--foreground` | `217 30% 10%` | kalte Tinte |
| `--primary` | `173 75% 22%` | **Viridian** — dunkles Laborglas-Grün, einziger Akzent |
| `--primary-strong` | `174 85% 16%` | Akzent als TEXT auf hellem Grund (AA) |
| `--ink` | `218 35% 7%` | kaltes Nachtblau für dunkle Einschübe |
| `--accent` | `172 32% 92%` | Mint-Wash, einzige getönte Fläche |
| `--radius` | `0.25rem` | scharfe Kanten: lg=4px, md=2px, sm=0 |

Dunkle Oberflächen (`.section-ink`, `.section-dark`, `.card-ink`)
**rescopen** `--primary`/`--primary-strong` automatisch auf helles Mint —
`text-primary` ist dort ohne Zutun lesbar. Helle `bg-card`-Karten
innerhalb einer Ink-Sektion setzen die Tokens zurück.

## Typografie

| Slot | Font | Einsatz |
| --- | --- | --- |
| `font-display` | **Fraunces** (variable, echte Kursive) | Headlines, Wortmarke, editoriale Akzente |
| `font-sans` | **Instrument Sans** | UI & Body |
| `font-mono` | **IBM Plex Mono** | Messdaten, Lots, Preise, Labels, Indizes |

Kursive ist wieder erlaubt (Fraunces-Italic) — gezielt für menschliche,
editoriale Akzente.

## Signatur-Bausteine (globals.css)

- `.eyebrow` — Mono-Kicker mit vorangestelltem Mess-Strich
- `.display-title` — Fraunces-Headline-Standard
- `.tick-rule` — Haarlinie mit Mess-Ticks alle 24px (Lineal)
- `.rule-gold` — Akzent-Haarlinie (Name historisch, zeichnet Viridian)
- `.gold-underline` — animierte Hover-Underline (Name historisch)
- `.index-ghost` — riesige Geister-Ordnungszahl
- `.stat-value` / `.stat-key` — Readout: Fraunces-Zahl + Mono-Key
- `.trust-pill` — eckiges Specimen-Tag (Vertrauenssignale)
- `.mono-label` / `.mono-tag` / `.field-label` — Mono-Mikrotypo
- `.section-pad` — vertikaler Sektionsrhythmus
- `.chrome-text` — kalter, statischer Chrom-Verlauf für die Wortmarke

## Komponenten

- `Button`: `variant="gold"` = primäres Viridian-CTA (Name historisch,
  alle Call-Sites nutzen ihn als Haupt-CTA), `"ink"` = Nachtblau-Sekundär.
- `Card`: `variant="lift"` für klickbare Karten, `"ink"` für dunkle
  Einschübe (trägt `card-ink` fürs Token-Rescoping).
- `Badge`: eckig (2px) — Proben-Etikett statt Pille.

## Prinzipien

1. Editorial-asymmetrisch statt zentriert-symmetrisch; großzügiger Weißraum.
2. Protokoll-Details: Index-Nummern (01/02/…), Lot-/Messwerte in Mono,
   Haarlinien & Ticks, Chromatogramm-Kurve als Marken-Visual.
3. Microinteractions dezent: Hover-Underline, leichte Lifts, EIN
   Shine-Sweep. Keine Endlos-Animationen, kein Glassmorphism, keine
   generischen Gradients.
4. Copy: präzise, menschlich, deutsch — keine Marketing-Floskeln.
5. Kontrast AA: Akzent-Text auf hellem Grund immer `text-primary-strong`.
