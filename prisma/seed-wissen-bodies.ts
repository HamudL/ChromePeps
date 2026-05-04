/**
 * Wissen-Bereich · Pillar-Artikel-Bodies (Markdown).
 *
 * Ausgelagert aus seed.ts damit der Haupt-Seed nicht auf 2000+ Zeilen
 * wächst. Jeder export ist ein Markdown-String der von einem
 * BlogPost-Eintrag in seed.ts referenziert wird.
 *
 * Konventionen pro Artikel:
 *  - Beginnt mit `## Einleitung` (ist dann nicht im H1)
 *  - Mind. ein `> [!NOTE]`/`> [!WARNING]`/`> [!IMPORTANT]`-Callout
 *  - Footer: `> [!IMPORTANT]` mit Forschungs-Disclaimer
 *  - Compliance: keine therapeutischen Versprechen, immer
 *    in-vitro/Forschungs-Bezug.
 *
 * AUDIT_REPORT_v3 §6 PR 16.
 */

// ============================================================
// METHODIK · 3 Artikel
// ============================================================

export const JANOSHIK_BODY = `## Einleitung

Wer in der Forschungspeptid-Branche nach „verlässlichem externen Lab" sucht, landet meist bei einem Namen: **Janoshik Analytical**. Das tschechische Labor hat sich seit 2014 als de-facto-Standard für unabhängige Reinheits- und Identitätsprüfung etabliert — und ist auch unser primärer Partner für jede Charge, die wir freigeben.

Dieser Beitrag erklärt, warum wir mit Janoshik arbeiten, welche Methoden dort eingesetzt werden und wie ihr selbst eine CoA über die öffentliche Verifizierungs-Seite gegenchecken könnt.

> [!NOTE]
> Wir sind kein Labor und stellen keine eigenen Reinheits-Werte aus. Jede Zahl auf einem unserer CoAs stammt aus einer Janoshik-Messung; wir reichen den Bericht 1:1 weiter.

## Wer ist Janoshik?

Janoshik Analytical ist ein **akkreditiertes Analytik-Labor** mit Sitz in Brünn, Tschechien. Spezialisiert auf:

- HPLC-UV-Reinheitsanalyse (Standard für peptidische Wirkstoffe)
- Massenspektrometrie (ESI-MS) zur Identitätsbestätigung
- Restsolvenz-Bestimmungen (GC-MS)
- Endotoxin-Tests (LAL-Assay)

Die Laborleitung hat über 15 Jahre Erfahrung in pharmazeutischer QC und betreibt das Janoshik-Verification-Portal — eine öffentliche Datenbank, in der Käufer jede CoA per Lot-Nummer abrufen können. Diese Transparenz ist im Forschungspeptid-Markt einzigartig und einer der Hauptgründe, warum wir uns für Janoshik entschieden haben.

## Methodik im Detail

### HPLC-UV bei 220 nm

Standardmäßig wird jede Charge auf einer **C18-Säule** (250 × 4,6 mm, 5 µm) mit TFA-modifiziertem Acetonitril/Wasser-Gradienten aufgetrennt. Detektion läuft bei 220 nm — der Wellenlänge, bei der die Peptidbindung absorbiert.

Vorteil dieser Methode: hohe Reproduzierbarkeit und gute Auflösung für Sequenzen bis ~50 Aminosäuren. Nachteil: kurze Peptide (≤ 4 AA) zeigen schwache Absorption und brauchen alternative Detektoren.

### ESI-MS zur Identitätsbestätigung

Parallel zur HPLC läuft ein **ESI-MS-Run** (Electrospray Ionization Mass Spectrometry). Der gemessene m/z-Wert wird gegen die theoretisch erwartete Masse abgeglichen. Eine Abweichung > 1 Da führt zur Charge-Ablehnung.

> Reinheit und Identität sind getrennte Tests. Eine 99,5-%-reine Charge des falschen Peptids ist nicht besser als eine 92-%-Charge des richtigen.

### Endotoxin- und Restsolvenz-Tests

Diese Tests sind **nicht** in unserer Standard-Pipeline enthalten — sie werden nur auf Anfrage durchgeführt, weil sie für den reinen In-vitro-Forschungsgebrauch in der Regel nicht relevant sind. Wer sie für ein Zell-Assay braucht, kann das vor Bestellung anfordern.

## Verification-Portal: Schritt für Schritt

1. CoA-PDF aus eurer Bestätigungs-Mail öffnen.
2. Lot-Nummer ablesen (Format: \`CS-xy0-1234\`).
3. Auf [janoshik.com/verification](https://janoshik.com/verification) Lot eingeben.
4. Originaldokument vergleichen: Reinheit, Methode, Testdatum müssen 1:1 mit dem PDF übereinstimmen.

> [!WARNING]
> Wenn Werte abweichen oder das Lot nicht im Portal gefunden wird: bitte sofort an \`labs@chromepeps.com\` melden. Es gab in der Vergangenheit Fälschungen von CoAs durch Drittanbieter — nicht in unserer Lieferkette, aber wir prüfen jeden Hinweis.

## Häufige Fragen

**Warum nicht ein deutsches Labor?** Janoshik bietet das beste Preis-Leistungs-Verhältnis für die Charge-Größen, die wir freigeben (typisch 100–500 Vials). Deutsche Labore sind 3–5× teurer und liefern keine öffentliche Verifikation.

**Akkreditiert?** Ja, ISO 17025 für Chromatographie- und Massenspektrometrie-Methoden. Akkreditierungs-Dokumente sind auf Anfrage verfügbar.

**Wie häufig testet ihr?** Jede einzelne Charge — keine Stichproben. Bei Mehrfachbestellungen aus derselben Produktionscharge geben wir denselben CoA mit (klar als „aus Charge X" gekennzeichnet).

> [!IMPORTANT]
> Forschungsgebrauch: Inhalte dieses Artikels beziehen sich ausschließlich auf In-vitro- und Labor-Kontexte. Keine Empfehlung für Anwendung am Menschen oder Tier.
`;

