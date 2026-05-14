from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

_SPORTS_NAME_STOP_WORDS = {
    "ac",
    "afc",
    "as",
    "bk",
    "cf",
    "club",
    "de",
    "el",
    "fc",
    "fk",
    "if",
    "of",
    "rc",
    "sc",
    "sk",
    "ssc",
    "sv",
    "the",
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
_LEAGUE_STAGE_WORDS = {
    "championship",
    "final",
    "finals",
    "group",
    "offs",
    "play",
    "playoff",
    "playoffs",
    "promotion",
    "quarter",
    "regular",
    "relegation",
    "season",
    "semi",
}


def localize_sports_text(value: str | None, locale: str, *, entity_type: str | None = None, country: str | None = None) -> str | None:
    if value is None:
        return value

    csv_translation = _lookup_csv_translation(value, locale, entity_type=entity_type, country=country)
    return csv_translation or value


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

        score = _csv_match_score(
            lookup_key,
            relaxed_lookup_key,
            entry,
            country_hints,
            allow_fuzzy_match=expected_entity_type is not None,
        )
        if score <= 0:
            continue
        if best_match is None or score > best_match[0]:
            best_match = (score, translated)

    return best_match[1] if best_match else None


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


def _csv_match_score(
    candidate: str,
    relaxed_candidate: str,
    entry: _CsvTranslationEntry,
    country_hints: tuple[str, ...],
    *,
    allow_fuzzy_match: bool,
) -> int:
    score = 0
    if candidate == entry.lookup_key:
        score = 100
    elif allow_fuzzy_match and relaxed_candidate == entry.relaxed_lookup_key:
        score = 90
    elif allow_fuzzy_match and _league_names_match_with_context(candidate, entry.lookup_key, country_hints):
        score = 85
    elif allow_fuzzy_match and _names_match_relaxed(relaxed_candidate, entry.relaxed_lookup_key):
        score = 50

    if score <= 0:
        return 0

    if country_hints and any(hint in entry.lookup_key for hint in country_hints):
        score += 30
    return score


def _league_names_match_with_context(candidate: str, source: str, country_hints: tuple[str, ...]) -> bool:
    if not country_hints:
        return False
    candidate_base = _strip_league_stage_words(candidate)
    source_base = _strip_league_stage_words(source)
    if not candidate_base or not source_base:
        return False
    has_country_context = any(hint in source_base for hint in country_hints)
    return has_country_context and (
        f" {candidate_base} " in f" {source_base} "
        or f" {source_base} " in f" {candidate_base} "
    )


def _strip_league_stage_words(value: str) -> str:
    words = [word for word in _normalize_lookup_key(value).split() if word not in _LEAGUE_STAGE_WORDS]
    return " ".join(words)


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

