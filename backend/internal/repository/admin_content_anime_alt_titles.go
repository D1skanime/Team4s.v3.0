package repository

import (
	"strings"

	"team4s.v3/backend/internal/models"
)

// appendAltTitleSlots verkettet jeden vollständigen Alt-Titel (Sprache, Typ und
// Titel gesetzt) als zusätzlichen authoritativeAnimeTitleSlotWrite an die
// bestehenden Slots. Die Werte laufen anschließend durch upsertAuthoritativeAnimeTitle,
// dessen strenger languages/title_types-JOIN ungültige Codes weiterhin still verwirft.
// Unvollständige Einträge (fehlende Sprache/Typ oder leerer Titel) werden übersprungen.
func appendAltTitleSlots(
	slots []authoritativeAnimeTitleSlotWrite,
	altTitles []models.AdminAnimeAltTitle,
) []authoritativeAnimeTitleSlotWrite {
	for _, alt := range altTitles {
		if alt.Language == nil || alt.Kind == nil {
			continue
		}

		languageCode := strings.TrimSpace(*alt.Language)
		titleType := strings.TrimSpace(*alt.Kind)
		title := strings.TrimSpace(alt.Title)
		if languageCode == "" || titleType == "" || title == "" {
			continue
		}

		value := title
		slots = append(slots, authoritativeAnimeTitleSlotWrite{
			Set:          true,
			LanguageCode: languageCode,
			TitleType:    titleType,
			Title:        &value,
		})
	}

	return slots
}
