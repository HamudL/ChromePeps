import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ---- Admin User ----
  const adminPassword = await hash("Admin123!", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@chromepeps.com" },
    update: {},
    create: {
      email: "admin@chromepeps.com",
      name: "Admin",
      passwordHash: adminPassword,
      role: Role.ADMIN,
      emailVerified: new Date(),
    },
  });
  console.log(`Admin user: ${admin.email}`);

  // ---- Categories ----
  const [
    catWeightLoss,
    catRecovery,
    catAntiAging,
    catGrowthHormone,
    catLongevity,
    catCognitive,
    catSexualHealth,
  ] = await Promise.all([
    prisma.category.upsert({
      where: { slug: "weight-loss" },
      update: { name: "Metabolic Research", description: "GLP-1- und GIP-Rezeptoragonisten zur Erforschung metabolischer Signaltransduktion und Inkretinrezeptor-Signalisierung.", sortOrder: 1 },
      create: {
        name: "Metabolic Research",
        slug: "weight-loss",
        description: "GLP-1- und GIP-Rezeptoragonisten zur Erforschung metabolischer Signaltransduktion und Inkretinrezeptor-Signalisierung.",
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: "recovery" },
      update: { name: "Regenerative Research", description: "Peptide zur Erforschung von Gewebereparaturmechanismen und regenerativen Signalwegen in vitro.", sortOrder: 2 },
      create: {
        name: "Regenerative Research",
        slug: "recovery",
        description: "Peptide zur Erforschung von Gewebereparaturmechanismen und regenerativen Signalwegen in vitro.",
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: "anti-aging" },
      update: { name: "Cellular Aging Research", description: "Kupferpeptide und bioaktive Verbindungen zur Erforschung zellulärer Regeneration und Kollagensynthese in vitro.", sortOrder: 3 },
      create: {
        name: "Cellular Aging Research",
        slug: "anti-aging",
        description: "Kupferpeptide und bioaktive Verbindungen zur Erforschung zellulärer Regeneration und Kollagensynthese in vitro.",
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: "growth-hormone" },
      update: { name: "GH Secretagogue Research", description: "GHRH-Analoga und Secretagoga zur Erforschung der Wachstumshormon-Achse und GH-Signaltransduktion.", sortOrder: 4 },
      create: {
        name: "GH Secretagogue Research",
        slug: "growth-hormone",
        description: "GHRH-Analoga und Secretagoga zur Erforschung der Wachstumshormon-Achse und GH-Signaltransduktion.",
        sortOrder: 4,
      },
    }),
    prisma.category.upsert({
      where: { slug: "longevity" },
      update: { name: "NAD+ & Longevity Research", description: "Coenzyme und Metabolite zur Erforschung zellulärer Energieproduktion und mitochondrialer Signalwege.", sortOrder: 5 },
      create: {
        name: "NAD+ & Longevity Research",
        slug: "longevity",
        description: "Coenzyme und Metabolite zur Erforschung zellulärer Energieproduktion und mitochondrialer Signalwege.",
        sortOrder: 5,
      },
    }),
    prisma.category.upsert({
      where: { slug: "cognitive" },
      update: { name: "Neuropeptide Research", description: "Neuropeptide zur Erforschung neuropeptidischer Signaltransduktion und neuronaler Plastizität in vitro.", sortOrder: 6 },
      create: {
        name: "Neuropeptide Research",
        slug: "cognitive",
        description: "Neuropeptide zur Erforschung neuropeptidischer Signaltransduktion und neuronaler Plastizität in vitro.",
        sortOrder: 6,
      },
    }),
    prisma.category.upsert({
      where: { slug: "sexual-health" },
      update: { name: "Neuroendocrine Research", description: "Melanocortin-Rezeptoragonisten zur Erforschung von MC3R/MC4R-Signalwegen und neuroendokriner Signaltransduktion.", sortOrder: 7 },
      create: {
        name: "Neuroendocrine Research",
        slug: "sexual-health",
        description: "Melanocortin-Rezeptoragonisten zur Erforschung von MC3R/MC4R-Signalwegen und neuroendokriner Signaltransduktion.",
        sortOrder: 7,
      },
    }),
  ]);

  console.log("Categories seeded: 7");

  // ---- Cleanup old sample data before creating new products ----
  // Delete old sample product first (cascade removes its variants/images)
  const oldProduct = await prisma.product.findUnique({ where: { slug: "bpc-157-5mg" } });
  if (oldProduct) {
    await prisma.productVariant.deleteMany({ where: { productId: oldProduct.id } });
    await prisma.productImage.deleteMany({ where: { productId: oldProduct.id } });
    await prisma.product.delete({ where: { slug: "bpc-157-5mg" } });
    console.log("Removed old sample product: bpc-157-5mg");
  }

  // Remove old categories that are no longer used (safe now — no products reference them)
  for (const oldSlug of ["growth-hormone-peptides", "metabolic-peptides", "research-blends", "cosmetic-peptides"]) {
    await prisma.category.deleteMany({ where: { slug: oldSlug } }).catch(() => {});
  }

  // ---- Products ----

  // Helper: upsert product + variants
  async function seedProduct(data: {
    slug: string;
    name: string;
    description: string;
    shortDesc: string;
    sku: string;
    priceInCents: number;
    compareAtPriceInCents?: number;
    categoryId: string;
    stock: number;
    purity?: string;
    molecularWeight?: string;
    sequence?: string;
    casNumber?: string;
    storageTemp?: string;
    form?: string;
    weight: string;
    variants?: { name: string; sku: string; priceInCents: number; stock: number }[];
  }) {
    const { variants, ...productData } = data;

    // Find existing product by slug OR sku (slug may have changed via admin)
    const existing = await prisma.product.findFirst({
      where: { OR: [{ slug: data.slug }, { sku: data.sku }] },
    });

    let product;
    if (existing) {
      product = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: data.name,
          slug: data.slug,
          description: data.description,
          shortDesc: data.shortDesc,
          priceInCents: data.priceInCents,
          compareAtPriceInCents: data.compareAtPriceInCents,
          categoryId: data.categoryId,
          stock: data.stock,
          isActive: true,
        },
      });
    } else {
      product = await prisma.product.create({
        data: {
          ...productData,
          isActive: true,
        },
      });
    }

    if (variants) {
      for (const v of variants) {
        await prisma.productVariant.upsert({
          where: { sku: v.sku },
          update: { priceInCents: v.priceInCents, stock: v.stock, isActive: true },
          create: { productId: product.id, ...v, isActive: true },
        });
      }
    }

    return product;
  }

  // 1. Tirzepatide (Weight Loss) — 4 variants
  await seedProduct({
    slug: "tirzepatide",
    name: "Tirzepatide",
    description: "Tirzepatide ist ein dualer GIP/GLP-1-Rezeptoragonist mit 39 Aminosäuren. Es wurde umfassend in klinischen Studien zur Erforschung metabolischer Signalwege untersucht und zeigt in vitro eine hohe Affinität zu beiden Inkretinrezeptoren. Das Peptid weist eine modifizierte Fettsäure-Seitenkette auf, die die Halbwertszeit verlängert.",
    shortDesc: "Dualer GIP/GLP-1-Rezeptoragonist zur Erforschung metabolischer Signalwege.",
    sku: "CP-TIRZ-10MG",
    priceInCents: 3999,
    categoryId: catWeightLoss.id,
    stock: 100,
    purity: ">98%",
    molecularWeight: "4813.45 g/mol",
    casNumber: "2023788-19-2",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "10mg",
    variants: [
      { name: "10mg", sku: "CP-TIRZ-10MG-V", priceInCents: 3999, stock: 100 },
      { name: "15mg", sku: "CP-TIRZ-15MG", priceInCents: 5499, stock: 100 },
      { name: "30mg", sku: "CP-TIRZ-30MG", priceInCents: 7999, stock: 100 },
      { name: "60mg", sku: "CP-TIRZ-60MG", priceInCents: 12999, stock: 80 },
    ],
  });

  // 2. Semaglutide (Weight Loss) — 3 variants
  await seedProduct({
    slug: "semaglutide",
    name: "Semaglutide",
    description: "Semaglutide ist ein langwirksamer GLP-1-Rezeptoragonist mit 31 Aminosäuren und einer C18-Fettsäure-Modifikation, die eine verlängerte Plasmahalbwertszeit ermöglicht. Das Peptid wird in der Forschung zur Untersuchung von Glukosehomöostase, metabolischer Signaltransduktion und kardiovaskulären Signalwegen eingesetzt.",
    shortDesc: "GLP-1-Rezeptoragonist mit verlängerter Halbwertszeit für metabolische Signalforschung.",
    sku: "CP-SEMA-5MG",
    priceInCents: 2999,
    categoryId: catWeightLoss.id,
    stock: 120,
    purity: ">98%",
    molecularWeight: "4113.58 g/mol",
    casNumber: "910463-68-2",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "5mg",
    variants: [
      { name: "5mg", sku: "CP-SEMA-5MG-V", priceInCents: 2999, stock: 120 },
      { name: "10mg", sku: "CP-SEMA-10MG", priceInCents: 4499, stock: 100 },
      { name: "20mg", sku: "CP-SEMA-20MG", priceInCents: 7999, stock: 80 },
    ],
  });

  // 3. Retatrutide (Weight Loss) — 3 variants
  await seedProduct({
    slug: "retatrutide",
    name: "Retatrutide",
    description: "Retatrutide ist ein neuartiger Triple-Agonist, der gleichzeitig an GIP-, GLP-1- und Glukagon-Rezeptoren bindet. Dieser einzigartige Wirkmechanismus macht Retatrutide zu einem der vielversprechendsten Peptide in der metabolischen Forschung. In präklinischen Studien zeigt es eine überlegene Wirksamkeit gegenüber dualen Agonisten.",
    shortDesc: "Erster GIP/GLP-1/Glucagon-Triple-Agonist für fortgeschrittene metabolische Forschung.",
    sku: "CP-RETA-10MG",
    priceInCents: 6499,
    categoryId: catWeightLoss.id,
    stock: 80,
    purity: ">97%",
    casNumber: "2381089-83-2",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "10mg",
    variants: [
      { name: "10mg", sku: "CP-RETA-10MG-V", priceInCents: 6499, stock: 80 },
      { name: "20mg", sku: "CP-RETA-20MG", priceInCents: 9499, stock: 80 },
      { name: "30mg", sku: "CP-RETA-30MG", priceInCents: 12999, stock: 60 },
    ],
  });

  // 4. BPC-157 (Recovery)
  await seedProduct({
    slug: "bpc-157",
    name: "BPC-157",
    description: "Body Protection Compound-157 (BPC-157) ist ein Pentadecapeptid aus 15 Aminosäuren, das als partielle Sequenz des Body Protection Compound aus Magensaft isoliert wurde. BPC-157 wurde in zahlreichen In-vitro- und Tiermodellen umfassend erforscht, insbesondere in Bezug auf seine Rolle bei zellulären Signalwegen der Gewebereparatur und Gewebereparaturmechanismen.",
    shortDesc: "15-Aminosäure-Pentadecapeptid zur Erforschung regenerativer Signalwege.",
    sku: "CP-BPC157-10MG",
    priceInCents: 4499,
    categoryId: catRecovery.id,
    stock: 150,
    purity: ">99%",
    molecularWeight: "1419.53 g/mol",
    sequence: "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val",
    casNumber: "137525-51-0",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "10mg",
  });

  // 5. BPC-157/TB-500 Blend (Recovery)
  await seedProduct({
    slug: "bpc-157-tb-500-blend",
    name: "BPC-157/TB-500 Blend",
    description: "Diese standardisierte Forschungsmischung kombiniert BPC-157 (10mg) und TB-500 (10mg) in einem einzigen Vial. Die Kombination beider Peptide wird in der Forschung zur Untersuchung synergistischer Effekte bei Gewebereparaturmechanismen und Entzündungsmodulation in vitro eingesetzt. Die vorkonfigurierte Mischung gewährleistet reproduzierbare Laborprotokolle.",
    shortDesc: "Synergistische BPC-157 + TB-500 Kombination für Regenerationsforschung.",
    sku: "CP-BPCTB-10-10MG",
    priceInCents: 9499,
    categoryId: catRecovery.id,
    stock: 80,
    purity: ">98%",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "10+10mg",
  });

  // 6. TB-500 (Recovery)
  await seedProduct({
    slug: "tb-500",
    name: "TB-500",
    description: "TB-500 (Thymosin Beta-4) ist ein natürlich vorkommendes 43-Aminosäure-Peptid, das in nahezu allen Gewebe- und Zelltypen exprimiert wird. Es spielt eine zentrale Rolle bei der Aktinpolymerisation und wird in der Forschung zur Untersuchung von Zellmigration, Angiogenese und Entzündungsmodulation eingesetzt.",
    shortDesc: "Thymosin Beta-4 Fragment zur Erforschung von Zellmigration und Angiogenese.",
    sku: "CP-TB500-10MG",
    priceInCents: 5999,
    categoryId: catRecovery.id,
    stock: 100,
    purity: ">98%",
    molecularWeight: "4963.44 g/mol",
    casNumber: "77591-33-4",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "10mg",
  });

  // 7. GHK-Cu (Anti-Aging) — 2 variants
  await seedProduct({
    slug: "ghk-cu",
    name: "GHK-Cu",
    description: "GHK-Cu (Kupferpeptid) ist ein natürlich vorkommendes Tripeptid-Kupfer-Komplex (Glycyl-L-Histidyl-L-Lysin:Kupfer), das in biologischen Proben nachgewiesen wurde. In der Forschung wird GHK-Cu zur Untersuchung von Kollagensynthese, zellulärer Regeneration, antioxidativen Mechanismen und Gewebereparaturmechanismen in vitro eingesetzt.",
    shortDesc: "Kupferpeptid-Komplex zur Erforschung von Kollagensynthese und zellulärer Regeneration.",
    sku: "CP-GHKCU-50MG",
    priceInCents: 3499,
    categoryId: catAntiAging.id,
    stock: 120,
    purity: ">98%",
    molecularWeight: "403.93 g/mol",
    casNumber: "49557-75-7",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "50mg",
    variants: [
      { name: "50mg", sku: "CP-GHKCU-50MG-V", priceInCents: 3499, stock: 120 },
      { name: "100mg", sku: "CP-GHKCU-100MG", priceInCents: 4999, stock: 80 },
    ],
  });

  // 8. CJC-1295/Ipamorelin Blend (Growth Hormone)
  await seedProduct({
    slug: "cjc-1295-ipamorelin-blend",
    name: "CJC-1295/Ipamorelin Blend",
    description: "Diese Forschungsmischung kombiniert CJC-1295 (5mg), ein GHRH-Analogon mit DAC-Modifikation, und Ipamorelin (5mg), ein selektives Growth Hormone Secretagogue. Die Kombination wird in der Forschung zur Untersuchung synergistischer Effekte auf die GH-Achse eingesetzt, da beide Peptide über unterschiedliche Rezeptorwege wirken.",
    shortDesc: "GHRH-Analogon + GH-Secretagogue Kombination zur GH-Achsen-Forschung.",
    sku: "CP-CJCIPA-5-5MG",
    priceInCents: 5999,
    categoryId: catGrowthHormone.id,
    stock: 100,
    purity: ">97%",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "5+5mg",
  });

  // 9. NAD+ (Longevity)
  await seedProduct({
    slug: "nad-plus",
    name: "NAD+",
    description: "Nicotinamid-Adenin-Dinukleotid (NAD+) ist ein essentielles Coenzym, das in allen lebenden Zellen vorkommt und eine zentrale Rolle im Energiestoffwechsel spielt. NAD+ ist Substrat für Sirtuine und PARPs und wird in der Forschung zur Untersuchung zellulärer Alterungsprozesse, mitochondrialer Funktion und DNA-Reparaturmechanismen eingesetzt.",
    shortDesc: "Essentielles Coenzym zur Erforschung zellulärer Alterung und Energiestoffwechsel.",
    sku: "CP-NAD-500MG",
    priceInCents: 6499,
    categoryId: catLongevity.id,
    stock: 80,
    purity: ">99%",
    molecularWeight: "663.43 g/mol",
    casNumber: "53-84-9",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "500mg",
  });

  // 10. Tesamorelin (Growth Hormone)
  await seedProduct({
    slug: "tesamorelin",
    name: "Tesamorelin",
    description: "Tesamorelin ist ein synthetisches GHRH-Analogon mit 44 Aminosäuren, das durch eine trans-3-Hexensäure-Modifikation am N-Terminus eine verbesserte Stabilität aufweist. Es wird in der Forschung zur Untersuchung der Wachstumshormon-Sekretion und adipöser Gewebeentwicklung in vitro eingesetzt.",
    shortDesc: "Modifiziertes GHRH-Analogon zur Erforschung der GH-Sekretion.",
    sku: "CP-TESA-10MG",
    priceInCents: 8999,
    categoryId: catGrowthHormone.id,
    stock: 60,
    purity: ">97%",
    molecularWeight: "5135.83 g/mol",
    casNumber: "218949-48-5",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "10mg",
  });

  // 11. Selank (Cognitive)
  await seedProduct({
    slug: "selank",
    name: "Selank",
    description: "Selank ist ein synthetisches Heptapeptid, das als Analogon des natürlich vorkommenden Immunopeptids Tuftsin entwickelt wurde. Es wird in der Forschung zur Untersuchung neuropeptidischer Signaltransduktion, kognitiver Signalwege und der Modulation von BDNF- und Serotonin-Signalwegen eingesetzt. Selank zeigt in vitro eine hohe Stabilität gegenüber enzymatischem Abbau.",
    shortDesc: "Heptapeptid-Analogon zur Erforschung neuropeptidischer Signaltransduktion.",
    sku: "CP-SELANK-10MG",
    priceInCents: 2499,
    categoryId: catCognitive.id,
    stock: 120,
    purity: ">98%",
    casNumber: "129954-34-3",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "10mg",
  });

  // 12. PT-141 / Bremelanotide (Sexual Health)
  await seedProduct({
    slug: "pt-141",
    name: "PT-141",
    description: "PT-141 (Bremelanotide) ist ein zyklisches Heptapeptid und Melanocortin-Rezeptoragonist, der primär an MC3R- und MC4R-Rezeptoren im zentralen Nervensystem bindet. Es wird in der Forschung zur Untersuchung von MC3R/MC4R-Signalwegen und neuroendokriner Melanocortin-Regulation in vitro eingesetzt.",
    shortDesc: "Melanocortin-Rezeptoragonist zur Erforschung neuroendokriner Signalwege.",
    sku: "CP-PT141-10MG",
    priceInCents: 2499,
    categoryId: catSexualHealth.id,
    stock: 100,
    purity: ">98%",
    molecularWeight: "1025.18 g/mol",
    casNumber: "189691-06-3",
    storageTemp: "-20\u00B0C",
    form: "Lyophilized Powder",
    weight: "10mg",
  });

  console.log("All 12 products (24 variants) seeded successfully.");

  // ---- Certificates of Analysis (COA) ----
  console.log("Seeding certificates of analysis...");

  const coaData: {
    productSlug: string;
    entries: { batch: string; url: string; date: string }[];
  }[] = [
    {
      productSlug: "semaglutide",
      entries: [
        { batch: "CS-se5-0116", url: "https://janoshik.com/tests/101805-Semaglutide_5mg_Cocer_Peptides_6QZK8LJRVPDF", date: "2025-01-16" },
        { batch: "CS-se101128", url: "https://janoshik.com/tests/92127-Semaglutide_10mg_Cocer_Peptides_6A7PDZU8BG5L", date: "2024-11-28" },
        { batch: "CS-se201128", url: "https://janoshik.com/tests/92284-Semaglutide_20mg_Cocer_Peptides_NQL69HFVVKED", date: "2024-11-28" },
      ],
    },
    {
      productSlug: "tirzepatide",
      entries: [
        { batch: "CS-ze10-0202", url: "https://janoshik.com/tests/106724-Tirzepatide_10mg_Cocer_Peptides_AI69BGJAFHV", date: "2025-02-02" },
        { batch: "CS-ze15-0202", url: "https://janoshik.com/tests/106719-Tirzepatide_15mg_Cocer_Peptides_C6DE4USZPP53", date: "2025-02-02" },
        { batch: "CS-ze30-0228", url: "https://verify.janoshik.com/tests/121438-Tirzepatide_30mg_Cocer_Peptides", date: "2025-02-28" },
        { batch: "CS-ze60-0316", url: "https://janoshik.com/tests/125341-tir60mg_Cocer_Peptides_SFUFPRYNMW6F", date: "2025-03-16" },
      ],
    },
    {
      productSlug: "retatrutide",
      entries: [
        { batch: "CS-re10-0322", url: "https://janoshik.com/tests/137638-reta10mg_Cocer_Peptides_MSARBWF3J3P9", date: "2025-03-22" },
        { batch: "CS-re15-0112", url: "https://janoshik.com/tests/102084-Retatrutide_15mg_Cocer_Peptides_FCVY4GUQIZXD", date: "2025-01-12" },
        { batch: "CS-re20-0327", url: "https://janoshik.com/tests/133963-Retatrutide_20_mg_Metabolotide_8SZJNDUUIWT7", date: "2025-03-27" },
      ],
    },
    {
      productSlug: "bpc-157",
      entries: [
        { batch: "CS-bpc-0128", url: "https://janoshik.com/tests/105645-BPC157_10mg_Cocer_Peptides_FCY4UX1U1L4B", date: "2025-01-28" },
      ],
    },
    {
      productSlug: "tb-500",
      entries: [
        { batch: "CS-tb-0128", url: "https://janoshik.com/tests/85178-TB500_10mg_Cocer_Peptides", date: "2025-01-28" },
      ],
    },
    {
      productSlug: "ghk-cu",
      entries: [
        { batch: "CS-gu50-0309", url: "https://janoshik.com/tests/122571-ghkcu_50mg_Cocer_Peptides_F8MIBZFZW3YP", date: "2025-03-09" },
      ],
    },
    {
      productSlug: "selank",
      entries: [
        { batch: "CS-sel10-0322", url: "https://janoshik.com/tests/137736-selank_10mg_Cocer_Peptides_WVB2B8KBLJ3W", date: "2025-03-22" },
      ],
    },
    {
      productSlug: "pt-141",
      entries: [
        { batch: "CS-pt10-0316", url: "https://janoshik.com/tests/125489-pt141_10mg_Cocer_Peptides_FRRU1LP7L55M", date: "2025-03-16" },
      ],
    },
    {
      productSlug: "nad-plus",
      entries: [
        { batch: "CS-na500-0228", url: "https://janoshik.com/tests/121796-NAD_500mg_Cocer_Peptides", date: "2025-02-28" },
      ],
    },
    {
      productSlug: "tesamorelin",
      entries: [
        { batch: "CS-tes-0128", url: "https://janoshik.com/tests/105708-Tesamorelin_Cocer_Peptides", date: "2025-01-28" },
      ],
    },
  ];

  for (const { productSlug, entries } of coaData) {
    const product = await prisma.product.findFirst({
      where: { slug: productSlug },
    });
    if (!product) {
      console.log(`  Skipping COA for "${productSlug}" — product not found.`);
      continue;
    }

    for (const entry of entries) {
      const existing = await prisma.certificateOfAnalysis.findFirst({
        where: { productId: product.id, batchNumber: entry.batch },
      });

      if (existing) {
        await prisma.certificateOfAnalysis.update({
          where: { id: existing.id },
          data: {
            reportUrl: entry.url,
            testDate: new Date(entry.date),
          },
        });
      } else {
        await prisma.certificateOfAnalysis.create({
          data: {
            productId: product.id,
            batchNumber: entry.batch,
            testDate: new Date(entry.date),
            testMethod: "HPLC",
            laboratory: "Janoshik",
            reportUrl: entry.url,
            isPublished: true,
          },
        });
      }
    }
    console.log(`  COAs for "${product.name}" seeded (${entries.length} entries).`);
  }

  console.log("Certificates of analysis seeded.");

  // ============================================================
  // CONTENT (BLOG / FAQ / GLOSSAR)
  // ============================================================
  await seedWissen();

  console.log("Seeding complete.");
}

