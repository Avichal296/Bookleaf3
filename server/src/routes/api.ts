import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { db } from "../lib/db.js";
import { auth, admin } from "../middleware/auth.js";
import { authorSnapshot, makeRoyaltyEmail } from "../services/royalty.js";
export const api = Router();
api.post("/auth/login", async (req, res) => {
  const parsed = z
    .object({ email: z.string().email(), password: z.string().min(1) })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Enter a valid email and password" });
  const user = await db.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash)))
    return res.status(401).json({ error: "Email or password is incorrect" });
  const session = {
    userId: user.id,
    role: user.role,
    name: user.name,
    email: user.email,
  };
  res.json({
    token: jwt.sign(session, process.env.JWT_SECRET!, { expiresIn: "12h" }),
    user: { ...session, city: user.city },
  });
});
api.get("/auth/me", auth, async (req, res) => {
  const u = await db.user.findUniqueOrThrow({
    where: { id: req.session!.userId },
    select: { id: true, name: true, email: true, role: true, city: true },
  });
  res.json({ user: u });
});
api.get("/dashboard", auth, async (req, res) => {
  const isAdmin = req.session!.role === "ADMIN";
  const authorId =
    isAdmin && typeof req.query.authorId === "string"
      ? req.query.authorId
      : req.session!.userId;
  if (!isAdmin && authorId !== req.session!.userId)
    return res
      .status(403)
      .json({ error: "You can only access your own royalty data" });
  res.json(await authorSnapshot(authorId));
});
api.get("/admin/authors", auth, admin, async (req, res) => {
  const q = String(req.query.q || "").trim(),
    city = String(req.query.city || ""),
    status = String(req.query.status || "");
  const authors = await db.user.findMany({
    where: {
      role: "AUTHOR",
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(city ? { city } : {}),
    },
    include: { books: { include: { royalties: true } } },
    orderBy: { name: "asc" },
  });
  let data = authors.map((a) => {
    const published = a.books.filter((b) => b.status === "PUBLISHED"),
      earned = published.reduce(
        (s, b) => s + b.royalties.reduce((x, r) => x + Number(r.amount), 0),
        0,
      ),
      paid = published.reduce(
        (s, b) => s + b.royalties.reduce((x, r) => x + Number(r.paidAmount), 0),
        0,
      ),
      pending = Math.max(0, earned - paid),
      overdue = published.some((b) =>
        b.royalties.some(
          (r) =>
            Number(r.amount) > Number(r.paidAmount) &&
            ((!r.lastPayoutAt &&
              !!b.publishedAt &&
              Date.now() - b.publishedAt.getTime() > 90 * 86400000) ||
              (!!r.lastPayoutAt &&
                Date.now() - r.lastPayoutAt.getTime() > 90 * 86400000)),
        ),
      );
    return {
      id: a.id,
      name: a.name,
      email: a.email,
      city: a.city,
      books: a.books.length,
      earned,
      paid,
      pending,
      status: overdue ? "overdue" : pending ? "pending" : "paid",
    };
  });
  if (status) data = data.filter((a) => a.status === status);
  res.json({
    authors: data,
    cities: [...new Set(authors.map((a) => a.city).filter(Boolean))],
  });
});
api.get("/admin/authors/:id", auth, admin, async (req, res) =>
  res.json(await authorSnapshot(String(req.params.id))),
);
api.get("/notifications", auth, async (req, res) => {
  const where =
    req.session!.role === "ADMIN"
      ? req.query.authorId
        ? { authorId: String(req.query.authorId) }
        : {}
      : { authorId: req.session!.userId };
  const rows = await db.notification.findMany({
    where,
    include: { author: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ notifications: rows });
});
async function queue(authorId: string, triggeredBy: string, key: string) {
  const found = await db.notification.findUnique({
    where: { idempotencyKey: key },
  });
  if (found) return { notification: found, created: false };
  const recent = await db.notification.findFirst({
    where: {
      authorId,
      status: { in: ["QUEUED", "PROCESSING"] },
      createdAt: { gte: new Date(Date.now() - 30000) },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { notification: recent, created: false };
  try {
    return {
      notification: await db.notification.create({
        data: {
          authorId,
          subject: "Your BookLeaf royalty summary",
          body: "Summary is being prepared…",
          idempotencyKey: key,
          triggeredBy,
        },
      }),
      created: true,
    };
  } catch (error) {
    const duplicate = await db.notification.findUnique({
      where: { idempotencyKey: key },
    });
    if (duplicate) return { notification: duplicate, created: false };
    throw error;
  }
}
async function dispatch(notificationId: string) {
  const n = await db.notification.findUniqueOrThrow({
    where: { id: notificationId },
  });
  try {
    const url = process.env.N8N_WEBHOOK_URL;
    if (url) {
      await db.notification.update({
        where: { id: n.id },
        data: { status: "PROCESSING" },
      });
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-webhook-secret": process.env.WEBHOOK_SECRET!,
        },
        signal: AbortSignal.timeout(90_000),
        body: JSON.stringify({
          notificationId: n.id,
          authorId: n.authorId,
          idempotencyKey: n.idempotencyKey,
          callbackUrl: `${process.env.PUBLIC_API_URL || `http://api:${process.env.API_PORT || 4000}`}/api/automation/callback`,
        }),
      });
      if (!response.ok)
        throw new Error(`Workflow responded ${response.status}`);
    } else {
      const generated = await makeRoyaltyEmail(n.authorId);
      await db.notification.update({
        where: { id: n.id },
        data: {
          subject: generated.subject,
          body: generated.body,
          status: "SUCCESS",
          completedAt: new Date(),
        },
      });
    }
  } catch (e) {
    const latest = await db.notification.findUnique({ where: { id: n.id } });
    if (latest?.status === "PROCESSING" || latest?.status === "QUEUED") {
      await db.notification.update({
        where: { id: n.id },
        data: {
          status: "FAILED",
          error:
            e instanceof Error ? e.message : "Workflow could not be reached",
          completedAt: new Date(),
        },
      });
    }
  }
}
api.post("/admin/authors/:id/send-summary", auth, admin, async (req, res) => {
  const author = await db.user.findUnique({
    where: { id: String(req.params.id), role: "AUTHOR" },
  });
  if (!author) return res.status(404).json({ error: "Author not found" });
  const key = String(
    req.headers["idempotency-key"] ||
      `${author.id}-${Math.floor(Date.now() / 30000)}`,
  );
  const result = await queue(author.id, req.session!.userId, key);
  if (result.created) void dispatch(result.notification.id);
  res.status(202).json({ notification: result.notification });
});
api.post("/admin/send-pending", auth, admin, async (req, res) => {
  const authors = await db.user.findMany({
    where: { role: "AUTHOR" },
    include: {
      books: { where: { status: "PUBLISHED" }, include: { royalties: true } },
    },
  });
  const pending = authors.filter((a) =>
    a.books.some((b) =>
      b.royalties.some((r) => Number(r.amount) > Number(r.paidAmount)),
    ),
  );
  const results = await Promise.all(
    pending.map((a) =>
      queue(
        a.id,
        req.session!.userId,
        `bulk-${Math.floor(Date.now() / 30000)}-${a.id}`,
      ),
    ),
  );
  results
    .filter((r) => r.created)
    .forEach((r) => void dispatch(r.notification.id));
  res.status(202).json({
    queued: results.length,
    notificationIds: results.map((r) => r.notification.id),
  });
});
api.post("/automation/process", async (req, res) => {
  if (req.header("x-webhook-secret") !== process.env.WEBHOOK_SECRET)
    return res.status(401).json({ error: "Invalid webhook secret" });
  const data = z
    .object({ notificationId: z.string(), authorId: z.string() })
    .safeParse(req.body);
  if (!data.success) return res.status(400).json({ error: "Invalid payload" });
  try {
    const generated = await makeRoyaltyEmail(data.data.authorId);
    res.json({
      status: "SUCCESS",
      notificationId: data.data.notificationId,
      subject: generated.subject,
      body: generated.body,
    });
  } catch (error) {
    res.status(500).json({
      notificationId: data.data.notificationId,
      error: error instanceof Error ? error.message : "AI generation failed",
    });
  }
});
api.post("/automation/callback", async (req, res) => {
  if (req.header("x-webhook-secret") !== process.env.WEBHOOK_SECRET)
    return res.status(401).json({ error: "Invalid webhook secret" });
  const parsed = z
    .object({
      notificationId: z.string(),
      status: z.enum(["SUCCESS", "FAILED"]),
      subject: z.string().optional(),
      body: z.string().optional(),
      error: z.string().optional(),
    })
    .safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ error: "Invalid callback" });
  const { notificationId, ...data } = parsed.data;
  const notification = await db.notification.update({
    where: { id: notificationId },
    data: {
      status: data.status,
      subject: data.subject,
      body: data.body,
      error: data.error,
      completedAt: new Date(),
    },
  });
  res.json({ ok: true, notificationId: notification.id });
});
