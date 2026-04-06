/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Minimal diagnostic page — no external deps, no DB calls, no client components.
 * If this renders, the base Next.js standalone setup works.
 * Visit: http://YOUR_IP/test
 */
export const dynamic = "force-dynamic";

export default function TestPage() {
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ color: "green", marginBottom: "1rem" }}>
        ChromePeps Base Test - OK
      </h1>
      <p>If you see this, Next.js standalone is working correctly.</p>
      <p style={{ marginTop: "1rem", color: "#666" }}>
        Server time: {new Date().toISOString()}
      </p>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>
        Node: {process.version}
      </p>
      <p style={{ marginTop: "0.5rem", color: "#666" }}>
        NODE_ENV: {process.env.NODE_ENV}
      </p>
      <hr style={{ margin: "2rem 0" }} />
      <h2>Diagnostics</h2>
      <DiagnosticChecks />
    </div>
  );
}

async function DiagnosticChecks() {
  const checks: { name: string; status: string; detail?: string }[] = [];

  // Check 1: Can we import React?
  try {
    const React = require("react");
    checks.push({ name: "react", status: "OK", detail: `v${React.version}` });
  } catch (e: unknown) {
    checks.push({ name: "react", status: "FAIL", detail: String(e) });
  }

  // Check 2: Can we import next-auth/react?
  try {
    const nextAuth = require("next-auth/react");
    const hasSessionProvider = typeof nextAuth.SessionProvider !== "undefined";
    checks.push({
      name: "next-auth/react → SessionProvider",
      status: hasSessionProvider ? "OK" : "UNDEFINED!",
      detail: hasSessionProvider
        ? typeof nextAuth.SessionProvider
        : "SessionProvider is undefined — this causes Error #130",
    });
  } catch (e: unknown) {
    checks.push({ name: "next-auth/react", status: "FAIL", detail: String(e) });
  }

  // Check 3: framer-motion (REMOVED from project — was causing Error #130)
  checks.push({
    name: "framer-motion",
    status: "REMOVED",
    detail: "Replaced with CSS animations (was failing: createContext not a function)",
  });

  // Check 4: Can we import @radix-ui/react-dialog?
  try {
    const dialog = require("@radix-ui/react-dialog");
    const hasRoot = typeof dialog.Root !== "undefined";
    checks.push({
      name: "@radix-ui/react-dialog → Root",
      status: hasRoot ? "OK" : "UNDEFINED!",
      detail: hasRoot
        ? "Root available"
        : `exports: ${Object.keys(dialog).join(", ")}`,
    });
  } catch (e: unknown) {
    checks.push({
      name: "@radix-ui/react-dialog",
      status: "FAIL",
      detail: String(e),
    });
  }

  // Check 5: Can we import @radix-ui/react-dropdown-menu?
  try {
    const dd = require("@radix-ui/react-dropdown-menu");
    const hasRoot = typeof dd.Root !== "undefined";
    checks.push({
      name: "@radix-ui/react-dropdown-menu → Root",
      status: hasRoot ? "OK" : "UNDEFINED!",
      detail: hasRoot
        ? "Root available"
        : `exports: ${Object.keys(dd).join(", ")}`,
    });
  } catch (e: unknown) {
    checks.push({
      name: "@radix-ui/react-dropdown-menu",
      status: "FAIL",
      detail: String(e),
    });
  }

  // Check 6: Can we import @radix-ui/react-slot?
  try {
    const slot = require("@radix-ui/react-slot");
    const hasSlot = typeof slot.Slot !== "undefined";
    checks.push({
      name: "@radix-ui/react-slot → Slot",
      status: hasSlot ? "OK" : "UNDEFINED!",
      detail: hasSlot
        ? "Slot available"
        : `exports: ${Object.keys(slot).join(", ")}`,
    });
  } catch (e: unknown) {
    checks.push({
      name: "@radix-ui/react-slot",
      status: "FAIL",
      detail: String(e),
    });
  }

  // Check 7: Can we import @radix-ui/react-separator?
  try {
    const sep = require("@radix-ui/react-separator");
    const hasRoot = typeof sep.Root !== "undefined";
    checks.push({
      name: "@radix-ui/react-separator → Root",
      status: hasRoot ? "OK" : "UNDEFINED!",
      detail: hasRoot
        ? "Root available"
        : `exports: ${Object.keys(sep).join(", ")}`,
    });
  } catch (e: unknown) {
    checks.push({
      name: "@radix-ui/react-separator",
      status: "FAIL",
      detail: String(e),
    });
  }

  // Check 8: Prisma
  try {
    const { PrismaClient } = require("@prisma/client");
    const client = new PrismaClient();
    await client.$connect();
    await client.$disconnect();
    checks.push({ name: "@prisma/client → connect", status: "OK" });
  } catch (e: unknown) {
    checks.push({
      name: "@prisma/client",
      status: "FAIL",
      detail: String(e),
    });
  }

  return (
    <table
      style={{
        borderCollapse: "collapse",
        width: "100%",
        marginTop: "1rem",
      }}
    >
      <thead>
        <tr>
          <th style={thStyle}>Module</th>
          <th style={thStyle}>Status</th>
          <th style={thStyle}>Detail</th>
        </tr>
      </thead>
      <tbody>
        {checks.map((c) => (
          <tr key={c.name}>
            <td style={tdStyle}>{c.name}</td>
            <td
              style={{
                ...tdStyle,
                color: c.status === "OK" ? "green" : "red",
                fontWeight: "bold",
              }}
            >
              {c.status}
            </td>
            <td style={{ ...tdStyle, fontSize: "0.85rem", color: "#666" }}>
              {c.detail ?? "—"}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0.5rem",
  borderBottom: "2px solid #333",
};

const tdStyle: React.CSSProperties = {
  padding: "0.5rem",
  borderBottom: "1px solid #ddd",
};
