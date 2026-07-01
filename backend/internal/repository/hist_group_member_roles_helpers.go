package repository

import "reflect"

func IsRoleActive(r HistGroupMemberRoleRow) bool {
	v := reflect.ValueOf(r)
	field := v.FieldByName("EndedDate")
	return field.IsValid() && field.IsNil()
}
