<#import "template.ftl" as layout>
<#import "field.ftl" as field>
<#import "user-profile-commons.ftl" as userProfileCommons>
<#import "register-commons.ftl" as registerCommons>
<@layout.registrationLayout displayMessage=messagesPerField.exists('global') displayRequiredFields=true; section>
<#--
  team4s theme baseline override of stock keycloak.v2/login/register.ftl
  (Keycloak 26.0.8, confirmed via
  `docker compose exec keycloak /opt/keycloak/bin/kc.sh --version`).

  Added for Plan 135-08 Task 1 (D-12/D-13 groundwork). Before this plan the
  team4s theme shipped NO .ftl overrides at all and inherited this file
  byte-for-byte from keycloak.v2 (see theme.properties' `parent=keycloak.v2`,
  and infra/keycloak/themes/team4s/login/ containing only
  messages/resources/theme.properties). This file is currently a functionally
  IDENTICAL copy of the stock keycloak.v2 template -- Task 2 layers the D-12
  email lock and D-13 invite-context changes on top of this baseline.

  REALITY, empirically verified against this realm (team4s), not assumed:
  - registrationEmailAsUsername is NOT set in realm-team4s.json (default
    false) -> the register form renders separate "username" and "email"
    user-profile attributes/fields (confirmed live: both <input id="username">
    and <input id="email"> are present and distinct).
  - Keycloak's registration endpoint does NOT natively prefill or lock the
    "email" attribute from `login_hint`. Proven by curling this realm's real
    /realms/team4s/protocol/openid-connect/registrations endpoint with a
    login_hint query param set to an email address (client_id=team4s-frontend,
    a valid registered redirect_uri, PKCE params): the rendered
    <input id="username"> carried the invited address as its `value`, while
    <input id="email"> stayed empty (value=""). This is server-side Keycloak
    Java behavior (FreeMarkerLoginFormsProvider maps `login_hint` only into
    the "username" form/profile attribute value) -- a theme-only change
    cannot redirect that mapping to "email" instead.
  - There is no realm userProfile "readOnly" attribute config in
    realm-team4s.json either, and editing that file is out of this theme-only
    plan's scope (also explicitly flagged as "leave untouched" for this plan).
    Even if such config existed, Keycloak's own readOnly rendering
    (user-profile-commons.ftl's inputTag macro: `<#if attribute.readOnly>
    disabled</#if>`) emits an HTML `disabled` attribute -- browsers exclude
    disabled fields' values from form submission -- not `readonly` (value
    still submitted), which is what D-12 actually needs.

  MECHANISM (implemented in Task 2): this realm's invited email always
  reaches the register form as an email-shaped `login_hint` (see
  frontend/src/lib/keycloakAuth.ts beginKeycloakLogin()/
  BeginKeycloakLoginOptions.loginHint, only ever set to the invited address
  by InviteAcceptFlow.tsx). So Task 2 reuses the login_hint-prefilled
  "username" attribute's value as the source of truth for an `invitedEmail`
  local whenever it looks like an email address (contains "@"), and renders
  the "email" attribute with custom markup carrying a real HTML `readonly`
  attribute plus that prefilled value.

  D-13 scope note: Keycloak does not forward arbitrary invite context (group
  name, inviter, role) to the registration template, so Task 2's context line
  is a generic, invite-shaped message, not a dynamic one naming the
  group/inviter -- exactly the fallback this plan's REALITY section
  anticipated.
