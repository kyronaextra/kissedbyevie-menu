# Evie Payment-Ready Tampermonkey Alerts

## What is live

The existing owner-only Evie Admin inbox checks **new, recent inbound lead messages** for explicit payment intent and emits a browser-only signal `evie:payment-ready`. The separate Tampermonkey userscript receives this signal and shows:

> @username is payment ready!

The alert means **the lead has expressed intent to pay**. It is not proof of a payment, successful order, or successful transaction.

This is a lightweight rule-based alert in the existing inbox. **It is not a deployed autonomous AI salesperson or payment verifier.**

## Install

1. Install Tampermonkey in your desktop browser.
2. While Tampermonkey is enabled, open the [Evie Payment-Ready Lead Alerts userscript](https://raw.githubusercontent.com/kyronaextra/kissedbyevie-menu/main/userscripts/evie-payment-ready.user.js) and choose Install.
3. Open [Evie Admin](https://kissedbyevie-menu.onrender.com/admin.html) and sign in as your approved admin account. Keep this tab open for incoming events.
4. From the Tampermonkey menu choose **💸 Test Evie payment-ready alert** to verify the popup.
5. The live popup also appears on matched **web.telegram.org**, **web.snapchat.com**, **x.com** and **stripchat.com** tabs while the signed-in Admin tab has received a new event.

It cannot display on arbitrary desktop apps, mobile Tampermonkey installations, or websites not in the userscript's @match header. It does not run a background daemon. A closed or logged-out Evie Admin tab will not receive incoming events.

## Detection and de-duplication

- Example triggers: "I'm ready to pay", "Send me your payment details", "How can I pay you?", "We are ready to purchase".
- Obvious negatives such as "I'm not ready", "I can't pay" or "I'll pay later" are excluded.
- Alerts are limited to messages no older than 10 minutes and only those marked as inbound from an authorized worker, or owner-created manual reminders with a matching summary.
- Each lead message gets a stable event ID to prevent repeating the alert after refreshing the admin page.
- The Tampermonkey extension stores only the event ID, handle or name, platform and timestamp—not messages, credentials or payment information. No automation sends outbound DMs.
- An explicit statement could still be sarcastic or ambiguous. Evie should verify the buyer's intent manually.

## Current integrations

- Telegram requires an **authorized personal worker** to be online and feeding inbound events into the existing admin inbox API. A previously issued connection key is not enough.
- X requires a separate approved DM integration.
- Snapchat currently supports manual follow-up records, not direct automated incoming-message reads.
- Real incoming lead alerts have not been end-to-end tested until a worker provides a real inbound message.

## Future AI bot wiring

When a connected lead-qualification agent eventually exists, have the agent record a new **payment-ready** lead only when a buyer explicitly confirms buying intent and the contact has been mapped to a real authorized inbox conversation. The agent should never auto-mark "paid", send payment demands, or trigger membership access without trusted verification and Evie's approval.

To avoid false positives, the agent should send a structured status in a future owner-authenticated endpoint; until that connector is implemented, use the existing conservative message-preview detector.

## Code

- `admin-inbox.js`: verifies basic signal conditions and emits `evie:payment-ready` from the owner dashboard.
- `userscripts/evie-payment-ready.user.js`: Tampermonkey overlay, cross-tab relay and menu test command.
- `admin.html`: link to install the userscript.

**Keep Evie Admin signed in and open in one desktop browser tab for current live behavior.**
