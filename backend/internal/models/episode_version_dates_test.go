package models

import (
	"github.com/stretchr/testify/require"
	"testing"
	"time"
)

func TestValidateEpisodeVersionDates(t *testing.T) {
	for _, tc := range []struct {
		name, start, end string
		invalid          bool
	}{
		{"same day earlier time", "2013-07-18T20:00:00Z", "2013-07-18T00:00:00Z", false},
		{"earlier day", "2013-07-18T00:00:00Z", "2013-07-17T23:59:59Z", true},
		{"same instant different offsets", "2013-07-19T00:30:00+02:00", "2013-07-18T22:30:00Z", false},
		{"later displayed UTC day", "2013-07-18T23:00:00Z", "2013-07-19T00:00:00Z", false},
		{"unknown start", "", "2013-07-18T00:00:00Z", false},
		{"unknown completion", "2013-07-18T00:00:00Z", "", false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			parse := func(s string) *time.Time {
				if s == "" {
					return nil
				}
				v, e := time.Parse(time.RFC3339, s)
				require.NoError(t, e)
				return &v
			}
			err := ValidateEpisodeVersionDates(parse(tc.start), parse(tc.end))
			if tc.invalid {
				require.ErrorIs(t, err, ErrEpisodeVersionDateOrder)
			} else {
				require.NoError(t, err)
			}
		})
	}
}
