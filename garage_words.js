/**
 * Garage-woorden uit garage_words.pdf
 * Regel: je hoort /zje/, maar je schrijft ge
 */
const GARAGE_WORDS = [
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
  "giraf",
  "genie",
  "logé",
  "logeren",
  "passagier",
  "origineel",
  "energie",
];

/** Browser TTS reads some short -ge words as English; speak Dutch /zje/ instead. */
const GARAGE_SPEECH = {
  gage: "ga zje",
  rage: "ra zje",
  stage: "staazje",
  ravage: "ravaazje",
};
