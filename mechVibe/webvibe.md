WebVibes — MVP Chrome Extension Specification
1. Project Overview

WebVibes (MVP) is a lightweight Chrome Extension that plays satisfying mechanical keyboard sounds on keypress while browsing.
The MVP focuses on audio quality, performance, and privacy, avoiding over-engineering.

This version is optimized for:

Chrome Web Store approval

Fast development

Real user validation

2. MVP Feature List (ONLY)
2.1 Core Audio Features

Keyboard Sound Playback

Play sound on every valid keypress

No tracking, no analytics

Sound Profiles (Limited)

Linear

Clicky

Typewriter

Zero-Latency Audio

Web Audio API

Audio buffers preloaded

Polyphonic Playback

Multiple sounds can overlap

Required for fast typing

Key-Specific Sounds

Spacebar

Enter

Backspace

2.2 Essential Controls

Enable / Disable Toggle

Global on/off switch

Volume Control

Single master volume slider

Sound Profile Selector

Dropdown or radio buttons

2.3 Privacy & Safety (Mandatory)

Password Field Protection

No sound in:

<input type="password">

Site Blacklist

User can disable sounds on selected domains

No Data Storage of Keystrokes

No logging

No transmission

Local-only settings

3. MVP User Flow

User installs extension

Opens any website with a text input

Types → hears instant mechanical sound

Opens popup:

Changes sound

Adjusts volume

Disables extension if needed

Extension auto-mutes on password fields

4. Folder & File Structure (MVP)
webvibes/
│
├── manifest.json
├── background.js
├── content.js
├── popup.html
├── popup.js
├── popup.css
│
├── audio/
│   ├── linear/
│   ├── clicky/
│   └── typewriter/
│
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png

5. File Responsibilities
manifest.json

Extension metadata

Register scripts and permissions

Define popup UI

background.js

Service worker

Responsibilities:

Initialize default settings

Listen for popup messages

Manage global enable/disable state

content.js

Injected into webpages

Responsibilities:

Detect keydown events

Validate input context

Ignore password fields

Enforce site blacklist

Trigger sound playback

popup.html

Minimal UI:

Toggle switch

Volume slider

Sound selector

popup.js

Reads/writes chrome.storage.local

Sends updates to background/content scripts

popup.css

Dark, minimal UI

No animations affecting performance

6. manifest.json (Manifest V3 Rules)

Required fields:

manifest_version: 3

background.service_worker

content_scripts

action.default_popup

permissions (minimal)

No unused permissions allowed.

7. Permissions & Justification
Permission	Why
storage	Save user settings
activeTab	Detect current site
scripting	Inject content script

❌ No network permissions
❌ No external APIs

8. Event Handling Logic

keydown detected in content.js

Validate:

Extension enabled

Not password field

Site not blacklisted

Trigger audio playback

Do nothing else

No counters. No tracking.

9. Sound Handling Logic

Initialize AudioContext once

Preload all sound files

On keypress:

Create buffer source

Play immediately

Allow overlap

Volume applied via GainNode

10. Popup UI Behavior

Reflects saved state instantly

Changes persist automatically

Popup never triggers sounds

Popup closes without side effects

11. Performance & Security Rules

No DOM modification on pages

No event listeners outside inputs

No keystroke values stored

Reuse audio buffers

Keep service worker stateless

12. Edge Cases (Handled)

Fast typing (high WPM)

Dynamic input fields

Extension disabled mid-session

AudioContext suspended by browser

Multiple tabs open

13. Explicitly Out of Scope (MVP)

❌ Achievements
❌ WPM tracking
❌ Cloud sync
❌ Monetization
❌ Analytics
❌ Sound marketplace

These are V2+ only.

Final Instruction to Code Generator (Cursor)

Build ONLY the MVP defined in this document.
Do not add extra features.
Follow Manifest V3 strictly.
Prioritize performance and privacy.

🔥 Why this MVP will work

Small → fast to build

Safe → Chrome approval friendly

Valuable → users feel it instantly

Expandable → perfect base for V2