export const TFA_VS_FA_BODY = `## Einleitung

Bei der Reverse-Phase-HPLC von Peptiden bestimmt die **Wahl des Ionenpaar-Reagenz** in der Mobilphase maßgeblich, wie scharf eure Peaks werden, wie lange die Säule lebt — und ob die Methode mit nachgeschalteter Massenspektrometrie kompatibel ist.

Standard ist seit Jahrzehnten **Trifluoressigsäure (TFA)**. Als Alternative gewinnt **Ameisensäure (Formic Acid, FA)** an Boden, vor allem für LC-MS-Workflows. Dieser Beitrag vergleicht beide Optionen und zeigt, wann welcher Modifier die richtige Wahl ist.

> [!NOTE]
> Wir nutzen für unsere Standard-Pipeline 0,1 % TFA. Wo MS-Identitätsbestätigung parallel läuft, kommt FA als Alternative in Frage.

## TFA — der Standard

TFA bei 0,05–0,1 % im Eluenten:
- **Sehr scharfe Peaks** durch starkes Ionenpaar-Verhalten — wichtig für Reinheits-Bestimmung im Sub-Prozent-Bereich
- **Robuste Reproduzierbarkeit** über Säulen- und Geräte-Generationen hinweg
- **Geeignet für UV-Detektion** ohne Hintergrund-Probleme bei 220 nm
- **Aggressiv gegen Säulenmaterial** — verkürzt Säulenlebensdauer um ~20 % gegenüber FA
- **Suppressiver Effekt im ESI-Mode** — TFA verschlechtert MS-Sensitivität deutlich (oft 10–100×)

## Ameisensäure — der MS-Freund

FA bei 0,1–0,5 % im Eluenten:
- **MS-kompatibel** — keine Ionen-Suppression im ESI-Modus
- **Schonender für die Säule** — geringere Korrosivität
- **Breiter Peaks** als bei TFA — typisch 1,5–2× FWHM
- **Schwächeres Ionenpaar-Verhalten** — kleine Verunreinigungen können unter dem Hauptpeak verschwinden

## Direktvergleich

| Kriterium             | TFA 0,1 %       | FA 0,1 %         |
|-----------------------|-----------------|------------------|
| Peak-Schärfe (FWHM)   | sehr scharf     | breit            |
| MS-Sensitivität       | stark suppr.    | praktisch ohne   |
| Säulen-Lebensdauer    | ~80 % von FA    | Referenz         |
| UV-220-nm-Hintergrund | sehr niedrig    | etwas höher      |
| Preis/Liter           | hoch            | sehr niedrig     |
| Lagerstabilität (5 °C) | sehr stabil     | stabil           |

## Wann TFA, wann FA?

### TFA wenn …
- Reinheits-Bestimmung mit ≥ 98 % Threshold (jede Verunreinigung muss sauber abgegrenzt sein)
- UV-Only-Detektion ohne MS
- Etablierte SOPs ohne Methoden-Transfer geplant

### FA wenn …
- LC-MS-gekoppelte Identitätsbestätigung im selben Run
- Säulenkosten ein Faktor sind (FA verlängert Lebensdauer messbar)
- Empfindliche Peptide (z. B. lipidiert) auf TFA mit Adducts reagieren

> Es gibt keinen „besseren" Modifier — nur den, der zur Methode passt. Wer Reinheits-QC fährt: TFA. Wer LC-MS-Profil baut: FA. Wer beides will: zwei separate Methoden.

## Hybrid-Workflow

Eine in der Praxis bewährte Kombination:
1. Run 1: TFA-Methode für Reinheits-Bestimmung
2. Run 2: FA-Methode für MS-Identität (selbe Säule, andere Mobilphase)

Das verdoppelt die Run-Zeit pro Probe, liefert aber beide Werte in höchster Qualität. Wir fahren das Verfahren bei Verdacht auf Co-Eluation oder bei neuen Peptid-Sequenzen, die wir noch nicht charakterisiert haben.

> [!WARNING]
> TFA-haltiger Abfall ist gesondert zu entsorgen — Fluor-Verbindungen gehören nicht ins normale Lab-Abwasser. Lokale Entsorgungs-Vorschriften beachten.

> [!IMPORTANT]
> Forschungsgebrauch: Inhalte dieses Artikels beziehen sich ausschließlich auf analytische In-vitro-Anwendungen. Keine Empfehlung für Anwendung am Menschen oder Tier.
`;

