const DEFAULT_WORDS_PER_CATEGORY = 4;

const CATEGORIES = [
  { id: "cent", name: "Cent", words: () => CENT_WORDS },
  { id: "cactus", name: "Cactus", words: () => CACTUS_WORDS },
  { id: "chef", name: "Chef", words: () => CHEF_WORDS },
  { id: "garage", name: "Garage", words: () => GARAGE_WORDS },
  { id: "griekse_y", name: "Griekse y", words: () => GRIEKSE_Y_WORDS },
  { id: "tropish", name: "Tropisch", words: () => TROPISH_WORDS },
  { id: "dirigent", name: "Dirigent", words: () => DIRIGENT_WORDS },
  { id: "politie", name: "Politie", words: () => POLITIE_WORDS },
  { id: "majesteit", name: "Majesteit", words: () => MAJESTEIT_WORDS },
  { id: "taxi", name: "Taxi", words: () => TAXI_WORDS },
];

const APOS_VARIANTS = /[''`´ʼ]/g;
const SPEECH_RATE_KEY = "taal-category-speech-rate";
const USER_NAME_KEY = "taal-category-user-name";
const WORDS_CONFIG_KEY = "taal-category-words-config";
const HISTORY_KEY = "taal-category-history";
const REVIEW_KEY = "taal-category-review-queue";
const ASKED_LOG_KEY = "taal-category-asked-log";
const MAX_HISTORY = 30;
const MAX_ASKED_LOG = 500;

const setup = document.getElementById("setup");
const userNameInput = document.getElementById("userNameInput");
const setupCategories = document.getElementById("setupCategories");
const setupAll = document.getElementById("setupAll");
const applyAllBtn = document.getElementById("applyAllBtn");
const setupTotal = document.getElementById("setupTotal");
const startBtn = document.getElementById("startBtn");
const progressSection = document.getElementById("progressSection");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const reviewInfo = document.getElementById("reviewInfo");
const categoryBadge = document.getElementById("categoryBadge");
const card = document.getElementById("card");
const results = document.getElementById("results");
const answerForm = document.getElementById("answerForm");
const answerInput = document.getElementById("answerInput");
const listenBtn = document.getElementById("listenBtn");
const checkBtn = document.getElementById("checkBtn");
const skipBtn = document.getElementById("skipBtn");
const feedback = document.getElementById("feedback");
const scoreText = document.getElementById("scoreText");
const reviewSummary = document.getElementById("reviewSummary");
const resultsTableBody = document.getElementById("resultsTableBody");
const mistakesList = document.getElementById("mistakesList");
const askedLogBody = document.getElementById("askedLogBody");
const restartBtn = document.getElementById("restartBtn");
const printBtn = document.getElementById("printBtn");
const historyList = document.getElementById("historyList");
const speechRateSelect = document.getElementById("speechRate");
const printableResults = document.getElementById("printableResults");

let order = [];
let index = 0;
let sessionLog = [];
let currentAttempts = [];
let sessionStartedAt = null;
let wordsPerCategory = {};

function categoryMaxWords(cat) {
  return cat.words().length;
}

function defaultWordsConfig() {
  const config = {};
  CATEGORIES.forEach((cat) => {
    config[cat.id] = Math.min(DEFAULT_WORDS_PER_CATEGORY, categoryMaxWords(cat));
  });
  return config;
}

function loadWordsConfig() {
  try {
    const saved = JSON.parse(localStorage.getItem(WORDS_CONFIG_KEY) || "null");
    if (!saved || typeof saved !== "object") {
      return defaultWordsConfig();
    }
    const config = defaultWordsConfig();
    CATEGORIES.forEach((cat) => {
      const value = parseInt(saved[cat.id], 10);
      if (Number.isFinite(value) && value >= 0) {
        config[cat.id] = Math.min(value, categoryMaxWords(cat));
      }
    });
    return config;
  } catch {
    return defaultWordsConfig();
  }
}

function saveWordsConfig(config) {
  localStorage.setItem(WORDS_CONFIG_KEY, JSON.stringify(config));
}

function normalizeUserName(name) {
  return name.trim().replace(/\s+/g, " ");
}

function loadUserName() {
  return normalizeUserName(localStorage.getItem(USER_NAME_KEY) || "");
}

function saveUserName(name) {
  const normalized = normalizeUserName(name);
  if (normalized) {
    localStorage.setItem(USER_NAME_KEY, normalized);
  } else {
    localStorage.removeItem(USER_NAME_KEY);
  }
  return normalized;
}

function getUserName() {
  return normalizeUserName(userNameInput?.value || loadUserName());
}

function displayUserName(name) {
  return name || "—";
}

function initUserName() {
  if (!userNameInput) {
    return;
  }
  userNameInput.value = loadUserName();
}

function persistUserNameFromInput() {
  if (!userNameInput) {
    return "";
  }
  const name = saveUserName(userNameInput.value);
  userNameInput.value = name;
  return name;
}

function readWordsConfigFromSetup() {
  const config = {};
  setupCategories.querySelectorAll("[data-category-id]").forEach((row) => {
    const id = row.dataset.categoryId;
    const input = row.querySelector(".setup-count-input");
    const cat = CATEGORIES.find((c) => c.id === id);
    const max = cat ? categoryMaxWords(cat) : 0;
    const value = parseInt(input.value, 10);
    config[id] = Number.isFinite(value) ? Math.min(Math.max(0, value), max) : 0;
    input.value = String(config[id]);
  });
  return config;
}

function renderSetupCategories() {
  wordsPerCategory = loadWordsConfig();
  setupCategories.innerHTML = "";

  CATEGORIES.forEach((cat) => {
    const max = categoryMaxWords(cat);
    const li = document.createElement("li");
    li.className = "setup-category";
    li.dataset.categoryId = cat.id;
    li.innerHTML = `
      <span class="setup-category-name">${escapeHtml(cat.name)}</span>
      <span class="setup-category-max">max ${max}</span>
      <input
        type="number"
        class="setup-count-input"
        min="0"
        max="${max}"
        value="${wordsPerCategory[cat.id] ?? 0}"
        aria-label="Aantal woorden voor ${escapeHtml(cat.name)}"
      />
    `;
    setupCategories.appendChild(li);
  });

  setupAll.value = String(wordsPerCategory[CATEGORIES[0]?.id] ?? DEFAULT_WORDS_PER_CATEGORY);
  const values = CATEGORIES.map((cat) => wordsPerCategory[cat.id] ?? 0);
  const allSame = values.every((v) => v === values[0]);
  setupAll.value = allSame ? String(values[0]) : "";
  setupAll.placeholder = allSame ? "" : "—";
  updateSetupTotal();
}

function updateSetupTotal() {
  const config = readWordsConfigFromSetup();
  const chosen = Object.values(config).reduce((sum, n) => sum + n, 0);
  const reviewCount = loadReviewQueue().length;
  const reviewNote =
    reviewCount > 0
      ? ` + ${reviewCount} herhaling${reviewCount === 1 ? "" : "en"}`
      : "";
  setupTotal.textContent = `Totaal: ${chosen} woord${chosen === 1 ? "" : "en"}${reviewNote}`;
  startBtn.disabled = chosen === 0 && reviewCount === 0;
}

function applyAllCategories() {
  const value = parseInt(setupAll.value, 10);
  if (!Number.isFinite(value) || value < 0) {
    return;
  }
  setupCategories.querySelectorAll(".setup-category").forEach((row) => {
    const input = row.querySelector(".setup-count-input");
    const max = parseInt(input.max, 10);
    input.value = String(Math.min(value, max));
  });
  updateSetupTotal();
}

function showSetup() {
  renderSetupCategories();
  setup.classList.remove("hidden");
  progressSection.classList.add("hidden");
  card.classList.add("hidden");
  results.classList.add("hidden");
  updateReviewInfo();
}

function hideSetup() {
  setup.classList.add("hidden");
}

function wordKey(item) {
  return `${item.categoryId}:${item.word}`;
}

function shuffle(array) {
  const a = [...array];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(words, count) {
  return shuffle(words).slice(0, Math.min(count, words.length));
}

function normalizeAnswer(text) {
  return text
    .trim()
    .replace(APOS_VARIANTS, "'")
    .replace(/\s+/g, " ");
}

function answersMatch(typed, expected) {
  const a = normalizeAnswer(typed);
  const b = normalizeAnswer(expected);
  if (a === b) return true;
  if (expected === "Laura's" && a.toLowerCase() === b.toLowerCase()) return true;
  return false;
}

function getSpeechRate() {
  const value = parseFloat(speechRateSelect.value, 10);
  return Number.isFinite(value) ? value : 0.55;
}

function saveSpeechRate() {
  localStorage.setItem(SPEECH_RATE_KEY, speechRateSelect.value);
}

function loadSpeechRate() {
  const saved = localStorage.getItem(SPEECH_RATE_KEY);
  if (saved && [...speechRateSelect.options].some((o) => o.value === saved)) {
    speechRateSelect.value = saved;
  }
}

function loadReviewQueue() {
  try {
    return JSON.parse(localStorage.getItem(REVIEW_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveReviewQueue(queue) {
  localStorage.setItem(REVIEW_KEY, JSON.stringify(queue));
}

function loadAskedLog() {
  try {
    return JSON.parse(localStorage.getItem(ASKED_LOG_KEY) || "[]");
  } catch {
    return [];
  }
}

function appendAskedLog(entry) {
  const log = loadAskedLog();
  log.unshift(entry);
  localStorage.setItem(ASKED_LOG_KEY, JSON.stringify(log.slice(0, MAX_ASKED_LOG)));
}

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToHistory(summary) {
  const history = loadHistory();
  history.unshift(summary);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

function formatDate(iso) {
  return new Date(iso).toLocaleString("nl-NL", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function buildSessionOrder() {
  const reviewQueue = loadReviewQueue();
  const selected = new Map();

  reviewQueue.forEach((item) => {
    selected.set(wordKey(item), { ...item, fromReview: true });
  });

  CATEGORIES.forEach((cat) => {
    const count = wordsPerCategory[cat.id] ?? 0;
    if (count <= 0) {
      return;
    }
    const pool = cat.words().map((word) => ({
      word,
      categoryId: cat.id,
      categoryName: cat.name,
      fromReview: false,
    }));
    pickRandom(pool, count).forEach((item) => {
      const key = wordKey(item);
      if (!selected.has(key)) {
        selected.set(key, item);
      }
    });
  });

  return shuffle([...selected.values()]);
}

function updateReviewInfo() {
  const count = loadReviewQueue().length;
  if (count === 0) {
    reviewInfo.classList.add("hidden");
    reviewInfo.textContent = "";
    return;
  }
  reviewInfo.classList.remove("hidden");
  reviewInfo.textContent =
    count === 1
      ? "1 woord uit een vorige ronde komt eerst terug (niet goed bij de eerste poging)."
      : `${count} woorden uit vorige rondes komen eerst terug (niet goed bij de eerste poging).`;
}

function currentItem() {
  return order[index];
}

function updateProgress() {
  const total = order.length;
  const current = index + 1;
  const pct = Math.round((index / total) * 100);
  progressFill.style.width = `${pct}%`;
  progressFill.parentElement.setAttribute("aria-valuenow", String(pct));
  progressText.textContent = `Woord ${Math.min(current, total)} van ${total}`;
}

function updateCategoryBadge() {
  const item = currentItem();
  const extra = item.fromReview ? " · herhaling" : "";
  categoryBadge.textContent = `${item.categoryName}${extra}`;
}

function speakWord(word) {
  speakDutchWord(word, getSpeechRate());
}

function showFeedback(ok, expected, typed, retry = false) {
  feedback.classList.remove("hidden", "correct", "incorrect");
  feedback.classList.add(ok ? "correct" : "incorrect");
  if (ok) {
    feedback.innerHTML = "<strong>Goed!</strong> Het woord klopt.";
  } else if (retry) {
    feedback.innerHTML = `
      <strong>Nog niet goed.</strong> Jij typte: <em>${escapeHtml(typed || "(leeg)")}</em>
      <div class="correct-spelling">Juiste spelling: <strong>${escapeHtml(expected)}</strong></div>
      <p class="retry-hint">Typ hetzelfde woord opnieuw tot het klopt.</p>
    `;
  } else {
    feedback.innerHTML = `
      <strong>Niet goed.</strong> Jij typte: <em>${escapeHtml(typed || "(leeg)")}</em>
      <div class="correct-spelling">Juiste spelling: <strong>${escapeHtml(expected)}</strong></div>
    `;
  }
}

function hideFeedback() {
  feedback.classList.add("hidden");
}

function enableInput() {
  answerInput.disabled = false;
  checkBtn.disabled = false;
  skipBtn.disabled = false;
}

function firstTryOk() {
  return currentAttempts.length > 0 && currentAttempts[0].ok;
}

function updateReviewQueueAfterWord(item, firstOk, finalOk, skipped) {
  let queue = loadReviewQueue();
  const key = wordKey(item);

  if (firstOk && finalOk) {
    queue = queue.filter((q) => wordKey(q) !== key);
  } else if (!firstOk) {
    const exists = queue.some((q) => wordKey(q) === key);
    if (!exists) {
      queue.push({
        word: item.word,
        categoryId: item.categoryId,
        categoryName: item.categoryName,
      });
    }
  }

  saveReviewQueue(queue);
}

function recordWordResult(entry) {
  sessionLog.push(entry);

  const logEntry = {
    word: entry.word,
    categoryId: entry.categoryId,
    categoryName: entry.categoryName,
    userName: getUserName(),
    date: new Date().toISOString(),
    sessionDate: sessionStartedAt,
    firstTryOk: entry.firstTryOk,
    finalOk: entry.correct,
    skipped: entry.skipped,
    tries: entry.tries,
    attempts: entry.attempts,
  };
  appendAskedLog(logEntry);

  updateReviewQueueAfterWord(
    entry,
    entry.firstTryOk,
    entry.correct,
    entry.skipped
  );
}

function finishWordEntry(item, skipped) {
  const firstOk = firstTryOk();
  return {
    word: item.word,
    categoryId: item.categoryId,
    categoryName: item.categoryName,
    fromReview: item.fromReview,
    attempts: [...currentAttempts],
    tries: currentAttempts.length,
    skipped,
    correct: !skipped,
    firstTryOk: firstOk,
  };
}

function advanceAfterCorrect(item, typed) {
  recordWordResult(finishWordEntry(item, false));
  currentAttempts = [];

  showFeedback(true, item.word, typed);
  checkBtn.disabled = true;
  skipBtn.disabled = true;
  answerInput.disabled = true;

  setTimeout(() => {
    index++;
    if (index >= order.length) {
      finishTest();
      return;
    }
    answerInput.value = "";
    hideFeedback();
    enableInput();
    answerInput.focus();
    updateProgress();
    updateCategoryBadge();
    setTimeout(() => speakWord(currentItem().word), 300);
  }, 1200);
}

function finishTest() {
  const total = order.length;
  const firstTryCorrect = sessionLog.filter((e) => e.firstTryOk && e.correct).length;
  const reviewNext = loadReviewQueue();

  const summary = {
    date: new Date().toISOString(),
    userName: getUserName(),
    total,
    correct: sessionLog.filter((e) => e.correct).length,
    firstTryCorrect,
    reviewNextCount: reviewNext.length,
    words: sessionLog,
  };

  saveToHistory(summary);
  renderResults(summary);
  renderAskedLog();
  renderHistory();
  updateReviewInfo();

  card.classList.add("hidden");
  progressSection.classList.add("hidden");
  results.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderResults(summary) {
  const { total, correct, firstTryCorrect, words, reviewNextCount, userName } =
    summary;
  const pct = Math.round((correct / total) * 100);
  const namePart = userName ? `${userName}: ` : "";

  scoreText.textContent = `${namePart}${correct} van ${total} goed (${pct}%) — ${firstTryCorrect} in één keer goed`;

  if (reviewNextCount > 0) {
    reviewSummary.classList.remove("hidden");
    reviewSummary.textContent = `Volgende ronde: ${reviewNextCount} woord(en) komen terug omdat de eerste poging niet goed was.`;
  } else {
    reviewSummary.classList.add("hidden");
    reviewSummary.textContent = "";
  }

  resultsTableBody.innerHTML = "";
  words.forEach((entry) => {
    const tr = document.createElement("tr");
    const attemptsText = entry.attempts
      .map((a, i) => {
        const mark = a.ok ? "✓" : "✗";
        return `${i + 1}. ${mark} ${a.typed || "(leeg)"}`;
      })
      .join("<br>");
    const firstClass = entry.firstTryOk ? "first-ok" : "first-bad";
    const firstLabel = entry.firstTryOk ? "Goed" : "Fout";
    const status = entry.skipped
      ? "Overgeslagen"
      : entry.tries === 1
        ? "Goed (1×)"
        : `Goed (${entry.tries}×)`;

    tr.innerHTML = `
      <td>${escapeHtml(entry.categoryName)}</td>
      <td><strong>${escapeHtml(entry.word)}</strong></td>
      <td>${attemptsText}</td>
      <td class="${firstClass}">${firstLabel}</td>
      <td>${escapeHtml(status)}</td>
    `;
    resultsTableBody.appendChild(tr);
  });

  printableResults.innerHTML = buildPrintHtml(summary);

  mistakesList.innerHTML = "";
  const problemWords = words.filter((e) => !e.firstTryOk || e.skipped);
  if (problemWords.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Alle woorden in één keer goed — super!";
    mistakesList.appendChild(li);
  } else {
    problemWords.forEach((entry) => {
      const li = document.createElement("li");
      const wrong = entry.attempts.filter((a) => !a.ok).map((a) => a.typed || "(leeg)");
      li.innerHTML = `<strong>${escapeHtml(entry.categoryName)} — ${escapeHtml(entry.word)}</strong> — fout(en): ${wrong.map(escapeHtml).join(", ")}`;
      mistakesList.appendChild(li);
    });
  }
}

function buildPrintHtml(summary) {
  const rows = summary.words
    .map((entry) => {
      const attempts = entry.attempts
        .map((a, i) => `${i + 1}. ${a.ok ? "goed" : "fout"}: ${a.typed || "(leeg)"}`)
        .join("; ");
      const status = entry.skipped ? "overgeslagen" : `${entry.tries} poging(en)`;
      const first = entry.firstTryOk ? "goed" : "fout";
      return `<tr><td>${escapeHtml(entry.categoryName)}</td><td>${escapeHtml(entry.word)}</td><td>${escapeHtml(attempts)}</td><td>${first}</td><td>${escapeHtml(status)}</td></tr>`;
    })
    .join("");

  const nameLine = summary.userName
    ? `<p><strong>Naam:</strong> ${escapeHtml(summary.userName)}</p>`
    : "";

  return `
    <h1>Categorie spelling — resultaten</h1>
    ${nameLine}
    <p><strong>Datum:</strong> ${escapeHtml(formatDate(summary.date))}</p>
    <p><strong>Score:</strong> ${summary.correct} van ${summary.total} goed</p>
    <p><strong>In één keer goed:</strong> ${summary.firstTryCorrect}</p>
    <table>
      <thead><tr><th>Categorie</th><th>Woord</th><th>Pogingen</th><th>1e poging</th><th>Resultaat</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

function renderAskedLog() {
  const log = loadAskedLog();
  askedLogBody.innerHTML = "";
  if (log.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML = '<td colspan="6">Nog geen woorden gevraagd.</td>';
    askedLogBody.appendChild(tr);
    return;
  }
  log.forEach((entry) => {
    const tr = document.createElement("tr");
    const firstClass = entry.firstTryOk ? "first-ok" : "first-bad";
    const firstLabel = entry.firstTryOk ? "Goed" : "Fout";
    const outcome = entry.skipped
      ? "Overgeslagen"
      : entry.finalOk
        ? "Goed"
        : "Fout";
    tr.innerHTML = `
      <td>${escapeHtml(formatDate(entry.date))}</td>
      <td>${escapeHtml(displayUserName(entry.userName))}</td>
      <td>${escapeHtml(entry.categoryName)}</td>
      <td><strong>${escapeHtml(entry.word)}</strong></td>
      <td class="${firstClass}">${firstLabel}</td>
      <td>${escapeHtml(outcome)}</td>
    `;
    askedLogBody.appendChild(tr);
  });
}

function renderHistory() {
  const history = loadHistory();
  historyList.innerHTML = "";
  if (history.length === 0) {
    historyList.innerHTML =
      '<li class="history-empty">Nog geen opgeslagen rondes.</li>';
    return;
  }
  history.forEach((entry, i) => {
    const li = document.createElement("li");
    const pct = Math.round((entry.correct / entry.total) * 100);
    const reviewNote =
      entry.reviewNextCount > 0
        ? ` · ${entry.reviewNextCount} terug`
        : "";
    const namePart = entry.userName
      ? `<span class="history-name">${escapeHtml(entry.userName)}</span>`
      : "";
    li.innerHTML = `
      <span class="history-date">${escapeHtml(formatDate(entry.date))}</span>
      ${namePart}
      <span class="history-score">${entry.correct}/${entry.total} (${pct}%)${reviewNote}</span>
      ${i === 0 ? '<span class="history-badge">laatste</span>' : ""}
    `;
    historyList.appendChild(li);
  });
}

function startTest() {
  persistUserNameFromInput();
  wordsPerCategory = readWordsConfigFromSetup();
  saveWordsConfig(wordsPerCategory);

  order = buildSessionOrder();
  if (order.length === 0) {
    updateSetupTotal();
    return;
  }

  index = 0;
  sessionLog = [];
  currentAttempts = [];
  sessionStartedAt = new Date().toISOString();

  hideSetup();
  card.classList.remove("hidden");
  progressSection.classList.remove("hidden");
  results.classList.add("hidden");
  hideFeedback();
  answerInput.value = "";
  enableInput();
  updateProgress();
  updateCategoryBadge();
  updateReviewInfo();
  answerInput.focus();
  setTimeout(() => speakWord(currentItem().word), 400);
}

function handleCheck(e) {
  e.preventDefault();
  const item = currentItem();
  const typed = answerInput.value;
  const ok = answersMatch(typed, item.word);

  currentAttempts.push({ typed, ok });

  if (!ok) {
    showFeedback(false, item.word, typed, true);
    answerInput.value = "";
    answerInput.focus();
    setTimeout(() => speakWord(item.word), 600);
    return;
  }

  advanceAfterCorrect(item, typed);
}

function handleSkip() {
  const item = currentItem();
  if (currentAttempts.length === 0) {
    currentAttempts.push({ typed: "", ok: false });
  }
  recordWordResult(finishWordEntry(item, true));
  currentAttempts = [];

  showFeedback(false, item.word, "", false);
  checkBtn.disabled = true;
  skipBtn.disabled = true;
  answerInput.disabled = true;

  setTimeout(() => {
    index++;
    if (index >= order.length) {
      finishTest();
      return;
    }
    answerInput.value = "";
    hideFeedback();
    enableInput();
    answerInput.focus();
    updateProgress();
    updateCategoryBadge();
    setTimeout(() => speakWord(currentItem().word), 300);
  }, 1000);
}

function handlePrint() {
  window.print();
}

answerForm.addEventListener("submit", handleCheck);
listenBtn.addEventListener("click", () => speakWord(currentItem().word));
skipBtn.addEventListener("click", handleSkip);
restartBtn.addEventListener("click", showSetup);
startBtn.addEventListener("click", startTest);
applyAllBtn.addEventListener("click", applyAllCategories);
setupAll.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    applyAllCategories();
  }
});
setupCategories.addEventListener("input", updateSetupTotal);
printBtn.addEventListener("click", handlePrint);
speechRateSelect.addEventListener("change", () => {
  saveSpeechRate();
  if (results.classList.contains("hidden") && index < order.length) {
    speakWord(currentItem().word);
  }
});
if (userNameInput) {
  userNameInput.addEventListener("change", persistUserNameFromInput);
  userNameInput.addEventListener("blur", persistUserNameFromInput);
}

loadSpeechRate();
initUserName();
updateReviewInfo();
renderAskedLog();
renderHistory();

if ("speechSynthesis" in window) {
  speechSynthesis.addEventListener("voiceschanged", () => {
    window.speechSynthesis.getVoices();
  });
  window.speechSynthesis.getVoices();
}

showSetup();
