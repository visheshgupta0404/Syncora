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
- Verify notification popups disappear after three seconds.
- Test full-screen, installation and app updates on Android and iPhone.

Hosted room access, realtime delivery, search and deployment have been checked. Automated tests do not establish physical-device timing or installation behavior; repeat phone checks before claiming device acceptance.

Keep playback foregrounded. YouTube ads, buffering and mobile autoplay restrictions can cause drift; exact 0 ms sync and background playback are not guaranteed.