export const ESI_MS_BODY = `## Einleitung

HPLC sagt euch, **wie rein** ein Peptid ist. ESI-MS sagt euch, **welches** Peptid es ist. Beide Methoden sind komplementär — und nur ihre Kombination liefert eine vollständige Charakterisierung.

Dieser Beitrag erklärt das ESI-MS-Prinzip, wie wir es zur Identitätsbestätigung nutzen, und welche Stolperfallen bei der Interpretation zu beachten sind.

## Prinzip: Ionisation per Elektrospray

Bei der **Electrospray Ionization** wird die Peptidlösung durch eine feine Kapillare in ein elektrisches Feld gesprüht. Die entstehenden Tröpfchen verdampfen, das Peptid bleibt als geladenes Ion zurück und wird ins Massenspektrometer geleitet.

Wichtig zu wissen:
- **Multipel geladene Ionen** sind die Norm bei Peptiden — typisch \`[M+2H]²⁺\`, \`[M+3H]³⁺\`
- Die gemessenen m/z-Werte müssen zurück zur **monoisotopischen Masse** umgerechnet werden
- **Adduct-Bildung** mit Na⁺, K⁺, NH₄⁺ ist häufig und darf nicht mit echten Verunreinigungen verwechselt werden

## Massenberechnung in der Praxis

Beispiel: Tirzepatide hat eine theoretische monoisotopische Masse von **4811,52 Da**. Im ESI-MS erscheint typisch:

\`\`\`text
[M+3H]³⁺ → m/z = (4811,52 + 3·1,00728) / 3 = 1604,85
[M+4H]⁴⁺ → m/z = (4811,52 + 4·1,00728) / 4 = 1203,89
[M+5H]⁵⁺ → m/z = (4811,52 + 5·1,00728) / 5 = 963,31
\`\`\`

Eine korrekte Identifikation liegt vor, wenn mindestens **zwei Ladungs-Zustände** mit der erwarteten Masse innerhalb von ± 1 Da übereinstimmen.

> [!NOTE]
> Bei Massen > 5000 Da steigt die Wahrscheinlichkeit für Isotopen-Überlappungen. Hochauflösende MS (Orbitrap, FT-ICR) ist dann genauer als ein klassisches Quadrupol — wir nutzen Letzteres als Standard, weil es für Identitäts-Bestätigung bei unseren Peptid-Größen ausreichend ist.

## Was MS NICHT kann

- **Quantifizieren** (das macht UV-HPLC)
- **Stereoisomere unterscheiden** (D vs. L, cis vs. trans)
- **Disulfid-Bindungen direkt nachweisen** ohne Reduktion
- **Salze ausblenden** — eine TFA-Counterion-Variante kommt unter Umständen als separates Signal

## Typische Fallstricke

1. **Adducts**: \`[M+Na]⁺\` ist 22 Da schwerer als \`[M+H]⁺\` — sieht schnell aus wie eine Verunreinigung. Lösung: gegen Adduct-Tabelle abgleichen.
2. **TFA-Suppression**: TFA in der Mobilphase drückt Sensitivität deutlich → bei MS-Workflows besser FA verwenden (siehe Artikel zur Mobilphase).
3. **In-source-Fragmentation**: zu hohe Source-Voltage zerschlägt das Peptid bereits in der Source. Erkennbar an Fragment-Pattern statt Molekül-Peak.

> Eine MS-Identitätsbestätigung ist nicht „die Charge ist gut", sondern „die Charge enthält das erwartete Molekül". Reinheit, Stabilität und biologische Aktivität sind eigene Tests.

## Unsere Verifikations-Pipeline

1. HPLC-UV → Reinheit > 98 % (sonst Reject)
2. ESI-MS → ≥ 2 Ladungs-Zustände innerhalb von ± 1 Da der erwarteten Masse (sonst Reject)
3. Beide Reports zusammen im CoA — kein „nur HPLC" oder „nur MS"

> [!WARNING]
> Eine Charge, die nur einen der beiden Tests besteht, wird **nicht** freigegeben. Wer eine CoA ohne MS-Bestätigung sieht, sollte nachfragen.

> [!IMPORTANT]
> Forschungsgebrauch: Inhalte dieses Artikels beziehen sich auf analytische In-vitro-Anwendungen. Keine Empfehlung für Anwendung am Menschen oder Tier.
`;

// ============================================================
// WIRKSTOFFKLASSEN · 3 Artikel
// ============================================================

