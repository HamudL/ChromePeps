"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUpload } from "@/components/admin/image-upload";

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductImage {
  id: string;
  url: string;
  alt: string | null;
  sortOrder: number;
}

interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc: string | null;
  sku: string;
  priceInCents: number;
  categoryId: string;
  stock: number;
  isActive: boolean;
  purity: string | null;
  molecularWeight: string | null;
  sequence: string | null;
  casNumber: string | null;
  storageTemp: string | null;
  form: string | null;
  weight: string | null;
  images: ProductImage[];
  category: Category;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([""]);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    async function loadData() {
      try {
        const [catRes, prodRes] = await Promise.all([
          fetch("/api/admin/categories"),
          fetch(`/api/products/${slug}`),
        ]);

        const catJson = await catRes.json();
        if (catJson.success) setCategories(catJson.data);

        const prodJson = await prodRes.json();
        if (!prodJson.success) {
          setError("Product not found.");
          setLoading(false);
          return;
        }

        const p: ProductData = prodJson.data;
        setProduct(p);
        setForm({
          name: p.name,
          sku: p.sku,
          description: p.description,
          shortDesc: p.shortDesc ?? "",
          priceEur: (p.priceInCents / 100).toFixed(2),
          categoryId: p.categoryId,
          stock: String(p.stock),
          isActive: p.isActive,
          purity: p.purity ?? "",
          molecularWeight: p.molecularWeight ?? "",
          sequence: p.sequence ?? "",
          casNumber: p.casNumber ?? "",
          storageTemp: p.storageTemp ?? "",
          form: p.form ?? "",
          weight: p.weight ?? "",
        });
        setImageUrls(
          p.images.length > 0 ? p.images.map((img) => img.url) : [""]
        );
      } catch {
        setError("Failed to load product data.");
      }
      setLoading(false);
    }

    loadData();
  }, [slug]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setSaving(true);
    setError("");

    const priceInCents = Math.round(parseFloat(form.priceEur) * 100);
    if (isNaN(priceInCents) || priceInCents <= 0) {
      setError("Please enter a valid price.");
      setSaving(false);
      return;
    }

    const images = imageUrls
      .filter((url) => url.trim() !== "")
      .map((url, i) => ({ url: url.trim(), alt: form.name, sortOrder: i }));

    const body = {
      name: form.name,
      sku: form.sku,
      description: form.description,
      shortDesc: form.shortDesc || null,
      priceInCents,
      categoryId: form.categoryId,
      stock: parseInt(form.stock) || 0,
      isActive: form.isActive,
      purity: form.purity || null,
      molecularWeight: form.molecularWeight || null,
      sequence: form.sequence || null,
      casNumber: form.casNumber || null,
      storageTemp: form.storageTemp || null,
      form: form.form || null,
      weight: form.weight || null,
      images: images.length > 0 ? images : [],
    };

    try {
      const res = await fetch(`/api/products/${product.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to update product.");
        setSaving(false);
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!product) return;
    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`/api/products/${product.slug}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "Failed to delete product.");
        setDeleting(false);
        return;
      }

      router.push("/admin/products");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!product && !loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h2 className="text-2xl font-bold">Product Not Found</h2>
        </div>
        <p className="text-muted-foreground">
          The product you are looking for does not exist or has been deleted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">
              Edit Product
            </h2>
            <p className="text-muted-foreground">
              Editing: {product!.name}
            </p>
          </div>
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={form.sku}
                  onChange={(e) => updateField("sku", e.target.value)}
                  required
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
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shortDesc">Short Description</Label>
              <Input
                id="shortDesc"
                value={form.shortDesc}
                onChange={(e) => updateField("shortDesc", e.target.value)}
                maxLength={300}
              />
            </div>

            <div className="flex items-center gap-2">
              <Label htmlFor="isActive">Active</Label>
              <input
                id="isActive"
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => updateField("isActive", e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground">
                Product visible in shop
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purity">Purity</Label>
                <Input
                  id="purity"
                  value={form.purity}
                  onChange={(e) => updateField("purity", e.target.value)}
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
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="casNumber">CAS Number</Label>
                <Input
                  id="casNumber"
                  value={form.casNumber}
                  onChange={(e) => updateField("casNumber", e.target.value)}
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageTemp">Storage Temperature</Label>
                <Input
                  id="storageTemp"
                  value={form.storageTemp}
                  onChange={(e) => updateField("storageTemp", e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form">Form</Label>
                <Input
                  id="form"
                  value={form.form}
                  onChange={(e) => updateField("form", e.target.value)}
                  maxLength={50}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  value={form.weight}
                  onChange={(e) => updateField("weight", e.target.value)}
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

        {/* Submit + Delete */}
        <div className="flex items-center justify-between">
          <div>
            {!showDeleteConfirm ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Product
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600 font-medium">
                  Permanently delete this product? This cannot be undone.
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting && (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  )}
                  Yes, Delete Permanently
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button asChild variant="outline">
              <Link href="/admin/products">Cancel</Link>
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
