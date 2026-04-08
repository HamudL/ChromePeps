"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageUpload } from "@/components/admin/image-upload";

interface Category {
  id: string;
  name: string;
  slug: string;
}

export default function NewProductPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);

  const [form, setForm] = useState({
    name: "",
    sku: "",
    description: "",
    shortDesc: "",
    priceEur: "",
    categoryId: "",
    stock: "0",
    isActive: true,
    purity: "",
    molecularWeight: "",
    sequence: "",
    casNumber: "",
    storageTemp: "",
    form: "",
    weight: "",
  });

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setCategories(json.data);
      })
      .catch(() => {});
  }, []);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const priceInCents = Math.round(parseFloat(form.priceEur) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setError("Please enter a valid price.");
      setLoading(false);
      return;
    }

    const images = imageUrls
      .filter((url) => url.trim() !== "")
      .map((url, i) => ({ url: url.trim(), alt: form.name, sortOrder: i }));

    const body = {
      name: form.name,
      sku: form.sku,
      description: form.description,
      shortDesc: form.shortDesc || undefined,
      priceInCents,
      categoryId: form.categoryId,
      stock: parseInt(form.stock) || 0,
      isActive: form.isActive,
      purity: form.purity || undefined,
      molecularWeight: form.molecularWeight || undefined,
      sequence: form.sequence || undefined,
      casNumber: form.casNumber || undefined,
      storageTemp: form.storageTemp || undefined,
      form: form.form || undefined,
      weight: form.weight || undefined,
      images: images.length > 0 ? images : undefined,
    };

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to create product.");
        setLoading(false);
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link href="/admin/products">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">New Product</h2>
          <p className="text-muted-foreground">
            Add a new product to your catalog.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Product name, SKU, and descriptions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  required
                  placeholder="e.g., BPC-157 5mg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  required
                  placeholder="e.g., CP-BPC157-5"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField("description", e.target.value)}
                required
                rows={5}
                placeholder="Full product description..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDesc">Short Description</Label>
              <Input
                id="shortDesc"
                value={form.shortDesc}
                onChange={(e) => updateField("shortDesc", e.target.value)}
                maxLength={300}
                placeholder="Brief description for product cards (max 300 chars)"
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
            <CardDescription>
              Set the product price and stock level.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="priceEur">Price (EUR) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    {"\u20AC"}
                  </span>
                  <Input
                    id="priceEur"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={form.priceEur}
                    onChange={(e) => updateField("priceEur", e.target.value)}
                    required
                    className="pl-8"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock">Stock *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={(e) => updateField("stock", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Category *</Label>
                <Select
                  value={form.categoryId}
                  onValueChange={(v) => updateField("categoryId", v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scientific Details */}
        <Card>
          <CardHeader>
            <CardTitle>Scientific Details</CardTitle>
            <CardDescription>
              Optional peptide-specific information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purity">Purity</Label>
                <Input
                  id="purity"
                  value={form.purity}
                  onChange={(e) => updateField("purity", e.target.value)}
                  placeholder="e.g., >98%"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="molecularWeight">Molecular Weight</Label>
                <Input
                  id="molecularWeight"
                  value={form.molecularWeight}
                  onChange={(e) =>
                    updateField("molecularWeight", e.target.value)
                  }
                  placeholder="e.g., 1419.53 g/mol"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="casNumber">CAS Number</Label>
                <Input
                  id="casNumber"
                  value={form.casNumber}
                  onChange={(e) => updateField("casNumber", e.target.value)}
                  placeholder="e.g., 137525-51-0"
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageTemp">Storage Temperature</Label>
                <Input
                  id="storageTemp"
                  value={form.storageTemp}
                  onChange={(e) => updateField("storageTemp", e.target.value)}
                  placeholder="e.g., -20C"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form">Form</Label>
                <Input
                  id="form"
                  value={form.form}
                  onChange={(e) => updateField("form", e.target.value)}
                  placeholder="e.g., Lyophilized Powder"
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={form.weight}
                  onChange={(e) => updateField("weight", e.target.value)}
                  placeholder="e.g., 5mg"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sequence">Sequence</Label>
              <Textarea
                id="sequence"
                value={form.sequence}
                onChange={(e) => updateField("sequence", e.target.value)}
                rows={3}
                placeholder="Amino acid sequence..."
              />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Images</CardTitle>
            <CardDescription>
              Upload product images from your computer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageUpload images={imageUrls} onChange={setImageUrls} />
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Product
          </Button>
        </div>
      </form>
    </div>
  );
}
