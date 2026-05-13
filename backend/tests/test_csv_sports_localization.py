from app.integrations.sports.localization import localize_sports_text


def test_localize_sports_text_uses_csv_for_supported_locales():
    assert localize_sports_text("English Premier League", "ar") == "الدوري الإنجليزي الممتاز"
    assert localize_sports_text("English Premier League", "fr") == "Premier League anglaise"
    assert localize_sports_text("English Premier League", "es") == "Premier League inglesa"


def test_localize_sports_text_matches_names_with_common_prefixes():
    assert localize_sports_text("FC Arsenal", "ar") == "أرسنال"
    assert localize_sports_text("Arsenal FC", "fr") == "Arsenal"


def test_localize_sports_text_uses_country_context_for_ambiguous_leagues():
    assert localize_sports_text("Premier League", "ar", entity_type="league", country="Egypt") == "الدوري المصري الدرجة الأولى"
    assert localize_sports_text("Premier League", "ar", entity_type="league", country="England") == "الدوري الإنجليزي الممتاز"
    assert localize_sports_text("LaLiga", "ar", entity_type="league", country="Spain") == "الدوري الإسباني الدرجة الأولى"
    assert localize_sports_text("Coppa Italia", "ar", entity_type="league", country="Italy") == "كأس إيطاليا"


def test_localize_sports_text_uses_csv_for_modern_sport():
    assert localize_sports_text("Modern Sport FC", "ar", entity_type="team") == "مودرن سبورت"
    assert localize_sports_text("Haras El Hodoud", "ar", entity_type="team") == "حرس الحدود"
