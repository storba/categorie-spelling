/** Dutch speech — pre-recorded audio where browser TTS fails. */

const AUDIO_VERSION = 3;

const AUDIO_BASE = (() => {
  const script = document.currentScript;
  if (script?.src) {
    return new URL("audio/", script.src).href;
  }
  return new URL("audio/", window.location.href).href;
})();

const GARAGE_RECORDED = [
  "garage",
  "bagage",
  "ravage",
  "gage",
  "rage",
  "stage",
  "etage",
  "etalage",
  "montage",
  "slijtage",
  "plantage",
  "reportage",
  "rapportage",
  "personage",
  "percentage",
  "horloge",
  "manege",
  "college",
  "asperge",
  "corsage",
  "vitrage",
  "collage",
];

function hasRecordedAudio(word) {
  if (GARAGE_RECORDED.includes(word)) {
    return true;
  }
  return (
    typeof POLITIE_WORDS !== "undefined" &&
    POLITIE_WORDS.includes(word) &&
    word.endsWith("tie")
  );
}

let activeAudio = null;

function wordSlug(word) {
  return (
    word
      .toLowerCase()
      .replace(/'/g, "")
      .replace(/ë/g, "e")
      .replace(/é/g, "e")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u")
      .replace(/ï/g, "i")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "woord"
  );
}

function speechText(word) {
  if (typeof GARAGE_SPEECH !== "undefined" && GARAGE_SPEECH[word]) {
    return GARAGE_SPEECH[word];
  }
  if (
    typeof POLITIE_WORDS !== "undefined" &&
    POLITIE_WORDS.includes(word) &&
    word.endsWith("tie")
  ) {
    return `${word.slice(0, -3)} tsie`;
  }
  if (
    typeof GARAGE_WORDS !== "undefined" &&
    GARAGE_WORDS.includes(word) &&
    word.endsWith("ge")
  ) {
    return word.slice(0, -2) + "zje";
  }
  if (word === "chantage") {
    return "chantazje";
  }
  return word;
}

function speakWithTts(word, rate) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(speechText(word));
  utterance.lang = "nl-NL";
  utterance.rate = rate;
  const voices = window.speechSynthesis.getVoices();
  const dutch = voices.find((v) => v.lang.startsWith("nl"));
  if (dutch) utterance.voice = dutch;
  window.speechSynthesis.speak(utterance);
}

function speakWithAudio(word, rate) {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio = null;
  }
  window.speechSynthesis.cancel();

  const audio = new Audio(`${AUDIO_BASE}${wordSlug(word)}.mp3?v=${AUDIO_VERSION}`);
  audio.playbackRate = rate;
  activeAudio = audio;
  audio.addEventListener("ended", () => {
    if (activeAudio === audio) {
      activeAudio = null;
    }
  });
  audio.play().catch(() => {
    activeAudio = null;
    speakWithTts(word, rate);
  });
}

function speakDutchWord(word, rate) {
  if (hasRecordedAudio(word)) {
    speakWithAudio(word, rate);
    return;
  }
  speakWithTts(word, rate);
}
