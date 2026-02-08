import { getState } from "../_lib/db";

export async function onRequestGet({ env }) {
  if (!env.DB) {
    return Response.json(
      { error: "Missing DB binding" },
      { status: 500 }
    );
  }

  const state = await getState(env.DB);
  return Response.json(state, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
