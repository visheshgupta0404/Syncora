# Syncora — Project Overview

**Management briefing · 20 October 2026**  
**Live application:** [syncoramoments.pages.dev](https://syncoramoments.pages.dev/)

## Executive overview

Syncora helps people in different locations watch and listen to YouTube together. Up to six people can join a private room, manage a shared playlist and chat from their phones or computers.

The core application is built and deployed. It uses free service tiers for the current small-group scope. Broader device testing is still needed before claiming consistent behavior across Android and iPhone models.

## The problem it solves

Watching together remotely often means switching between video links, messages and repeated attempts to press play at the same time. Syncora brings these activities into one shared space, with controls that help participants follow the same video and playback position.

## The user experience

1. **Create a room:** enter a display name and receive a private invitation code.
2. **Invite others:** share the link directly or through WhatsApp.
3. **Choose content:** search YouTube inside Syncora or paste a video link.
4. **Watch together:** use shared playback controls, manage the queue and chat.

No separate account registration is required. Users can install the website on their home screen; iPhone installation uses Safari's Add to Home Screen option.

## What has been delivered

| Capability | Benefit |
| --- | --- |
| Private rooms for up to six people | A focused space for a small group |
| YouTube search and official embedded playback | Find and play content in one place |
| Shared play, pause, seek, skip and restart | Coordinate viewing across participants |
| Reusable queue with thumbnails and current/up-next labels | Understand and manage the viewing order |
| Live chat | Keep the conversation beside the video |
| Resync and reconnection handling | Help a returning or delayed device catch up |
| Responsive layout and home-screen installation | Use the same service on phones and computers |

Everyone in a room has equal playback control. There is no separate host approval role.

## How it works

Each participant plays the video on their own device. Syncora shares the room's playback instructions, playlist and messages through its backend. It does not stream a copy of one person's screen to everyone else.

Playback changes use a shared execution time 1.5 seconds ahead to help devices act together. Resync adjusts the requesting device to the room's timeline without intentionally changing everyone else's playback.

| Technology | Role in simple terms |
| --- | --- |
| React and CSS | Build the screens and responsive layout |
| Vite | Runs local development and prepares the app for release |
| Supabase | Handles guest identities, room data, access checks and live updates |
| YouTube APIs | Provide video search and official playback |
| Cloudflare Pages and Functions | Host the app and handle search while keeping the API key private |
| PWA service worker | Supports installation and caches the app shell |
| GitHub and automated checks | Store the source code and support repeatable releases |

## Privacy and operating boundaries

Room invitations grant access and should be shared privately. A display name is a label, not a verified identity. Room members and the database administrator can read chat; it is not end-to-end encrypted.

Rooms expire after seven days. The playlist remains reusable while the room exists, and chat retains the latest 100 messages. Releasing the final member's seat deletes the room and its history. Anonymous authentication records have a separate maintenance lifecycle.

The YouTube search key stays on the server. Database access rules restrict room data to its members. Videos use YouTube's official player, including its advertising, branding and embedding restrictions.

## Current status and limitations

| Area | Current position |
| --- | --- |
| Core features | Implemented and deployed |
| Automated validation | Latest implementation checks passed: 25 tests and a production build |
| Hosted services | Room access, live updates, search and deployment have been checked |
| Physical devices | Wider Android/iPhone playback and installation acceptance remains necessary |
| Synchronization | Shared timing and drift correction are implemented; exact 0 ms alignment is not guaranteed |
| Background use | Playback may stop or lose synchronization when switching apps or locking the phone |
| iPhone playback | A direct tap may be required to enable sound |

The app shell can load from cache, but shared rooms, search and video playback require internet access. YouTube advertisements, buffering and device restrictions can affect the experience.

## Cost and maintenance

The deployment uses Supabase and Cloudflare free tiers, with YouTube search subject to API quotas. This supports the current small-group goal within provider limits; it is not a promise of unlimited free operation. Inactive services may pause, and usage should be reviewed as adoption grows.

Ongoing maintenance includes checking service availability and quotas, keeping dependencies current, reviewing anonymous accounts and repeating device checks after meaningful changes. Optional CAPTCHA protection is supported but is not currently configured.

## Release workflow and next priorities

Changes are checked locally, committed to GitHub's `main` branch and automatically built by Cloudflare Pages. GitHub also runs automated verification. Database changes require a separate, controlled migration.

The next priority is a practical acceptance session using real Android and iPhone devices: join the same room, test shared playback and chat, switch apps, return and Resync, and verify installation. Further features should follow observed user needs and service capacity.

**Delivery assessment:** Syncora is a deployed application ready for small-group use and device acceptance testing. Its main remaining constraints come from mobile playback behavior, YouTube restrictions and free-service limits.
