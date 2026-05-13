from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

ARABIC_TRANSLATIONS = {
    "Premier League": "الدوري الإنجليزي الممتاز",
    "UEFA Champions League": "دوري أبطال أوروبا",
    "Champions League": "دوري أبطال أوروبا",
    "Serie A": "الدوري الإيطالي",
    "La Liga": "الدوري الإسباني",
    "Primera Division": "الدوري الإسباني",
    "Bundesliga": "الدوري الألماني",
    "Ligue 1": "الدوري الفرنسي",
    "Football": "كرة القدم",
    "National Stadium": "الملعب الوطني",
    "Unknown home team": "الفريق صاحب الأرض غير معروف",
    "Unknown away team": "الفريق الضيف غير معروف",
    "Arsenal": "أرسنال",
    "Chelsea": "تشيلسي",
    "Liverpool": "ليفربول",
    "Manchester City": "مانشستر سيتي",
    "Manchester United": "مانشستر يونايتد",
    "Tottenham": "توتنهام",
    "Tottenham Hotspur": "توتنهام هوتسبير",
    "Newcastle": "نيوكاسل",
    "Newcastle United": "نيوكاسل يونايتد",
    "Aston Villa": "أستون فيلا",
    "Barcelona": "برشلونة",
    "Real Madrid": "ريال مدريد",
    "Atletico Madrid": "أتلتيكو مدريد",
    "Atlético de Madrid": "أتلتيكو مدريد",
    "Sevilla": "إشبيلية",
    "Valencia": "فالنسيا",
    "Bayern Munich": "بايرن ميونيخ",
    "Bayern": "بايرن ميونيخ",
    "Borussia Dortmund": "بوروسيا دورتموند",
    "Bayer Leverkusen": "باير ليفركوزن",
    "RB Leipzig": "لايبزيغ",
    "Juventus": "يوفنتوس",
    "Inter": "إنتر",
    "Inter Milan": "إنتر ميلان",
    "AC Milan": "إيه سي ميلان",
    "Milan": "ميلان",
    "Napoli": "نابولي",
    "Roma": "روما",
    "Lazio": "لاتسيو",
    "Paris Saint Germain": "باريس سان جيرمان",
    "Paris SG": "باريس سان جيرمان",
    "Paris Saint-Germain": "باريس سان جيرمان",
    "Marseille": "مارسيليا",
    "Lyon": "ليون",
    "Monaco": "موناكو",
}

_LATIN_WORD_PATTERN = re.compile(r"[A-Za-zÀ-ÿ]+(?:[-'][A-Za-zÀ-ÿ]+)*")
_SPORTS_NAME_STOP_WORDS = {
    "ac",
    "afc",
    "as",
    "bk",
    "cf",
    "club",
    "de",
    "fc",
    "fk",
    "if",
    "rc",
    "sc",
    "sk",
    "ssc",
    "sv",
    "the",
}
_DIGRAPH_MAP = (
    ("sch", "ش"),
    ("sh", "ش"),
    ("ch", "تش"),
    ("kh", "خ"),
    ("gh", "غ"),
    ("th", "ث"),
    ("ph", "ف"),
    ("ck", "ك"),
    ("qu", "كو"),
    ("ou", "و"),
    ("oo", "و"),
    ("ee", "ي"),
    ("ea", "ي"),
    ("ie", "ي"),
    ("ai", "اي"),
    ("ay", "اي"),
    ("au", "او"),
)
_CHAR_MAP = {
    "a": "ا",
    "b": "ب",
    "c": "ك",
    "d": "د",
    "e": "ي",
    "f": "ف",
    "g": "ج",
    "h": "ه",
    "i": "ي",
    "j": "ج",
    "k": "ك",
    "l": "ل",
    "m": "م",
    "n": "ن",
    "o": "و",
    "p": "ب",
    "q": "ق",
    "r": "ر",
    "s": "س",
    "t": "ت",
    "u": "و",
    "v": "ف",
    "w": "و",
    "x": "كس",
    "y": "ي",
    "z": "ز",
    "à": "ا",
    "á": "ا",
    "â": "ا",
    "ä": "ا",
    "ç": "س",
    "é": "ي",
    "è": "ي",
    "ê": "ي",
    "ë": "ي",
    "í": "ي",
    "ï": "ي",
    "ó": "و",
    "ö": "و",
    "ú": "و",
    "ü": "و",
}


@dataclass(frozen=True, slots=True)
class _CsvTranslationEntry:
    entity_type: str
    english_name: str
    lookup_key: str
    relaxed_lookup_key: str
    translations: dict[str, str]


_ENTITY_TYPE_MAP = {
    "league": "دوري",
    "competition": "دوري",
    "team": "نادي",
    "club": "نادي",
}
_COUNTRY_HINTS = {
    "egypt": ("egypt", "egyptian"),
    "england": ("england", "english"),
    "saudi arabia": ("saudi", "saudi arabia"),
    "spain": ("spain", "spanish"),
    "germany": ("germany", "german"),
    "italy": ("italy", "italian"),
    "france": ("france", "french"),
    "netherlands": ("netherlands", "dutch", "netherland"),
    "portugal": ("portugal", "portuguese"),
}


