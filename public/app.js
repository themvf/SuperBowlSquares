const REFRESH_MS = 2500;

const boardEl = document.getElementById("board");
const boardStatusEl = document.getElementById("board-status");
const lastUpdatedEl = document.getElementById("last-updated");
const selectedEl = document.getElementById("selected-cell");
const initialsInput = document.getElementById("initials");
const claimForm = document.getElementById("claim-form");
const claimButton = document.getElementById("claim-button");
const messageEl = document.getElementById("form-message");

let state = {
  axisX: [],
  axisY: [],
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

function setSelected(id, xDigit, yDigit) {
  selected = { id, xDigit, yDigit };
  selectedEl.textContent = `Away ${xDigit} / Home ${yDigit}`;
}

function clearSelected() {
  selected = null;
  selectedEl.textContent = "None";
}

function buildBoard() {
  boardEl.innerHTML = "";

  const axisX = state.axisX || [];
  const axisY = state.axisY || [];
  const squares = new Map(
    (state.squares || []).map((square) => [square.id, square.initials])
  );

  const corner = document.createElement("div");
  corner.className = "cell corner";
  corner.textContent = "Scores";
  boardEl.appendChild(corner);

  axisX.forEach((digit) => {
    const cell = document.createElement("div");
    cell.className = "cell axis";
    cell.textContent = digit;
    boardEl.appendChild(cell);
  });

  axisY.forEach((yDigit, row) => {
    const axisCell = document.createElement("div");
    axisCell.className = "cell axis";
    axisCell.textContent = yDigit;
    boardEl.appendChild(axisCell);

    axisX.forEach((xDigit, col) => {
      const id = row * 10 + col;
      const initials = squares.get(id) || "";
      const cell = document.createElement("button");
      cell.className = "cell square";
      cell.type = "button";
      cell.dataset.id = id;
      cell.dataset.x = xDigit;
      cell.dataset.y = yDigit;
      cell.textContent = initials || "";
      cell.title = `Away ${xDigit} / Home ${yDigit}`;

      if (initials) {
        cell.classList.add("claimed");
        cell.disabled = true;
      }

      cell.addEventListener("click", () => {
        if (cell.classList.contains("claimed")) {
          return;
        }
        setSelected(id, xDigit, yDigit);
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

    const claimed = (state.squares || []).filter((square) => square.initials)
      .length;
    setBoardStatus(`${claimed}/100 claimed`);
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

fetchState();
setInterval(fetchState, REFRESH_MS);
