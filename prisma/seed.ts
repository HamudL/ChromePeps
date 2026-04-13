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
  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
