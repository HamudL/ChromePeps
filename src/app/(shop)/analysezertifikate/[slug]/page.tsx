export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Download, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ slug: string }>;
}

async function getProductWithCertificates(slug: string) {
  return db.product.findFirst({
    where: { slug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      certificates: {
        where: { isPublished: true },
        orderBy: { testDate: "desc" },
      },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductWithCertificates(slug);
  if (!product) return {};

  return {
    title: `${product.name} — Analysezertifikate | ChromePeps`,
    description: `Drittlabor-verifizierte Analysezertifikate für ${product.name}. ${product.certificates.length} Testergebnisse verfügbar.`,
  };
}

export default async function ProductCertificatesPage({ params }: Props) {
  const { slug } = await params;
  const product = await getProductWithCertificates(slug);

  if (!product || product.certificates.length === 0) {
    notFound();
  }

  return (
    <div className="container py-8 md:py-12 max-w-4xl">
      {/* Back link */}
      <Button asChild variant="ghost" size="sm" className="mb-6 -ml-2">
        <Link href="/analysezertifikate">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Alle Analysezertifikate
        </Link>
      </Button>

      {/* Header */}
      <div className="mb-8">
        <Badge
          variant="outline"
          className="px-3 py-0.5 text-xs mb-3 inline-flex"
        >
          <ShieldCheck className="mr-1 h-3 w-3" />
          Drittlabor-verifiziert
        </Badge>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
          {product.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {product.certificates.length}{" "}
          {product.certificates.length === 1
            ? "Analysezertifikat"
            : "Analysezertifikate"}{" "}
          verfügbar
        </p>
      </div>

      {/* Certificates Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chargennr.</TableHead>
                <TableHead>Reinheit</TableHead>
                <TableHead>Testmethode</TableHead>
                <TableHead>Labor</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead className="text-right">Bericht</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {product.certificates.map((cert) => (
                <TableRow key={cert.id}>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {cert.batchNumber}
                    </code>
                  </TableCell>
                  <TableCell>
                    {cert.purity != null ? (
                      <Badge variant="secondary">{cert.purity}%</Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        ---
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{cert.testMethod}</TableCell>
                  <TableCell className="text-sm">{cert.laboratory}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(cert.testDate).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {cert.reportUrl && (
                        <a
                          href={cert.reportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Janoshik
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                      {cert.pdfUrl && (
                        <a
                          href={cert.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          PDF
                          <Download className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Info */}
      <p className="mt-6 text-xs text-muted-foreground text-center">
        Alle Analysezertifikate können unabhängig auf{" "}
        <a
          href="https://janoshik.com/verification/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          janoshik.com/verification
        </a>{" "}
        verifiziert werden.
      </p>
    </div>
  );
}
