from __future__ import annotations

import csv
import re
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


def localize_sports_text(value: str | None, locale: str) -> str | None:
    if value is None:
        return value

    csv_translation = _lookup_csv_translation(value, locale)
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


def _lookup_csv_translation(value: str, locale: str) -> str | None:
    translations = _load_csv_translations()
    locale_translations = translations.get(locale)
    if not locale_translations:
        return None
    return locale_translations.get(_normalize_lookup_key(value))


@lru_cache
def _load_csv_translations() -> dict[str, dict[str, str]]:
    path = _translation_csv_path()
    if not path.exists():
        return {}

    translations: dict[str, dict[str, str]] = {"ar": {}, "en": {}, "fr": {}, "es": {}}
    with path.open(encoding="utf-8-sig", newline="") as csv_file:
        reader = csv.DictReader(csv_file)
        for row in reader:
            english_name = _clean_csv_value(row.get("الاسم الإنجليزي"))
            if not english_name:
                continue

            lookup_key = _normalize_lookup_key(english_name)
            for locale, column_name in (
                ("ar", "الاسم العربي"),
                ("en", "الاسم الإنجليزي"),
                ("fr", "الاسم الفرنسي"),
                ("es", "الاسم الإسباني"),
            ):
                translated = _clean_csv_value(row.get(column_name))
                if translated:
                    translations[locale][lookup_key] = translated

    return translations


def _translation_csv_path() -> Path:
    return Path(__file__).resolve().parents[3] / "leagues_and_teams.csv"


def _normalize_lookup_key(value: str) -> str:
    return " ".join(value.casefold().replace("-", " ").split())


def _clean_csv_value(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None
