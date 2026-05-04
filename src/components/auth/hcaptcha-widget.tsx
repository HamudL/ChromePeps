"use client";

import { useRef } from "react";
import HCaptcha from "@hcaptcha/react-hcaptcha";

/**
 * hCaptcha-Widget-Wrapper.
 *
 * Wird auf /login und /register erst gerendert wenn der Server signalisiert
 * `captchaRequired: true` (= 2+ fehlgeschlagene Versuche in den letzten
 * 10 Minuten). Sobald der User das Captcha löst, ruft dieses Widget
 * `onVerify(token)` auf — der Caller speichert den Token in eigenem State
 * und schickt ihn beim nächsten Submit mit.
 *
 * Reset: nach jedem fehlgeschlagenen Server-Submit (z.B. weil das Backend
 * sagt „captcha was bereits verbraucht") muss der Widget zurückgesetzt
 * werden, damit der User neu lösen kann. Dafür stellt diese Komponente
 * eine `resetRef` zur Verfügung — der Caller hält die ref und ruft
 * `resetRef.current?.resetCaptcha()` auf.
 *
 * AUDIT_REPORT_v3 §4.3 + §6 PR 4.
 */

interface Props {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  /**
   * Ref-Holder, in den die Reset-Funktion geschrieben wird. Caller hält die
   * ref und kann das Widget per `ref.current?.resetCaptcha()` auf null
   * zurücksetzen.
   */
  resetRef?: React.MutableRefObject<{ resetCaptcha: () => void } | null>;
}

export function HCaptchaWidget({ onVerify, onExpire, resetRef }: Props) {
  const widgetRef = useRef<HCaptcha>(null);

  const sitekey = process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY;
  if (!sitekey) {
    return (
      <p className="text-xs text-muted-foreground">
        ⚠ HCAPTCHA_SITE_KEY fehlt — Captcha temporär deaktiviert.
      </p>
    );
  }

  // resetRef über Ref-Forwarding-Substitut: jedes Render schreibt die
  // aktuelle Reset-Funktion in den Caller-Ref. So kann der Caller
  // `resetRef.current?.resetCaptcha()` aufrufen, ohne wirklich
  // forwardRef zu brauchen (HCaptcha-Komponente unterstützt das nicht
  // sauber für externe Refs).
  if (resetRef) {
    resetRef.current = {
      resetCaptcha: () => {
        widgetRef.current?.resetCaptcha();
      },
    };
  }

  return (
    <div className="flex justify-center">
      <HCaptcha
        ref={widgetRef}
        sitekey={sitekey}
        onVerify={onVerify}
        onExpire={() => {
          onExpire?.();
        }}
      />
    </div>
  );
}