-->

    <#if section = "header">
        <#if messageHeader??>
            ${kcSanitize(msg("${messageHeader}"))?no_esc}
        <#else>
            ${msg("registerTitle")}
        </#if>
    <#elseif section = "form">
        <#-- D-12/D-13 (Task 2): derive the invited email from the
             login_hint-prefilled "username" attribute value (see the file
             header comment above for why "username", not "email"). -->
        <#assign invitedEmail = "">
        <#list profile.attributes as team4sProbeAttribute>
            <#if (team4sProbeAttribute.name == "username" || team4sProbeAttribute.name == "email") && (team4sProbeAttribute.value!"")?contains("@")>
                <#assign invitedEmail = team4sProbeAttribute.value>
            </#if>
        </#list>

        <#-- 135-10 (D-15): "username" is no longer the visible identity field.
             "fansubName" is a new, separate, case-preserved user-profile
             attribute; the visible register-form field the user types into
             is now bound to it. "username" is rendered as a single hidden
             input further below and kept in sync via JS as
             lowercase(fansubName) on every input/blur/submit -- Keycloak
             itself additionally lowercases usernames server-side (empirically
             verified against this realm's live registration endpoint), so
             this keeps the derived login identity consistent with what KC
             will actually store, while the fansubName attribute preserves
             the user's original casing for display (members.nickname /
             account_display_name, see current_user_auth.go). -->

        <form id="kc-register-form" class="${properties.kcFormClass!}" action="${url.registrationAction}" method="post" novalidate="novalidate">

            <#if invitedEmail?has_content>
                <div class="${properties.kcFormGroupClass!} team4s-invite-context" id="team4s-invite-context">
                    <p>${kcSanitize(msg("team4sInviteContext"))?no_esc}</p>
                </div>
            </#if>

            <#-- 135-10 (D-15): the actual KC login identity, always derived
                 client-side from fansubName (see the sync script below).
                 Rendered empty regardless of any KC-side prefill (e.g. a
                 login_hint-populated "username" profile attribute value
                 during an invite flow) so a stray, not-yet-lowercased or
                 email-shaped value never reaches submission before the sync
                 script overwrites it. -->
            <input type="hidden" id="username" name="username" value="" />

            <#-- D-12 (Task 2): this is user-profile-commons.ftl's own
                 userProfileFormFields loop, inlined instead of called via the
                 macro import, so the "email" attribute's <input> can be given
                 a real HTML `readonly` attribute (value still submitted)
                 instead of the macro's built-in `disabled` behavior (value
                 dropped from submission -- see file header comment). Every
                 other attribute keeps calling the stock
                 userProfileCommons.inputFieldByType macro unchanged. -->
            <#assign currentGroup="">
            <#list profile.attributes as attribute>

                <#assign group = (attribute.group)!"">
                <#if group != currentGroup>
                    <#assign currentGroup=group>
                    <#if currentGroup != "">
                        <div class="${properties.kcFormGroupClass!}"
                        <#list group.html5DataAnnotations as key, value>
                            data-${key}="${value}"
                        </#list>
                        >

                            <#assign groupDisplayHeader=group.displayHeader!"">
                            <#if groupDisplayHeader != "">
                                <#assign groupHeaderText=advancedMsg(groupDisplayHeader)!group>
                            <#else>
                                <#assign groupHeaderText=group.name!"">
                            </#if>
                            <div class="${properties.kcContentWrapperClass!}">
                                <label id="header-${attribute.group.name}" class="${kcFormGroupHeader!}">${groupHeaderText}</label>
                            </div>

                            <#assign groupDisplayDescription=group.displayDescription!"">
                            <#if groupDisplayDescription != "">
                                <#assign groupDescriptionText=advancedMsg(groupDisplayDescription)!"">
                                <div class="${properties.kcLabelWrapperClass!}">
                                    <label id="description-${group.name}" class="${properties.kcLabelClass!}">${groupDescriptionText}</label>
                                </div>
                            </#if>
                        </div>
                    </#if>
                </#if>

                <#-- 135-10 (D-15): "username" is only ever rendered once, as the
                     hidden field above -- skip its normal labeled field-group
                     entirely so no visible/duplicate "username" input exists. -->
                <#-- Keycloak injects the optional technical locale attribute although the
                     Team4s profile contract does not expose it. The realm's default locale
                     is already de, so it must not appear as a registration input. -->
                <#if attribute.name != "username" && attribute.name != "locale">
                <#-- A duplicate lowercase(fansubName)-derived username collides
                     server-side with the hidden "username" attribute, not the
                     visible "fansubName" one -- surface that error under the
                     field the user actually sees and can fix. -->
                <#assign team4sFansubNameError = "">
                <#if attribute.name == "fansubName">
                    <#if messagesPerField.existsError('fansubName')>
                        <#assign team4sFansubNameError = kcSanitize(messagesPerField.get('fansubName'))?no_esc>
                    <#elseif messagesPerField.existsError('username')>
                        <#assign team4sFansubNameError = kcSanitize(messagesPerField.get('username'))?no_esc>
                    </#if>
                </#if>
                <@field.group name=attribute.name label=advancedMsg(attribute.displayName!'') error=(attribute.name == "fansubName")?then(team4sFansubNameError, kcSanitize(messagesPerField.get('${attribute.name}'))?no_esc) required=attribute.required>
                    <div class="${properties.kcInputWrapperClass!}">
                        <#if attribute.annotations.inputHelperTextBefore??>
                            <div class="${properties.kcInputHelperTextBeforeClass!}" id="form-help-text-before-${attribute.name}" aria-live="polite">${kcSanitize(advancedMsg(attribute.annotations.inputHelperTextBefore))?no_esc}</div>
                        </#if>

                        <#if attribute.name == "email" && invitedEmail?has_content>
                            <#-- D-12: locked, server-rendered readonly + prefilled email field. -->
                            <span class="${properties.kcInputClass} team4s-email-locked">
                                <#-- Auto-escaping (HTML output format) is already active for this
                                     template, matching every other attribute value output in this
                                     file (e.g. inputTag's `value="${(value!'')}"` in
                                     user-profile-commons.ftl) -- an explicit ?html here is rejected
                                     by FreeMarker as redundant/double-escaping, not a missing
                                     mitigation. -->
                                <input type="text" id="email" name="email" value="${invitedEmail}" class="${properties.kcInputClass!} team4s-input-readonly"
                                    aria-invalid="<#if messagesPerField.existsError('email')>true</#if>"
                                    readonly
                                    autocomplete="email"
                                />
                            </span>
                            <div class="${properties.kcInputHelperTextAfterClass!}" id="form-help-text-after-email" aria-live="polite">${kcSanitize(msg("team4sEmailLockedHelp"))?no_esc}</div>
                        <#elseif attribute.name == "fansubName">
                            <#-- 135-10 (D-15): the visible identity field. Free-typed,
                                 original casing preserved and submitted as-is into the
                                 new fansubName attribute; the hidden "username" field
                                 (above) is kept as lowercase(this value) via JS. -->
                            <input type="text" id="fansubName" name="fansubName" value="${(attribute.value!'')}"
                                class="${properties.kcInputClass!}"
                                aria-invalid="<#if team4sFansubNameError?has_content>true</#if>"
                                autocomplete="username" autofocus
                            />
                            <#if attribute.annotations.inputHelperTextAfter??>
                                <div class="${properties.kcInputHelperTextAfterClass!}" id="form-help-text-after-fansubName" aria-live="polite">${kcSanitize(advancedMsg(attribute.annotations.inputHelperTextAfter))?no_esc}</div>
                            </#if>
                        <#else>
                            <@userProfileCommons.inputFieldByType attribute=attribute/>
                            <#if attribute.annotations.inputHelperTextAfter??>
                                <div class="${properties.kcInputHelperTextAfterClass!}" id="form-help-text-after-${attribute.name}" aria-live="polite">${kcSanitize(advancedMsg(attribute.annotations.inputHelperTextAfter))?no_esc}</div>
                            </#if>
                        </#if>
                    </div>
                </@field.group>
                </#if>

                <#-- render password fields just under fansubName (the visible identity field) or email (if used as username) -->
                <#if passwordRequired?? && (attribute.name == 'fansubName' || (attribute.name == 'email' && realm.registrationEmailAsUsername))>
                    <@field.password name="password" required=true label=msg("password") autocomplete="new-password" />
                    <@field.password name="password-confirm" required=true label=msg("passwordConfirm") autocomplete="new-password" />
                </#if>
            </#list>

            <script type="module">
                (function () {
                    const fansubInput = document.getElementById("fansubName");
                    const usernameInput = document.getElementById("username");
                    const form = document.getElementById("kc-register-form");
                    if (!fansubInput || !usernameInput || !form) return;
                    const syncUsername = () => {
                        usernameInput.value = fansubInput.value.toLowerCase();
                    };
                    fansubInput.addEventListener("input", syncUsername);
                    fansubInput.addEventListener("blur", syncUsername);
                    form.addEventListener("submit", syncUsername);
                    syncUsername();
                })();
            </script>

            <#list profile.html5DataAnnotations?keys as key>
                <script type="module" src="${url.resourcesPath}/js/${key}.js"></script>
            </#list>

            <@registerCommons.termsAcceptance/>

            <#if recaptchaRequired?? && (recaptchaVisible!false)>
                <div class="form-group">
                    <div class="${properties.kcInputWrapperClass!}">
                        <div class="g-recaptcha" data-size="compact" data-sitekey="${recaptchaSiteKey}" data-action="${recaptchaAction}"></div>
                    </div>
                </div>
            </#if>

            <#if recaptchaRequired?? && !(recaptchaVisible!false)>
                <script>
                    function onSubmitRecaptcha(token) {
                        document.getElementById("kc-register-form").requestSubmit();
                    }
                </script>
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <button class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!} g-recaptcha"
                            data-sitekey="${recaptchaSiteKey}" data-callback="onSubmitRecaptcha" data-action="${recaptchaAction}" type="submit">
                        ${msg("doRegister")}
                    </button>
                </div>
            <#else>
                <div id="kc-form-buttons" class="${properties.kcFormButtonsClass!}">
                    <input class="${properties.kcButtonClass!} ${properties.kcButtonPrimaryClass!} ${properties.kcButtonBlockClass!} ${properties.kcButtonLargeClass!}" type="submit" value="${msg("doRegister")}"/>
                </div>
            </#if>

            <div class="${properties.kcFormGroupClass!} pf-v5-c-login__main-footer-band">
                <div id="kc-form-options" class="${properties.kcFormOptionsClass!} pf-v5-c-login__main-footer-band-item">
                    <div class="${properties.kcFormOptionsWrapperClass!}">
                        <span><a href="${url.loginUrl}">${kcSanitize(msg("backToLogin"))?no_esc}</a></span>
                    </div>
                </div>
            </div>

        </form>

        <template id="errorTemplate">
            <div class="${properties.kcFormHelperTextClass}" aria-live="polite">
                <div class="${properties.kcInputHelperTextClass}">
                    <div class="${properties.kcInputHelperTextItemClass} ${properties.kcError}">
                        <ul class="${properties.kcInputErrorMessageClass}">
                        </ul>
                    </div>
                </div>
            </div>
        </template>
        <template id="errorItemTemplate">
            <li></li>
        </template>

        <script type="module">
            import { validatePassword } from "${url.resourcesPath}/js/password-policy.js";

            const activePolicies = [
                { name: "length", policy: { value: ${passwordPolicies.length!-1}, error: "${msg('invalidPasswordMinLengthMessage')}"} },
                { name: "maxLength", policy: { value: ${passwordPolicies.maxLength!-1}, error: "${msg('invalidPasswordMaxLengthMessage')}"} },
                { name: "lowerCase", policy: { value: ${passwordPolicies.lowerCase!-1}, error: "${msg('invalidPasswordMinLowerCaseCharsMessage')}"} },
                { name: "upperCase", policy: { value: ${passwordPolicies.upperCase!-1}, error: "${msg('invalidPasswordMinUpperCaseCharsMessage')}"} },
                { name: "digits", policy: { value: ${passwordPolicies.digits!-1}, error: "${msg('invalidPasswordMinDigitsMessage')}"} },
                { name: "specialChars", policy: { value: ${passwordPolicies.specialChars!-1}, error: "${msg('invalidPasswordMinSpecialCharsMessage')}"} }
            ].filter(p => p.policy.value !== -1);

            document.getElementById("password").addEventListener("change", (event) => {
                const serverErrors = document.getElementById("input-error-password");
                if (serverErrors) {
                    serverErrors.remove();
                }

                const template = document.querySelector("#errorTemplate").content.cloneNode(true);

                const errors = validatePassword(event.target.value, activePolicies);
                const errorList = template.querySelector("ul");
                const htmlErrors = errors.forEach((e) => {
                    const row = document.querySelector("#errorItemTemplate").content.cloneNode(true);
                    const li = row.querySelector("li");
                    li.textContent = e;
                    errorList.appendChild(li);
                });
                document.getElementById("input-error-client-password").replaceChildren(template);
            });
        </script>
    </#if>
</@layout.registrationLayout>
