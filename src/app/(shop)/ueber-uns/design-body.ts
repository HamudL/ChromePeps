/**
 * Design-HTML der /ueber-uns Seite — Brand-Edition aus dem Claude-Design-
 * Handoff (ueber-uns.html), in eine getrennte Datei extrahiert.
 *
 * Wird in page.tsx via dangerouslySetInnerHTML in den .ueber-uns-design
 * Wrapper injected. Scoped CSS (ueber-uns.css) + Client-JS (interactions.tsx)
 * docken über IDs/Klassen an.
 *
 * Anpassungen ggü. Quell-HTML:
 *   - <head>, <body>, design-eigene <nav>, <div.foot>, <script> entfernt
 *     (Site-Header + Footer kommen aus dem (shop)-Layout; chrom-nav bleibt
 *     als Sub-Navigation und sitzt sticky unter dem Header)
 *   - Vial-<img>s zeigen auf unsere 120-Frame Assembly-Sequenz:
 *     Hero = frame_120 (assembled, statisches Showcase + Maus-Parallax),
 *     Story = frame_001 (scroll-scrubbed durch interactions.tsx)
 *   - {{PLACEHOLDER}}-Tokens für Live-Daten aus der DB (page.tsx ersetzt sie):
 *     AVG_PURITY_RAW, CHARGEN_COUNT, LOT_NUMBER, PURITY, TEST_DATE
 */

