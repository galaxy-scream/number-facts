const CHARACTERS = [
  { name: "Squid", emoji: "🦑" },
  { name: "Octopus", emoji: "🐙" },
  { name: "Robot", emoji: "🤖" },
  { name: "Dog", emoji: "🐶" },
  { name: "Cat", emoji: "🐱" },
  { name: "Fox", emoji: "🦊" },
  { name: "Panda", emoji: "🐼" },
  { name: "Tiger", emoji: "🐯" },
  { name: "Whale", emoji: "🐋" },
  { name: "Shark", emoji: "🦈" },
  { name: "Fish", emoji: "🐟" },
  { name: "Crocodile", emoji: "🐊" },
  { name: "Human", emoji: "🧑" },
];

let selectedCharacter = 0;

const picker = document.getElementById("character-picker");
const form = document.getElementById("fact-form");
const input = document.getElementById("number-input");
const goBtn = document.getElementById("go-btn");
const loading = document.getElementById("loading");
const errorBox = document.getElementById("error-box");
const factDisplay = document.getElementById("fact-display");
const factText = document.getElementById("fact-text");
const characterIcon = document.getElementById("character-icon");

function renderPicker() {
  picker.innerHTML = "";
  CHARACTERS.forEach((char, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "char-btn" + (i === selectedCharacter ? " selected" : "");
    btn.textContent = char.emoji;
    btn.title = char.name;
    btn.setAttribute("aria-label", char.name);
    btn.setAttribute(
      "aria-pressed",
      i === selectedCharacter ? "true" : "false",
    );
    btn.addEventListener("click", () => selectCharacter(i));
    picker.appendChild(btn);
  });
}

function selectCharacter(index) {
  selectedCharacter = index;
  renderPicker();
  // Update icon if facts are already showing
  if (!factDisplay.hidden) {
    characterIcon.textContent = CHARACTERS[selectedCharacter].emoji;
  }
}

function showLoading() {
  loading.hidden = false;
  errorBox.hidden = true;
  factDisplay.hidden = true;
  goBtn.disabled = true;
}

function hideLoading() {
  loading.hidden = true;
  goBtn.disabled = false;
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.hidden = false;
  factDisplay.hidden = true;
}

function showFacts(text) {
  characterIcon.textContent = CHARACTERS[selectedCharacter].emoji;
  factText.textContent = text;
  factDisplay.hidden = false;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const raw = input.value.trim();
  const num = Number(raw);

  if (!raw || !Number.isInteger(num) || num < 1 || num > 999) {
    showError("Please enter a whole number between 1 and 999.");
    return;
  }

  showLoading();

  try {
    const res = await fetch("/api/facts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: num }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      showError(data.error || "Something went wrong. Give it another go!");
      return;
    }

    showFacts(data.facts);
  } catch {
    showError(
      "Could not connect to the server. Check your internet and try again.",
    );
  } finally {
    hideLoading();
  }
});

// Initialise
renderPicker();
