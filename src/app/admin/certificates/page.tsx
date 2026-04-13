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

interface Certificate {
  id: string;
  productId: string;
  batchNumber: string;
  testDate: string;
  purity: number | null;
  testMethod: string;
  laboratory: string;
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
  const [syncResult, setSyncResult] = useState<string | null>(null);
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
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const json = await res.json();
      if (json.success && json.data[0]) {
        setForm((prev) => ({ ...prev, pdfUrl: json.data[0] }));
      } else {
        setError(json.error || "PDF-Upload fehlgeschlagen.");
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
    setError("");
    try {
      const res = await fetch("/api/admin/certificates/sync", {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Sync fehlgeschlagen.");
      } else {
        const { imported, skipped, errors: syncErrors } = json.data;
        setSyncResult(
          `${imported} importiert, ${skipped} übersprungen${syncErrors?.length ? `, ${syncErrors.length} Fehler` : ""}`
        );
        if (imported > 0) await loadData();
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
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg p-3">
          Sync abgeschlossen: {syncResult}
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
                filtered.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileCheck className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {cert.product.name}
                        </span>
                      </div>
                    </TableCell>
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
                ))
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

            <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground border border-dashed rounded-lg p-3 transition-colors">
                    <Upload className="h-4 w-4" />
                    {uploading ? "Wird hochgeladen..." : "PDF auswählen (max 10MB)"}
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePdfUpload(file);
                        e.target.value = "";
                      }}
                      disabled={uploading}
                    />
                  </label>
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
