import { db } from "../lib/db.js";

const OVERDUE_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function authorSnapshot(authorId: string) {
  const author = await db.user.findUniqueOrThrow({
    where: { id: authorId },
    include: {
      books: {
        include: {
          sales: true,
          royalties: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });

  const books = author.books.map((book) => {
    const earned = book.royalties.reduce(
      (sum, row) => sum + Number(row.amount),
      0,
    );
    const paid = book.royalties.reduce(
      (sum, row) => sum + Number(row.paidAmount),
      0,
    );
    const copiesSold = book.sales.reduce((sum, row) => sum + row.units, 0);
    const payouts = book.royalties
      .filter((row) => row.paidAmount.gt(0))
      .map((row) => ({
        period: row.period,
        amount: Number(row.paidAmount),
        date: row.lastPayoutAt,
      }));
    const lastPayout =
      payouts
        .map((row) => row.date)
        .filter((value): value is Date => value !== null)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;
    const pending = Math.max(0, earned - paid);
    const noPayoutPastGracePeriod =
      !lastPayout &&
      !!book.publishedAt &&
      Date.now() - book.publishedAt.getTime() > OVERDUE_DAYS * DAY_MS;
    const stalePayout =
      !!lastPayout && Date.now() - lastPayout.getTime() > OVERDUE_DAYS * DAY_MS;
    const overdue = pending > 0 && (noPayoutPastGracePeriod || stalePayout);
    const royaltyStatus =
      book.status === "PRODUCTION"
        ? "production"
        : pending === 0
          ? "paid"
          : overdue
            ? "overdue"
            : "pending";

    return {
      id: book.id,
      sourceId: book.sourceId,
      title: book.title,
      isbn: book.isbn,
      genre: book.genre,
      status: book.status,
      sourceStatus: book.sourceStatus,
      publishedAt: book.publishedAt,
      mrp: Number(book.mrp),
      royaltyPerCopy: book.royaltyPerCopy ? Number(book.royaltyPerCopy) : null,
      platform: book.platform,
      availableOn: book.availableOn,
      copiesSold,
      earned,
      paid,
      pending,
      lastPayout,
      payouts,
      royaltyStatus,
    };
  });

  return {
    author: {
      id: author.id,
      sourceId: author.sourceId,
      name: author.name,
      email: author.email,
      phone: author.phone,
      city: author.city,
      joinedAt: author.joinedAt,
    },
    books,
    summary: {
      books: books.length,
      copiesSold: books.reduce((sum, book) => sum + book.copiesSold, 0),
      earned: books.reduce((sum, book) => sum + book.earned, 0),
      paid: books.reduce((sum, book) => sum + book.paid, 0),
      pending: books.reduce((sum, book) => sum + book.pending, 0),
    },
  };
}

export async function makeRoyaltyEmail(authorId: string) {
  const snapshot = await authorSnapshot(authorId);
  const published = snapshot.books.filter(
    (book) => book.status === "PUBLISHED",
  );
  const bookLines = published
    .map(
      (book) =>
        `• ${book.title}: ${book.copiesSold.toLocaleString()} copies sold, ₹${book.earned.toFixed(2)} earned (₹${book.paid.toFixed(2)} paid, ₹${book.pending.toFixed(2)} pending).`,
    )
    .join("\n");

  let timing = snapshot.summary.pending
    ? "Pending royalties are included in the next quarterly payout cycle. Please allow up to 45 days from processing for funds to arrive."
    : "All recorded royalties are paid. Thank you for continuing to publish with BookLeaf.";
  if (
    snapshot.summary.pending &&
    published.some((book) => book.royaltyStatus === "overdue")
  ) {
    timing =
      "Some pending royalties are overdue. Our operations team is reviewing the payout and will follow up with you.";
  }

  const prompt = [
    `Write a concise, warm, professional BookLeaf royalty email addressed to ${snapshot.author.name}.`,
    "Use only the facts below. Keep every amount and title exact. Do not invent payout dates, promises, or policy.",
    "Summarize every published title with copies sold and earned, paid, and pending amounts.",
    `Totals: earned ₹${snapshot.summary.earned.toFixed(2)}, paid ₹${snapshot.summary.paid.toFixed(2)}, pending ₹${snapshot.summary.pending.toFixed(2)}.`,
    `Payout guidance: ${timing}`,
    `Production titles: ${
      snapshot.books
        .filter((book) => book.status === "PRODUCTION")
        .map((book) => `${book.title} (${book.sourceStatus})`)
        .join(", ") || "none"
    }.`,
    "If nothing is pending, acknowledge that positively. Close warmly from BookLeaf Author Care.",
    `Book facts:\n${bookLines || "No published titles have sales recorded."}`,
  ].join("\n\n");

  const fallbackBody = [
    `Dear ${snapshot.author.name},`,
    "",
    "Here is your latest royalty snapshot.",
    "",
    bookLines || "No published titles have sales recorded yet.",
    "",
    `Total earned: ₹${snapshot.summary.earned.toFixed(2)}`,
    `Already paid: ₹${snapshot.summary.paid.toFixed(2)}`,
    `Pending: ₹${snapshot.summary.pending.toFixed(2)}`,
    "",
    timing,
    "",
    snapshot.books.some((book) => book.status === "PRODUCTION")
      ? `Still in production: ${snapshot.books
          .filter((book) => book.status === "PRODUCTION")
          .map((book) => `${book.title} (${book.sourceStatus})`)
          .join(", ")}.`
      : "",
    "",
    "Warmly,",
    "BookLeaf Author Care",
  ]
    .filter(Boolean)
    .join("\n");

  let body = fallbackBody;
  if (process.env.OPENAI_API_KEY) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "Write careful, human, warm publishing royalty emails. Never change supplied numbers or invent a policy.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.35,
      }),
    });
    if (!response.ok)
      throw new Error(`AI provider responded ${response.status}`);
    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const generated = data.choices?.[0]?.message?.content?.trim();
    if (!generated)
      throw new Error("AI provider returned an empty royalty summary");
    body = generated;
  }

  return {
    author: snapshot.author,
    summary: snapshot.summary,
    body,
    subject: `Your BookLeaf royalty update, ${new Date().toLocaleString("en-IN", { month: "long", year: "numeric" })}`,
  };
}
