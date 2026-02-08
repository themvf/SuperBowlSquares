const AXIS_X_KEY = "axis_x";
const AXIS_Y_KEY = "axis_y";

function randomInt(max) {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return Math.floor((buffer[0] / 2 ** 32) * max);
}

function shuffleDigits() {
  const digits = Array.from({ length: 10 }, (_, index) => index);
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

function parseAxis(value) {
  if (!value) {
    return null;
  }
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed) && parsed.length === 10) {
      return parsed;
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function ensureSchema(db) {
  await db.exec(
    `CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS squares (
      id INTEGER PRIMARY KEY,
      initials TEXT,
      claimed_at TEXT
    );`
  );
}

async function ensureAxes(db) {
  const [xRow, yRow] = await Promise.all([
    db.prepare("SELECT value FROM meta WHERE key = ?").bind(AXIS_X_KEY).first(),
    db.prepare("SELECT value FROM meta WHERE key = ?").bind(AXIS_Y_KEY).first(),
  ]);

  const axisX = parseAxis(xRow?.value);
  const axisY = parseAxis(yRow?.value);

  if (axisX && axisY) {
    return { axisX, axisY };
  }

  const newAxisX = shuffleDigits();
  const newAxisY = shuffleDigits();

  await db.batch([
    db
      .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)")
      .bind(AXIS_X_KEY, JSON.stringify(newAxisX)),
    db
      .prepare("INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)")
      .bind(AXIS_Y_KEY, JSON.stringify(newAxisY)),
  ]);

  return { axisX: newAxisX, axisY: newAxisY };
}

async function ensureSquares(db) {
  const values = Array.from({ length: 100 }, (_, index) => `(${index})`).join(",");
  await db.exec(`INSERT OR IGNORE INTO squares (id) VALUES ${values};`);
}

async function initBoard(db) {
  await ensureSchema(db);
  const axes = await ensureAxes(db);
  await ensureSquares(db);
  return axes;
}

export async function getState(db) {
  const axes = await initBoard(db);
  const rows = await db.prepare("SELECT id, initials FROM squares ORDER BY id").all();

  return {
    axisX: axes.axisX,
    axisY: axes.axisY,
    squares: rows.results ?? [],
  };
}

export async function claimSquare(db, id, initials) {
  await initBoard(db);
  const result = await db
    .prepare(
      "UPDATE squares SET initials = ?, claimed_at = datetime('now') WHERE id = ? AND initials IS NULL"
    )
    .bind(initials, id)
    .run();

  const changes = result?.meta?.changes ?? 0;
  return changes === 1;
}