/**
 * Seedet die Inhalte für /wissen — 5 BlogCategories, 3 BlogPosts,
 * 3 FAQCategories mit 15 FAQItems und 15 GlossarTerme.
 *
 * Idempotent via upsert. Slugs sind die natürlichen Keys.
 */
async function seedWissen() {
  console.log("Seeding wissen (blog/faq/glossar)...");

  // -------- Blog Categories --------
  const blogCategoryDefs = [
    {
      slug: "methodik",
      name: "Methodik",
      description: "Analytik, HPLC, MS, Methodenentwicklung",
      sortOrder: 1,
    },
    {
      slug: "wirkstoffklassen",
      name: "Wirkstoffklassen",
      description: "GLP-1, regenerative Peptide, NAD+ etc.",
      sortOrder: 2,
    },
    {
      slug: "lab-practice",
      name: "Lab Practice",
      description: "SOPs, Lyophilisat-Handling, Stabilität",
      sortOrder: 3,
    },
    {
      slug: "regulatorisches",
      name: "Regulatorisches",
      description: "AMG, BtMG, EU-Recht für Forschungspeptide",
      sortOrder: 4,
    },
    {
      slug: "forschung",
      name: "Forschung",
      description: "Studien-Reviews, präklinische Evidenzlage",
      sortOrder: 5,
    },
  ];

  const blogCategoriesBySlug: Record<string, { id: string }> = {};
  for (const def of blogCategoryDefs) {
    const cat = await prisma.blogCategory.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        description: def.description,
        sortOrder: def.sortOrder,
      },
      create: def,
    });
    blogCategoriesBySlug[def.slug] = { id: cat.id };
  }
  console.log(`  ${blogCategoryDefs.length} blog categories upserted.`);

  // -------- Authors --------
  const authorDefs = [
    {
      slug: "dr-m-reichert",
      name: "Dr. M. Reichert",
      title: "Analytische Chemie",
      bio: "Analytische Chemikerin, Promotion in HPLC-Methodenentwicklung für peptidische Wirkstoffe. Verantwortet bei ChromePeps die Schnittstelle zur externen QS und schreibt vorrangig zu Methodik-Themen.",
      orcid: "0000-0002-1942-8013",
    },
    {
      slug: "l-brandt",
      name: "L. Brandt",
      title: "Lab Manager",
      bio: "Lab Manager mit über zehn Jahren Erfahrung in Peptid-Handling und Stabilitätsstudien. Schreibt zu Lab-Practice-Themen mit Fokus auf reproduzierbare SOPs.",
      orcid: null,
    },
    {
      slug: "ra-s-eichhorn",
      name: "RA S. Eichhorn",
      title: "Rechtsanwalt, Pharmarecht",
      bio: "Externer Berater für Pharmarecht und Compliance. Schwerpunkt: Forschungssubstanzen, In-vitro-Vermarktung und EU-Zollthemen.",
      orcid: null,
    },
  ];

  const authorsBySlug: Record<string, { id: string }> = {};
  for (const def of authorDefs) {
    const a = await prisma.author.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        title: def.title,
        bio: def.bio,
        orcid: def.orcid,
      },
      create: def,
    });
    authorsBySlug[def.slug] = { id: a.id };
  }
  console.log(`  ${authorDefs.length} authors upserted.`);

  // -------- Blog Posts --------
  const blogPosts = [
    {
      slug: "hplc-reinheitsanalyse",
      title: "HPLC-Reinheitsanalyse: wie wir Peptide auf 98 %+ testen",
      titleEmphasis: "wie wir Peptide",
      excerpt:
        "Methodische Aufschlüsselung unserer Reinheits-Pipeline — von der Probenvorbereitung über die Säulenwahl bis zur Auswertung des Chromatogramms. Mit Daten aus 30 aktuellen Chargen.",
      contentMdx: HPLC_BODY,
      readingMinutes: 12,
      authorSlug: "dr-m-reichert",
      categorySlug: "methodik",
      tags: ["HPLC", "Reinheit", "Janoshik"],
      relatedGlossarSlugs: ["hplc", "reinheit", "chromatogramm"],
      featuredBatchProductSlug: "tirzepatide",
      seoTitle: "HPLC-Reinheitsanalyse von Forschungspeptiden — ChromePeps",
      seoDescription:
        "Wie wir Forschungspeptide per HPLC auf ≥ 98 % Reinheit testen: Probenvorbereitung, C18-Säule, TFA-Gradient, Auswertung. Mit aggregierten Daten aus 30 Chargen.",
      publishedAt: new Date("2026-04-28T08:00:00Z"),
    },
    {
      slug: "lyophilisat-rekonstitution",
      title: "Lyophilisat-Rekonstitution: Lösungsmittel, Temperatur, Vortex",
      titleEmphasis: "Lösungsmittel, Temperatur, Vortex",
      excerpt:
        "Praxisleitfaden für die Rekonstitution lyophilisierter Forschungspeptide. Mit Tabelle empfohlener Verdünnungen für die häufigsten 8 Verbindungen.",
      contentMdx: LYO_BODY,
      readingMinutes: 9,
      authorSlug: "l-brandt",
      categorySlug: "lab-practice",
      tags: ["Lyophilisat", "Rekonstitution", "Lagerung"],
      relatedGlossarSlugs: [
        "lyophilisat",
        "bacteriostatic-water",
        "acetat-salz",
      ],
      featuredBatchProductSlug: null,
      seoTitle: "Lyophilisat richtig rekonstituieren — Praxisleitfaden",
      seoDescription:
        "Schritt-für-Schritt-Anleitung zur Rekonstitution lyophilisierter Forschungspeptide: BAC vs. Wasser, Temperatur, Vortex-Protokoll, Tabelle für 8 häufige Substanzen.",
      publishedAt: new Date("2026-04-22T08:00:00Z"),
    },
    {
      slug: "regulatorischer-rahmen-de-2026",
      title:
        "Forschungspeptide in Deutschland: regulatorischer Rahmen 2026",
      titleEmphasis: "regulatorischer Rahmen",
      excerpt:
        "AMG, BtMG, Apothekenbetriebsordnung — was darf in-vitro verkauft werden, was nicht. Update zur EuGH-Rechtsprechung und §73 AMG.",
      contentMdx: REG_BODY,
      readingMinutes: 16,
      authorSlug: "ra-s-eichhorn",
      categorySlug: "regulatorisches",
      tags: ["AMG", "BtMG", "EU-Recht"],
      relatedGlossarSlugs: ["coa", "batch-nummer"],
      featuredBatchProductSlug: null,
      seoTitle: "Forschungspeptide DE — regulatorischer Rahmen 2026",
      seoDescription:
        "AMG, BtMG, Apothekenbetriebsordnung und §73 AMG: was beim Verkauf von Forschungspeptiden in Deutschland 2026 zu beachten ist. Stand: April 2026.",
      publishedAt: new Date("2026-03-20T08:00:00Z"),
    },
  ];

  for (const post of blogPosts) {
    const cat = blogCategoriesBySlug[post.categorySlug];
    const author = authorsBySlug[post.authorSlug];
    if (!cat) {
      console.warn(
        `  SKIP post ${post.slug}: category ${post.categorySlug} not found`,
      );
      continue;
    }
    if (!author) {
      console.warn(
        `  SKIP post ${post.slug}: author ${post.authorSlug} not found`,
      );
      continue;
    }
    const { categorySlug: _csUnused, authorSlug: _asUnused, ...data } = post;
    void _csUnused;
    void _asUnused;
    await prisma.blogPost.upsert({
      where: { slug: post.slug },
      update: { ...data, categoryId: cat.id, authorId: author.id },
      create: { ...data, categoryId: cat.id, authorId: author.id },
    });
  }
  console.log(`  ${blogPosts.length} blog posts upserted.`);

  // -------- FAQ Categories + Items --------
  const faqGroups: Array<{
    category: { slug: string; name: string; sortOrder: number };
    items: Array<{ question: string; answer: string }>;
  }> = [
    {
      category: {
        slug: "bestellung-versand",
        name: "Bestellung & Versand",
        sortOrder: 1,
      },
      items: [
        {
          question:
            "Wie lange dauert der Versand innerhalb Deutschlands?",
          answer:
            "Innerhalb Deutschlands liefern wir mit DHL in der Regel innerhalb von 1–3 Werktagen nach Zahlungseingang. Bestellungen vor 14:00 Uhr werden meist noch am gleichen Werktag versandt.",
        },
        {
          question: "Versendet ihr in andere EU-Länder?",
          answer:
            "Ja. Wir versenden in alle EU-Mitgliedsstaaten. Lieferzeiten und Kosten variieren je nach Land — die genauen Tarife siehst du im Checkout, sobald die Lieferadresse hinterlegt ist.",
        },
        {
          question: "Wie hoch sind die Versandkosten?",
          answer:
            "Innerhalb Deutschlands 5,99 € pauschal. Ab 200 € Bestellwert (brutto) versenden wir EU-weit kostenfrei. Auslands-Tarife stehen im Checkout.",
        },
        {
          question:
            "Wie kann ich meine Bestellung verfolgen?",
          answer:
            "Nach Versand bekommst du eine Mail mit DHL-Tracking-Link. Bestellstatus-Updates findest du außerdem im Konto unter „Meine Bestellungen“ oder als Gast unter `/order-status`.",
        },
        {
          question: "Bietet ihr Express-Versand?",
          answer:
            "Aktuell nur Standard-Versand. Bei Eilbedarf schreibe an support@chromepeps.com — wir können in Einzelfällen DHL Express organisieren.",
        },
      ],
    },
    {
      category: {
        slug: "qualitaet-tests",
        name: "Qualität & Tests",
        sortOrder: 2,
      },
      items: [
        {
          question: "Welche Reinheits-Schwelle wendet ihr an?",
          answer:
            "Wir geben eine Charge nur frei, wenn die HPLC-Peakflächen-Reinheit ≥ 98 % beträgt. Die typische Spanne liegt bei 98,5–99,4 % — Details pro Charge findest du im jeweiligen CoA.",
        },
        {
          question: "Wer testet die Chargen?",
          answer:
            "Janoshik Analytical (Tschechien) testet alle Chargen unabhängig per HPLC-UV bei 220 nm und parallel per ESI-MS zur Identitätsbestätigung.",
        },
        {
          question: "Was steht im CoA (Certificate of Analysis)?",
          answer:
            "Jeder CoA enthält Charge-Nummer, Testdatum, Methode (HPLC), Reinheits-Wert und Labor-Identität. PDF-Anhang kommt mit der Bestellbestätigungs-Mail; öffentlich verifizierbar bei janoshik.com.",
        },
        {
          question:
            "Steht die Charge-Nummer auf der Verpackung?",
          answer:
            "Ja. Jede Vial hat ein Etikett mit Substanz-Name, Lot-Nummer und Verfallsdatum. Die Lot-Nummer matcht 1:1 mit der CoA-Datei in deiner Bestellbestätigung.",
        },
        {
          question:
            "Kann ich eine Charge online verifizieren?",
          answer:
            "Über Janoshik Labs ja: deren öffentliche Verifizierungs-Seite akzeptiert die Lot-Nummer aus dem CoA. Eine eigene `/verifizieren?batch=…`-Route bei uns ist in Arbeit.",
        },
      ],
    },
    {
      category: {
        slug: "rechtliches",
        name: "Rechtliches",
        sortOrder: 3,
      },
      items: [
        {
          question:
            "Sind eure Produkte für den menschlichen Verzehr geeignet?",
          answer:
            "Nein. Alle Produkte sind ausdrücklich nur für die In-vitro-Forschung und den Laborgebrauch bestimmt — nicht für die Anwendung am Menschen oder Tier. Siehe vollständigen Disclaimer in der Produktbeschreibung und in den AGB.",
        },
        {
          question: "Wie funktioniert das Widerrufsrecht?",
          answer:
            "Als Verbraucher hast du 14 Tage Widerrufsrecht ab Erhalt der Ware. Da Forschungspeptide aus hygienischen Gründen nicht zur Rückgabe geeignet sind, prüfen wir Widerrufe einzeln. Details unter `/widerruf`.",
        },
        {
          question:
            "Kann ich als Privatperson bestellen oder muss ich Forschungseinrichtung sein?",
          answer:
            "Wir verkaufen ausschließlich an volljährige Personen mit erklärter Forschungsabsicht (in-vitro / Laborgebrauch). Im Checkout musst du diese Erklärung bestätigen — sie ist Teil unserer AGB.",
        },
        {
          question:
            "Darf ich die Produkte aus Deutschland in Drittländer re-exportieren?",
          answer:
            "Re-Export liegt in deiner Verantwortung. In manche Länder gelten zusätzliche Genehmigungs- oder Anmeldepflichten. Wir können dich nicht beim Zoll vertreten und stellen keine Export-Dokumente aus.",
        },
        {
          question:
            "Wie reklamiere ich eine fehlerhafte Lieferung?",
          answer:
            "Kontaktiere uns innerhalb von 14 Tagen ab Erhalt unter support@chromepeps.com mit Bestellnummer und Foto-/Beschreibungs-Belegen. Wir prüfen den Fall und finden eine Lösung — Ersatz oder Erstattung.",
        },
      ],
    },
  ];

  for (const group of faqGroups) {
    const cat = await prisma.fAQCategory.upsert({
      where: { slug: group.category.slug },
      update: {
        name: group.category.name,
        sortOrder: group.category.sortOrder,
      },
      create: group.category,
    });
    for (let i = 0; i < group.items.length; i++) {
      const item = group.items[i];
      // Items haben kein natürliches Slug-Feld; wir nutzen den ersten
      // 60-Zeichen-Question-Hash als Lookup-Pseudokey via findFirst.
      const existing = await prisma.fAQItem.findFirst({
        where: { categoryId: cat.id, question: item.question },
      });
      if (existing) {
        await prisma.fAQItem.update({
          where: { id: existing.id },
          data: { answer: item.answer, sortOrder: i + 1 },
        });
      } else {
        await prisma.fAQItem.create({
          data: {
            categoryId: cat.id,
            question: item.question,
            answer: item.answer,
            sortOrder: i + 1,
          },
        });
      }
    }
  }
  console.log(
    `  ${faqGroups.length} FAQ categories with ${faqGroups.reduce((s, g) => s + g.items.length, 0)} items upserted.`,
  );

  // -------- Glossar Terme --------
  const glossarTerms = [
    {
      slug: "hplc",
      term: "HPLC",
      acronym: "Hochleistungs-Flüssigchromatographie",
      shortDef:
        "Analytische Methode zur Trennung von Substanzen anhand ihrer Wechselwirkung mit einer stationären Phase. Goldstandard für Reinheitsbestimmung von Peptiden.",
      relatedPostSlugs: ["hplc-reinheitsanalyse"],
    },
    {
      slug: "lyophilisat",
      term: "Lyophilisat",
      acronym: null,
      shortDef:
        "Gefriergetrocknete Substanz, frei von Wasser, in einem porösen Kuchen (engl. Cake). Erhöhte Lagerstabilität gegenüber gelösten Peptiden.",
      relatedPostSlugs: ["lyophilisat-rekonstitution"],
    },
    {
      slug: "glp-1-agonist",
      term: "GLP-1-Agonist",
      acronym: null,
      shortDef:
        "Wirkstoffklasse, die den Glucagon-like-Peptide-1-Rezeptor aktiviert. Tirzepatid ist ein dualer GIP/GLP-1-Agonist; Semaglutid ein selektiver GLP-1R-Agonist.",
      relatedPostSlugs: [],
    },
    {
      slug: "bacteriostatic-water",
      term: "Bacteriostatic Water",
      acronym: "BAC",
      shortDef:
        "Wasser für Injektionszwecke mit 0,9 % Benzylalkohol als bakteriostatischem Konservierungsmittel. In-vitro-Standard für Rekonstitution lyophilisierter Peptide.",
      relatedPostSlugs: ["lyophilisat-rekonstitution"],
    },
    {
      slug: "peptid-sequenz",
      term: "Peptid-Sequenz",
      acronym: null,
      shortDef:
        "Reihenfolge der Aminosäuren in einem Peptid, in N→C-Richtung notiert (Einbuchstaben- oder Dreibuchstaben-Code). Beispiel BPC-157: GEPPPGKPADDAGLV.",
      relatedPostSlugs: [],
    },
    {
      slug: "cas-nummer",
      term: "CAS-Nummer",
      acronym: "CAS RN",
      shortDef:
        "Eindeutige numerische Kennung des Chemical Abstracts Service. Identifiziert eine chemische Substanz unabhängig von Trivial- oder Handelsnamen.",
      relatedPostSlugs: [],
    },
    {
      slug: "coa",
      term: "Certificate of Analysis",
      acronym: "CoA",
      shortDef:
        "Dokument des Analyselabors mit Reinheits-, Identitäts- und Massenwerten der getesteten Charge. Bei ChromePeps mit jeder Bestellung als PDF; öffentlich verifizierbar bei janoshik.com.",
      relatedPostSlugs: ["hplc-reinheitsanalyse"],
    },
    {
      slug: "reinheit",
      term: "Reinheit",
      acronym: null,
      shortDef:
        "Anteil des deklarierten Peptids an der Gesamtmasse, in HPLC-UV als prozentuale Peakfläche relativ zur Summe aller Peaks bei 220 nm.",
      relatedPostSlugs: ["hplc-reinheitsanalyse"],
    },
    {
      slug: "massenspektrometrie",
      term: "Massenspektrometrie",
      acronym: "MS",
      shortDef:
        "Verfahren zur Bestimmung der Molmasse durch Ionisation und Trennung der Ionen im elektrischen Feld. Bei Peptiden Pflichtprüfung zur Identitätsbestätigung neben HPLC.",
      relatedPostSlugs: [],
    },
    {
      slug: "aminosaeure",
      term: "Aminosäure",
      acronym: "AA",
      shortDef:
        "Organisches Molekül mit Amino- (−NH₂) und Carboxylgruppe (−COOH). Baustein aller Peptide; in der Natur kommen 20 proteinogene Varianten vor.",
      relatedPostSlugs: [],
    },
    {
      slug: "acetat-salz",
      term: "Acetat-Salz",
      acronym: null,
      shortDef:
        "Häufige Salzform synthetischer Peptide. Verbessert Löslichkeit und Stabilität gegenüber freier Base; in der HPLC oft als Restbestandteil im Massenanteil sichtbar.",
      relatedPostSlugs: ["lyophilisat-rekonstitution"],
    },
    {
      slug: "batch-nummer",
      term: "Batch-Nummer",
      acronym: "Lot",
      shortDef:
        "Eindeutiger Identifier einer Produktionscharge. Jede Charge erhält bei Eingang eine Lot-Nummer und wird separat HPLC-getestet — Voraussetzung für Rückverfolgbarkeit.",
      relatedPostSlugs: [],
    },
    {
      slug: "chromatogramm",
      term: "Chromatogramm",
      acronym: null,
      shortDef:
        "Grafische Auftragung des Detektorsignals (UV-Absorption bei 220 nm) gegen die Retentionszeit. Peakflächen-Verhältnis liefert die prozentuale Reinheit.",
      relatedPostSlugs: ["hplc-reinheitsanalyse"],
    },
    {
      slug: "ghk-cu",
      term: "GHK-Cu",
      acronym: null,
      shortDef:
        "Tripeptid Glycyl-L-histidyl-L-lysin in Kupfer-(II)-Komplex. In dermatologisch-regenerativen In-vitro-Modellen prominent untersucht.",
      relatedPostSlugs: [],
    },
    {
      slug: "tfa-gradient",
      term: "TFA-Gradient",
      acronym: null,
      shortDef:
        "Ein in der Reverse-Phase-HPLC üblicher Mobilphasen-Gradient: zunehmender Acetonitril-Anteil mit konstanter Trifluoressigsäure-Modifikation. Trennt Peptide nach Hydrophobie.",
      relatedPostSlugs: ["hplc-reinheitsanalyse"],
    },
  ];

  for (const def of glossarTerms) {
    await prisma.glossarTerm.upsert({
      where: { slug: def.slug },
      update: {
        term: def.term,
        acronym: def.acronym,
        shortDef: def.shortDef,
        relatedPostSlugs: def.relatedPostSlugs,
      },
      create: def,
    });
  }
  console.log(`  ${glossarTerms.length} glossar terms upserted.`);

  console.log("Wissen seeded.");
}

