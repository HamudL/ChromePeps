"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { useCookieConsent } from "@/store/cookie-consent-store";

const GA_MEASUREMENT_ID = "G-0N2ETR0S31";

export function GoogleAnalytics() {
  const decision = useCookieConsent((s) => s.decision);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Only load GA4 after the user explicitly accepted cookies (DSGVO)
  if (!mounted || decision !== "accepted") return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            anonymize_ip: true
          });
        `}
      </Script>
    </>
  );
}
