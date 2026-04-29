"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  FileCheck,
  ExternalLink,
  Download,
  Upload,
  RefreshCw,
  X,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  RefreshCcw,
  MinusCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
interface Product {
  id: string;
  name: string;
  slug: string;
}

interface SyncCreatedEntry {
  productName: string;
  batchNumber: string;
  reportUrl: string | null;
}
interface SyncUpdatedEntry {
  productName: string;
  batchNumber: string;
  changedFields: string[];
}
interface SyncSkippedEntry {
  productName: string;
  batchNumber: string;
  reason: string;
}
interface SyncResult {
  created: SyncCreatedEntry[];
  updated: SyncUpdatedEntry[];
  skipped: SyncSkippedEntry[];
  errors: string[];
}

interface Certificate {
  id: string;
  productId: string;
  batchNumber: string;
  testDate: string;
  purity: number | null;
  testMethod: string;
  laboratory: string;
  dosage: string | null;
  reportUrl: string | null;
  pdfUrl: string | null;
  notes: string | null;
  isPublished: boolean;
  product: Product;
}

const defaultForm = {
  productId: "",
  batchNumber: "",
  testDate: new Date().toISOString().split("T")[0],
  purity: "",
  testMethod: "HPLC",
  laboratory: "Janoshik",
  dosage: "",
  reportUrl: "",
  pdfUrl: "",
  notes: "",
  isPublished: true,
};

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingCert, setEditingCert] = useState<Certificate | null>(null);
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncDetailsOpen, setSyncDetailsOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const loadData = useCallback(async () => {
    try {
      const [certsRes, prodsRes] = await Promise.all([
        fetch("/api/admin/certificates"),
        fetch("/api/products?pageSize=100"),
      ]);
      const certsJson = await certsRes.json();
      const prodsJson = await prodsRes.json();
      if (certsJson.success) setCertificates(certsJson.data);
      if (prodsJson.success && prodsJson.data?.items) setProducts(prodsJson.data.items);
    } catch {
      setError("Fehler beim Laden der Daten.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function resetForm() {
    setForm(defaultForm);
    setEditingCert(null);
    setError("");
  }

  function openCreateDialog() {
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(cert: Certificate) {
    setEditingCert(cert);
    setForm({
      productId: cert.productId,
      batchNumber: cert.batchNumber,
      testDate: new Date(cert.testDate).toISOString().split("T")[0],
      purity: cert.purity != null ? String(cert.purity) : "",
      testMethod: cert.testMethod,
      laboratory: cert.laboratory,
      dosage: cert.dosage ?? "",
      reportUrl: cert.reportUrl ?? "",
      pdfUrl: cert.pdfUrl ?? "",
      notes: cert.notes ?? "",
      isPublished: cert.isPublished,
    });
    setError("");
    setDialogOpen(true);
  }

  async function handlePdfUpload(file: File) {
    setUploading(true);
    const formData = new FormData();
    formData.append("files", file);

    try {
      // ?as=coa: Bilder werden serverseitig in eine 1-Page-PDF gewrapped,
      // PDFs werden 1:1 unter /uploads/certificates/ abgelegt. So bleibt
      // pdfUrl in der DB immer ein .pdf-Pfad und der Mail-Anhang-Code
      // muss nichts wissen.
      const res = await fetch("/api/upload?as=coa", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (json.success && json.data[0]) {
        setForm((prev) => ({ ...prev, pdfUrl: json.data[0] }));
      } else {
        setError(json.error || "Upload fehlgeschlagen.");
      }
    } catch {
      setError("Netzwerkfehler beim Upload.");
    }
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");

    const body = {
      productId: form.productId,
      batchNumber: form.batchNumber,
      testDate: form.testDate,
      purity: form.purity ? parseFloat(form.purity) : null,
      testMethod: form.testMethod,
      laboratory: form.laboratory,
      dosage: form.dosage.trim() || null,
      reportUrl: form.reportUrl || null,
      pdfUrl: form.pdfUrl || null,
      notes: form.notes || null,
      isPublished: form.isPublished,
    };

    try {
      const isEdit = !!editingCert;
      const url = isEdit
        ? `/api/admin/certificates/${editingCert.id}`
        : "/api/admin/certificates";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Speichern fehlgeschlagen.");
        setSaving(false);
        return;
      }

      setDialogOpen(false);
      resetForm();
      await loadData();
    } catch {
      setError("Netzwerkfehler.");
    }
    setSaving(false);
  }

  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    setSyncDetailsOpen(false);
    setError("");
    try {
      const res = await fetch("/api/admin/certificates/sync", {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Sync fehlgeschlagen.");
      } else {
        const result: SyncResult = {
          created: json.data.created ?? [],
          updated: json.data.updated ?? [],
          skipped: json.data.skipped ?? [],
          errors: json.data.errors ?? [],
        };
        setSyncResult(result);
        // Panel direkt aufklappen, wenn was Neues/Aktualisiertes passiert
        // ist — Admin soll die neuen Chargen sofort sehen.
        if (result.created.length > 0 || result.updated.length > 0) {
          setSyncDetailsOpen(true);
          await loadData();
        }
      }
    } catch {
      setError("Netzwerkfehler beim Sync.");
    }
    setSyncing(false);
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/admin/certificates/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Löschen fehlgeschlagen.");
        setDeleteConfirmId(null);
        return;
      }
      setDeleteConfirmId(null);
      await loadData();
    } catch {
      setError("Netzwerkfehler.");
    }
  }

  const filtered =
    filterProduct === "all"
      ? certificates
      : certificates.filter((c) => c.productId === filterProduct);

  // Gruppieren nach productId — pro Produkt eine eigene Sub-Sektion
  // mit Produkt-Header + Charges darunter. Sortiert: Produkte
  // alphabetisch, Charges innerhalb der Gruppe nach testDate desc.
  const groupedByProduct = (() => {
    const groups = new Map<
      string,
      { product: { id: string; name: string; slug: string }; certs: typeof filtered }
    >();
    for (const cert of filtered) {
      const existing = groups.get(cert.productId);
      if (existing) {
        existing.certs.push(cert);
      } else {
        groups.set(cert.productId, {
          product: cert.product,
          certs: [cert],
        });
      }
    }
    // Innerhalb der Gruppe nach Datum desc sortieren (neueste zuerst).
    for (const g of groups.values()) {
      g.certs.sort(
        (a, b) =>
          new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
      );
    }
    // Gruppen alphabetisch nach Produkt-Name.
    return Array.from(groups.values()).sort((a, b) =>
      a.product.name.localeCompare(b.product.name),
    );
  })();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Analysezertifikate
          </h2>
          <p className="text-muted-foreground">
            COA-Verwaltung ({certificates.length} Einträge)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing}>
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Spreadsheet Sync
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Neues Zertifikat
          </Button>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm">Filter:</Label>
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Alle Produkte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Produkte</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
          {error}
        </div>
      )}

      {syncResult && (
        <div className="border border-border rounded-lg bg-background shadow-sm">
          {/* Summary-Zeile */}
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-green-50/50">
            <button
              type="button"
              onClick={() => setSyncDetailsOpen((prev) => !prev)}
              className="flex items-center gap-2 text-sm font-medium text-left flex-1"
            >
              {syncDetailsOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-green-700">
                Sync abgeschlossen:
              </span>
              <span className="flex items-center gap-1 text-green-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {syncResult.created.length} neu
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1 text-blue-700">
                <RefreshCcw className="h-3.5 w-3.5" />
                {syncResult.updated.length} aktualisiert
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <MinusCircle className="h-3.5 w-3.5" />
                {syncResult.skipped.length} unverändert/übersprungen
              </span>
              {syncResult.errors.length > 0 && (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="text-red-700">
                    {syncResult.errors.length} Fehler
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setSyncResult(null);
                setSyncDetailsOpen(false);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Schließen"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {syncDetailsOpen && (
            <div className="px-4 py-3 space-y-4 text-sm">
              {syncResult.created.length > 0 && (
                <div>
                  <h4 className="font-semibold text-green-700 mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" />
                    Neu ({syncResult.created.length})
                  </h4>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">
                            Produkt
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Charge
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Report
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncResult.created.map((e, idx) => (
                          <tr
                            key={`created-${idx}`}
                            className="border-t"
                          >
                            <td className="px-3 py-1.5">{e.productName}</td>
                            <td className="px-3 py-1.5">
                              <code className="bg-muted px-1.5 py-0.5 rounded">
                                {e.batchNumber}
                              </code>
                            </td>
                            <td className="px-3 py-1.5">
                              {e.reportUrl ? (
                                <a
                                  href={e.reportUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  Öffnen
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {syncResult.updated.length > 0 && (
                <div>
                  <h4 className="font-semibold text-blue-700 mb-2 flex items-center gap-1.5">
                    <RefreshCcw className="h-4 w-4" />
                    Aktualisiert ({syncResult.updated.length})
                  </h4>
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">
                            Produkt
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Charge
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Geänderte Felder
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncResult.updated.map((e, idx) => (
                          <tr
                            key={`updated-${idx}`}
                            className="border-t"
                          >
                            <td className="px-3 py-1.5">{e.productName}</td>
                            <td className="px-3 py-1.5">
                              <code className="bg-muted px-1.5 py-0.5 rounded">
                                {e.batchNumber}
                              </code>
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="flex flex-wrap gap-1">
                                {e.changedFields.map((f) => (
                                  <Badge
                                    key={f}
                                    variant="outline"
                                    className="text-[10px]"
                                  >
                                    {f}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {syncResult.skipped.length > 0 && (
                <div>
                  <h4 className="font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <MinusCircle className="h-4 w-4" />
                    Übersprungen ({syncResult.skipped.length})
                  </h4>
                  <div className="rounded-md border overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">
                            Produkt
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Charge
                          </th>
                          <th className="text-left px-3 py-2 font-medium">
                            Grund
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {syncResult.skipped.map((e, idx) => (
                          <tr
                            key={`skipped-${idx}`}
                            className="border-t"
                          >
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {e.productName}
                            </td>
                            <td className="px-3 py-1.5">
                              <code className="bg-muted px-1.5 py-0.5 rounded">
                                {e.batchNumber}
                              </code>
                            </td>
                            <td className="px-3 py-1.5 text-muted-foreground">
                              {e.reason}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {syncResult.errors.length > 0 && (
                <div>
                  <h4 className="font-semibold text-red-700 mb-2">
                    Fehler ({syncResult.errors.length})
                  </h4>
                  <ul className="list-disc list-inside space-y-0.5 text-xs text-red-700">
                    {syncResult.errors.map((err, idx) => (
                      <li key={`err-${idx}`}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {syncResult.created.length === 0 &&
                syncResult.updated.length === 0 &&
                syncResult.errors.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    Alle Einträge im Spreadsheet sind bereits auf dem aktuellen Stand.
                  </p>
                )}
            </div>
          )}
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produkt</TableHead>
                <TableHead>Chargennr.</TableHead>
                <TableHead>Reinheit</TableHead>
                <TableHead>Methode</TableHead>
                <TableHead>Labor</TableHead>
                <TableHead>Datum</TableHead>
                <TableHead>Links</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length > 0 ? (
                // Gruppiert: pro Produkt ein Header-Row mit Produkt-Name
                // und Charge-Count, danach die einzelnen Charges (ohne
                // erneut den Produkt-Namen pro Zeile zu wiederholen).
                groupedByProduct.flatMap((group) => [
                  <TableRow
                    key={`group-${group.product.id}`}
                    className="bg-muted/40 hover:bg-muted/40"
                  >
                    <TableCell colSpan={9} className="py-2">
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">
                          {group.product.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          · {group.certs.length}{" "}
                          {group.certs.length === 1 ? "Charge" : "Chargen"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>,
                  ...group.certs.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell />
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                            {cert.batchNumber}
                          </code>
                          {cert.dosage && (
                            <Badge
                              variant="outline"
                              className="text-[10px] font-mono uppercase tracking-wider"
                              title="Dosis-Variante dieser Charge"
                            >
                              {cert.dosage}
                            </Badge>
                          )}
                        </div>
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
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {cert.reportUrl && (
                          <a
                            href={cert.reportUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            title="Janoshik-Report"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        {cert.pdfUrl && (
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                            title="PDF"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={cert.isPublished ? "default" : "secondary"}
                      >
                        {cert.isPublished ? "Aktiv" : "Entwurf"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(cert)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {deleteConfirmId === cert.id ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDelete(cert.id)}
                            >
                              Ja
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteConfirmId(null)}
                            >
                              Nein
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setDeleteConfirmId(cert.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    </TableRow>
                  )),
                ])
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8">
                    <p className="text-muted-foreground">
                      Keine Zertifikate vorhanden.
                    </p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCert ? "Zertifikat bearbeiten" : "Neues Zertifikat"}
            </DialogTitle>
            <DialogDescription>
              {editingCert
                ? "Analysezertifikat aktualisieren."
                : "Neues Analysezertifikat hinzufügen."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>Produkt *</Label>
              <Select
                value={form.productId}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, productId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Produkt auswählen..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Chargennummer *</Label>
                <Input
                  value={form.batchNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      batchNumber: e.target.value,
                    }))
                  }
                  placeholder="z.B. CS-se5-0116"
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Dosis{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (optional)
                  </span>
                </Label>
                <Input
                  value={form.dosage}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, dosage: e.target.value }))
                  }
                  placeholder="z.B. 5mg"
                />
                <p className="text-[11px] text-muted-foreground">
                  Muss mit dem Variant-Namen übereinstimmen, damit der Mail-Versand
                  pro Variante den richtigen COA findet. Leer = gilt als Fallback
                  für alle Varianten.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Testdatum *</Label>
                <Input
                  type="date"
                  value={form.testDate}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, testDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Reinheit (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={form.purity}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, purity: e.target.value }))
                  }
                  placeholder="99.2"
                />
              </div>
              <div className="space-y-2">
                <Label>Testmethode</Label>
                <Select
                  value={form.testMethod}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, testMethod: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HPLC">HPLC</SelectItem>
                    <SelectItem value="qNMR">qNMR</SelectItem>
                    <SelectItem value="LC-MS">LC-MS</SelectItem>
                    <SelectItem value="HPLC + LC-MS">HPLC + LC-MS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Labor</Label>
                <Input
                  value={form.laboratory}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, laboratory: e.target.value }))
                  }
                  placeholder="Janoshik"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Janoshik Report-URL</Label>
              <Input
                type="url"
                value={form.reportUrl}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reportUrl: e.target.value }))
                }
                placeholder="https://janoshik.com/tests/..."
              />
            </div>

            <div className="space-y-2">
              <Label>PDF-Datei</Label>
              {form.pdfUrl ? (
                <div className="flex items-center gap-2">
                  <a
                    href={form.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate max-w-[300px]"
                  >
                    {form.pdfUrl}
                  </a>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, pdfUrl: "" }))
                    }
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-lg p-3 transition-colors">
                    <Upload className="h-4 w-4" />
                    {uploading
                      ? "Wird hochgeladen..."
                      : "PDF, PNG oder JPG auswählen"}
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                        e.target.value = "";
                      }}
                      disabled={uploading}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Max. 10 MB (PDF) bzw. 5 MB (Bild). Bilder werden
                    automatisch in eine 1-seitige PDF konvertiert, damit
                    der Mail-Anhang sauber aussieht.
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notizen</Label>
              <Textarea
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
                rows={2}
                placeholder="Optionale Anmerkungen..."
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.isPublished ? "published" : "draft"}
                onValueChange={(v: string) =>
                  setForm((prev) => ({
                    ...prev,
                    isPublished: v === "published",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Veröffentlicht</SelectItem>
                  <SelectItem value="draft">Entwurf</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                saving || !form.productId || !form.batchNumber.trim()
              }
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingCert ? "Speichern" : "Erstellen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
