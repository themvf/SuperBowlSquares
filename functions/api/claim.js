import { claimSquare } from "../_lib/db";

const MAX_INITIALS = 10;

function normalizeInitials(value) {
  if (!value) {
    return "";
  }

  const trimmed = value.toString().trim().toUpperCase();
  const cleaned = trimmed.replace(/[^A-Z0-9]/g, "");
  if (cleaned.length < 1 || cleaned.length > MAX_INITIALS) {
    return "";
  }
  return cleaned;
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) {
    return Response.json(
      { error: "Missing DB binding" },
      { status: 500 }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = Number(payload?.id);
  const initials = normalizeInitials(payload?.initials);

  if (!Number.isInteger(id) || id < 0 || id > 99) {
    return Response.json({ error: "Invalid square id" }, { status: 400 });
  }

  if (!initials) {
    return Response.json(
      { error: "Initials must be 1-10 letters or numbers" },
      { status: 400 }
    );
  }

  const claimed = await claimSquare(env.DB, id, initials);

  if (!claimed) {
    return Response.json(
      { ok: false, reason: "taken" },
      { status: 409 }
    );
  }

  return Response.json({ ok: true });
}
