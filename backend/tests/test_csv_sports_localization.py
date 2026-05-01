from app.integrations.sports.localization import localize_sports_text


def test_localize_sports_text_uses_csv_for_supported_locales():
    assert localize_sports_text("English Premier League", "ar") == "الدوري الإنجليزي الممتاز"
    assert localize_sports_text("English Premier League", "fr") == "Premier League anglaise"
    assert localize_sports_text("English Premier League", "es") == "Premier League inglesa"
