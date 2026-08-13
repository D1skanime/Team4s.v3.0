#!/usr/bin/env python3
"""Validate the Phase 128 public-member OpenAPI contract."""

from collections import Counter
from pathlib import Path
from typing import Any

import yaml


class UniqueKeyLoader(yaml.SafeLoader):
    """SafeLoader variant that rejects duplicate keys at every mapping level."""


def construct_unique_mapping(
    loader: UniqueKeyLoader,
    node: yaml.MappingNode,
    deep: bool = False,
) -> dict[Any, Any]:
    loader.flatten_mapping(node)
    mapping: dict[Any, Any] = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=deep)
        if key in mapping:
            raise yaml.constructor.ConstructorError(
                "while constructing a mapping",
                node.start_mark,
                f"found duplicate key {key!r}",
                key_node.start_mark,
            )
        mapping[key] = loader.construct_object(value_node, deep=deep)
    return mapping


UniqueKeyLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG,
    construct_unique_mapping,
)

ROOT = Path(__file__).resolve().parents[1]
CONTRACT = ROOT / "shared" / "contracts" / "openapi.yaml"
NEUTRAL_MESSAGE = "profil nicht verf\u00fcgbar"

OPERATIONS = {
    "/api/v1/members/{slug}": (
        "getMemberProfile",
        "#/components/schemas/PublicMemberProfileEnvelope",
    ),
    "/api/v1/members/{slug}/projects": (
        "getMemberProjects",
        "#/components/schemas/PublicMemberProjectsEnvelope",
    ),
    "/api/v1/members/{slug}/contributions": (
        "getMemberContributions",
        "#/components/schemas/PublicMemberContributionsResponse",
    ),
    "/api/v1/anime/{animeId}/group/{groupId}/members/{memberSlug}": (
        "getProjectMemberSummary",
        "#/components/schemas/ProjectMemberSummary",
    ),
    "/api/v1/anime/{animeId}/group/{groupId}/members/{memberSlug}/notes": (
        "getProjectMemberNotes",
        "#/components/schemas/ProjectMemberNotesCursorResponse",
    ),
    "/api/v1/anime/{animeId}/group/{groupId}/members/{memberSlug}/media": (
        "getProjectMemberMedia",
        "#/components/schemas/ProjectMemberMediaCursorResponse",
    ),
    "/api/v1/anime/{animeId}/group/{groupId}/members/{memberSlug}/releases": (
        "getProjectMemberReleases",
        "#/components/schemas/ProjectMemberReleasesCursorResponse",
    ),
}


def response_schema(response: dict[str, Any]) -> str:
    return response["content"]["application/json"]["schema"]["$ref"]


def assert_cache_headers(response: dict[str, Any], context: str) -> None:
    headers = response.get("headers", {})
    expected = {
        "Cache-Control": ["private, no-store"],
        "Vary": ["Authorization"],
    }
    for name, enum_value in expected.items():
        actual = headers.get(name, {}).get("schema", {}).get("enum")
        assert actual == enum_value, f"{context}: {name} must be {enum_value[0]!r}"


def collect_operation_ids(paths: dict[str, Any]) -> list[str]:
    operation_ids: list[str] = []
    for path_item in paths.values():
        for method, operation in path_item.items():
            if method.lower() in {"get", "put", "post", "delete", "patch", "head", "options", "trace"}:
                operation_id = operation.get("operationId")
                if operation_id:
                    operation_ids.append(operation_id)
    return operation_ids


def main() -> None:
    document = yaml.load(CONTRACT.read_text(encoding="utf-8"), Loader=UniqueKeyLoader)
    paths = document["paths"]
    schemas = document["components"]["schemas"]

    operation_ids = collect_operation_ids(paths)
    duplicates = sorted(
        operation_id
        for operation_id, count in Counter(operation_ids).items()
        if count > 1
    )
    assert not duplicates, f"duplicate operationIds: {duplicates}"

    for path, (operation_id, success_schema) in OPERATIONS.items():
        operation = paths[path]["get"]
        context = f"GET {path}"
        assert operation["operationId"] == operation_id, f"{context}: operationId drift"
        assert operation.get("security") == [{"bearerAuth": []}, {}], (
            f"{context}: optional bearer security required"
        )
        assert "viewer-dependent" in operation.get("description", "").lower(), (
            f"{context}: cache/access description missing"
        )
        assert response_schema(operation["responses"]["200"]) == success_schema, (
            f"{context}: incorrect 200 schema"
        )
        assert response_schema(operation["responses"]["404"]) == (
            "#/components/schemas/ErrorResponse"
        ), f"{context}: incorrect 404 schema"
        assert NEUTRAL_MESSAGE in str(operation["responses"]["404"]), (
            f"{context}: neutral 404 example missing"
        )
        assert_cache_headers(operation["responses"]["200"], f"{context} 200")
        assert_cache_headers(operation["responses"]["404"], f"{context} 404")

    assert "MemberProfileHidden" not in schemas
    assert schemas["ProfileVisibility"]["enum"] == ["public", "private"]
    profile = schemas["PublicMemberProfileData"]
    assert "slug" in profile["required"]
    assert profile["properties"]["slug"]["type"] == "string"
    assert "app_user_id" not in profile["properties"]

    envelope = schemas["PublicMemberProfileEnvelope"]
    assert envelope["required"] == ["data", "viewer"]
    viewer = schemas["PublicMemberViewer"]
    assert viewer["required"] == ["is_owner", "is_private_preview"]

    contributions = schemas["PublicMemberContributionsResponse"]
    assert contributions["required"] == ["role_timeline", "has_unverified"]

    print("Phase 128 member OpenAPI contract: OK")


if __name__ == "__main__":
    main()
