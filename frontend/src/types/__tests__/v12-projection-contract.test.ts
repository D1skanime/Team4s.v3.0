import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import type {
  DomainProjectionContributorRow,
  DomainProjectionDisputeState,
  DomainProjectionHistoricalRow,
  DomainProjectionMemberRow,
  DomainProjectionProfileStatus,
  DomainProjectionResponse,
  DomainProjectionReviewStatus,
} from "@/types/domain-projection";
import type {
  MediaOwnershipOwnerType,
  MediaOwnershipRow,
} from "@/types/media-ownership";

type ExactUnion<Actual, Expected> =
  Exclude<Actual, Expected> extends never
    ? Exclude<Expected, Actual> extends never
      ? true
      : never
    : never;

type ExactKeys<T, Keys extends readonly PropertyKey[]> =
  Exclude<keyof T, Keys[number]> extends never
    ? Exclude<Keys[number], keyof T> extends never
      ? true
      : never
    : never;

const profileStatuses = ["active", "historical", "memorial"] as const;
const disputeStates = ["none", "open", "resolved"] as const;
const reviewStatuses = [
  "in_review",
  "approved",
  "rejected",
  "archived",
  "removed",
] as const;
const ownerTypes = [
  "member",
  "fansub_group",
  "release_version",
  "release_theme",
] as const;

const memberKeys = [
  "id",
  "member_id",
  "member_display_name",
  "member_slug",
  "roles",
  "role_labels",
  "status",
  "profile_status",
  "claimed",
] as const;
const historicalKeys = [
  "id",
  "member_id",
  "member_display_name",
  "member_slug",
  "roles",
  "role_labels",
  "joined_year",
  "left_year",
  "status",
  "profile_status",
  "claimed",
] as const;
const contributorKeys = [
  "id",
  "anime_id",
  "anime_title",
  "member_id",
  "member_display_name",
  "member_slug",
  "roles",
  "role_labels",
  "started_year",
  "ended_year",
  "status",
  "dispute_state",
  "visibility",
  "review_status",
] as const;
const mediaOwnershipKeys = [
  "id",
  "owner_type",
  "owner_id",
  "media_category",
  "visibility",
  "review_status",
  "review_status_label",
  "file_path",
  "original_file_path",
  "caption",
  "mime_type",
] as const;

const profileStatusExact: ExactUnion<
  DomainProjectionProfileStatus,
  (typeof profileStatuses)[number]
> = true;
const disputeStateExact: ExactUnion<
  DomainProjectionDisputeState,
  (typeof disputeStates)[number]
> = true;
const reviewStatusExact: ExactUnion<
  DomainProjectionReviewStatus,
  (typeof reviewStatuses)[number]
> = true;
const ownerTypeExact: ExactUnion<
  MediaOwnershipOwnerType,
  (typeof ownerTypes)[number]
> = true;
const memberKeysExact: ExactKeys<
  DomainProjectionMemberRow,
  typeof memberKeys
> = true;
const historicalKeysExact: ExactKeys<
  DomainProjectionHistoricalRow,
  typeof historicalKeys
> = true;
const contributorKeysExact: ExactKeys<
  DomainProjectionContributorRow,
  typeof contributorKeys
> = true;
const mediaOwnershipKeysExact: ExactKeys<
  MediaOwnershipRow,
  typeof mediaOwnershipKeys
> = true;

