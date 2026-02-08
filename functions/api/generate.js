import { generateAxes } from "../_lib/db";

export async function onRequestPost({ env, request }) {
  if (!env.DB) {
    return Response.json({ error: "Missing DB binding" }, { status: 500 });
  }

  if (!env.ADMIN_KEY) {
    return Response.json(
      { error: "ADMIN_KEY is not configured" },
      { status: 500 }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch (error) {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const adminKey = payload?.adminKey?.toString() ?? "";
  if (!adminKey || adminKey !== env.ADMIN_KEY) {
    return Response.json({ error: "Invalid admin key" }, { status: 401 });
  }

  const result = await generateAxes(env.DB);

  if (!result.ok) {
    if (result.reason === "not_full") {
      return Response.json(
        {
          error: "Board not full",
          claimedCount: result.claimedCount,
        },
        { status: 409 }
      );
    }
    if (result.reason === "already") {
      return Response.json({ error: "Numbers already generated" }, { status: 409 });
    }
    return Response.json({ error: "Unable to generate numbers" }, { status: 400 });
  }

  return Response.json({
    ok: true,
    axisX: result.axisX,
    axisY: result.axisY,
    teamX: result.teamX,
    teamY: result.teamY,
  });
}