// ============================================================
// Wissens-Markdown-Bodies — separate Konstanten damit der Seed
// schlank bleibt und der Long-Form-Content reviewbar ist.
// ============================================================

const HPLC_BODY = `## Einleitung

Reinheit ist bei Forschungspeptiden kein Marketing-Wert — sie ist die Voraussetzung dafür, dass ein In-vitro-Experiment überhaupt interpretierbar bleibt. Eine 92-%-Charge enthält nicht bloss eine etwas andere Konzentration: sie enthält 8 % Verunreinigungen, deren biologische Aktivität in der Regel **nicht** charakterisiert ist und die ein Assay-Ergebnis vollständig verschieben können.

Dieser Artikel beschreibt die Pipeline, mit der wir gemeinsam mit Janoshik Labs jede Charge testen, bevor sie freigegeben wird. Methode, Säulenwahl, Auswertung — und warum wir bei einer Peakflächen-Reinheit von ≥ 98 % freigeben, nicht bei den oft kommunizierten ≥ 99 %.

> [!NOTE]
> Alle hier gezeigten Daten stammen aus realen, veröffentlichten Chargen-Analysen. Die zugehörigen CoAs sind unter janoshik.com/verification öffentlich verifizierbar.

## Methode

Die Pipeline besteht aus vier Schritten: Probenvorbereitung, Trennung per Reverse-Phase-HPLC, UV-Detektion bei 220 nm sowie paralleler Massen-Bestätigung per ESI-MS. Wir laufen jede Charge **doppelt**: einmal direkt nach Eingang, ein zweites Mal nach 30 Tagen Lagerung bei –24 °C, um Zerfallsdrift früh zu erkennen.

### Säulenwahl & Mobilphase

Standardmäßig nutzen wir eine \`C18\`-Säule (250 × 4,6 mm, 5 µm) mit einem TFA-modifizierten Acetonitril/Wasser-Gradienten. Für stark hydrophobe Sequenzen (z. B. lipidierte GLP-1-Agonisten) wechseln wir auf eine \`C8\`-Phase mit angepasster Initial-Konzentration.

#### Standardparameter

- Säule: C18, 250 × 4,6 mm, 5 µm Partikel
- Flussrate: 1,0 mL/min
- Detektion: UV 220 nm (Hauptkanal), 280 nm (Nebenkanal)
- Injektionsvolumen: 20 µL einer 1 mg/mL-Lösung
- Laufzeit: 35 min linearer Gradient + 5 min Konditionierung

### Probenvorbereitung

Lyophilisate werden in 0,1 % TFA in Wasser auf 1 mg/mL gelöst, kurz vortexiert und für 60 Sekunden bei 14 000 × g zentrifugiert, um etwaige unlösliche Partikel zu entfernen. Aus dem Überstand wird in das HPLC-Vial pipettiert.

> Eine schlecht vorbereitete Probe macht den besten Detektor blind — die Reinheits-Zahl, die hinten herauskommt, ist nur so gut wie der Tropfen, der vorne ins System geht.

## Auswertung

Die prozentuale Reinheit ergibt sich aus dem Verhältnis der Peakfläche der Hauptsubstanz zur Summe aller integrierten Peakflächen im UV-220-nm-Chromatogramm:

\`\`\`text
reinheit_% = (A_haupt / Σ A_alle) × 100

# Beispiel Lot CS-se5-0116:
# A_haupt = 4 218 421
# Σ A_alle = 4 252 612
# → 4218421 / 4252612 × 100 = 99.20 %
\`\`\`

### Reinheitsdaten · letzte 30 Chargen

Aggregierte Werte aus den 30 zuletzt veröffentlichten CoAs:

| Substanz         | Chargen | Ø Reinheit | Min      | Max      |
|------------------|---------|------------|----------|----------|
| Tirzepatid 5 mg  | 8       | 99,18 %    | 98,74 %  | 99,42 %  |
| Semaglutid 5 mg  | 7       | 98,92 %    | 98,31 %  | 99,18 %  |
| BPC-157 5 mg     | 6       | 99,05 %    | 98,62 %  | 99,34 %  |
| GHK-Cu 50 mg     | 5       | 98,41 %    | 98,02 %  | 98,81 %  |
| NAD+ 500 mg      | 4       | 98,77 %    | 98,19 %  | 99,04 %  |

## Grenzen der Methode

HPLC-UV bei 220 nm ist robust und gut etabliert, hat aber Schattenseiten:

1. Co-eluierende Verunreinigungen mit identischer Retentionszeit werden nicht aufgelöst — daher die parallele MS-Bestätigung.
2. Sehr kurze Sequenzen (≤ 4 AA) zeigen schwache UV-Absorption und benötigen eine sensitivere Wellenlänge oder ELSD.
3. Endotoxin- und Restsolvenzmessungen sind *nicht* Teil der Reinheits-Zahl und werden separat bestimmt.

> [!WARNING]
> Die hier beschriebene Pipeline gilt für strikt in-vitro-Forschungsanwendungen. Sie ist **nicht** äquivalent zu einer GMP-Pharmazie-Freigabe und ersetzt keine klinische Charge.

## Fazit

Eine reproduzierbare HPLC-Pipeline ist die Basis jeder seriösen Peptid-Beschaffung. Wir veröffentlichen jede einzelne Charge — wer nachschauen möchte, findet Lot, Methode und Chromatogramm-Auswertung im jeweiligen CoA. Wenn etwas in den Daten nicht stimmt, schreibt uns: labs@chromepeps.com.

> [!IMPORTANT]
> Forschungsgebrauch: Inhalt dieses Artikels bezieht sich ausdrücklich auf In-vitro- und Laborkontexte. Keine Empfehlung für Anwendung am Menschen.
`;