export const GLP1_FAMILIE_BODY = `## Einleitung

GLP-1-Rezeptoragonisten sind die meistgesuchte Wirkstoffklasse in der aktuellen Forschungs-Peptidlandschaft. Drei Substanzen dominieren:
**Semaglutide**, **Tirzepatide** und der jüngste Newcomer **Retatrutide**. Sie wirken über überlappende, aber nicht identische Mechanismen — was sie als Forschungs-Tools sehr unterschiedlich macht.

Dieser Beitrag liefert einen Überblick über strukturelle Unterschiede, Rezeptor-Selektivität und die jeweils relevante präklinische Datenlage. Bewusst keine Anwendungs-Empfehlungen — nur In-vitro-Charakterisierung.

> [!NOTE]
> Alle drei Substanzen sind in unserem Sortiment ausschließlich als Forschungspeptide für In-vitro-Studien verfügbar. Wir geben keine therapeutischen Empfehlungen.

## Semaglutide — der GLP-1-Solist

**Mechanismus:** selektiver GLP-1-Rezeptoragonist, lipidiert für verlängerte Plasmahalbwertszeit (~7 Tage in vivo, in präklinischen Modellen). Strukturell modifizierter GLP-1-Native mit C18-Fettsäureseitenkette.

**Forschungs-Kontext:**
- Inkretin-Signalweg-Studien
- Modulation der β-Zell-Funktion in pankreatischen Inseln
- Untersuchungen zur GLP-1R-Internalisierung

**Reinheits-Erwartung:** ≥ 98,5 % HPLC-UV. Identität per ESI-MS bestätigt.

## Tirzepatide — Dual GLP-1 + GIP

**Mechanismus:** Dual-Agonist an GLP-1R **und** GIP-Rezeptor (Glucose-dependent Insulinotropic Polypeptide). Synergistische Wirkung in präklinischen Modellen — beide Inkretin-Achsen werden parallel adressiert.

**Forschungs-Kontext:**
- Vergleichende Studien GLP-1 vs. GIP-Signaltransduktion
- Untersuchungen zu Rezeptor-Crosstalk und Heterodimerisierung
- Adipozyten-Differenzierung in vitro

**Strukturelle Besonderheit:** ähnliche Lipidierung wie Semaglutide, aber andere AA-Sequenz mit GIP-Affinitätsmotiv im N-Terminus.

## Retatrutide — Triple-Agonist

**Mechanismus:** Tri-Agonist an GLP-1R, GIP-R **und** Glucagon-Rezeptor. Drei Inkretin/Counter-Regulatoren-Achsen gleichzeitig — das macht Retatrutide zum komplexesten Tool der Klasse.

**Forschungs-Kontext:**
- Untersuchungen zu Glucagon-Rezeptor-Counterbalance
- Energie-Homöostase-Studien in Hepatozyten-Modellen
- Vergleichende Pathway-Analyse mit Mono- und Dual-Agonisten

**Status:** Klinische Phase III (Stand 2026), in der präklinischen Forschung breit eingesetzt.

## Direktvergleich

| Eigenschaft         | Semaglutide       | Tirzepatide          | Retatrutide              |
|---------------------|-------------------|----------------------|--------------------------|
| Rezeptoren          | GLP-1R            | GLP-1R + GIP-R       | GLP-1R + GIP-R + GCGR    |
| Lipidierung         | C18 Fettsäure     | C20 Fettsäure        | C20 Fettsäure            |
| Mol. Gewicht (Da)   | ~4114             | ~4811                | ~4731                    |
| Monomer-Stabilität  | hoch              | hoch                 | mittel-hoch              |
| Empf. Verdünnung    | 2,5 mg/mL in BAC  | 2,5 mg/mL in BAC     | 2,0 mg/mL in BAC         |

## Stabilität nach Rekonstitution

Alle drei Substanzen sind in BAC bei 2–8 °C über 28 Tage stabil. Reines Wasser ohne Konservierung verkürzt die Stabilität auf 14 Tage. Tieffrieren (–20 °C oder kälter) ist möglich, aber Frier-Tau-Zyklen sollten vermieden werden — Aliquotierung à 100–200 µL ist Best Practice.

> Die Wahl zwischen den drei Substanzen ist eine Frage der Forschungsfrage, nicht der „Stärke". Wer einen Single-Receptor-Effekt isoliert messen will, nimmt Semaglutide. Wer Cross-Talk untersucht, Tirzepatide oder Retatrutide.

## Forschungs-Hinweise

- **Receptor-Saturation**: bei In-vitro-Bindungs-Assays auf nicht-saturierende Konzentrationen achten. Typische EC₅₀ liegt im sub-nanomolaren Bereich.
- **Internalisierung-Assays**: GLP-1R wird nach Aktivierung schnell internalisiert. Zeitfenster der Messung beachten.
- **Vergleichbarkeit**: zwischen Chargen achten auf identische Reinheit (≥ 98,5 %), sonst können Aktivitäts-Unterschiede an Verunreinigungen liegen.

> [!IMPORTANT]
> Forschungsgebrauch: Alle Inhalte beziehen sich ausschließlich auf In-vitro-Forschung. Keine Empfehlung für Anwendung am Menschen oder Tier.
`;

export const BPC157_BODY = `## Einleitung

**BPC-157** (Body Protection Compound 157) ist ein synthetisches Pentadekapeptid, abgeleitet aus einer Sequenz, die ursprünglich in menschlichem Magensaft identifiziert wurde. In der präklinischen Literatur ist BPC-157 eines der am häufigsten untersuchten Forschungs-Peptide im Bereich der Gewebereparatur-Signalwege.

Dieser Beitrag fasst den aktuellen Stand der **in-vitro- und tierexperimentellen Datenlage** (Stand April 2026) zusammen — bewusst ohne Anwendungs-Empfehlungen.

> [!NOTE]
> BPC-157 ist **nicht** zugelassen als Arzneimittel. Sämtliche Inhalte dieses Artikels beziehen sich auf präklinische Forschungsergebnisse, nicht auf therapeutische Anwendung.

## Struktur

15 Aminosäuren, Sequenz: \`GEPPPGKPADDAGLV\`. Synthetisches Pentadekapeptid mit guter Stabilität in wässriger Lösung — ein Grund, warum es in der Forschung so verbreitet ist.

**Molekulargewicht:** ~1419 Da
**Reinheit (HPLC-UV):** typisch ≥ 98,5 %
**Identität (ESI-MS):** [M+2H]²⁺ bei m/z 710,5

## Untersuchte Signalwege

Die präklinische Literatur (Sikiric et al. und Folgearbeiten) untersucht BPC-157 in folgenden Kontexten:

### Angiogenese-Signalweg
- Modulation von VEGF-Expression in vitro
- Endothelzell-Migration in Wound-Healing-Assays
- Tube-Formation-Assays mit HUVECs

### Stickoxid-Signalisierung
- Beeinflussung der eNOS-Expression in vaskulären Modellen
- Untersuchungen zu NO-vermittelter Vasodilatation in isolierten Gefäßen

### Wachstumsfaktoren-Cross-Talk
- Modulation von EGR-1 und Growth-Hormone-Achsen
- Studien zu Tendon-Fibroblasten-Proliferation in Zellkultur

> Wichtig: All diese Daten stammen aus In-vitro- oder Tierversuchen. Eine Übertragbarkeit auf den Menschen ist **nicht** bewiesen.

## Stabilität

BPC-157 zeigt im Vergleich zu vielen anderen Peptiden hohe Stabilität:
- **Lyophilisat:** ≥ 24 Monate bei –20 °C
- **In Wasser/BAC gelöst:** 28 Tage bei 2–8 °C
- **Säurestabil:** untersucht im Kontext der Magenpassage in Tierstudien

Die Stabilität bei Raumtemperatur ist begrenzt — gelöste Lösungen sollten nicht > 4 h ungekühlt stehen.

## Reinheit ist kritisch

Gerade bei BPC-157 ist die Charge-Reinheit besonders wichtig, weil:
1. Das Peptid in vielen Forschungsfragen als „kontaminations-empfindlich" gilt
2. Acetat-Salz vs. TFA-Salz das Aktivitäts-Profil in manchen Assays verschiebt
3. Sequenz-Verkürzungen (z. B. Verlust von 1–2 AA) im UV-Chromatogramm subtil sind

> [!WARNING]
> Wer mit BPC-157 in Zell-Assays arbeitet, sollte **immer** den CoA prüfen — speziell ob ein TFA-Wert angegeben ist. TFA-Counterion kann in manchen Assays als Confounder wirken.

## Forschungs-Workflow-Tipps

- **Rekonstitution:** in BAC auf 1 mg/mL. Sanftes Schwenken, kein Vortex.
- **Stocks:** 10–20 µL Aliquots in PCR-Tubes bei –20 °C, einzeln verbrauchen.
- **Verdünnungen:** in PBS oder Assay-Medium frisch ansetzen, nicht > 4 h vor Versuchsbeginn.
- **Konzentrationsbereich:** typisch 1 nM – 10 µM für Bindungs-Assays.

## Datenlage-Limitierungen

Die meisten Studien stammen aus einer einzelnen Forschungsgruppe (Sikiric et al. in Zagreb). Unabhängige Replikation in größerem Maßstab ist begrenzt verfügbar — wer die Datenlage zitiert, sollte das im Studien-Design adressieren.

Zusätzlich: viele In-vivo-Daten stammen aus Ratten- und Mäusemodellen mit hohen Dosierungen. Übertragbarkeit auf andere Spezies oder den Menschen ist nicht etabliert.

> [!IMPORTANT]
> Forschungsgebrauch: BPC-157 ist als Forschungspeptid für In-vitro- und tierexperimentelle Studien dokumentiert. Keine Empfehlung für Anwendung am Menschen.
`;

