// Composed action hook for admin/fansubs/create (174-14, D-13/D-14).
//
// Extracted verbatim from AdminFansubCreateContent: refreshCreatedState,
// addAlias, removeAlias and save keep their exact bodies — only their
// closed-over useState values/setters become explicit named parameters.
// State ownership stays centralized in the page component (this hook does
// not call useState/useEffect itself), matching the
// useEpisodeManagerBulkMutations analog's "state stays in the facade" rule.

import { Dispatch, FormEvent, SetStateAction } from "react";

import {
  createFansubAlias,
  createFansubGroup,
  deleteFansubAlias,
  getFansubAliases,
  getFansubByID,
  updateFansubGroup,
} from "@/lib/api";
import { EditableMediaValue } from "@/components/admin/MediaUpload";
import { FansubAlias, FansubGroup } from "@/types/fansub";

import {
  CommunityLinkDraft,
  FormState,
  errMessage,
  formToCreatePayload,
  formToPatchPayload,
  mapGroupLinks,
  mapGroupMedia,
  mapGroupToForm,
  slugify,
  sortAliases,
  syncFansubLinks,
} from "./adminFansubCreateHelpers";

interface UseAdminFansubCreateActionsParams {
  createdGroup: FansubGroup | null;
  setCreatedGroup: Dispatch<SetStateAction<FansubGroup | null>>;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  setInitialForm: Dispatch<SetStateAction<FormState>>;
  aliases: FansubAlias[];
  setAliases: Dispatch<SetStateAction<FansubAlias[]>>;
  aliasDrafts: string[];
  setAliasDrafts: Dispatch<SetStateAction<string[]>>;
  setInitialAliasDrafts: Dispatch<SetStateAction<string[]>>;
  aliasInput: string;
  setAliasInput: Dispatch<SetStateAction<string>>;
  setAliasError: Dispatch<SetStateAction<string | null>>;
  setAliasBusy: Dispatch<SetStateAction<boolean>>;
  links: CommunityLinkDraft[];
  setLinks: Dispatch<SetStateAction<CommunityLinkDraft[]>>;
  initialLinks: CommunityLinkDraft[];
  setInitialLinks: Dispatch<SetStateAction<CommunityLinkDraft[]>>;
  logoMedia: EditableMediaValue | null;
  setLogoMedia: Dispatch<SetStateAction<EditableMediaValue | null>>;
  setInitialLogoMedia: Dispatch<SetStateAction<EditableMediaValue | null>>;
  bannerMedia: EditableMediaValue | null;
  setBannerMedia: Dispatch<SetStateAction<EditableMediaValue | null>>;
  setInitialBannerMedia: Dispatch<SetStateAction<EditableMediaValue | null>>;
  setManualSlug: Dispatch<SetStateAction<boolean>>;
  setSaving: Dispatch<SetStateAction<boolean>>;
  hasRuntimeAuthToken: boolean;
  invalid: boolean;
  setError: Dispatch<SetStateAction<string | null>>;
  setToast: Dispatch<SetStateAction<string | null>>;
}

