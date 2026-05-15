/**
 * Design-HTML der /ueber-uns Seite, 1:1 aus dem Claude-Design-Handoff
 * ("Über uns-handoff.zip" → ueber-uns.html), in eine getrennte Datei
 * extrahiert, weil ~25 KB Markup die page.tsx sonst aufblähen würden.
 *
 * Wird in page.tsx via dangerouslySetInnerHTML in den .ueber-uns-design
 * Wrapper injected. Die scoped CSS (ueber-uns.css) und der Client-Side
 * JS (interactions.tsx) docken über IDs/Klassen an dieses Markup an.
 *
 * Anpassungen ggü. Quell-HTML:
 *   - <head>, <body>, <script src="ueber-uns.js"> entfernt (Next handled)
 *   - <footer class="foot"> entfernt (wir behalten den Site-Footer aus dem
 *     (shop)-Layout statt dem Design-eigenen)
 *   - assets/vial/ Pfade auf /ueber-uns/vial/ umgeschrieben (public-Pfad)
 */

export const DESIGN_BODY_HTML = `<!-- ========== NAV ========== -->
<nav class="nav" id="nav">
  <div class="nav-inner">
    <a class="brand" href="#top" aria-label="ChromePeps Startseite">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22">
          <defs>
            <linearGradient id="brandGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stop-color="#e9c97a" />
              <stop offset="50%" stop-color="#c89a2a" />
              <stop offset="100%" stop-color="#8c6712" />
            </linearGradient>
          </defs>
          <path d="M16 2L29 9v14L16 30 3 23V9z" fill="none" stroke="url(#brandGrad)" stroke-width="1.5"/>
          <path d="M11 12h8l-2 4h-4l4 6h-3l-5-7z" fill="url(#brandGrad)"/>
        </svg>
      </span>
      <span class="brand-word">ChromePeps</span>
    </a>
    <div class="nav-links">
      <a href="#manifest">Manifest</a>
      <a href="#prozess">Prozess</a>
      <a href="#labor">Labor</a>
      <a href="#zahlen">Zahlen</a>
      <a href="#roadmap">Roadmap</a>
    </div>
    <a class="nav-cta" href="#kontakt">
      <span>Kontakt</span>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8m0 0L6.5 2.5M10 6L6.5 9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </a>
  </div>
  <div class="nav-progress"><div id="nav-progress-bar"></div></div>
</nav>

<!-- ========== HERO ========== -->
<section class="hero" id="top">
  <div class="hero-grain" aria-hidden="true"></div>
  <div class="hero-grid" aria-hidden="true"></div>
  <div class="ambient-orb orb-1" aria-hidden="true"></div>
  <div class="ambient-orb orb-2" aria-hidden="true"></div>

  <div class="hero-inner">
    <div class="hero-copy">
      <div class="mono-label hero-mono">
        <span class="dot"></span>EST. TODO:SELF &nbsp;·&nbsp; (STANDORT)TODO:SELF·&nbsp; STAND MAI 2026
      </div>
      <h1 class="hero-title">
        <span class="line">Reinheit</span>
        <span class="line muted" style="width: 648px">ist keine</span>
        <span class="line chrome" style="opacity: 0">Behauptung.</span>
      </h1>
      <p class="hero-sub">
        ChromePeps ist ein deutsches Labor-Supply für Forschungspeptide. Jede Charge wird durch
        Janoshik Labs per HPLC analysiert, bevor sie das Lager verlässt. Kein Marketing-Filter
        zwischen Forscher und Chromatogramm.
      </p>
      <div class="hero-ctas">
        <a class="btn-gold" href="#labor" data-magnet>
          <span>Wie wir testen</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10m0 0L8 3m4 4L8 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a class="btn-ghost-dark" href="#manifest" data-magnet>
          <span>Unser Manifest</span>
        </a>
      </div>

      <div class="hero-meta">
        <div class="hero-meta-item">
          <div class="hero-meta-num" data-count="99.34" data-decimals="2" data-suffix="%">0</div>
          <div class="hero-meta-lbl">Ø HPLC-Reinheit · 2026</div>
        </div>
        <div class="hero-meta-sep"></div>
        <div class="hero-meta-item">
          <div class="hero-meta-num">TODO</div>
          <div class="hero-meta-lbl">Chargen freigegeben</div>
        </div>
        <div class="hero-meta-sep"></div>
        <div class="hero-meta-item">
          <div class="hero-meta-num" data-count="100" data-suffix="%">0</div>
          <div class="hero-meta-lbl">3rd-Party verifiziert</div>
        </div>
      </div>
    </div>

    <div class="hero-vial-wrap">
      <div class="vial-stage" id="heroVialStage">
        <div class="vial-backdrop" aria-hidden="true">
          <div class="vial-disc"></div>
          <div class="vial-scan"></div>
        </div>
        <div class="vial-3d" id="vial3d">
          <div class="vial-glow"></div>
          <img class="vial-img" src="/ueber-uns/vial/frame_01.webp" alt="ChromePeps Retatrutide Vial" />
          <div class="vial-sheen" aria-hidden="true"></div>
          <div class="vial-shadow"></div>
        </div>
        <div class="vial-callouts" aria-hidden="true">
          <div class="callout c-top">
            <span class="line"></span>
            <span class="label"><b>10ml</b>· clear borosilicate</span>
          </div>
          <div class="callout c-mid">
            <span class="line"></span>
            <span class="label"><b>HPLC ≥ 98%</b>· Janoshik verified</span>
          </div>
          <div class="callout c-bot">
            <span class="line"></span>
            <span class="label"><b>LOT-2026-K83</b>· −24°C cold-chain</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ticker -->
  <div class="ticker" aria-hidden="true">
    <div class="ticker-track">
      <span>HPLC ≥ 98%</span><span>·</span>
      <span>JANOSHIK LABS — INDEPENDENT</span><span>·</span>
      <span>COA PER ORDER</span><span>·</span>
      <span>COLD CHAIN</span><span>·</span>
      <span>GDPR · DSGVO</span><span>·</span>
      <span>RESEARCH USE ONLY</span><span>·</span>
      <span>LOT-TRACED · END TO END</span><span>·</span>
      <span>HPLC ≥ 98%</span><span>·</span>
      <span>JANOSHIK LABS — INDEPENDENT</span><span>·</span>
      <span>COA PER ORDER</span><span>·</span>
      <span>COLD CHAIN</span><span>·</span>
      <span>GDPR · DSGVO</span><span>·</span>
      <span>RESEARCH USE ONLY</span><span>·</span>
      <span>LOT-TRACED · END TO END</span><span>·</span>
    </div>
  </div>
</section>

<!-- ========== MANIFEST ========== -->
<section class="manifest" id="manifest">
  <div class="container">
    <div class="manifest-head reveal">
      <div class="mono-label dark"><span class="num">01</span> &nbsp;/&nbsp; MANIFEST</div>
    </div>
    <div class="manifest-grid">
      <div class="manifest-text reveal">
        <p class="lede">
          Wir bauen ChromePeps für Forschende, die ein <em>Chromatogramm</em> lesen
          können  und für alle, die es lernen wollen.
        </p>
        <p>
          Der Markt für Forschungspeptide ist gefüllt mit Anbietern, die das Wort
          „Reinheit" als Schlagwort verwenden. Wir behandeln es als Messwert. Jede
          Charge, die unser Lager verlässt, hat einen Datensatz: Massenspektrum, Lot-Nummer, Test-Datum.
        </p>
        <p>
          Diese Daten gehören nicht uns. Sie gehören in jede Bestellung, in jede
          E-Mail, in jeden öffentlich verifizierbaren Janoshik-Eintrag. Transparenz
          ist die teuerste Marketing-Strategie — und die einzige, die unter HPLC
          standhält.
        </p>
      </div>
      <aside class="manifest-side reveal">
        <ul class="meta-list">
          <li><span class="k">Gegründet</span><span class="v">TODO:self</span></li>
          <li><span class="k">Rechtsform</span><span class="v">UG (haftungsbeschränkt)</span></li>
          <li><span class="k">Sitz</span><span class="v">BaWü, DE</span></li>
          <li><span class="k">Lagerung</span><span class="v">TODO:self</span></li>
          <li><span class="k">Analytik</span><span class="v">Janoshik Labs · HPLC/MS</span></li>
          <li><span class="k">Versand</span><span class="v">DE + EU · ~24 h Handling</span></li>
          <li><span class="k">Zahlung</span><span class="v">Stripe · SEPA · Crypto</span></li>
          <li><span class="k">Klasse</span><span class="v">Research Use Only</span></li>
        </ul>
      </aside>
    </div>
  </div>
</section>

<!-- ========== SCROLL-LOCKED VIAL STORY ========== -->
<section class="story" id="story">
  <div class="story-track" id="storyTrack">
    <div class="story-sticky">
      <div class="story-bg-grid" aria-hidden="true"></div>
      <div class="story-vial">
        <div class="story-vial-disc" aria-hidden="true"></div>
        <div class="story-vial-glow"></div>
        <div class="story-vial-frame" id="storyVialFrame">
          <div class="story-scanline" aria-hidden="true"><i></i></div>
          <img id="storyVialImg" src="/ueber-uns/vial/frame_01.webp" alt="ChromePeps Vial" />
          <div class="story-vial-sheen" aria-hidden="true"></div>
          <!-- inline annotations that fade per panel -->
          <div class="vial-anno a-1"><span class="dot"></span><span class="line"></span><b>STERIL · NEUTRAL VERPACKT</b></div>
          <div class="vial-anno a-2"><span class="dot"></span><span class="line"></span><b>HPLC · 99.4&thinsp;%</b></div>
          <div class="vial-anno a-3"><span class="dot"></span><span class="line"></span><b>LOT-2026-K83</b></div>
          <div class="vial-anno a-4"><span class="dot"></span><span class="line"></span><b>RESEARCH USE ONLY</b></div>
        </div>
        <div class="story-progress">
          <span id="storyAngle">01 / 04</span>
          <span class="story-progress-bar"><i id="storyProgressFill"></i></span>
        </div>
      </div>

      <div class="story-panels">
        <article class="story-panel active" data-panel="0">
          <div class="mono-label gold">02 / VOM ROHSTOFF ZUR CHARGE</div>
          <h2>Jede&nbsp;Charge erhält eine Identität, bevor sie ein Etikett bekommt.</h2>
          <p>
            Eingangs­wiegung, Sichtprüfung der Lyophilisat-Struktur, eindeutige Lot-Nummer.....TODO
          </p>
          <dl class="panel-data">
            <div><dt>Lot-ID-Format</dt><dd>CP-TODO</dd></div>
            <div><dt>Quarantäne-Zone</dt><dd>−24 °C, getrennt</dd></div>
            <div><dt>Rückverfolgung</dt><dd>End-to-End</dd></div>
          </dl>
        </article>

        <article class="story-panel" data-panel="1">
          <div class="mono-label gold">03 / UNABHÄNGIGE ANALYTIK</div>
          <h2>Wir testen nicht selbst. Das ist der Punkt.</h2>
          <p>
            Jede Charge geht in einer Probe an
            <em>Janoshik Analytical</em>, ein unabhängiges Labor mit
            öffentlicher Datenbank. HPLC bestimmt die Reinheit, Massen­spektrometrie
            verifiziert die Identität. Das Ergebnis ist nicht „unser" Ergebnis. Es
            ist Janoshiks.
          </p>
          <dl class="panel-data">
            <div><dt>Methode</dt><dd>RP-HPLC + ESI-MS</dd></div>
            <div><dt>Schwelle</dt><dd>≥ 98 % zur Freigabe</dd></div>
            <div><dt>Verifikation</dt><dd>janoshik.com/verify</dd></div>
          </dl>
        </article>

        <article class="story-panel" data-panel="2">
          <div class="mono-label gold">04 / FREIGABE &amp; VERSAND</div>
          <h2>Eine Charge wird erst freigegeben, wenn die Daten es erlauben.</h2>
          <p>
            Reinheit ≥ 98 %, Identität bestätigt. Erst dann verlässt die Charge das
            Lager. Versand in neutraler, isolierter Verpackung. Das passende CoA
            wird mit der Bestätigungs E-Mail mitgesendet, automatisiert, ohne Anfrage.
          </p>
          <dl class="panel-data">
            <div><dt>Handling</dt><dd>≤ 24 h ab Eingang</dd></div>
            <div><dt>Verpackung</dt><dd>neutral · isoliert</dd></div>
            <div><dt>CoA-Versand</dt><dd>automatisch · per Order</dd></div>
          </dl>
        </article>

        <article class="story-panel" data-panel="3">
          <div class="mono-label gold">05 / WAS WIR NICHT SIND</div>
          <h2>Kein Apotheker, kein Arzt, kein Wundermittel-Verkäufer.</h2>
          <p>
            ChromePeps liefert <em>Research Use Only</em>-Material. Wir geben
            keine medizinische Beratung, keine Dosierungs­empfehlungen, keine
            Heilversprechen. Unsere Kunden sind Labore, Forschende, Hochschulen
            und Menschen, die wissen, wozu HPLC-Daten da sind: für die Wissenschaft,
            nicht für Werbung.
          </p>
          <dl class="panel-data">
            <div><dt>Klasse</dt><dd>RUO · §6 GMP-nicht</dd></div>
            <div><dt>Beratung</dt><dd>technisch, keine medizinische</dd></div>
            <div><dt>Datenschutz</dt><dd>DSGVO · cookieless</dd></div>
          </dl>
        </article>
      </div>
    </div>
  </div>
</section>

<!-- ========== QUALITY PROCESS TIMELINE ========== -->
<section class="prozess" id="prozess">
  <div class="container">
    <header class="section-head reveal">
      <div class="mono-label gold">06 / DER PROZESS</div>
      <h2 class="section-title">Vom Eingang zum Etikett — in vier verifizierten Schritten.</h2>
      <p class="section-sub">Keine Abkürzungen. Keine Ausnahmen. Keine „Sonderchargen".</p>
    </header>

    <ol class="timeline">
      <li class="step reveal" data-step="01">
        <div class="step-num" style="margin: 13px 0px 22px">01</div>
        <div class="step-line" style="margin: 0px"></div>
        <div class="step-body">
          <h3>Wareneingang &amp; Lot-Anlage</h3>
          <p>Charge wird gewogen, fotografiert, mit Lot-ID versehen und in den −24°C Quarantäne-Schrank eingelagert.</p>
          <div class="step-tags">
            <span>≤ 60 min</span><span>−24 °C</span><span>Lot-ID</span>
          </div>
        </div>
      </li>

      <li class="step reveal" data-step="02">
        <div class="step-num" style="margin: 13px 0px 22px">02</div>
        <div class="step-line"></div>
        <div class="step-body">
          <h3>Janoshik HPLC-Analyse</h3>
          <p>Versiegelte Probe geht an Janoshik Analytical. RP-HPLC bestimmt Reinheit, ESI-MS bestätigt Identität gegen Referenz.</p>
          <div class="step-tags">
            <span>RP-HPLC</span><span>ESI-MS</span><span>3rd party</span>
          </div>
        </div>
      </li>

      <li class="step reveal" data-step="03">
        <div class="step-num" style="margin: 13px 0px 22px">03</div>
        <div class="step-line"></div>
        <div class="step-body">
          <h3>Freigabe-Entscheidung</h3>
          <p>≥ 98 % Reinheit + bestätigte Identität = Freigabe. Bei Abweichung: Charge wird zurückgewiesen, nicht „angepasst".</p>
          <div class="step-tags">
            <span>≥ 98 %</span><span>binary pass/fail</span>
          </div>
        </div>
      </li>

      <li class="step reveal last" data-step="04">
        <div class="step-num" style="margin: 13px 0px 22px">04</div>
        <div class="step-line"></div>
        <div class="step-body">
          <h3>Versand mit CoA</h3>
          <p>Neutrale, isolierte Verpackung mit Kühlpacks. Das CoA der konkreten Lot-Nummer kommt automatisch mit der Versandbestätigung.</p>
          <div class="step-tags">
            <span>24 h Handling</span><span>CoA · auto</span><span>EU-weit</span>
          </div>
        </div>
      </li>
    </ol>
  </div>
</section>

<!-- ========== CHROMATOGRAM SECTION ========== -->
<section class="labor" id="labor">
  <div class="container">
    <div class="labor-grid">
      <div class="labor-copy reveal">
        <div class="mono-label gold">07 / EVIDENZ · NICHT MARKETING</div>
        <h2 class="section-title light">So sieht ein „passed" Lot aus.</h2>
        <p class="labor-lead">
          Echtes HPLC-Chromatogramm einer ChromePeps-Charge. Der Haupt-Peak
          bei <span class="tab">t<sub>R</sub> = 5,82 min</span> ist das
          Zielpeptid. Die Fläche unter der Kurve im Verhältnis zur Gesamt­fläche
          gibt die Reinheit: <b class="gold">99,41 %</b>.
        </p>
        <ul class="labor-points">
          <li><span class="bullet"></span><div><b>Säule:</b> C18, 4,6 × 250 mm, 5 µm</div></li>
          <li><span class="bullet"></span><div><b>Fluss:</b> 1,0 ml/min · UV 220 nm</div></li>
          <li><span class="bullet"></span><div><b>Gradient:</b> 0,1 % TFA / Acetonitril</div></li>
          <li><span class="bullet"></span><div>Referenz: Janoshik LOT-</div></li>
        </ul>
        <a class="btn-gold inline" href="#" data-magnet>
          <span>CoA-Beispiel ansehen</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10m0 0L8 3m4 4L8 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>

      <div class="hplc reveal">
        <div class="hplc-header">
          <div class="hplc-title">
            <span class="dot live"></span>
            <span>HPLC · RETATRUTIDE · LOT-</span>
          </div>
          <div class="hplc-stat">
            <span>PURITY</span><b>%</b>
          </div>
        </div>
        <div class="hplc-stage">
          <svg id="hplcSvg" viewBox="0 0 600 300" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="peakFill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="rgba(232,193,80,0.55)" />
                <stop offset="100%" stop-color="rgba(232,193,80,0)" />
              </linearGradient>
              <linearGradient id="peakLine" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="#f4d97a" />
                <stop offset="100%" stop-color="#b9851c" />
              </linearGradient>
            </defs>
            <!-- grid -->
            <g class="hplc-grid">
              <line x1="0" x2="600" y1="60" y2="60"/>
              <line x1="0" x2="600" y1="120" y2="120"/>
              <line x1="0" x2="600" y1="180" y2="180"/>
              <line x1="0" x2="600" y1="240" y2="240"/>
              <line x1="100" x2="100" y1="0" y2="300"/>
              <line x1="200" x2="200" y1="0" y2="300"/>
              <line x1="300" x2="300" y1="0" y2="300"/>
              <line x1="400" x2="400" y1="0" y2="300"/>
              <line x1="500" x2="500" y1="0" y2="300"/>
            </g>
            <!-- baseline -->
            <line class="hplc-baseline" x1="0" x2="600" y1="270" y2="270"/>
            <!-- peak path -->
            <path id="peakArea" d="" fill="url(#peakFill)" opacity="0"/>
            <path id="peakStroke" d="" fill="none" stroke="url(#peakLine)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"
                  stroke-dasharray="0 9999" />
            <!-- markers -->
            <g id="peakMarker" opacity="0">
              <line x1="280" x2="280" y1="40" y2="270" stroke="rgba(244,217,122,0.45)" stroke-dasharray="3 4"/>
              <text x="286" y="54" class="hplc-tag">tR 5.82 min</text>
              <text x="286" y="68" class="hplc-tag dim">99.41 %</text>
            </g>
            <g id="impurityMarker" opacity="0">
              <line x1="430" x2="430" y1="230" y2="270" stroke="rgba(255,255,255,0.18)" stroke-dasharray="3 4"/>
              <text x="436" y="240" class="hplc-tag dim">0.31 %</text>
            </g>
          </svg>
          <div class="hplc-axis-x">
            <span>0</span><span>2</span><span>4</span><span>6</span><span>8</span><span>10 min</span>
          </div>
          <div class="hplc-axis-y">
            <span>mAU</span>
          </div>
        </div>
        <div class="hplc-footer">
          <div><span class="lbl">SAMPLE</span><span class="val"></span></div>
          <div><span class="lbl">METHOD</span><span class="val">RP-HPLC 220nm</span></div>
          <div><span class="lbl">RUN</span><span class="val"></span></div>
          <div><span class="lbl">STATUS</span><span class="val pass">PASS</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- ========== ZAHLEN / METRICS ========== -->
<section class="zahlen" id="zahlen">
  <div class="container">
    <header class="section-head reveal">
      <div class="mono-label gold">08 / IN ZAHLEN</div>
      <h2 class="section-title">Operationelle Realität, 2026.</h2>
      <p class="section-sub">Werte aus dem laufenden Janoshik-Verifikations­fluss, keine Hochrechnungen.</p>
    </header>

    <div class="metrics-grid">
      <div class="metric reveal">
        <div class="metric-num"><span data-count="99.34" data-decimals="2">0</span><small>%</small></div>
        <div class="metric-lbl">Ø HPLC-Reinheit · 12 Monate</div>
        <div class="metric-sub">über alle Janoshik-getesteten Chargen</div>
      </div>
      <div class="metric reveal">
        <div class="metric-num"><span data-text="TODO">TODO</span></div>
        <div class="metric-lbl">Chargen freigegeben</div>
        <div class="metric-sub">seit Gründung</div>
      </div>
      <div class="metric reveal">
        <div class="metric-num"><span data-count="7">0</span><small>%</small></div>
        <div class="metric-lbl">Reject-Rate</div>
        <div class="metric-sub">zurückgewiesen, nicht „angepasst"</div>
      </div>
      <div class="metric reveal">
        <div class="metric-num"><span data-count="22">0</span><small>h</small></div>
        <div class="metric-lbl">Ø Handling-Zeit</div>
        <div class="metric-sub">Bestelleingang → Versand</div>
      </div>
      <div class="metric reveal">
        <div class="metric-num"><span data-count="0">0</span></div>
        <div class="metric-lbl">Re-Calls</div>
        <div class="metric-sub">Charge zurückgerufen nach Freigabe</div>
      </div>
      <div class="metric reveal">
        <div class="metric-num"><span data-count="100" >0</span><small>%</small></div>
        <div class="metric-lbl">CoA-Coverage</div>
        <div class="metric-sub">jede Bestellung · automatisch</div>
      </div>
    </div>
  </div>
</section>

<!-- ========== ROADMAP ========== -->
<section class="roadmap" id="roadmap">
  <div class="container">
    <header class="section-head reveal">
      <div class="mono-label dark">09 / ROADMAP</div>
      <h2 class="section-title">Was als Nächstes verifizierbar wird.</h2>
    </header>

    <div class="rm-grid">
      <div class="rm-col reveal">
        <div class="rm-tag done">Q2 2024 · ✓</div>
        <h3>Gründung &amp; erstes Sortiment</h3>
        <p>UG-Gründung in München. Vier Kern-Peptide gelistet. Erster Janoshik-Vertrag.</p>
      </div>
      <div class="rm-col reveal">
        <div class="rm-tag done">Q4 2024 · ✓</div>
        <h3>Lot-Tracking-System</h3>
        <p>Eigenes Tooling: Lot-ID, CoA-Mapping, automatisierter CoA-Versand pro Bestellung.</p>
      </div>
      <div class="rm-col reveal">
        <div class="rm-tag done">Q3 2025 · ✓</div>
        <h3>Cold-Chain &amp; EU-Versand</h3>
        <p>Isolierte Verpackung, 24h-Handling, Versand in DE und ausgewählten EU-Ländern.</p>
      </div>
      <div class="rm-col reveal">
        <div class="rm-tag done" style="background-color: rgb(253, 244, 216)">Q3 2026 ·</div>
        <h3>Öffentliche CoA-Datenbank</h3>
        <p>Jede freigegebene Lot-Nummer ist auf chromepeps.com direkt verlinkbar — ohne Bestellung.</p>
      </div>
      <div class="rm-col reveal current">
        <div class="rm-tag now" style="background-color: rgb(237, 234, 232); color: rgb(87, 73, 66)">Q4 2026</div>
        <h3>Endotoxin-Routine-Testing</h3>
        <p>LAL-Test zusätzlich zur HPLC für jede sensible Charge — Standard wird angehoben.</p>
      </div>
      <div class="rm-col reveal future">
        <div class="rm-tag next">Q2 2027</div>
        <h3>ISO-9001 Pilot</h3>
        <p>Vorbereitung der Qualitätsmanagement-Zertifizierung für den UG-Standort.</p>
      </div>
      </div>
    </div>
  </div>
</section>

<!-- ========== CTA / KONTAKT ========== -->
<section class="kontakt" id="kontakt">
  <div class="kontakt-grain" aria-hidden="true"></div>
  <div class="ambient-orb orb-3" aria-hidden="true"></div>
  <div class="container kontakt-inner">
    <div class="kontakt-left reveal">
      <div class="mono-label gold">10 / KONTAKT</div>
      <h2 class="kontakt-title">
        <span class="line">Forschungsfragen,</span>
        <span class="line chrome">Sortimentsanfragen,</span>
        <span class="line muted-dark">CoA-Verifikation.</span>
      </h2>
      <p class="kontakt-sub">
        Wir antworten innerhalb von 24 Werktagsstunden, auf Deutsch oder Englisch.
        Kein Bot, keine Ticket-Warteschleife.
      </p>
      <div class="kontakt-actions">
        <a class="btn-gold large" href="mailto:hello@chromepeps.com" data-magnet>
          <span>hello@chromepeps.com</span>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10m0 0L8 3m4 4L8 11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <a class="btn-ghost-dark large" href="#" data-magnet>
          <span>FAQ ansehen</span>
        </a>
      </div>
    </div>

    <div class="kontakt-right reveal">
      <div class="kontakt-card">
        <div class="kontakt-card-head">
          <span class="mono-label gold">FIRMENDATEN</span>
        </div>
        <ul class="kontakt-list">
          <li><span>Rechtsträger</span><b>ChromePeps UG (haftungsbeschränkt)</b></li>
          <li><span>Sitz</span><b>München, Deutschland</b></li>
          <li><span>USt-ID</span><b>DE 3xx xxx xxx</b></li>
          <li><span>Handelsregister</span><b>AG München HRB ····</b></li>
          <li><span>Analytik-Partner</span><b>Janoshik Analytical</b></li>
          <li><span>Versand-Partner</span><b>DHL · UPS</b></li>
        </ul>
      </div>
    </div>
  </div>

  </section>

`;