def localize_sports_text(value: str | None, locale: str, *, entity_type: str | None = None, country: str | None = None) -> str | None:
    if value is None:
        return value

    csv_translation = _lookup_csv_translation(value, locale, entity_type=entity_type, country=country)
    if csv_translation:
        return csv_translation

    if locale != "ar":
        return value

    direct = ARABIC_TRANSLATIONS.get(value)
    if direct:
        return direct

    translated = value
    for english, arabic in sorted(ARABIC_TRANSLATIONS.items(), key=lambda item: len(item[0]), reverse=True):
        if english in translated:
            translated = translated.replace(english, arabic)

    translated = translated.replace(" vs ", " ضد ")
    translated = translated.replace(" in ", " في ")
    translated = _LATIN_WORD_PATTERN.sub(lambda match: _transliterate_latin_to_arabic(match.group(0)), translated)
    return translated


def _transliterate_latin_to_arabic(word: str) -> str:
    transliterated = word.lower()
    for source, target in _DIGRAPH_MAP:
        transliterated = transliterated.replace(source, target)

    letters: list[str] = []
    for char in transliterated:
        if char in "-'":
            continue
        letters.append(_CHAR_MAP.get(char, char))
    return "".join(letters)


def _lookup_csv_translation(value: str, locale: str, *, entity_type: str | None = None, country: str | None = None) -> str | None:
    entries = _load_csv_translation_entries()
    if not entries:
        return None

    lookup_key = _normalize_lookup_key(value)
    relaxed_lookup_key = _normalize_relaxed_lookup_key(value)
    expected_entity_type = _normalize_entity_type(entity_type)
    country_hints = _country_hints(country)
    best_match: tuple[int, str] | None = None

    for entry in entries:
        translated = entry.translations.get(locale)
        if not translated:
            continue
        if expected_entity_type and entry.entity_type != expected_entity_type:
            continue

        score = _csv_match_score(lookup_key, relaxed_lookup_key, entry, country_hints)
        if score <= 0:
            continue
        if best_match is None or score > best_match[0]:
            best_match = (score, translated)

    return best_match[1] if best_match else None


@lru_cache
def _load_csv_translations() -> dict[str, dict[str, str]]:
    translations: dict[str, dict[str, str]] = {"ar": {}, "en": {}, "fr": {}, "es": {}}
    for entry in _load_csv_translation_entries():
        for locale, translated in entry.translations.items():
            translations[locale][entry.lookup_key] = translated
    return translations


@lru_cache
def _load_csv_translation_entries() -> tuple[_CsvTranslationEntry, ...]:
    path = _translation_csv_path()
    if not path.exists():
        return ()

    entries: list[_CsvTranslationEntry] = []
    with path.open(encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            entity_type = _clean_csv_value(row.get("النوع")) or ""
            english_name = _clean_csv_value(row.get("الاسم الإنجليزي"))
            if not english_name:
                continue

            lookup_key = _normalize_lookup_key(english_name)
            translations: dict[str, str] = {}
            for locale, column_name in (
                ("ar", "الاسم العربي"),
                ("en", "الاسم الإنجليزي"),
                ("fr", "الاسم الفرنسي"),
                ("es", "الاسم الإسباني"),
            ):
                translated = _clean_csv_value(row.get(column_name))
                if translated:
                    translations[locale] = translated

            entries.append(
                _CsvTranslationEntry(
                    entity_type=entity_type,
                    english_name=english_name,
                    lookup_key=lookup_key,
                    relaxed_lookup_key=_normalize_relaxed_lookup_key(english_name),
                    translations=translations,
                )
            )

    return tuple(entries)


def _translation_csv_path() -> Path:
    return Path(__file__).resolve().parents[3] / "leagues_and_teams.csv"


def _normalize_lookup_key(value: str) -> str:
    normalized = value.casefold().replace("-", " ")
    normalized = re.sub(r"[^a-z0-9\u00c0-\u024f]+", " ", normalized)
    normalized = " ".join(normalized.split())
    return normalized.replace("laliga", "la liga")


def _normalize_relaxed_lookup_key(value: str) -> str:
    words = [
        word
        for word in _normalize_lookup_key(value).split()
        if word not in _SPORTS_NAME_STOP_WORDS
    ]
    return " ".join(words)


def _normalize_entity_type(entity_type: str | None) -> str | None:
    if not entity_type:
        return None
    normalized = entity_type.strip().casefold()
    return _ENTITY_TYPE_MAP.get(normalized, entity_type.strip())


def _country_hints(country: str | None) -> tuple[str, ...]:
    if not country:
        return ()
    normalized = _normalize_lookup_key(country)
    return _COUNTRY_HINTS.get(normalized, (normalized,))


def _csv_match_score(candidate: str, relaxed_candidate: str, entry: _CsvTranslationEntry, country_hints: tuple[str, ...]) -> int:
    score = 0
    if candidate == entry.lookup_key:
        score = 100
    elif relaxed_candidate == entry.relaxed_lookup_key:
        score = 90
    elif _names_match_relaxed(relaxed_candidate, entry.relaxed_lookup_key):
        score = 50

    if score <= 0:
        return 0

    if country_hints and any(hint in entry.lookup_key for hint in country_hints):
        score += 30
    return score


def _names_match_relaxed(candidate: str, source: str) -> bool:
    if not candidate or not source:
        return False
    if candidate == source:
        return True
    return f" {candidate} " in f" {source} " or f" {source} " in f" {candidate} "


def _clean_csv_value(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None