const openapi = readFileSync(
  new URL("../../../../shared/contracts/openapi.yaml", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");
const apiClientSource = readFileSync(
  new URL("../../lib/api.ts", import.meta.url),
  "utf8",
).replace(/\r\n/g, "\n");

function getOpenApiBlock(startMarker: string, endPattern: RegExp): string {
  const start = openapi.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = openapi.slice(start + startMarker.length);
  const end = rest.search(endPattern);
  return end === -1 ? rest : rest.slice(0, end);
}

function expectRequiredFields(schemaName: string, fields: readonly string[]) {
  const block = getOpenApiBlock(`    ${schemaName}:\n`, /\n    [A-Za-z][A-Za-z0-9]+:\n/);
  const requiredMatch = block.match(/\n      required:\n([\s\S]*?)\n      properties:/);
  expect(requiredMatch?.[1].match(/- ([a-z_]+)/g)?.map((line) => line.slice(2))).toEqual(
    [...fields],
  );
}

function expectInlineEnum(schemaName: string, values: readonly string[]) {
  const block = getOpenApiBlock(`    ${schemaName}:\n`, /\n    [A-Za-z][A-Za-z0-9]+:\n/);
  expect(block).toContain(`      enum: [${values.join(", ")}]`);
}

function getApiFunctionBlock(functionName: string): string {
  const startMarker = `export async function ${functionName}(`;
  const start = apiClientSource.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const rest = apiClientSource.slice(start);
  const nextFunction = rest.slice(startMarker.length).search(/\nexport async function /);
  return nextFunction === -1
    ? rest
    : rest.slice(0, startMarker.length + nextFunction);
}

function expectReadHelperUsesCentralApiSeam(
  functionName: string,
  expectedFragments: readonly string[],
) {
  const block = getApiFunctionBlock(functionName);
  const lowerBlock = block.toLowerCase();

  expect(block).toContain("getApiBaseUrl()");
  expect(block).toContain("apiClientFetch(");
  expect(block).toContain("parseApiErrorPayload(");
  expect(block).toContain("throw new ApiError(");
  for (const fragment of expectedFragments) {
    expect(block).toContain(fragment);
  }

  expect(lowerBlock).not.toContain("await fetch(");
  expect(lowerBlock).not.toContain(".data");
  expect(lowerBlock).not.toContain("localstorage");
  expect(lowerBlock).not.toContain("sessionstorage");
  expect(lowerBlock).not.toContain("document.cookie");
}

describe("v12 projection contract parity", () => {
  it("keeps TypeScript unions and object keys exact", () => {
    expect(profileStatusExact).toBe(true);
    expect(disputeStateExact).toBe(true);
    expect(reviewStatusExact).toBe(true);
    expect(ownerTypeExact).toBe(true);
    expect(memberKeysExact).toBe(true);
    expect(historicalKeysExact).toBe(true);
    expect(contributorKeysExact).toBe(true);
    expect(mediaOwnershipKeysExact).toBe(true);

    const response = {
      members: [],
      historical: [],
      contributors: [],
    } satisfies DomainProjectionResponse;
    expect(Object.keys(response)).toEqual(["members", "historical", "contributors"]);
  });

  it("documents the pinned paths as direct no-envelope responses", () => {
    const domainPath = getOpenApiBlock(
      "  /fansubs/{id}/domain-projection:\n",
      /\n  \/media-ownership\/\{ownerType\}\/\{ownerId\}:\n/,
    );
    const mediaPath = getOpenApiBlock(
      "  /media-ownership/{ownerType}/{ownerId}:\n",
      /\ncomponents:\n/,
    );

    expect(domainPath).toContain("$ref: \"#/components/schemas/DomainProjectionResponse\"");
    expect(domainPath).not.toMatch(/\n\s+data:/);
    expect(domainPath).not.toMatch(/\n\s+(post|patch|put|delete):/);
    expect(mediaPath).toContain("$ref: \"#/components/schemas/MediaOwnershipRow\"");
    expect(mediaPath).not.toMatch(/\n\s+data:/);
    expect(mediaPath).not.toMatch(/\n\s+(post|patch|put|delete):/);
  });

  it("keeps OpenAPI schema fields and enums aligned with the TS mirrors", () => {
    expectRequiredFields("DomainProjectionMemberRow", memberKeys);
    expectRequiredFields("DomainProjectionHistoricalRow", historicalKeys);
    expectRequiredFields("DomainProjectionContributorRow", contributorKeys);
    expectRequiredFields("MediaOwnershipRow", mediaOwnershipKeys);
    expectInlineEnum("DomainProjectionProfileStatus", profileStatuses);
    expectInlineEnum("DomainProjectionDisputeState", disputeStates);
    expectInlineEnum("DomainProjectionReviewStatus", reviewStatuses);
    expectInlineEnum("MediaOwnershipOwnerType", ownerTypes);
  });

  it("keeps projection reads behind the central api.ts helpers", () => {
    expectReadHelperUsesCentralApiSeam("getFansubGroupDomainProjection", [
      "/api/v1/fansubs/${groupID}/domain-projection",
      "return response.json() as Promise<DomainProjectionResponse>",
    ]);
    expectReadHelperUsesCentralApiSeam("getMediaOwnershipProjection", [
      "const encodedOwnerType = encodeURIComponent(ownerType)",
      "/api/v1/media-ownership/${encodedOwnerType}/${ownerID}",
      "return response.json() as Promise<MediaOwnershipProjectionResponse>",
    ]);
  });
});
