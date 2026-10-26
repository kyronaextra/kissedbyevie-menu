# Evie SnapDesk / Tampermonkey → Evie Admin

**Status:** Code staged for review on a feature branch. It is **not live**, and no database/Edge Function migration has been applied by merging code alone. This integration does not require Docker, Python, or a local server.

## Pieces

- \`bot-studio.html\`, \`bot-studio.js\`, \`bot-studio.css\`: phone-friendly private editor on the existing Render website using the existing Evie Admin accounts.
- \`userscripts/evie-snapdesk.user.js\`: Tampermonkey companion on \`https://web.snapchat.com/*\`. It only shows its own draft/template panel and never reads Snapchat DOM, cookies, network responses or message events, and never automatically sends chats.
- \`supabase/functions/evie-bot-sync/index.ts\`: isolated protected API in the site's existing Supabase project. Admin reads/writes require the existing server-verified Evie Admin role; the browser only gets a read-only profile API after being paired.
- \`docs/EVIE_SNAPDESK_SCHEMA.sql\`: private configuration and hashed-device-key tables with RLS enabled and no anonymous/authenticated direct table policies.

## To activate

1. Review the feature PR before merging. Do not paste secret keys in GitHub, Render static files, or the userscript.
2. In the **existing** Supabase project (the one backing Evie Admin), review/run \`docs/EVIE_SNAPDESK_SCHEMA.sql\` once in the SQL editor. It creates only \`evie_bot_config\` and \`evie_bot_devices\`.
3. Deploy the new function \`evie-bot-sync\` from \`supabase/functions/evie-bot-sync/\`. Set **verify_jwt = false for this function only**. This is necessary because paired PC requests use a separate 256-bit device key in the \`X-Evie-Device-Token\` header instead of a Supabase JWT. The function itself validates admin JWTs on its administrative routes, and validates SHA-256 hashed device keys on its read-only profile route. The existing \`evie-admin-api\` function is not changed.
4. Merge the reviewed feature branch into \`main\` to publish the website changes on the existing Render static site (or deploy that branch to a private preview for testing). Confirm that \`https://kissedbyevie-menu.onrender.com/bot-studio.html\` loads and an existing Evie Admin account can sign in.
5. On your **Windows PC**, install Tampermonkey in Chrome/Edge. Open the \`userscripts/evie-snapdesk.user.js\` file from the merged GitHub repository's **Raw** view and confirm the Tampermonkey installation dialog. Enable the extension/user script and open \`https://web.snapchat.com/\`.
6. From the Tampermonkey menu select **Evie SnapDesk → Copy Evie pairing key**. Avoid sending this secret to anyone. On your phone, open \`https://kissedbyevie-menu.onrender.com/bot-studio.html\`, sign in, enter a friendly device name and the copied key, and choose **Pair device**.
7. Select/modify/import personalities, and select **Publish personality settings**. The userscript checks for approved changes about once per minute while its Snapchat Web tab stays open, or immediately on **Refresh settings**.

## Privacy and scope

- JSON imports may contain **data/settings only**; they are **never executed as JavaScript**. JavaScript and Python "bot cores" would need manual conversion to declarative rules/templates.
- The userscript does not request the Snapchat login, session cookies, tokens, or message history. It only uses the page to display its own floating control.
- The generated 256-bit pairing secret stays inside Tampermonkey storage; the server stores only its SHA-256 hash. The key can be revoked from Bot Studio.
- The backend does not collect message bodies. Input for draft suggestions is owner-entered, and draft copying is deliberate/manual.
- **No ChatGPT/LLM inference is included in this version.** The current assistant conversation is not automatically accessible from a browser userscript. A later model integration would need a separately authorized server-side API key plus data-use consent and cost controls. Never expose an API key in a userscript.
- Snapchat's terms restrict unauthorized automation. This integration deliberately does not automate reading messages, sending messages, or bypassing Snapchat interfaces or access controls.
- Render serves the editor's static files; the existing protected Supabase backend stores dynamic configuration. Render's static hosting cannot save live changes on its own.
- This is **not a background bot**. When the home browser is closed or sleeping, the userscript stops running.

## Verification checklist

- Confirm an unauthenticated request to \`GET /functions/v1/evie-bot-sync?action=admin_state\` returns 403.
- Confirm an unpaired \`GET ...?action=profile\` request returns 401 or 403.
- Confirm a verified admin can pair the device and save one profile; a browser with the matching key receives \`configuration\` and \`revision\`.
- Confirm a revoked device can no longer read profiles.
- Confirm direct anonymous/authenticated table access is denied by database privileges/RLS.
- Confirm a new JSON import remains local to the editor until Publish.
- Confirm no Snapchat chats are read or sent automatically.

**Rollback:** Revert the frontend feature PR/commit and disable or remove the isolated Edge Function. The new tables can be retained for an audit trail; deleting data should be a separately authorized operation.
