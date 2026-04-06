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
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: "growth-hormone-peptides" },
      update: {},
      create: {
        name: "Growth Hormone Peptides",
        slug: "growth-hormone-peptides",
        description:
          "Research peptides related to growth hormone releasing factors for in-vitro study.",
        sortOrder: 1,
      },
    }),
    prisma.category.upsert({
      where: { slug: "metabolic-peptides" },
      update: {},
      create: {
        name: "Metabolic Peptides",
        slug: "metabolic-peptides",
        description:
          "Peptides for metabolic pathway research and in-vitro assays.",
        sortOrder: 2,
      },
    }),
    prisma.category.upsert({
      where: { slug: "research-blends" },
      update: {},
      create: {
        name: "Research Blends",
        slug: "research-blends",
        description:
          "Pre-configured peptide blends for standardized laboratory protocols.",
        sortOrder: 3,
      },
    }),
    prisma.category.upsert({
      where: { slug: "cosmetic-peptides" },
      update: {},
      create: {
        name: "Cosmetic Peptides",
        slug: "cosmetic-peptides",
        description:
          "Peptides used in dermatological and cosmetic formulation research.",
        sortOrder: 4,
      },
    }),
  ]);
  console.log(`Categories seeded: ${categories.length}`);

  // ---- Sample Products ----
  const ghCategory = categories[0];

  const product = await prisma.product.upsert({
    where: { slug: "bpc-157-5mg" },
    update: {},
    create: {
      name: "BPC-157",
      slug: "bpc-157-5mg",
      description:
        "Body Protection Compound-157 (BPC-157) is a pentadecapeptide composed of 15 amino acids. It is a partial sequence of body protection compound (BPC) isolated from gastric juice. Researchers have studied BPC-157 extensively in in-vitro and animal models for its potential role in cellular signaling pathways.",
      shortDesc:
        "15-amino acid pentadecapeptide for gastric juice pathway research.",
      sku: "CP-BPC157-5MG",
      priceInCents: 3499,
      compareAtPriceInCents: 4499,
      categoryId: ghCategory.id,
      stock: 150,
      isActive: true,
      purity: ">99%",
      molecularWeight: "1419.53 g/mol",
      sequence: "Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val",
      casNumber: "137525-51-0",
      storageTemp: "-20\u00B0C",
      form: "Lyophilized Powder",
      weight: "5mg",
    },
  });

  await prisma.productVariant.upsert({
    where: { sku: "CP-BPC157-10MG" },
    update: {},
    create: {
      productId: product.id,
      name: "10mg",
      sku: "CP-BPC157-10MG",
      priceInCents: 5999,
      stock: 80,
      isActive: true,
    },
  });

  console.log(`Sample product seeded: ${product.name}`);
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