export const NAD_BODY = `## Einleitung

**NAD+** (Nicotinamid-Adenin-Dinukleotid) ist kein Peptid — sondern ein Coenzym, das in jeder lebenden Zelle vorkommt und zentral für Energie-Stoffwechsel, DNA-Reparatur und Sirtuin-Aktivität ist. In den letzten Jahren ist NAD+ zu einem der meistgesuchten Forschungs-Tools in der Mitochondrien- und Longevity-Forschung geworden.

Dieser Beitrag erklärt die NAD+-Biochemie, die wichtigsten in-vitro-Assay-Kontexte und worauf bei der Lagerung zu achten ist (Spoiler: NAD+ ist deutlich empfindlicher als die meisten Peptide).

> [!NOTE]
> NAD+ ist als Forschungssubstanz für In-vitro-Anwendungen verfügbar. Sämtliche Aussagen in diesem Artikel beziehen sich auf präklinische Kontexte.

## Was ist NAD+?

NAD+ ist ein **Coenzym aus Adenin, Ribose, Phosphat und Nicotinamid**. Es existiert in zwei Redox-Zuständen:
- **NAD+** (oxidiert) — Elektronenakzeptor in katabolen Reaktionen
- **NADH** (reduziert) — Elektronendonor in anabolen Reaktionen

Das NAD+/NADH-Verhältnis in einer Zelle ist ein direktes Maß für ihren Redox-Status und steuert Hunderte enzymatischer Reaktionen.

**Molekulargewicht:** 663,4 Da
**Reinheit (HPLC):** typisch ≥ 98,5 %, hochkristallin

## Untersuchte Signalwege

### Sirtuin-Aktivität
NAD+ ist direkter Cofaktor für **Sirtuine (SIRT1–SIRT7)** — eine Klasse von Deacetylasen, die zentral in Stress-Response, Genregulation und Stoffwechsel-Adaptation involviert sind.

In-vitro-Assays:
- Acetylierungs-Status von p53 und FOXO-Transkriptionsfaktoren
- Aktivitäts-Messung über fluorogene Substrate
- Studien zu Sirtuin-Inhibitor-/Aktivator-Screening

### PARP-Mediated DNA Repair
**Poly-ADP-Ribose-Polymerase (PARP)** verbraucht NAD+, um DNA-Schäden zu reparieren. Bei massivem DNA-Schaden kann PARP-Aktivität die NAD+-Pools erschöpfen.

In-vitro-Studien adressieren:
- PARP-Aktivität nach H₂O₂-induzierten Strangbrüchen
- NAD+-Depletion als Marker für oxidativen Stress
- Wechselwirkung von PARP-Inhibitoren mit NAD+-Verfügbarkeit

### Mitochondriale Funktion
NAD+ ist Elektronenakzeptor in der **Atmungskette** (Komplex I). Niedrige NAD+-Pools korrelieren in Zellkultur mit reduzierter ATP-Produktion und mitochondrialer Dysfunktion.

## Stabilität ist anspruchsvoll

NAD+ ist deutlich **empfindlicher** als typische Peptide:

| Bedingung                  | Stabilität     |
|----------------------------|----------------|
| Lyophilisat, –20 °C, dunkel | 24+ Monate     |
| Lyophilisat, 4 °C          | ~12 Monate     |
| In Wasser, 4 °C, dunkel    | 7 Tage         |
| In Wasser, RT              | ≤ 24 h         |
| Lichtexposition (UV)       | Schnellzerfall |

> [!WARNING]
> NAD+ ist **lichtempfindlich**. Vials nicht offen liegen lassen, Aliquots in dunklen Tubes. Direkte UV-Exposition zerstört die Substanz innerhalb von Minuten.

## Rekonstitutions-Empfehlung

- Lyophilisat in **eiskaltem Wasser** auf 100 mg/mL (typisch 5 mL für 500 mg)
- Auf Raumtemperatur kommen lassen für ~5 min, sanft schwenken
- **In Aliquots à 100 µL bei –80 °C** einfrieren
- Frier-Tau-Zyklen vermeiden — jeder Zyklus reduziert die Aktivität messbar

## Reinheit und Identität

NAD+ wird per HPLC-UV bei 260 nm vermessen (Adenin-Absorption). ESI-MS-Identität via [M-H]⁻ bei m/z 662,4. Wir prüfen jede Charge auf Spuren von:
- NADH (reduziertes Form, häufiger Co-Eluent)
- Nicotinamid (Hydrolyse-Produkt)
- ADP-Ribose (weiteres Hydrolyse-Produkt)

Eine ≥ 98 %ige Charge enthält < 0,5 % NADH und < 0,3 % Hydrolyse-Produkte.

> Frische Lösungen sind nicht verhandelbar. Wer NAD+ aus einer 3-Wochen-alten Wasser-Lösung pipettiert, misst nicht NAD+ — sondern eine Mischung aus NAD+ und seinen Zerfallsprodukten.

> [!IMPORTANT]
> Forschungsgebrauch: NAD+ ist in unserem Sortiment ausschließlich als Forschungssubstanz für In-vitro-Anwendungen verfügbar. Keine Empfehlung für Anwendung am Menschen.
`;