export const DESIGN_BODY_HTML = `

<!-- ========================================================================
     TOP NAV — Brand
     ==================================================================== -->


<!-- ========================================================================
     CHROMATOGRAM SUB-NAV — table of contents as HPLC trace
     ==================================================================== -->
<div class="chrom-nav" id="chromNavBar" aria-label="Inhalt als HPLC-Chromatogramm">
  <div class="chrom-nav-inner">
    <div class="chrom-nav-label">
      <span class="live"></span>
      <span>RP-HPLC · 220 nm</span>
    </div>
    <div class="chrom-nav-svg-wrap">
      <svg class="chrom-nav-svg" id="chromNav" viewBox="0 0 1000 56" preserveAspectRatio="none" aria-hidden="false">
        <g class="grid">
          <line x1="0" x2="1000" y1="14" y2="14"/>
          <line x1="0" x2="1000" y1="28" y2="28"/>
          <line x1="0" x2="1000" y1="42" y2="42"/>
        </g>
        <line class="baseline" x1="0" x2="1000" y1="50" y2="50"/>
        <path id="chromNavFill" class="trace-fill" d=""/>
        <path id="chromNavTrace" class="trace" d=""/>
        <g id="chromNavPeaks"></g>
        <line class="playhead" id="chromNavPlayhead" x1="0" x2="0" y1="0" y2="56"/>
      </svg>
    </div>
    <div class="chrom-nav-right">
      <b id="chromNavTime">00:00</b>
      <span>min</span>
    </div>
  </div>
</div>

<!-- ========================================================================
     HERO
     ==================================================================== -->
<section class="hero hero-ambient" id="top">
  <div class="subtle-grid"></div>
  <div class="hero-inner">

    <div class="hero-copy">
      <div class="hero-kicker">Über uns · Mai 2026</div>
      <h1 class="hero-title">Reinheit, gemessen
nicht versprochen.</h1>
      <p class="hero-sub">ChromePeps liefert Forschungspeptide nach veröffentlichter Methode. Jede Charge erhält eine Lot-Nummer; jede Lot-Nummer ein HPLC-Chromatogramm von Janoshik Analytical. Was Sie auf dem Etikett lesen, hat ein unabhängiges Labor gemessen, nicht wir.</p>
      <div class="hero-ctas">
        <a class="btn-gold" href="#labor">
          Wie wir testen
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h10m0 0L8 3m4 4L8 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a class="btn-ghost" href="#manifest">Unser Manifest</a>
      </div>

      <div class="hero-meta">
        <div class="hero-meta-item">
          <div class="v"><span data-count="{{AVG_PURITY_RAW}}" data-decimals="2">0</span><small>%</small></div>
          <div class="k">Ø HPLC-Reinheit · 2026</div>
        </div>
        <div class="hero-meta-item">
          <div class="v"><span data-count="{{CHARGEN_COUNT}}" data-decimals="0">0</span></div>
          <div class="k">Chargen freigegeben</div>
        </div>
        <div class="hero-meta-item">
          <div class="v"><span data-count="100" data-decimals="0">0</span><small>%</small></div>
          <div class="k">3rd-Party verifiziert</div>
        </div>
      </div>
    </div>

    <div class="hero-stage">
      <div class="specimen-card" id="specCard">
        <div class="specimen-head">
          <span>SPECIMEN · {{LOT_NUMBER}}</span>
          <span class="live">live</span>
        </div>
        <div class="specimen-vial" id="specVialStage">
          <span class="caliper top"><span>⌀ 22&nbsp;mm</span></span>
          <span class="caliper right">↕&nbsp;58&nbsp;mm · 10&nbsp;ml borosilikat</span>
          <img src="/ueber-uns/vial-assembly/frame_120.webp" alt="ChromePeps Vial" id="specVialImg" />
          <span class="caliper lot"><b>LOT</b>&nbsp;{{LOT_NUMBER}} · <span class="pass">HPLC {{PURITY}} %</span></span>
          <span class="stamp-ruo">RUO<small>Research Use Only</small></span>
        </div>
        <div class="specimen-foot">
          <div><div class="k">Method</div><div class="v">RP-HPLC · ESI-MS</div></div>
          <div><div class="k">Released</div><div class="v amber">PASS · {{TEST_DATE}}</div></div>
        </div>
      </div>
    </div>

  </div>
</section>

<!-- ========================================================================
     MANIFEST (dark)
     ==================================================================== -->
<section class="manifest section-ink" id="manifest">
  <div class="apo-grid-ink"></div>
  <div class="container">
    <div class="manifest-grid">

      <div class="manifest-head reveal">
        <div class="mono-label gold"><span class="dot"></span>01 · MANIFEST</div>
        <h2>Reinheit ist <span class="accent">kein Schlagwort.</span><br/>Es ist eine Messung.</h2>
      </div>

      <div class="manifest-body reveal">
        <p>
          Der Markt für Forschungspeptide ist voll von Anbietern, die das Wort <b>Reinheit</b> als Schlagwort verwenden. Wir behandeln es als Messwert. Jede Charge, die unser Lager verlässt, trägt einen Datensatz: Reinheit per HPLC, Identität per Massenspektrometrie, eindeutige Lot-Nummer, Datum, Methode.
        </p>
        <p>
          Diese Daten gehören nicht uns. Sie gehören in jede Bestellung, in jede E-Mail, in jeden öffentlich verifizierbaren <span class="accent">Janoshik-Eintrag</span>. Transparenz ist die teuerste Marketing-Strategie — und die einzige, die unter HPLC standhält.
        </p>
        <p>
          Wir geben keine Heilversprechen. Wir liefern <b>Material</b> nach <b>Methode</b>, mit <b>Beleg</b>. Was unsere Kunden damit anfangen, ist deren Wissenschaft.
        </p>
      </div>

      <aside class="manifest-side reveal">
        <dl>
          <div class="row"><dt>Gegründet</dt><dd>2024</dd></div>
          <div class="row"><dt>Rechtsform</dt><dd>UG (haftungsbeschränkt)</dd></div>
          <div class="row"><dt>Sitz</dt><dd>Baden-Württemberg, DE</dd></div>
          <div class="row"><dt>Lagerung</dt><dd>tiefgekühlt · isolierter Schrank</dd></div>
          <div class="row"><dt>Analytik</dt><dd>Janoshik Labs · HPLC / MS</dd></div>
          <div class="row"><dt>Versand</dt><dd>DE + EU · ~24 h Handling</dd></div>
          <div class="row"><dt>Zahlung</dt><dd>Stripe · SEPA · Crypto (soon)</dd></div>
          <div class="row"><dt>Klasse</dt><dd>Research Use Only</dd></div>
        </dl>
      </aside>

    </div>
  </div>
</section>

<!-- ========================================================================
     STORY — scroll-locked specimen (light, apo-grid)
     ==================================================================== -->
<section class="story apo-grid" id="story">
  <div class="container">

    <div class="manifest-head reveal" style="text-align: center; max-width: 720px; margin: 0 auto 56px;">
      <div class="mono-label" style="justify-content: center; display: inline-flex;"><span class="dot"></span>02 · VIAL → CHARGE</div>
      <h2 style="font-family: var(--font-display); font-weight: 700; font-size: clamp(36px, 4.2vw, 56px); line-height: 1.05; letter-spacing: -0.02em; margin: 14px 0 14px; color: var(--foreground);">
        Was passiert, bevor das Etikett <span class="accent" style="color: var(--primary)">freigegeben</span> wird.
      </h2>
      <p style="font-size: 17px; color: var(--muted-fg); margin: 0;">Vier Schritte vom Rohstoff bis zur versendeten Charge — scrollen Sie weiter, das Vial dreht sich mit.</p>
    </div>

    <div class="story-inner">

      <div class="story-stage-wrap">
        <div class="story-stage" id="storyStage">
          <div class="gridbg"></div>
          <div class="holder"><img src="/ueber-uns/vial-assembly/frame_001.webp" alt="" id="storyVial" /></div>
          <span class="scan" id="storyScan"></span>

          <span class="annot left a1" data-show="1"><span class="ln"></span><span><b>STERIL</b> · NEUTRAL VERPACKT</span></span>
          <span class="annot right a2" data-show="2"><span class="ln"></span><span><b>HPLC {{PURITY}} %</b> · Janoshik</span></span>
          <span class="annot left a3" data-show="3"><span class="ln"></span><span><b>{{LOT_NUMBER}}</b> · −24 °C</span></span>
          <span class="annot right a4" data-show="4"><span class="ln"></span><span><b>RUO</b> · Research Use Only</span></span>

          <div class="progress">
            <span id="storyIdx">01 / 04</span>
            <span class="bar"><i id="storyBar"></i></span>
            <span id="storyTotal">04</span>
          </div>
        </div>
      </div>

      <div class="story-panels">

        <article class="story-panel reveal" data-panel="1">
          <div class="mono-label gold">i · WARENEINGANG</div>
          <h3>Jede Charge erhält eine <span class="accent">Identität</span>, bevor sie ein Etikett bekommt.</h3>
          <p>Eingangs­wiegung, Sicht­prüfung der Lyophilisat-Struktur, eindeutige Lot-Nummer.</p>
          <dl>
            <div><dt>Lot-ID</dt><dd>{{LOT_NUMBER}}</dd></div>
            <div><dt>Quarantäne</dt><dd>isoliert</dd></div>
            <div><dt>Doku</dt><dd>End-to-End</dd></div>
            <div><dt>Handling</dt><dd>≤ 60 min</dd></div>
          </dl>
        </article>

        <article class="story-panel reveal" data-panel="2">
          <div class="mono-label gold">ii · JANOSHIK</div>
          <h3>Wir testen <span class="accent">nicht selbst.</span> Das ist der Punkt.</h3>
          <p>Eine versiegelte Probe geht an Janoshik Analytical, ein unabhängiges Labor mit öffentlicher Datenbank. RP-HPLC bestimmt die Reinheit, ESI-MS verifiziert die Identität gegen Referenz­spektrum. Das Ergebnis ist nicht „unser" Ergebnis.</p>
          <dl>
            <div><dt>Methode</dt><dd>RP-HPLC + ESI-MS</dd></div>
            <div><dt>Schwelle</dt><dd>≥ 98 %</dd></div>
            <div><dt>Labor</dt><dd>Janoshik s.r.o.</dd></div>
            <div><dt>Verifikation</dt><dd>janoshik.com</dd></div>
          </dl>
        </article>

        <article class="story-panel reveal" data-panel="3">
          <div class="mono-label gold">iii · FREIGABE &amp; VERSAND</div>
          <h3>Eine Charge wird <span class="accent">erst freigegeben</span>, wenn die Daten es erlauben.</h3>
          <p>≥ 98 % Reinheit, bestätigte Identität. Erst dann verlässt die Charge das Lager. Versand in neutraler, isolierter Verpackung. Das CoA der konkreten Lot-Nummer liegt der Versandbestätigung automatisch bei.</p>
          <dl>
            <div><dt>Handling</dt><dd>~24 h</dd></div>
            <div><dt>Verpackung</dt><dd>neutral · isoliert</dd></div>
            <div><dt>Cold-Chain</dt><dd>EU-weit</dd></div>
            <div><dt>CoA</dt><dd>auto · per Order</dd></div>
          </dl>
        </article>

        <article class="story-panel reveal" data-panel="4">
          <div class="mono-label gold">iv · WAS WIR NICHT SIND</div>
          <h3>Kein Apotheker. Kein Arzt. Kein Wundermittel-
verkäufer.</h3>
          <p>ChromePeps liefert Material der Klasse <b>Research Use Only</b>. Wir geben keine medizinische Beratung, keine Dosierungs­empfehlungen, keine Heilversprechen. Unsere Kunden wissen, wozu HPLC-Daten da sind: für die Wissenschaft, nicht für Werbung.</p>
          <dl>
            <div><dt>Klasse</dt><dd>RUO</dd></div>
            <div><dt>Beratung</dt><dd>technisch</dd></div>
            <div><dt>Datenschutz</dt><dd>DSGVO · cookieless</dd></div>
            <div><dt>Sitz</dt><dd>BaWü, DE</dd></div>
          </dl>
        </article>

      </div>

    </div>

    <div style="height: 96px;"></div>
  </div>
</section>

<!-- ========================================================================
     PROZESS (dark — 4 steps with icons)
     ==================================================================== -->
<section class="prozess section-ink" id="prozess">
  <div class="apo-grid-ink"></div>
  <div class="container prozess-inner reveal">
    <div class="mono-label gold" style="justify-content: center; display: inline-flex;"><span class="dot"></span>03 · DER PROZESS</div>
    <h2>Vom Eingang zum Etikett in vier verifizierten Schritten.</h2>
    <p class="sub">Keine Abkürzungen. Keine Ausnahmen. Keine „Sonderchargen".</p>

    <div class="prozess-grid">

      <div class="proz-step">
        <span class="step-n">1</span>
        <span class="icon-wrap">
          <!-- lucide: Package -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
        </span>
        <h3>Eingang &amp; Lot-Anlage</h3>
        <p>Charge entgegen genommen, mit Lot-ID versehen und in den isolierten Kühlschrank eingelagert.</p>
        <div class="tags">
          <span class="tag">≤ 60 min</span><span class="tag">ISOLIERT</span><span class="tag">Lot-ID</span>
        </div>
      </div>

      <div class="proz-step">
        <span class="step-n">2</span>
        <span class="icon-wrap">
          <!-- lucide: Microscope -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/></svg>
        </span>
        <h3>Janoshik HPLC-Analyse</h3>
        <p>Versiegelte Probe geht an Janoshik Analytical. RP-HPLC bestimmt Reinheit, ESI-MS bestätigt Identität gegen Referenz.</p>
        <div class="tags">
          <span class="tag">RP-HPLC</span><span class="tag">ESI-MS</span><span class="tag">3rd party</span>
        </div>
      </div>

      <div class="proz-step">
        <span class="step-n">3</span>
        <span class="icon-wrap">
          <!-- lucide: ShieldCheck -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>
        </span>
        <h3>Freigabe oder Reject</h3>
        <p>≥ 98 % Reinheit + bestätigte Identität = Freigabe. Bei Abweichung wird die Charge zurückgewiesen, nicht „angepasst".</p>
        <div class="tags">
          <span class="tag pass">PASS ≥ 98 %</span><span class="tag">binary</span>
        </div>
      </div>

      <div class="proz-step">
        <span class="step-n">4</span>
        <span class="icon-wrap">
          <!-- lucide: Mail -->
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </span>
        <h3>Versand mit CoA</h3>
        <p>Neutrale, isolierte Verpackung. Das CoA der konkreten Lot-Nummer kommt automatisch mit der Versandbestätigung.</p>
        <div class="tags">
          <span class="tag">24 h Handling</span><span class="tag">CoA · auto</span><span class="tag">EU-weit</span>
        </div>
      </div>

    </div>
  </div>
</section>

<!-- ========================================================================
     LABOR · HPLC FIGURE CARD (light)
     ==================================================================== -->
<section class="labor" id="labor">
  <div class="apo-grid"></div>
  <div class="container labor-inner">

    <div class="labor-copy reveal">
      <div class="mono-label gold"><span class="dot"></span>04 · EVIDENZ · NICHT MARKETING</div>
      <h2>So sieht ein <span class="accent">„passed"</span> Lot aus.</h2>
      <p class="lead">
        Echtes HPLC-Chromatogramm einer ChromePeps-Charge. Der Haupt-Peak bei <span class="tab">t<sub>R</sub> = 5,82 min</span> ist das Zielpeptid. Die Fläche unter der Kurve im Verhältnis zur Gesamt­fläche gibt die Reinheit: <b class="gold">{{PURITY}} %</b>.
      </p>
      <ul class="labor-points">
        <li><div><b>Säule:</b> C18, 4,6 × 250 mm, 5 µm</div></li>
        <li><div><b>Fluss:</b> 1,0 ml/min · UV 220 nm</div></li>
        <li><div><b>Gradient:</b> 0,1 % TFA / Acetonitril, 5 → 60 % über 10 min</div></li>
        <li><div><b>Referenz:</b> Janoshik MS-Library · Match-Score 0,997</div></li>
      </ul>
      <div class="labor-cta">
        <a class="btn-gold" href="#kontakt">
          CoA-Beispiel ansehen
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h10m0 0L8 3m4 4L8 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
    </div>

    <div class="hplc-card reveal">
      <div class="hplc-head">
        <div class="cell"><div class="k">Sample</div><div class="v">{{LOT_NUMBER}}</div></div>
        <div class="cell"><div class="k">Method</div><div class="v">RP-HPLC · 220 nm</div></div>
        <div class="cell"><div class="k">Säule</div><div class="v">C18 · 4,6×250 mm</div></div>
        <div class="cell"><div class="k">Run</div><div class="v">{{TEST_DATE}}</div></div>
        <div class="cell"><div class="k">Status</div><div class="v pass">PASS · {{PURITY}} %</div></div>
      </div>

      <div class="hplc-stage">
        <svg id="hplcSvg" viewBox="0 0 1000 320" preserveAspectRatio="none" aria-hidden="true">
          <g class="grid">
            <line x1="0" x2="1000" y1="50" y2="50"/>
            <line x1="0" x2="1000" y1="110" y2="110"/>
            <line x1="0" x2="1000" y1="170" y2="170"/>
            <line x1="0" x2="1000" y1="230" y2="230"/>
            <line x1="0" x2="1000" y1="290" y2="290"/>
            <line x1="200" x2="200" y1="0" y2="300"/>
            <line x1="400" x2="400" y1="0" y2="300"/>
            <line x1="600" x2="600" y1="0" y2="300"/>
            <line x1="800" x2="800" y1="0" y2="300"/>
          </g>
          <line class="axis-line" x1="0" x2="1000" y1="300" y2="300"/>
          <line class="baseline" x1="0" x2="1000" y1="280" y2="280"/>

          <path id="peakArea" class="trace-fill" d=""/>
          <path id="peakStroke" class="trace" d="" stroke-dasharray="0 9999"/>

          <g id="peakMarker" opacity="0">
            <line class="marker" x1="465" x2="465" y1="30" y2="280"/>
            <text class="label" x="475" y="48">t<tspan font-style="italic">R</tspan> 5,82 min</text>
            <text class="label dim" x="475" y="64">{{PURITY}} %</text>
          </g>
          <g id="impurityMarker" opacity="0">
            <line class="marker" x1="710" x2="710" y1="244" y2="280"/>
            <text class="label dim" x="720" y="260">0,31 %</text>
          </g>

          <text class="y-label" x="8" y="14">mAU</text>
          <text class="axis-tick" x="200" y="314">2</text>
          <text class="axis-tick" x="400" y="314">4</text>
          <text class="axis-tick" x="600" y="314">6</text>
          <text class="axis-tick" x="800" y="314">8</text>
          <text class="axis-tick" x="965" y="314">10 min</text>
        </svg>

        <span class="stamp-pass" id="stampPass">PASSED<small>14 · MAI · 26</small></span>
      </div>

      <div class="hplc-foot">
        <div class="notes">
          <b>Bedingungen:</b> RP-HPLC · C18 · 4,6 × 250 mm · 5 µm · Fluss 1,0 ml/min · UV 220 nm · Gradient 0,1 % TFA / Acetonitril, 5 → 60 % über 10 min. Referenz­spektrum: Janoshik MS-Library, Match-Score 0,997.
        </div>
        <div class="cta">
          <a href="#kontakt">CoA anfordern <span>↗</span></a>
        </div>
      </div>
    </div>

  </div>
</section>

<!-- ========================================================================
     ZAHLEN (light)
     ==================================================================== -->
<section class="zahlen" id="zahlen">
  <div class="container">
    <div class="zahlen-head reveal">
      <div class="mono-label gold" style="justify-content: center; display: inline-flex;"><span class="dot"></span>05 · IN ZAHLEN</div>
      <h2>Operationelle Realität, <span class="accent">2026.</span></h2>
      <p class="sub">Werte aus dem laufenden Janoshik-Verifikations­fluss, keine Hochrechnungen.</p>
    </div>

    <div class="zahlen-grid">
      <div class="metric reveal">
        <div class="num">fig. 5.1</div>
        <div class="v"><span data-count="{{AVG_PURITY_RAW}}" data-decimals="2">0</span><small>%</small></div>
        <div class="lbl">Ø HPLC-Reinheit</div>
        <div class="desc">12-Monats-Mittel · alle Janoshik-getesteten Chargen</div>
      </div>
      <div class="metric reveal">
        <div class="num">fig. 5.2</div>
        <div class="v"><span class="accent"></span><span data-count="{{CHARGEN_COUNT}}" data-decimals="0">0</span></div>
        <div class="lbl">Chargen freigegeben</div>
        <div class="desc">seit Gründung · Stand Mai 2026</div>
      </div>
      <div class="metric reveal">
        <div class="num">fig. 5.3</div>
        <div class="v"><span data-count="7" data-decimals="0">0</span><small>%</small></div>
        <div class="lbl">Reject-Rate</div>
        <div class="desc">zurückgewiesen, nicht „angepasst"</div>
      </div>
      <div class="metric reveal">
        <div class="num">fig. 5.4</div>
        <div class="v"><span data-count="22" data-decimals="0">~24</span><small>h</small></div>
        <div class="lbl">Ø Handling-Zeit</div>
        <div class="desc">Bestelleingang → Versand</div>
      </div>
      <div class="metric reveal">
        <div class="num">fig. 5.5</div>
        <div class="v"><span data-count="0" data-decimals="0">0</span></div>
        <div class="lbl">Re-Calls</div>
        <div class="desc">Charge je zurückgerufen: nein.</div>
      </div>
      <div class="metric reveal">
        <div class="num">fig. 5.6</div>
        <div class="v"><span data-count="100" data-decimals="0">0</span><small>%</small></div>
        <div class="lbl">CoA-Coverage</div>
        <div class="desc">jede Bestellung · automatisch</div>
      </div>
    </div>
  </div>
</section>

<!-- ========================================================================
     ROADMAP (dark)
     ==================================================================== -->
<section class="roadmap section-ink" id="roadmap">
  <div class="apo-grid-ink"></div>
  <div class="container roadmap-inner">
    <div class="roadmap-head reveal">
      <div class="mono-label gold" style="justify-content: center; display: inline-flex;"><span class="dot"></span>06 · ROADMAP</div>
      <h2>Was als Nächstes <span class="accent">verifizierbar</span> wird.</h2>
      <p class="sub">Eine Roadmap ist nur dann ehrlich, wenn auch die noch nicht erreichten Punkte darin stehen. Hier sind beide.</p>
    </div>

    <div class="tl reveal">
      <div class="tl-row">
        <div class="tl-q"><span class="dot"></span>Q2 · 2026</div>
        <div class="tl-t">Gründung &amp; erstes Sortiment</div>
        <div class="tl-d">UG-Gründung in BaWü. Vier Kern-Peptide gelistet. Erster Janoshik-Vertrag.</div>
        <div class="tl-s">erledigt ✓</div>
      </div>
      <div class="tl-row">
        <div class="tl-q"><span class="dot"></span>Q2 · 2026</div>
        <div class="tl-t">Lot-Tracking-System</div>
        <div class="tl-d">Eigenes Tooling: Lot-ID, CoA-Mapping, automatisierter CoA-Versand pro Bestellung.</div>
        <div class="tl-s">erledigt ✓</div>
      </div>
      <div class="tl-row">
        <div class="tl-q"><span class="dot"></span>Q2 · 2026</div>
        <div class="tl-t">Cold-Chain &amp; EU-Versand</div>
        <div class="tl-d">Isolierte Verpackung, *24 h Handling, Versand in DE und ausgewählten EU-Ländern.</div>
        <div class="tl-s">erledigt ✓</div>
      </div>
      <div class="tl-row current">
        <div class="tl-q"><span class="dot"></span>Q4 · 2026</div>
        <div class="tl-t">Öffentliche CoA-Datenbank</div>
        <div class="tl-d">Jede freigegebene Lot-Nummer ist auf chromepeps.com direkt verlinkbar, ohne Bestellung, ohne Login.</div>
        <div class="tl-s">in Arbeit ●</div>
      </div>
      <div class="tl-row future">
        <div class="tl-q"><span class="dot"></span>Q1 · 2027</div>
        <div class="tl-t">Endotoxin-Routine-Testing</div>
        <div class="tl-d">LAL-Test zusätzlich zur HPLC für jede sensible Charge Standard wird angehoben.</div>
        <div class="tl-s">geplant</div>
      </div>
      <div class="tl-row future">
        <div class="tl-q"><span class="dot"></span>Q3 · 2027</div>
        <div class="tl-t">ISO-9001 Pilot</div>
        <div class="tl-d">Vorbereitung der Qualitäts­management-Zertifizierung für den UG-Standort.</div>
        <div class="tl-s">geplant</div>
      </div>
    </div>

  </div>
</section>

<!-- ========================================================================
     KONTAKT (light)
     ==================================================================== -->
<section class="kontakt hero-ambient" id="kontakt">
  <div class="subtle-grid"></div>
  <div class="container kontakt-inner">

    <div class="kontakt-left reveal">
      <div class="mono-label gold"><span class="dot"></span>07 · KONTAKT</div>
      <h2>Forschungsfragen.<br/>Sortiments­anfragen.<br/><span class="accent">CoA-Verifikation.</span></h2>
      <p class="sub">Wir antworten innerhalb von 24 Werktags­stunden, auf Deutsch oder Englisch. Kein Bot, kein Ticket-System.</p>
      <div class="kontakt-ctas">
        <a class="btn-gold large" href="mailto:hello@chromepeps.com">
          hello@chromepeps.com
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2 7h10m0 0L8 3m4 4L8 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a class="btn-ghost large" href="#">FAQ ansehen</a>
      </div>
    </div>

    <aside class="kontakt-card reveal">
      <div class="kontakt-card-head">Firmendaten</div>
      <ul>
        <li><span>Rechtsträger</span><b>ChromePeps UG (haftungsbeschränkt)</b></li>
        <li><span>Sitz</span><b>Baden-Württemberg, DE</b></li>
        <li><span>USt-ID</span><b>DE 3xx xxx xxx</b></li>
        <li><span>HR</span><b>AG · HRB ····</b></li>
        <li><span>Analytik</span><b>Janoshik Analytical s.r.o.</b></li>
        <li><span>Versand</span><b>DHL · EU-weit</b></li>
        <li><span>Klasse</span><b>Research Use Only · §6 AMG</b></li>
      </ul>
    </aside>

  </div>

  
</section>


`;