export function useAdminFansubCreateActions({
  createdGroup,
  setCreatedGroup,
  form,
  setForm,
  setInitialForm,
  aliases,
  setAliases,
  aliasDrafts,
  setAliasDrafts,
  setInitialAliasDrafts,
  aliasInput,
  setAliasInput,
  setAliasError,
  setAliasBusy,
  links,
  setLinks,
  initialLinks,
  setInitialLinks,
  logoMedia,
  setLogoMedia,
  setInitialLogoMedia,
  bannerMedia,
  setBannerMedia,
  setInitialBannerMedia,
  setManualSlug,
  setSaving,
  hasRuntimeAuthToken,
  invalid,
  setError,
  setToast,
}: UseAdminFansubCreateActionsParams) {
  async function refreshCreatedState(fansubID: number): Promise<void> {
    const [groupResponse, aliasResponse] = await Promise.all([
      getFansubByID(fansubID),
      getFansubAliases(fansubID),
    ]);
    const nextGroup = groupResponse.data;
    const nextForm = mapGroupToForm(nextGroup);
    const nextMedia = mapGroupMedia(nextGroup);
    const nextLinks = mapGroupLinks(nextGroup);
    const nextAliases = aliasResponse.data.sort((a, b) =>
      a.alias.localeCompare(b.alias, "de"),
    );

    setCreatedGroup(nextGroup);
    setForm(nextForm);
    setInitialForm(nextForm);
    setLogoMedia(nextMedia.logo);
    setBannerMedia(nextMedia.banner);
    setInitialLogoMedia(nextMedia.logo);
    setInitialBannerMedia(nextMedia.banner);
    setLinks(nextLinks);
    setInitialLinks(nextLinks);
    setAliases(nextAliases);
    setAliasDrafts(nextAliases.map((item) => item.alias));
    setInitialAliasDrafts(nextAliases.map((item) => item.alias));
    setManualSlug(nextForm.slug !== slugify(nextForm.name));
  }

  const addAlias = async () => {
    const value = aliasInput.trim();
    if (!value) return;
    if (
      aliasDrafts.some((item) => item.toLowerCase() === value.toLowerCase())
    ) {
      setAliasError("Alias existiert bereits.");
      return;
    }

    setAliasBusy(true);
    setAliasError(null);
    try {
      if (!createdGroup || !hasRuntimeAuthToken) {
        setAliasDrafts((current) => sortAliases([...current, value]));
        setAliasInput("");
        return;
      }

      const response = await createFansubAlias(createdGroup.id, {
        alias: value,
      });
      const nextAliases = [...aliases, response.data].sort((a, b) =>
        a.alias.localeCompare(b.alias, "de"),
      );
      const nextDrafts = nextAliases.map((item) => item.alias);
      setAliases(nextAliases);
      setAliasDrafts(nextDrafts);
      setInitialAliasDrafts(nextDrafts);
      setAliasInput("");
      setToast("Alias hinzugefügt.");
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setAliasBusy(false);
    }
  };

  const removeAlias = async (aliasValue: string) => {
    if (!createdGroup || !hasRuntimeAuthToken) {
      setAliasDrafts((current) =>
        current.filter((item) => item !== aliasValue),
      );
      return;
    }

    const alias = aliases.find((item) => item.alias === aliasValue);
    if (!alias) {
      setAliasDrafts((current) =>
        current.filter((item) => item !== aliasValue),
      );
      return;
    }

    setAliasBusy(true);
    setAliasError(null);
    try {
      await deleteFansubAlias(createdGroup.id, alias.id);
      const nextAliases = aliases.filter((item) => item.id !== alias.id);
      const nextDrafts = nextAliases.map((item) => item.alias);
      setAliases(nextAliases);
      setAliasDrafts(nextDrafts);
      setInitialAliasDrafts(nextDrafts);
      setToast("Alias entfernt.");
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setAliasBusy(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasRuntimeAuthToken || invalid) return;

    setSaving(true);
    setError(null);
    try {
      if (!createdGroup) {
        const createResponse = await createFansubGroup(
          formToCreatePayload(form),
        );
        const fansubID = createResponse.data.id;

        for (const alias of aliasDrafts) {
          await createFansubAlias(fansubID, { alias });
        }

        await syncFansubLinks(fansubID, [], links);
        await refreshCreatedState(fansubID);
        setToast(
          "Fansub angelegt. Medien können jetzt direkt über den DB-Asset-Flow hochgeladen werden.",
        );
      } else {
        await updateFansubGroup(
          createdGroup.id,
          formToPatchPayload(form, logoMedia, bannerMedia),
        );
        await syncFansubLinks(createdGroup.id, initialLinks, links);
        await refreshCreatedState(createdGroup.id);
        setToast("Änderungen gespeichert.");
      }
    } catch (nextError) {
      setError(errMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  return { refreshCreatedState, addAlias, removeAlias, save };
}
