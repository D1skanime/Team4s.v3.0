// Package main implements the D-08 hygiene report for Befund #27: a one-off, PURELY READ-ONLY
// CLI tool that lists app_users rows whose keycloak_subject no longer has a matching row in
// Keycloak's own user_entity table (orphaned by a Keycloak delete+recreate). This file contains
// ONLY SELECT statements -- no DELETE/UPDATE/INSERT anywhere, proven structurally by
// TestReportPackageNeverMutatesData in report_test.go, not just by convention.
package main

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// AppUserSubject is one app_users row as read from the Team4s database.
type AppUserSubject struct {
	ID              int64
	KeycloakSubject string
	Email           string
}

// OrphanedAppUser is an AppUserSubject whose KeycloakSubject has no matching row in Keycloak's
// user_entity table. Deliberately a separate type from AppUserSubject (identical fields) so the
// function signature at the computeOrphanedAppUsers call boundary reads as "the result of a
// comparison", not just "the same input echoed back".
type OrphanedAppUser struct {
	ID              int64
	KeycloakSubject string
	Email           string
}

// fetchAppUserSubjects reads every app_users row's id/keycloak_subject/email from the Team4s
// database. Read-only: SELECT only.
func fetchAppUserSubjects(ctx context.Context, pool *pgxpool.Pool) ([]AppUserSubject, error) {
	rows, err := pool.Query(ctx, `SELECT id, keycloak_subject, email FROM app_users ORDER BY id`)
	if err != nil {
		return nil, fmt.Errorf("query app_users: %w", err)
	}
	defer rows.Close()

	var subjects []AppUserSubject
	for rows.Next() {
		var s AppUserSubject
		if err := rows.Scan(&s.ID, &s.KeycloakSubject, &s.Email); err != nil {
			return nil, fmt.Errorf("scan app_users row: %w", err)
		}
		subjects = append(subjects, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate app_users rows: %w", err)
	}
	return subjects, nil
}

// fetchKeycloakSubjectIDs reads every user id from Keycloak's own user_entity table into a set
// for cheap membership lookup. Read-only: SELECT only.
func fetchKeycloakSubjectIDs(ctx context.Context, pool *pgxpool.Pool) (map[string]struct{}, error) {
	rows, err := pool.Query(ctx, `SELECT id FROM user_entity`)
	if err != nil {
		return nil, fmt.Errorf("query user_entity: %w", err)
	}
	defer rows.Close()

	ids := make(map[string]struct{})
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan user_entity row: %w", err)
		}
		ids[id] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user_entity rows: %w", err)
	}
	return ids, nil
}

// computeOrphanedAppUsers is a pure Set-Diff: it returns every AppUserSubject whose
// KeycloakSubject does NOT appear as a key in keycloakSubjectIDs, preserving the input order of
// appUsers. No DB access here -- this is the reusable, independently testable core of the D-08
// comparison.
func computeOrphanedAppUsers(appUsers []AppUserSubject, keycloakSubjectIDs map[string]struct{}) []OrphanedAppUser {
	var orphaned []OrphanedAppUser
	for _, u := range appUsers {
		if _, ok := keycloakSubjectIDs[u.KeycloakSubject]; !ok {
			orphaned = append(orphaned, OrphanedAppUser{
				ID:              u.ID,
				KeycloakSubject: u.KeycloakSubject,
				Email:           u.Email,
			})
		}
	}
	return orphaned
}

// runReport is the testable core of the D-08 hygiene report: it reads both sides (Team4s
// app_users, Keycloak user_entity) and returns the set-diff via computeOrphanedAppUsers. Never
// writes anything -- read-only by construction (SELECT-only fetchers + a pure in-memory diff).
func runReport(ctx context.Context, teamPool, keycloakPool *pgxpool.Pool) ([]OrphanedAppUser, error) {
	appUsers, err := fetchAppUserSubjects(ctx, teamPool)
	if err != nil {
		return nil, fmt.Errorf("fetch app_users subjects: %w", err)
	}

	keycloakSubjectIDs, err := fetchKeycloakSubjectIDs(ctx, keycloakPool)
	if err != nil {
		return nil, fmt.Errorf("fetch keycloak subject ids: %w", err)
	}

	return computeOrphanedAppUsers(appUsers, keycloakSubjectIDs), nil
}