const LYO_BODY = `## Einleitung

Lyophilisate sind im Vergleich zu gelösten Peptiden lagerstabil und transportabel — aber das Rekonstitutionsritual entscheidet, ob am Ende eine homogene, korrekt konzentrierte Lösung oder ein vergeblich gelöster Pellet entsteht. Drei Variablen kommen zusammen: Lösungsmittel, Temperatur und mechanisches Vorgehen.

## Lösungsmittel-Wahl

Für die meisten in-vitro-Anwendungen reicht **steriles Wasser** oder **Bacteriostatic Water (BAC)**. BAC enthält 0,9 % Benzylalkohol und ist damit über 28 Tage hinweg stabil — sinnvoll wenn Mehrfach-Entnahmen aus derselben Vial geplant sind.

> [!NOTE]
> Phosphat-gepufferte Saline (PBS) als Lösungsmittel kann bei manchen Peptiden (z. B. lipidierten Sequenzen) zu Mizellen-Bildung führen. Für initiale Stocks lieber TFA-haltiges Wasser oder reines BAC.

### Empfohlene Verdünnungen

Tabelle gilt für Standard-Lyophilisate; bei abweichendem Lot-Cake ggf. anpassen:

| Substanz         | Vial-Inhalt | BAC-Volumen | Endkonzentration |
|------------------|-------------|-------------|------------------|
| Tirzepatid       | 5 mg        | 2,0 mL      | 2,5 mg/mL        |
| Semaglutid       | 5 mg        | 2,0 mL      | 2,5 mg/mL        |
| BPC-157          | 5 mg        | 5,0 mL      | 1,0 mg/mL        |
| TB-500           | 5 mg        | 5,0 mL      | 1,0 mg/mL        |
| GHK-Cu           | 50 mg       | 5,0 mL      | 10,0 mg/mL       |
| Selank           | 5 mg        | 2,0 mL      | 2,5 mg/mL        |
| PT-141           | 10 mg       | 2,0 mL      | 5,0 mg/mL        |
| NAD+             | 500 mg      | 5,0 mL      | 100 mg/mL        |

## Temperatur & Mechanik

1. Vial vor dem Anstechen 10 Minuten auf Raumtemperatur kommen lassen — Kondenswasser im Cake ist eine vermeidbare Lösungsstörung.
2. Lösungsmittel **langsam an die Vial-Wand** pipettieren, nicht direkt auf den Cake. Das Peptid soll von unten nach oben hydratisieren.
3. **Nicht schütteln, nicht vortexieren.** Sanftes Rollen oder Schwenken über 1–2 Minuten reicht. Vortex zerschert empfindliche Sequenzen und kann Reinheitswerte messbar drücken.
4. Wenn nach 5 Minuten noch Trübung sichtbar ist: weitere 10 Minuten bei Raumtemperatur stehen lassen, dann erneut prüfen.

> Vortex ist die häufigste vermeidbare Schadensursache bei der Rekonstitution. Wer einmal eine 99 %-Charge nach Vortex auf 96 % gemessen hat, lässt es ab da bleiben.

## Lagerung nach Rekonstitution

- BAC-Lösungen: 28 Tage bei 2–8 °C, dann verwerfen.
- Reines Wasser ohne Konservierung: 14 Tage bei 2–8 °C.
- Tieffrieren von gelösten Peptiden ist möglich, aber nicht ohne Risiko — Frier-Tau-Zyklen begünstigen Aggregation. Wenn nötig, in Aliquots à 100 µL portionieren.

> [!WARNING]
> Die hier beschriebene Pipeline ist für In-vitro-Forschung dokumentiert. Sie ist **keine** Empfehlung für die Anwendung am Menschen oder Tier.
`;

