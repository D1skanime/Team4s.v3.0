/**
 * Trivial, non-test consumer module for the Welle-2 barrel-compat canary tests
 * (174-02, D-10). Each canary test file mocks `@/lib/api` differently (literal
 * factory, `vi.importActual` partial mock, namespace `vi.spyOn`, or no mock at
 * all) and needs something real to call through the barrel to prove the mock
 * actually intercepts calls. Kept deliberately minimal — no logic beyond
 * forwarding to the real barrel exports.
 */
import { apiClientFetch, resolveApiUrl } from "@/lib/api";

export function callApiClientFetch(): ReturnType<typeof apiClientFetch> {
  return apiClientFetch("/api/v1/canary-probe", { skipAuthPreflight: true });
}

export function callResolveApiUrl(): ReturnType<typeof resolveApiUrl> {
  return resolveApiUrl("/api/x");
}
