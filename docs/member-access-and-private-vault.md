# KBE member access architecture — updated product decision

## Access model
- A free OF subscriber account is permanent and may access the private free-subscriber gallery and order area.
- VIP/GFE entitlements are separate and time-bounded when sold as subscriptions.
- Purchased individual media grants can persist after VIP/GFE expires, subject to the purchase terms and content availability.
- VIP/GFE members can access a private vault: purchased media, creator-delivered customs, and their own uploads.
- Never derive privileges from a client-side tier field or a manually typed social username. Use Supabase Auth user ID and server-enforced entitlements.
- Do not conflate the existing `evie_memberships` status with an OnlyFans subscription. An OF verification claim is a separate proof.
- If free gallery access requires an OnlyFans subscription proof, use manual challenge-code verification and decide whether gallery access survives OF subscription cancellation. The KBE account itself must remain permanent.

## Data model
- `evie_member_profiles`: user_id, nickname, optional phone, social references.
- `evie_of_claims`: manual OnlyFans proof, review status, validity period; no OnlyFans passwords.
- `evie_media_assets`: asset ID, owner/creator, provider, private object key, media type, metadata. No public provider share links.
- `evie_media_entitlements`: user_id, asset_id, grant type (purchase, custom_delivery, subscription), granted_at, expires_at nullable, revoked_at nullable.
- `evie_member_uploads`: uploader user ID, private asset reference, consent/ownership attestation, created_at.
- `evie_orders`: customer user ID, items, price, payment state, fulfillment state; client-side copied orders are NOT proof of purchase.
- `evie_gallery_entries`: free subscriber gallery assets, published_at, unpublished_at.

## Security
- Private storage and signed short-lived download URLs, not publicly shared Dropbox or Drive URLs.
- Strict RLS: user reads only own media grants and uploads; admin delivery only through authenticated server endpoints with audit logs.
- Do not store media directly in a publicly exposed static site or unprotected Supabase Storage bucket.
- Ensure file access can survive subscription expiry for purchased items, but never promise perpetual provider availability.
- Upload size/type validation, malware scanning, private metadata, and consent-based removal/deletion.
- Discreet UI: neutral tab titles, hidden previews, no push notifications with explicit content, quick exit; no claim of perfect secrecy.
- Age gate is not equivalent to independent adult verification; restrict adult media to verified adults and comply with applicable laws.
- Do not automatically grant VIP access after an OF claim is approved.

## Delivery sequence
1. Finish free account authentication and profile.
2. Build admin-reviewed OF subscriber proof and free subscriber gallery.
3. Build protected order records and media entitlement model.
4. Add VIP/GFE private vault with purchased content and creator customs.
5. Add member uploads with content moderation, consent, storage limits, and deletion controls.
6. Run authorization, privacy, signed URL expiry, and age-verification tests before release.

This is an architecture specification only; no new vault, gallery, or permissions are deployed by this document.
