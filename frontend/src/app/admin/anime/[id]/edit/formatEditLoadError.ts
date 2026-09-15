import { formatAdminError } from "../../utils/studio-helpers";

export function formatEditLoadError(error: unknown): string {
  return formatAdminError(error, "Anime konnte nicht geladen werden.");
}
