package repository_test

import (
	"reflect"
	"testing"
	"time"

	"team4s.v3/backend/internal/repository"
)

func TestHistRoleStructHasDateFields(t *testing.T) {
	rowType := reflect.TypeOf(repository.HistGroupMemberRoleRow{})
	startedDate, ok := rowType.FieldByName("StartedDate")
	if !ok {
		t.Fatal("HistGroupMemberRoleRow.StartedDate *time.Time nicht gefunden - D-02 nicht implementiert")
	}
	if startedDate.Type.Kind() != reflect.Ptr || startedDate.Type.Elem() != reflect.TypeOf(time.Time{}) {
		t.Fatalf("HistGroupMemberRoleRow.StartedDate hat Typ %s, erwartet *time.Time", startedDate.Type)
	}
	endedDate, ok := rowType.FieldByName("EndedDate")
	if !ok {
		t.Fatal("HistGroupMemberRoleRow.EndedDate *time.Time nicht gefunden - D-02 nicht implementiert")
	}
	if endedDate.Type.Kind() != reflect.Ptr || endedDate.Type.Elem() != reflect.TypeOf(time.Time{}) {
		t.Fatalf("HistGroupMemberRoleRow.EndedDate hat Typ %s, erwartet *time.Time", endedDate.Type)
	}
}

func TestHistRoleEndDateRule_NilEnddateIsActive(t *testing.T) {
	row := repository.HistGroupMemberRoleRow{}
	if !repository.IsRoleActive(row) {
		t.Fatal("historische Rolle ohne Enddatum muss als weiterhin aktiv gelten")
	}
}

func TestHistRoleEndDateRule_SetEnddateIsHistorical(t *testing.T) {
	row := repository.HistGroupMemberRoleRow{}
	rowValue := reflect.ValueOf(&row).Elem()
	endedDate := rowValue.FieldByName("EndedDate")
	if !endedDate.IsValid() {
		t.Fatal("HistGroupMemberRoleRow.EndedDate *time.Time nicht gefunden - D-04 nicht implementiert")
	}
	end := time.Date(2009, time.December, 31, 0, 0, 0, 0, time.UTC)
	endedDate.Set(reflect.ValueOf(&end))
	if repository.IsRoleActive(row) {
		t.Fatal("historische Rolle mit Enddatum darf nicht als aktive Rolle gelten")
	}
}