// ============================================================
// LAB-PRACTICE · 1 Artikel
// ============================================================

export const COLD_CHAIN_BODY = `## Einleitung

Lyophilisate sind robust. Lange Versandwege, Sommerhitze, Postzwischenlager — die meisten Forschungspeptide überstehen das ohne messbaren Aktivitäts-Verlust. **Die meisten.** Dieser Beitrag erklärt, welche Substanzen aus unserem Sortiment kühlempfindlich sind, wie wir sie verschicken und was ihr beim Empfang prüfen solltet.

> [!NOTE]
> Wir versenden alle Bestellungen in isolierten Boxen mit Kühlpads. Im Sommer (April–September) zusätzlich mit Express-Option, falls die Lieferadresse > 2 Werktage entfernt liegt.

## Welche Peptide sind kühlempfindlich?

### Sehr kühlempfindlich (≤ 8 °C beim Versand obligatorisch)
- **NAD+** — zerfällt bei > 25 °C in 24 h messbar
- **Insulin-ähnliche Wachstumsfaktoren** (IGF-1 LR3) — Aggregation bei Wärmewechseln
- **Lipidierte GLP-1-Agonisten** in unverpacktem Zustand — wir liefern stets in Originalfläschchen

### Mittel kühlempfindlich (Raumtemperatur ≤ 5 Tage tolerabel)
- Standard-GLP-1-Agonisten in Lyophilisat-Form
- BPC-157, TB-500 (Lyophilisat-stabil)
- Selank, Semax (kurze Sequenzen, robust)

### Robust (auch bei längerer Hitze stabil)
- Bacteriostatic Water (Versandbeständig bis 35 °C)
- Reine Wachstumsfaktoren in Lyophilisat-Form

## Unser Versand-Setup

1. **Versand-Box:** EPS-Schaumstoff (~3 cm Wandstärke), 4 cm dünner als der DHL-Standard zum Sparen von Versandgewicht
2. **Kühlpads:** 2× 50-g-Gel-Akkus, vorgekühlt auf –20 °C, halten ~36 h bei 25 °C Außentemperatur unter 10 °C
3. **Inneres Insert:** Wellpappe-Halter für Vials, verhindert Bewegung
4. **Versandlabel:** „Temperatur-empfindlich, kühl lagern" auf jeder Box

> Eine Box, die 8 °C über 36 h hält, ist gut genug für 95 % aller deutschen Versandwege. Für die anderen 5 % (Hitzewelle, Express-Probleme) gibt's den Express-Aufpreis bei Bedarf.

## Empfang: was prüfen?

Bei Erhalt empfehlen wir:

1. **Kühlpads kontrollieren:** Sollen kalt (nicht eiskalt) sein. Komplett warm = Versand verzögert sich, eventuell Reklamation
2. **Vial-Inhalt sichten:** Lyophilisat soll als trockener Cake im Boden liegen. Verfärbungen, Klumpen, Auflösungen → Reklamation
3. **Etikett lesen:** Substanz, Lot, MHD müssen mit der Bestellbestätigung übereinstimmen
4. **Sofort kühlen:** Vials in Originalverpackung in den Kühlschrank bei 4 °C, oder bei längerer Lagerung in den Tiefkühler bei –20 °C

## Reklamations-Kriterien

Wir tauschen aus oder erstatten, wenn:
- Versandbox bei Erhalt > 36 h überschreitet die Kühlphase und Kühlpads vollständig warm sind
- Vial sichtbar geöffnet, beschädigt oder undicht ist
- Lot-Nummer im CoA und auf der Vial nicht übereinstimmt
- Inhalt eindeutig nicht das bestellte Produkt ist (Verwechslung)

Reklamationen bitte innerhalb von **48 h nach Erhalt** an \`support@chromepeps.com\` mit Foto der Box, der Vial und der Kühlpads.

## Saisonale Anpassungen

- **Mai–September:** Express-Versand standardmäßig empfohlen (kein Aufpreis bei Bestellungen > 200 €)
- **Hitzewelle (> 30 °C Tagestemperatur):** wir verschieben Versand an Freitagen automatisch auf Montag, um Wochenend-Lagerung in Hitzezonen zu vermeiden
- **Winter:** Standard-Versand ausreichend, Kühlung als Frostschutz nicht nötig (NAD+ vertragt kurze Frost-Peaks im Lyophilisat)

> [!WARNING]
> Wer ein Lyophilisat in der Hand hält, das nass aussieht oder verfärbt ist: **nicht** rekonstituieren und nicht im Versuch einsetzen. Bilder schicken, Reklamation öffnen.

> [!IMPORTANT]
> Forschungsgebrauch: Inhalte dieses Artikels beziehen sich ausschließlich auf den Versand und die Lagerung von Forschungspeptiden für In-vitro-Anwendungen.
`;

