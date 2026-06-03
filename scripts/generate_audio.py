#!/usr/bin/env python3
"""Generate clear Dutch word audio (Microsoft neural voice) for the spelling test."""

import asyncio
import re
import sys
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("Install first: pip install edge-tts")
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "audio"

# Friendly, clear Dutch voice; slightly slow for children
VOICE = "nl-NL-ColetteNeural"
RATE = "-18%"

WORDS = [
    "'s morgens",
    "dynamiet",
    "brouwerij",
    "ambtenaar",
    "auto's",
    "lettertype",
    "extraatje",
    "concertzaal",
    "Laura's",
    "ingrediënt",
    "officier",
    "alfabetische",
    "flauw",
    "parapluutje",
    "object",
    "spaanse",
    "exclusief",
    "thuiswedstrijd",
    "orthodontist",
    "certificaat",
    "luchtballonnen",
    "kabeljauw",
    "bacteriën",
    "claxon",
    "yoghurt",
    "toeristisch",
    "kano's",
    "poëzie",
    "precies",
]

# Garage -ge words: browser TTS misreads short ones like gage/rage.
GARAGE_WORDS = [
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
]


# Spoken text differs from spelling (TTS misreads some short words).
SPEAK_AS = {
    "gage": "ga zje",
    "rage": "ra zje",
}

POLITIE_WORDS = [
    "politie",
    "positie",
    "notitie",
    "prestatie",
    "sensatie",
    "spatie",
    "traktatie",
    "locatie",
    "frustratie",
    "editie",
    "emotie",
    "ovatie",
    "informatie",
    "munitie",
    "conditie",
    "justitie",
    "ambitie",
    "auditie",
    "isolatie",
    "operatie",
    "animatie",
    "motivatie",
    "imitatie",
    "emigratie",
    "decoratie",
    "demonstratie",
    "situatie",
    "presentatie",
    "repetitie",
    "reparatie",
    "reputatie",
    "arrestatie",
    "publicatie",
    "illustratie",
    "combinatie",
    "competitie",
    "compositie",
    "acceptatie",
    "irritatie",
    "definitie",
    "evaluatie",
    "concentratie",
    "administratie",
    "organisatie",
    "communicatie",
    "sollicitatie",
    "expositie",
    "expeditie",
    "revolutie",
    "contributie",
    "integratie",
    "innovatie",
]


def speak_text(word: str) -> str:
    if word in SPEAK_AS:
        return SPEAK_AS[word]
    if word.endswith("tie"):
        return f"{word[:-3]} tsie"
    return word


def slug(word: str) -> str:
    s = (
        word.lower()
        .replace("'", "")
        .replace("ë", "e")
        .replace("ö", "o")
        .replace("ü", "u")
        .replace("ï", "i")
    )
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "woord"


async def generate_one(word: str, *, force: bool = False) -> None:
    path = AUDIO_DIR / f"{slug(word)}.mp3"
    spoken = speak_text(word)
    if path.exists() and not force and spoken == word:
        print(f"skip {path.name}")
        return
    communicate = edge_tts.Communicate(spoken, VOICE, rate=RATE)
    await communicate.save(str(path))
    label = f"{word} -> {spoken!r}" if spoken != word else word
    print(f"ok   {path.name}  ({label})")


async def main() -> None:
    AUDIO_DIR.mkdir(parents=True, exist_ok=True)
    seen = set()
    for word in WORDS + GARAGE_WORDS + POLITIE_WORDS:
        if word in seen:
            continue
        seen.add(word)
        force = word in SPEAK_AS or word.endswith("tie")
        await generate_one(word, force=force)
    print(f"\nDone. Files in {AUDIO_DIR}")


if __name__ == "__main__":
    asyncio.run(main())
