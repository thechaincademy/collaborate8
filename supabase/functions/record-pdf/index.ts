import { corsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdmin, getUserFromRequest } from "../_shared/supabase.ts";

function escapePdf(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)").replace(/[^\x20-\x7E]/g, " ");
}

function buildPdf(pages: string[][]): Uint8Array {
  const objects: string[] = [];
  const pageIds: number[] = [];
  let nextId = 3;
  const fontId = 3;
  nextId = 4;
  const contentIds: number[] = [];
  const pageObjectIds: number[] = [];
  for (const lines of pages) {
    const contentId = nextId++;
    const pageId = nextId++;
    contentIds.push(contentId);
    pageObjectIds.push(pageId);
    pageIds.push(pageId);
    const commands = ["BT", "/F1 10 Tf", "48 800 Td", "14 TL"];
    lines.forEach((line, index) => {
      const text = escapePdf(line).slice(0, 110);
      commands.push(index === 0 ? `(${text}) Tj` : `T* (${text}) Tj`);
    });
    commands.push("ET");
    const stream = commands.join("\n");
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`;
  }
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;
  objects[fontId] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let id = 1; id < objects.length; id++) {
    if (!objects[id]) continue;
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = pdf.length;
  const size = objects.length;
  pdf += `xref\n0 ${size}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id < size; id++) {
    pdf += `${String(offsets[id] ?? 0).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer << /Size ${size} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}

async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function reference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "C8-REC-";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const user = await getUserFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    if (payload.range !== "all") return json({ error: "range_not_supported" }, 400);
    const admin = createSupabaseAdmin();
    const { data: account } = await admin.from("safeguarding_accounts").select("safeguarding_enabled").eq("user_id", user.id).maybeSingle();
    if (!account?.safeguarding_enabled) return json({ error: "safeguarding_disabled" }, 403);

    const [{ data: messages }, { data: payments }, { data: expenses }] = await Promise.all([
      admin.from("messages").select("id, created_at, sender_id, body").or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`).order("created_at").limit(2000),
      admin.from("payments").select("id, created_at, amount, status, payer_id").or(`payer_id.eq.${user.id},payee_id.eq.${user.id}`).order("created_at").limit(2000),
      admin.from("expense_requests").select("id, created_at, description, amount, status, user_id").eq("user_id", user.id).order("created_at").limit(2000),
    ]);

    const generatedAt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/London",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).format(new Date());
    const ref = reference();
    const lines = [`Collabor8 record`, `Record date: ${generatedAt}`];
    lines.push("Messages");
    for (const row of messages ?? []) {
      const author = row.sender_id === user.id ? "You" : "Co-parent";
      lines.push(`${row.created_at} | ${author} | ${row.body ?? ""}`);
    }
    lines.push("Payments");
    for (const row of payments ?? []) {
      const direction = row.payer_id === user.id ? "sent" : "received";
      lines.push(`${row.created_at} | ${direction} | ${row.amount} | ${row.status}`);
    }
    lines.push("Shared expenses");
    for (const row of expenses ?? []) {
      lines.push(`${row.created_at} | ${row.description} | ${row.amount} | ${row.status}`);
    }
    const recordChecksum = await sha256(new TextEncoder().encode(lines.join("\n")));
    const footer = [`Generated ${generatedAt}`, ref, `Checksum ${recordChecksum}`];
    const pageSize = 45;
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += pageSize) pages.push(lines.slice(i, i + pageSize));
    if (pages.length === 0) pages.push(["Collabor8 record"]);
    for (const page of pages) page.push("", ...footer);
    const pdf = buildPdf(pages);
    const fileHash = await sha256(pdf);
    const path = `${user.id}/${ref}.pdf`;
    const { error: uploadError } = await admin.storage.from("safeguarding-records").upload(path, pdf, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) return json({ error: "upload_failed" }, 500);
    const signed = await admin.storage.from("safeguarding-records").createSignedUrl(path, 60 * 10);
    if (signed.error || !signed.data?.signedUrl) return json({ error: "url_failed" }, 500);
    return json({
      url: signed.data.signedUrl,
      generated_at: new Date().toISOString(),
      reference: ref,
      sha256: fileHash,
    });
  } catch (error) {
    console.error("[record-pdf] failed");
    return json({ error: "Failed" }, 500);
  }
});