// ============================================================
// REGULATORISCHES · 1 Artikel
// ============================================================

export const EU_ZOLL_BODY = `## Einleitung

Forschungspeptide aus dem EU-Ausland zu importieren ist juristisch straightforward — solange ein paar Regeln beachtet werden. Dieser Beitrag fasst die wichtigsten Punkte für Käufer in Deutschland und Österreich zusammen, mit Fokus auf Lieferungen aus Tschechien, Slowakei und Polen (häufigste Herkunftsländer).

> [!NOTE]
> Dieser Beitrag ist eine fachliche Einordnung, **keine Rechtsberatung**. Für komplexe Konstellationen (B2B-Großmengen, Re-Export, Drittländer) bleibt anwaltliche Beratung empfehlenswert.

## EU-Binnenmarkt: Standardfall

Innerhalb der EU greift der **freie Warenverkehr** nach Art. 28 AEUV. Forschungs-Reagenzien gelten als „Waren" und sind nicht zoll- oder einfuhrgenehmigungspflichtig, solange:
- Sie als Reagenz/In-vitro-Material gekennzeichnet sind
- Keine Substanz unter das BtMG oder das EU-Drogenregime fällt
- Keine Dual-Use-Bestimmungen greifen (selten relevant für Peptide)

Wir versenden alle Bestellungen aus EU-Ländern auf diesem Weg — keine Zollanmeldung, keine zusätzlichen Steuern.

## Kennzeichnung auf der Lieferung

Jede unserer Sendungen trägt auf dem Versandlabel:
- Inhaltsbeschreibung: „Forschungs-Reagenz (In-vitro-Reagent)"
- HS-Code: 2937 oder 3822 je nach Substanztyp
- Wert in EUR
- Ursprungsland

Diese Kennzeichnung ist im EU-Binnenmarkt zwar nicht streng erforderlich, erleichtert aber etwaige Stichproben-Kontrollen erheblich.

## Drittländer-Import

Wenn ihr aus **Nicht-EU-Ländern** importiert (z. B. China, USA), ändert sich die Lage:

- **Zollanmeldung** ist Pflicht — bei Sendungen > 150 € fällt Einfuhrumsatzsteuer (19 % in DE, 20 % in AT) an
- **Reagenz-Status** muss durch ein Begleitschreiben (CoA + Hersteller-Brief) belegt sein
- **Zollkontrollen** sind häufiger, vor allem bei Sendungen aus China oder Indien — Vorsortier-Lager wie Frankfurt-Flughafen halten Sendungen 1–3 Tage fest, bis Dokumente geprüft sind

Wir importieren nicht selbst aus Drittländern und können daher keine Zoll-Beratung anbieten. Wer ähnliche Substanzen aus den USA bezieht, sollte einen Zollagenten konsultieren.

## Mehrwertsteuer

Innerhalb der EU bei B2C-Lieferungen: USt des Verkäuferlandes (typisch 19 % DE, 21 % CZ).

Bei B2B-Lieferungen mit gültiger USt-ID: **Reverse-Charge-Verfahren** (Lieferung netto, Empfänger versteuert im Inland). Unsere Rechnungen weisen das bei vorhandener USt-ID automatisch aus.

> [!WARNING]
> Eine ungültige USt-ID auf der B2B-Bestellung führt zu nachträglicher Belastung mit der USt des Verkäuferlandes. Bitte vor Bestellung im VIES-Portal validieren: ec.europa.eu/taxation_customs/vies.

## Re-Export

Wer Forschungspeptide aus Deutschland in Drittländer **re-exportiert** (z. B. UK, Schweiz, USA):

- **Verantwortung liegt vollständig beim Re-Exporteur** — wir stellen keine Export-Zertifikate aus
- **Zoll-Dokumente** (z. B. Ausfuhranmeldung) müssen vom Re-Exporteur erstellt werden
- **Empfängerland-Compliance**: in der UK gelten andere Regeln als in der EU; in den USA gilt die FDA-Reagenz-Klassifikation

Eine Sendung „Privatperson → Privatperson über Grenzen" ist juristisch heikel — wir empfehlen, in solchen Fällen direkt im Empfängerland zu beziehen statt zu re-exportieren.

## Compliance-Checkliste für Käufer

1. **Lieferland prüfen** — innerhalb EU = entspannt, außerhalb = Zoll-Vorbereitung
2. **USt-ID validieren** — bei B2B vor Bestellung
3. **Reagenz-Status nachweisen** — CoA und Bestätigungs-Mail aufbewahren, mindestens 5 Jahre
4. **Etikett der Vial sichten** — „In-vitro use only" muss auf jeder Vial stehen
5. **Re-Export vermeiden** — wenn doch nötig, Anwalt einschalten

> Der EU-Binnenmarkt ist für Forschungspeptide ein Geschenk: kein Zoll, keine Einfuhranmeldung, keine zusätzlichen Steuern. Wer den Vorteil nutzen will, muss nur in der EU bleiben — Re-Export verbrennt diesen Vorteil komplett.

> [!IMPORTANT]
> Forschungsgebrauch: Inhalte beziehen sich ausschließlich auf den Import von Forschungspeptiden für In-vitro-Anwendungen. Keine Empfehlung für Anwendung am Menschen.
`;

// ============================================================
// FORSCHUNG · 1 Artikel
// ============================================================

