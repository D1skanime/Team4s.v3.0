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
        <form id="kc-register-form" class="${properties.kcFormClass!}" action="${url.registrationAction}" method="post" novalidate="novalidate">
            <@userProfileCommons.userProfileFormFields; callback, attribute>
                <#if callback = "afterField">
                <#-- render password fields just under the username or email (if used as username) -->
                    <#if passwordRequired?? && (attribute.name == 'username' || (attribute.name == 'email' && realm.registrationEmailAsUsername))>
                        <@field.password name="password" required=true label=msg("password") autocomplete="new-password" />
                        <@field.password name="password-confirm" required=true label=msg("passwordConfirm") autocomplete="new-password" />
                    </#if>
                </#if>
            </@userProfileCommons.userProfileFormFields>

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