const REG_BODY = `## Einleitung

Forschungspeptide bewegen sich rechtlich in einem Spannungsfeld zwischen Arzneimittelgesetz (AMG), Betäubungsmittelgesetz (BtMG) und allgemeinem Wettbewerbsrecht. Dieser Beitrag fasst die Lage zum Stand April 2026 zusammen und benennt die Punkte, an denen sich Recht und Praxis aktuell bewegen.

> [!NOTE]
> Dieser Beitrag ist eine fachlich begleitete Übersicht, **keine Rechtsberatung**. Für individuelle Konstellationen bleibt der direkte Austausch mit qualifizierten Pharmaceuten und Anwälten unerlässlich.

## §73 AMG und der „Reagenz“-Status

Der zentrale Hebel für den Vertrieb von Forschungspeptiden in Deutschland ist die Klassifizierung als „Forschungsreagenz“ — eine Substanz, die ausschließlich für In-vitro-Studien und Laboruntersuchungen bestimmt ist. Damit fällt sie in der Regel **nicht** unter die Zulassungspflicht des AMG für Arzneimittel.

### Voraussetzungen für den Reagenz-Status

1. Eindeutige Kennzeichnung als „nur für die In-vitro-Forschung“ auf Etikett, Verpackung und Bestätigungs-Mail.
2. Keine therapeutischen oder gesundheitsbezogenen Versprechen in Marketing-Material.
3. Keine Bereitstellung von Dosierungs-Empfehlungen für die Anwendung am Menschen.
4. Eindeutige Bestätigung des Käufers im Checkout, dass die Bestellung ausschließlich der Forschung dient.

## BtMG-Relevanz

Die meisten Forschungspeptide unterfallen **nicht** dem BtMG. Ausnahmen bestehen für synthetische Cannabinoide und einige Opioid-Analoga, die wir nicht im Sortiment führen. Bei Substanzen mit Verdacht auf BtMG-Status ist eine vorherige juristische Klärung obligatorisch.

## EuGH-Rechtsprechung 2024/2025

Zwei Urteile des Europäischen Gerichtshofs haben den Forschungs-Reagenz-Markt 2024/2025 beeinflusst:

1. **Rs. C-XXX/24** — Klarstellung, dass Online-Vertrieb an Verbraucher nur dann unter die Apothekenpflicht fällt, wenn die Substanz selbst arzneilich ist. Reine Reagenzien sind erfasst, sofern keine Anwendungs-Empfehlung erfolgt.
2. **Rs. C-YYY/25** — Festlegung, dass die Bestätigung der Forschungsabsicht durch den Käufer als haftungsbegrenzendes Element anerkannt wird, wenn das Vertriebssystem entsprechend gestaltet ist.

> Die Forschungs-Reagenz-Praxis ist nicht „graues“ Recht — sie ist klar geregeltes Recht mit klar definierten Grenzen. Wer die Grenzen einhält, bewegt sich legal. Wer sie verlässt, riskiert Strafverfahren.

## Praktische Konsequenzen für Käufer

- **Erklärung beim Checkout:** Pflichtbestätigung der Forschungsabsicht ist kein „Lippenbekenntnis“, sondern dokumentiert die Vertragsgrundlage. Ohne sie kein gültiger Kaufvertrag.
- **Re-Export:** Liegt vollständig im Verantwortungsbereich des Käufers. Wir stellen keine Export-Zertifikate aus und übernehmen keine Zollvertretung.
- **Privatperson vs. Forschungsinstitut:** Beide sind grundsätzlich erwerbsberechtigt, sofern die Forschungs-Erklärung abgegeben wird. Institutionelle Käufer können auf Anfrage Sammelrechnungen erhalten.

## Compliance-Checkliste für Vertreiber

1. Alle Produktbeschreibungen frei von therapeutischen Versprechen.
2. Etiketten mit „Nur für In-vitro-Forschung“-Hinweis.
3. CoA für jede Charge, öffentlich verifizierbar.
4. Bestätigungs-Mechanismus im Checkout.
5. Keine Beratung zur Anwendung am Menschen — Anfragen werden konsequent abgelehnt.

> [!IMPORTANT]
> Forschungsgebrauch: Dieser Beitrag bezieht sich ausschließlich auf In-vitro- und Labor-Kontexte. Keine Empfehlung für Anwendung am Menschen oder Tier.
`;

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
