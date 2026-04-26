// Stub für `import "server-only"` in Vitest. Im echten Build wird
// dieser Import von Next.js zur Build-Zeit erkannt und blockiert
// jeden Versuch, das Modul ins Client-Bundle zu ziehen. In Tests
// brauchen wir das nicht — der Import muss nur resolven.
export {};
