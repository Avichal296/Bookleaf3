import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaClient, Role, BookStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

type Fixture = {
  authors: Array<{
    author_id: string;
    name: string;
    email: string;
    phone?: string;
    city?: string;
    joined_date?: string;
    books: Array<{
      book_id: string;
      title: string;
      isbn: string;
      genre: string;
      publication_date: string | null;
      status: string;
      mrp: number;
      author_royalty_per_copy?: number;
      total_copies_sold: number;
      total_royalty_earned: number;
      royalty_paid: number;
      royalty_pending: number;
      last_royalty_payout_date: string | null;
      print_partner: string;
      available_on: string[];
    }>;
  }>;
};

const db = new PrismaClient();
const published = (status: string) =>
  status.toLowerCase().startsWith("published");
const date = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00.000Z`) : null;

async function main() {
  const fixture = JSON.parse(
    await readFile(
      new URL("./data/bookleaf_sample_data.json", import.meta.url),
      "utf8",
    ),
  ) as Fixture;
  const authorPassword = await bcrypt.hash(
    process.env.SEED_AUTHOR_PASSWORD || "AuthorDemo2026!",
    12,
  );
  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@bookleaf.local";
  const adminPassword = await bcrypt.hash(
    process.env.SEED_ADMIN_PASSWORD || "BookleafDemo2026!",
    12,
  );

  await db.user.upsert({
    where: { email: adminEmail },
    update: { name: "Aarav Kapoor", role: Role.ADMIN },
    create: {
      name: "Aarav Kapoor",
      email: adminEmail,
      passwordHash: adminPassword,
      role: Role.ADMIN,
      city: "New Delhi",
    },
  });

  for (const authorRecord of fixture.authors) {
    const author = await db.user.upsert({
      where: { email: authorRecord.email.toLowerCase() },
      update: {
        sourceId: authorRecord.author_id,
        name: authorRecord.name,
        city: authorRecord.city,
        phone: authorRecord.phone,
        joinedAt: date(authorRecord.joined_date),
      },
      create: {
        sourceId: authorRecord.author_id,
        name: authorRecord.name,
        email: authorRecord.email.toLowerCase(),
        passwordHash: authorPassword,
        role: Role.AUTHOR,
        city: authorRecord.city,
        phone: authorRecord.phone,
        joinedAt: date(authorRecord.joined_date),
      },
    });

    for (const bookRecord of authorRecord.books) {
      const isPublished = published(bookRecord.status);
      
const book = await db.book.upsert({
  where: { isbn: bookRecord.isbn },
  update: {
    sourceId: bookRecord.book_id,
    author: {
      connect: { id: author.id },
    },
    title: bookRecord.title,
    genre: bookRecord.genre,
    status: isPublished
      ? BookStatus.PUBLISHED
      : BookStatus.PRODUCTION,
    sourceStatus: bookRecord.status,
    publishedAt: date(bookRecord.publication_date),
    mrp: bookRecord.mrp ?? 0,
    royaltyPerCopy: bookRecord.author_royalty_per_copy ?? null,
    platform: bookRecord.print_partner?.trim() || "Not assigned",
    availableOn: bookRecord.available_on ?? [],
  },
  create: {
    sourceId: bookRecord.book_id,
    author: {
      connect: { id: author.id },
    },
    title: bookRecord.title,
    isbn: bookRecord.isbn,
    genre: bookRecord.genre,
    status: isPublished
      ? BookStatus.PUBLISHED
      : BookStatus.PRODUCTION,
    sourceStatus: bookRecord.status,
    publishedAt: date(bookRecord.publication_date),
    mrp: bookRecord.mrp ?? 0,
    royaltyPerCopy: bookRecord.author_royalty_per_copy ?? null,
    platform: bookRecord.print_partner?.trim() || "Not assigned",
    availableOn: bookRecord.available_on ?? [],
  },
});


      if (!isPublished) continue;
      await db.sale.upsert({
        where: {
          bookId_period_platform: {
            bookId: book.id,
            period: "SOURCE_AGGREGATE",
            platform: "All reported channels",
          },
        },
        update: { units: bookRecord.total_copies_sold },
        create: {
          bookId: book.id,
          platform: "All reported channels",
          units: bookRecord.total_copies_sold,
          period: "SOURCE_AGGREGATE",
        },
      });
      await db.royalty.upsert({
        where: { id: `fixture-${book.id}` },
        update: {
          amount: bookRecord.total_royalty_earned,
          paidAmount: bookRecord.royalty_paid,
          lastPayoutAt: date(bookRecord.last_royalty_payout_date),
        },
        create: {
          id: `fixture-${book.id}`,
          bookId: book.id,
          amount: bookRecord.total_royalty_earned,
          paidAmount: bookRecord.royalty_paid,
          period: "SOURCE_AGGREGATE",
          lastPayoutAt: date(bookRecord.last_royalty_payout_date),
        },
      });
    }
  }
  console.log(
    `Imported ${fixture.authors.length} authors and ${fixture.authors.reduce((n, a) => n + a.books.length, 0)} books from the Assignment 1 fixture.`,
  );
}

main().finally(() => db.$disconnect());
