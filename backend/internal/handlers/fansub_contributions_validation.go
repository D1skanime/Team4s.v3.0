package handlers

var historicalContributionStatuses = map[string]struct{}{
	"draft":      {},
	"historical": {},
	"confirmed":  {},
	"disputed":   {},
}

var historicalContributionVisibilities = map[string]struct{}{
	"internal": {},
	"public":   {},
}

func normalizeHistoricalContributionStatus(value string) (string, bool) {
	if value == "" {
		return "historical", true
	}
	_, ok := historicalContributionStatuses[value]
	return value, ok
}

func validHistoricalContributionStatus(value string) bool {
	_, ok := historicalContributionStatuses[value]
	return ok
}

func normalizeHistoricalContributionVisibility(value string) (string, bool) {
	if value == "" {
		return "internal", true
	}
	_, ok := historicalContributionVisibilities[value]
	return value, ok
}

func validHistoricalContributionVisibility(value string) bool {
	_, ok := historicalContributionVisibilities[value]
	return ok
}
