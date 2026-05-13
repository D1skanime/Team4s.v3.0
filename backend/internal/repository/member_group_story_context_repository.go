package repository

import (
	"context"
	"fmt"
)

type MemberStoryContextMember struct {
	ID       int64
	Nickname string
}

type MemberStoryContextRole struct {
	ID    int64
	Name  string
	Label string
}

type MemberStoryContext struct {
	Members []MemberStoryContextMember `json:"members"`
	Roles   []MemberStoryContextRole   `json:"roles"`
}

// GetMemberGroupStoryContext returns selectable members and contributor roles for the
// member-story editor. The fansubGroupID keeps the method scoped to the current admin view.
func (r *FansubNotesRepository) GetMemberGroupStoryContext(
	ctx context.Context,
	fansubGroupID int64,
) (*MemberStoryContext, error) {
	_ = fansubGroupID

	memberRows, err := r.db.Query(ctx, `
		SELECT id, nickname
		FROM members
		WHERE nickname IS NOT NULL
		  AND btrim(nickname) <> ''
		ORDER BY nickname ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list member story context members for group %d: %w", fansubGroupID, err)
	}
	defer memberRows.Close()

	members := make([]MemberStoryContextMember, 0)
	for memberRows.Next() {
		var member MemberStoryContextMember
		if err := memberRows.Scan(&member.ID, &member.Nickname); err != nil {
			return nil, fmt.Errorf("scan member story context member: %w", err)
		}
		members = append(members, member)
	}
	if err := memberRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate member story context members: %w", err)
	}

	roleRows, err := r.db.Query(ctx, `
		SELECT id, name, label
		FROM contributor_roles
		ORDER BY label ASC, name ASC
	`)
	if err != nil {
		return nil, fmt.Errorf("list member story context roles for group %d: %w", fansubGroupID, err)
	}
	defer roleRows.Close()

	roles := make([]MemberStoryContextRole, 0)
	for roleRows.Next() {
		var role MemberStoryContextRole
		if err := roleRows.Scan(&role.ID, &role.Name, &role.Label); err != nil {
			return nil, fmt.Errorf("scan member story context role: %w", err)
		}
		roles = append(roles, role)
	}
	if err := roleRows.Err(); err != nil {
		return nil, fmt.Errorf("iterate member story context roles: %w", err)
	}

	return &MemberStoryContext{
		Members: members,
		Roles:   roles,
	}, nil
}