export const STABILITAET_BODY = `## Einleitung

Ein Peptid ist nicht stabil oder instabil — es zerfällt nach einem **Zeit-Temperatur-Lösungsmittel-Profil**, das pro Sequenz unterschiedlich aussieht. Dieser Beitrag fasst zusammen, was wir aus unseren eigenen Stabilitäts-Studien (siehe HPLC-Reinheits-Pipeline) und aus der publizierten Literatur über Langzeit-Stabilität von Forschungs-Peptiden wissen.

> [!NOTE]
> Daten in diesem Beitrag stammen aus T0/T30-Vergleichsmessungen unserer eigenen Pipeline plus aus aggregierten Janoshik-Reports der letzten 12 Monate.

## Drei Zustands-Klassen

Forschungspeptide existieren bei euch typischerweise in einem von drei Zuständen — jeder mit eigener Stabilitäts-Kurve.

### 1. Lyophilisat (–20 °C, dunkel)
- **Stabilität:** für die meisten Sequenzen 24 Monate, oft länger
- **Risiko:** Hydrolyse durch Restfeuchte (deshalb dichte Vials, dunkel gelagert)
- **Empfehlung:** Lyophilisate so lange wie möglich im Lyophilisat-Zustand belassen

### 2. In Wasser oder BAC gelöst, 2–8 °C
- **Stabilität:** 14–28 Tage je nach Sequenz und Lösungsmittel
- **BAC verlängert** auf 28 Tage durch Benzylalkohol-Konservierung
- **Reines Wasser:** 14 Tage Maximum

### 3. Tiefgefroren in Lösung, –20 °C oder kälter
- **Stabilität:** 6–12 Monate möglich, aber nicht risikofrei
- **Frier-Tau-Zyklen** sind der Hauptfeind — jeder Zyklus reduziert Aktivität
- **Aliquotierung** à 100–200 µL ist Best Practice, jeder Aliquot wird einmal aufgetaut

## Sequenz-spezifische Faktoren

Was beeinflusst Stabilität pro Sequenz?

| Faktor              | Effekt                                                         |
|---------------------|----------------------------------------------------------------|
| Met-Reste           | Oxidation an Methionin, +16 Da messbar in MS                   |
| Cys-Reste           | Disulfid-Brücken-Bildung, Veränderung in HPLC-Retentionszeit   |
| Asp-Pro-Bindung     | Säurelabile Hydrolyse, vor allem bei niedrigem pH              |
| N-terminales Gln    | Cyclisierung zu Pyroglutamat, –17 Da messbar                    |
| Lipidierung         | Aggregation, Mizellen-Bildung in falschem Lösungsmittel        |

> Wer eine instabile Sequenz hat (viel Met, Cys, oder Asp-Pro), sollte häufiger frische Lösungen ansetzen statt Frier-Tau-Zyklen zu riskieren.

## Was wir messen — T0 vs. T30

Unser Standard-Protokoll: jede Charge wird **zwei Mal vermessen** — einmal bei Eingang (T0), einmal nach 30 Tagen Lagerung im Lyophilisat-Zustand bei –24 °C (T30). Beide Werte sind im CoA dokumentiert.

Aggregierte Daten aus 30 Chargen der letzten 12 Monate:

| Substanz            | Δ Reinheit T0 → T30 | Bewertung      |
|---------------------|---------------------|----------------|
| Tirzepatide         | –0,12 %             | praktisch null |
| Semaglutide         | –0,18 %             | praktisch null |
| BPC-157             | –0,21 %             | sehr stabil    |
| GHK-Cu              | –0,32 %             | stabil         |
| NAD+                | –0,87 %             | empfindlicher  |
| TB-500              | –0,15 %             | sehr stabil    |

NAD+ ist in dieser Liste der Ausreißer — was zur Empfehlung passt, NAD+ als „kühlempfindlich" zu behandeln (siehe separater Artikel).

## Indikatoren für Zerfall

Wer eine Lösung verwendet, die schon länger steht, sollte vor dem Versuch prüfen:

1. **Visuell:** Trübung, Ausfällungen, Verfärbungen → verwerfen
2. **Geruch:** Veränderter Geruch (besonders bei Cys-haltigen Peptiden) → verwerfen
3. **HPLC, falls verfügbar:** Veränderte Retentionszeit oder neue Peaks → verwerfen
4. **Alter:** Wenn Stock-Datum > Empfehlung → verwerfen

> Eine Vial, die kostet 50 € — eine Lösung, die ein Experiment verzerrt, kostet euch eine Woche Zeit. Verwerfen ist günstiger als rekonstruieren.

## Frier-Tau-Zyklen — die unterschätzte Gefahr

Jeder Frier-Tau-Zyklus erzeugt:
- Mechanischen Stress durch Eiskristall-Bildung
- Lokale Konzentrations-Spitzen während des Auftauens
- Erhöhte Aggregations-Tendenz

Studien an monoklonalen Antikörpern (gut vergleichbar mit hochmolekularen Peptiden) zeigen messbaren Aktivitäts-Verlust nach 5–10 Frier-Tau-Zyklen. Für Forschungs-Peptide gilt: **maximal 1–2 Zyklen pro Aliquot**.

> [!WARNING]
> Eine 5× aufgetaute Stock-Lösung sollte nicht für quantitative Vergleichs-Assays genutzt werden. Reproduzierbarkeits-Probleme sind dann eher in der Lagerung als in der Pipettier-Genauigkeit zu suchen.

## Best-Practice-Workflow

1. **Lyophilisat lagern**: –20 °C, dunkel, original verschlossen
2. **Lösung vorbereiten**: in BAC auf empfohlene Konzentration, sanft schwenken
3. **Aliquotieren**: in 100–200 µL Portionen in Eppendorf-Tubes
4. **Tieffrieren**: –80 °C wenn verfügbar, sonst –20 °C
5. **Pro Versuch ein Aliquot auftauen**: nicht refreezen
6. **Verbrauchsdatum dokumentieren**: Lab-Notebook-Eintrag pro Aliquot

> [!IMPORTANT]
> Forschungsgebrauch: Stabilitäts-Daten beziehen sich auf In-vitro-Anwendungen. Sie sind kein Ersatz für eine eigene Stabilitäts-Studie für spezifische Assay-Bedingungen.
`;
