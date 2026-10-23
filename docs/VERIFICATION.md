# Verification

## Automated checks

```sh
npm ci
npm test
npm run build
```

Tests cover room capacity, database permissions, commands and retries, playlist rotation, invitation codes, playback recovery, configuration and search API validation. Database tests use embedded Postgres; external search requests are mocked.

`npm run test:live` optionally checks the configured Supabase service using temporary rooms and anonymous identities. It removes its room data afterward; Auth identities remain for administrator review. Run only against a project you control.

## Release checklist

- Create a room, join from another browser and share an invitation.
- Confirm six identities can join and the seventh is refused.
- Search or paste a video; add, reorder, remove and play next.
- Confirm current/up-next labels and playlist rotation.
- Check shared play, pause, seek, next, previous and restart controls.
- Use Resync after returning from another app; other members should continue.
- Send chat messages and confirm delivery to another member.
- Reload and reconnect; confirm room recovery and seat release.
- Confirm joins and accepted actions renew expiry to seven days ahead; passive refreshes do not.
- Verify notification popups disappear after three seconds.
- Test full-screen, installation and app updates on Android and iPhone.

Hosted room access, realtime delivery, search and deployment have been checked. Automated tests do not establish physical-device timing or installation behavior; repeat phone checks before claiming device acceptance.

Keep playback foregrounded. YouTube ads, buffering and mobile autoplay restrictions can cause drift; exact 0 ms sync and background playback are not guaranteed.

## Latest acceptance status — 23 October 2026

- Owner reports Android/iPhone acceptance completed. This is user-reported acceptance, not independent coverage of every device model.
- Owner confirmed CAPTCHA verification and room creation work after selecting Turnstile in Supabase.
- Current automated suite: 32 tests. Hosted multi-user checks passed before CAPTCHA was enabled. Do not run the guest-creation script against CAPTCHA-protected production: it intentionally does not solve challenges.
- Launch review passed: 32 tests, production build, zero known npm audit vulnerabilities, public page, manifest/icons, logo, configured CAPTCHA site key, CSP and API rejection checks (401 unauthenticated, 400 empty query, 405 wrong method). Community/LinkedIn comments will be used for feedback; no in-app feedback feature is planned for this milestone.

### Background music licence status

The owner supplied `alaaezzeddinelbn-coffee-shop-warmth-622818.mp3`, hosted as `public/audio/coffee-shop-warmth.mp3`. The original download website is unknown, no ID3 source/licence metadata was present, and the exact track licence could not be independently verified. The owner requested keeping it while locating the original licence. This is an unresolved asset-permission item, not a verified royalty-free claim.
