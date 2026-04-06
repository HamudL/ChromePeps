import { APP_NAME, RESEARCH_DISCLAIMER } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <h1 className="text-5xl font-bold tracking-tight chrome-text">
          {APP_NAME}
        </h1>
        <p className="text-lg text-muted-foreground">
          Premium research peptides with verified purity.
        </p>
        <p className="text-xs text-muted-foreground/70 border-t pt-4">
          {RESEARCH_DISCLAIMER}
        </p>
      </div>
    </main>
  );
}
