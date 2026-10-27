# Kissed by Evie — member gallery, deliveries, messages and OF verification

## Experience

The existing free customer identity is still **X OAuth** or **email magic link with Snapchat/Telegram username reference**. These remain one Supabase Auth identity, not separate social-platform passwords. After sign-in, the account page shows:

1. Editable nickname/name, optional phone and social references.
2. **OF verification:** subscriber enters their OnlyFans username and receives a random 24-character code. They DM that code **from their OnlyFans account** to Evie's creator inbox. Admin personally checks the code and active subscription, then approves; status lasts 30 days. This is **not** OnlyFans OAuth and **never** grants access to paid content.
3. **My Purchases:** paid photos and videos individually assigned to the exact Supabase Auth user ID. Each file remains in a private Supabase Storage bucket. A new short-lived access link is generated when the customer opens an item, allowing future viewing while the delivery remains assigned and age eligibility is satisfied.
4. **Private Messages:** one-way notes from Evie, saved permanently on the customer's account until deliberately deleted under an appropriate retention policy. There is no Telegram/Snapchat/X message sending.
5. **The Secret Tease:** free censored **photos only** for any signed-in nonanonymous customer account. No paid membership, OF verification or VIP tier is needed. Teaser image files must be irreversibly censored **before upload**, not browser-blurred originals.

## Admin workflows

Evie Admin → **Members** → choose **Deliver / Message** beside a member:

- Upload JPEG/PNG/WebP photo or MP4/WebM video, max 50 MB per file. The browser uploads only to the new private \`evie-customer-deliveries\` bucket. The Edge API checks that the object exists and is correctly typed, then creates the assignment to that customer. One user's delivery will not appear in another user's library.
- Compose and post a private dashboard message. It is saved in \`evie_customer_messages\`; the recipient sees it on future logins.
- View assigned files and messages, or revoke a purchased media assignment. **Revocation stops new signed links, but an existing link may remain usable for up to 60 minutes for video or 10 minutes for photos**. This is not DRM and does not prevent screen captures or previously downloaded copies.

Evie Admin → **Members** → **OnlyFans subscriber verification**:

- Match the pending claimant's OnlyFans username and random code **against a DM from that exact account**.
- Confirm the subscriber's active subscription in OnlyFans.
- Approve (for 30 days) or reject. Do not approve from the claimed username alone; do not ask for OnlyFans passwords.
- This verified status is never interpreted by the code as payment or age verification.

## Data & access boundaries

| Storage / table | Content | Who can read |
|---|---|---|
| \`evie-account-teasers\` + \`evie_teaser_photos\` | Published, pre-censored images only | Any authenticated nonanonymous account |
| \`evie-customer-deliveries\` + \`evie_customer_deliveries\` | Assigned purchased photos/videos | Only recipient with independent \`evie_memberships.age_verified_at\` |
| \`evie_customer_messages\` | Saved admin notes | Only recipient |
| \`evie_of_claims\` | Subscriber usernames/challenges/status | Owner of claim, privileged backend for reviews |
| \`evie-daddy-vault\` | Existing paid VIP private files | Existing distinct paid-membership and age-verification RLS |

**Important:** User-entered 18+ checkboxes and OAuth logins do not prove adulthood. Before allowing adult purchased files to appear, use the existing independent age-verification approval flow to populate \`evie_memberships.age_verified_at\`. OF subscriber approval does NOT do this.

All writes to delivery metadata, dashboard messages and OF claim decisions are via the existing admin-authenticated \`evie-admin-api\`. Admin files are uploaded with a JWT whose **server-owned app_metadata.evie_admin** is true; a normal account cannot assign content by spoofing a profile field. Never place a Supabase secret/service-role key in front-end JS.

## Supabase changes prepared/applied

- \`supabase/migrations/20261026233000_evie_of_subscriber_claims.sql\`
- \`supabase/migrations/20261026234500_evie_free_teaser_gallery.sql\`
- \`supabase/migrations/20261026235500_evie_customer_purchases_and_messages.sql\`
- \`supabase/functions/evie-of-claim/index.ts\` (authenticated claim submissions)
- \`supabase/functions/evie-admin-api/index.ts\` (privileged delivery, message and OF review actions)

## Launch/testing

Changes to website HTML/CSS/JS remain in the **feature pull request**, not the live Render homepage until merged and deployed. Supabase migrations and Edge API functions can be active before the UI is live. To finish:

1. Allow \`https://kissedbyevie-menu.onrender.com/account.html\` as a Supabase Auth redirect URL and test email magic links.
2. Configure Supabase's X OAuth 2.0 provider through the official X developer app; client secret remains ONLY in provider/server settings.
3. Merge the feature PR after review; let Render deploy the new static pages.
4. Sign in as two test customers A/B and an admin. A must never see B's private message, assigned file metadata, or storage objects.
5. Verify A's content is invisible until independent adult verification, and visible afterward. Test both video and photo display. A copied, expired signed URL must not give access forever. Existing video links can remain valid for up to an hour, and images for up to 10 minutes, even after revocation.
6. Post a note through Evie Admin, reload the account dashboard, and confirm it persists. Test account sign-out clears all media.
7. Create a simulated OF claim; confirm it remains pending until admin approves, and then displays verified for 30 days. Ensure OF approval never changes VIP tier or age verification.
8. Upload only fully **pre-censored** photos to \`evie-account-teasers\` and publish only after checking the image itself. No video/uncensored uploads in that bucket.

### Limitations
- The standard browser upload currently caps a file at 50 MB; larger videos will need a configured higher Storage limit and resumable TUS upload workflow.
- This is manual delivery; payment providers are not connected. Evie must check payment and only deliver legitimate orders.
- The account page has no built-in email/social notification when a new message arrives; users see it next time they open their dashboard.
- No files are seeded into either gallery by this implementation.
- Private media can still be captured or saved by recipients; access control is not copy protection.
