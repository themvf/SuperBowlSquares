const REFRESH_MS = 2500;

const boardEl = document.getElementById("board");
const boardStatusEl = document.getElementById("board-status");
const lastUpdatedEl = document.getElementById("last-updated");
const selectedEl = document.getElementById("selected-cell");
const initialsInput = document.getElementById("initials");
const claimForm = document.getElementById("claim-form");
const claimButton = document.getElementById("claim-button");
const messageEl = document.getElementById("form-message");
const axisTopTitleEl = document.getElementById("axis-top-title");
const axisLeftTitleEl = document.getElementById("axis-left-title");
const adminKeyInput = document.getElementById("admin-key");
const generateButton = document.getElementById("generate-button");

let state = {
  axisX: null,
  axisY: null,
  teamX: null,
  teamY: null,
  squares: [],
};

let selected = null;
let isFetching = false;

function setMessage(text, tone = "") {
  messageEl.textContent = text;
  messageEl.dataset.tone = tone;
}

function setBoardStatus(text) {
  boardStatusEl.textContent = text;
}

function setLastUpdated(date) {
  if (!date) {
    lastUpdatedEl.textContent = "--";
    return;
  }
  lastUpdatedEl.textContent = date.toLocaleTimeString();
}

function normalizeInitials(value) {
  if (!value) {
    return "";
  }
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

function axesGenerated() {
  return (
    Array.isArray(state.axisX) &&
    Array.isArray(state.axisY) &&
    state.axisX.length === 10 &&
    state.axisY.length === 10
  );
}

function setSelected(id, label) {
  selected = { id, label };
  selectedEl.textContent = label;
}

function clearSelected() {
  selected = null;
  selectedEl.textContent = "None";
}

function updateAxisTitles() {
  if (axesGenerated()) {
    axisTopTitleEl.textContent = `${state.teamX || "Team X"} digits`;
    axisLeftTitleEl.textContent = `${state.teamY || "Team Y"} digits`;
    return;
  }
  axisTopTitleEl.textContent = "Awaiting numbers";
  axisLeftTitleEl.textContent = "Awaiting numbers";
}

function updateGenerateButton(claimedCount) {
  if (axesGenerated()) {
    generateButton.disabled = true;
    generateButton.textContent = "Numbers generated";
    return;
  }

  if (claimedCount < 100) {
    generateButton.disabled = true;
    generateButton.textContent = "Generate numbers";
    return;
  }

  generateButton.disabled = false;
  generateButton.textContent = "Generate numbers";
}

function buildBoard() {
  boardEl.innerHTML = "";

  const axisReady = axesGenerated();
  const axisX = axisReady ? state.axisX : Array.from({ length: 10 }, () => "");
  const axisY = axisReady ? state.axisY : Array.from({ length: 10 }, () => "");
  const squares = new Map(
    (state.squares || []).map((square) => [square.id, square.initials])
  );

  const corner = document.createElement("div");
  corner.className = "cell corner";
  corner.textContent = axisReady ? "Scores" : "Squares";
  boardEl.appendChild(corner);

  axisX.forEach((digit) => {
    const cell = document.createElement("div");
    cell.className = "cell axis";
    cell.textContent = axisReady ? digit : "";
    boardEl.appendChild(cell);
  });

  axisY.forEach((yDigit, row) => {
    const axisCell = document.createElement("div");
    axisCell.className = "cell axis";
    axisCell.textContent = axisReady ? yDigit : "";
    boardEl.appendChild(axisCell);

    axisX.forEach((xDigit, col) => {
      const id = row * 10 + col;
      const initials = squares.get(id) || "";
      const cell = document.createElement("button");
      cell.className = "cell square";
      cell.type = "button";
      cell.dataset.id = id;

      const label = axisReady
        ? `Patriots ${xDigit} / Seahawks ${yDigit}`
        : `Row ${row + 1} / Col ${col + 1}`;

      cell.dataset.label = label;
      cell.textContent = initials || "";
      cell.title = label;

      if (initials) {
        cell.classList.add("claimed");
        cell.disabled = true;
      }

      cell.addEventListener("click", () => {
        if (cell.classList.contains("claimed")) {
          return;
        }
        setSelected(id, label);
        initialsInput.focus();
      });

      boardEl.appendChild(cell);
    });
  });
}

async function fetchState() {
  if (isFetching) {
    return;
  }

  isFetching = true;
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Failed to load state");
    }
    state = await response.json();
    buildBoard();
    updateAxisTitles();

    const claimed = (state.squares || []).filter((square) => square.initials)
      .length;
    setBoardStatus(`${claimed}/100 claimed`);
    updateGenerateButton(claimed);
    setLastUpdated(new Date());
  } catch (error) {
    setBoardStatus("Offline");
    setMessage("Unable to refresh board. Check your connection.");
  } finally {
    isFetching = false;
  }
}

claimForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");

  if (!selected) {
    setMessage("Select a square first.");
    return;
  }

  const initials = normalizeInitials(initialsInput.value);
  if (!initials) {
    setMessage("Enter 1-10 letters or numbers.");
    return;
  }

  claimButton.disabled = true;

  try {
    const response = await fetch("/api/claim", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: selected.id, initials }),
    });

    if (response.ok) {
      initialsInput.value = "";
      clearSelected();
      setMessage("Square locked in.");
      await fetchState();
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (response.status === 409) {
      setMessage("That square was just taken. Pick another one.");
    } else {
      setMessage(payload.error || "Unable to claim square.");
    }
  } catch (error) {
    setMessage("Unable to claim square. Try again.");
  } finally {
    claimButton.disabled = false;
  }
});

initialsInput.addEventListener("input", (event) => {
  const normalized = normalizeInitials(event.target.value);
  if (event.target.value !== normalized) {
    event.target.value = normalized;
  }
});

generateButton.addEventListener("click", async () => {
  setMessage("");

  if (axesGenerated()) {
    setMessage("Numbers already generated.");
    return;
  }

  const claimed = (state.squares || []).filter((square) => square.initials)
    .length;
  if (claimed < 100) {
    setMessage("All 100 squares must be claimed first.");
    return;
  }

  const adminKey = adminKeyInput.value.trim();
  if (!adminKey) {
    setMessage("Enter the admin code to generate numbers.");
    return;
  }

  generateButton.disabled = true;

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ adminKey }),
    });

    if (response.ok) {
      adminKeyInput.value = "";
      setMessage("Numbers generated.");
      await fetchState();
      return;
    }

    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      setMessage("Invalid admin code.");
    } else if (response.status === 409) {
      setMessage(payload.error || "Board is not ready.");
    } else {
      setMessage(payload.error || "Unable to generate numbers.");
    }
  } catch (error) {
    setMessage("Unable to generate numbers.");
  } finally {
    const claimedCount = (state.squares || []).filter((square) => square.initials)
      .length;
    updateGenerateButton(claimedCount);
  }
});

fetchState();
setInterval(fetchState, REFRESH_MS);
