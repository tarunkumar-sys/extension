# WebVibes - Mechanical Keyboard Sound Extension

A browser extension that adds satisfying mechanical keyboard sounds to your typing experience.

## Features

- 🎹 Multiple sound profiles (Linear, Clicky, Typewriter, Gunshot, Creams, Anime Moan, Razer Typewriter)
- 🔊 Volume control
- ⌨️ Per-key sound customization (A-Z, 0-9, Space, Enter, Backspace)
- 🚫 Site blacklist
- 🔇 Enable/disable toggle

## Installation

1. Open Chrome/Edge and go to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `mechVibe` folder

## Adding Custom Audio Files

### Step 1: Create a Profile Folder

Create a new folder in `audio/` with your profile name (e.g., `myprofile/`).

### Step 2: Add Audio Files

Place audio files in the profile folder. Supported formats: MP3, WAV, OGG.

#### General Files:

- `myprofile.mp3/wav/ogg` - Profile fallback sound
- `key.mp3/wav/ogg` - Default sound for unspecified keys

#### Special Key Files:

- `spacebar.mp3/wav/ogg` - Spacebar sound
- `enter.mp3/wav/ogg` - Enter key sound
- `backspace.mp3/wav/ogg` - Backspace sound

#### Per-Key Files (New):

- `keyA.mp3/wav/ogg` to `keyZ.mp3/wav/ogg` - Individual letter sounds
- `key0.mp3/wav/ogg` to `key9.mp3/wav/ogg` - Individual number sounds

**Example:**

```
audio/myprofile/
├── myprofile.ogg          # Profile fallback
├── key.ogg                 # Default key sound
├── spacebar.ogg            # Spacebar
├── enter.ogg               # Enter
├── backspace.ogg           # Backspace
├── keyA.ogg                # A key
├── keyB.ogg                # B key
├── key1.ogg                # 1 key
└── ...
```

### Step 3: Add Profile to UI

Add to `popup.html` in the profile selector:

```html
<label class="profile-option">
  <input type="radio" name="profile" value="myprofile" />
  <span>My Profile</span>
</label>
```

### Step 4: Reload Extension

Go to `chrome://extensions/`, find WebVibes, and click reload.

## Audio File Requirements

- **Formats**: MP3, WAV, OGG
- **Duration**: 0.05-0.2 seconds
- **Size**: Under 100KB each
- **Naming**: Exact case, no spaces (e.g., `keyA.wav`)

## Fallback Order

1. Specific key file (e.g., `keyA.wav`)
2. General `key.wav`
3. Profile sound (e.g., `myprofile.wav`)
4. Generated tone

## Troubleshooting

- **No sound**: Check file names, formats, and reload extension
- **Wrong sound**: Verify fallback hierarchy
- **Profile not showing**: Check HTML and folder name
- **Console errors**: Open DevTools (F12) and check

## File Structure

```
mechVibe/
├── audio/
│   ├── linear/
│   ├── clicky/
│   ├── typewriter/
│   ├── gunshot/
│   ├── creams/
│   ├── animemoan/
│   ├── razertypewriter/
│   └── [your-profile]/
│       ├── [profile-name].mp3/wav/ogg
│       ├── key.mp3/wav/ogg
│       ├── spacebar.mp3/wav/ogg
│       ├── enter.mp3/wav/ogg
│       ├── backspace.mp3/wav/ogg
│       ├── keyA.mp3/wav/ogg
│       ├── keyB.mp3/wav/ogg
│       ├── key1.mp3/wav/ogg
│       └── ...
├── icons/
├── background.js
├── content.js
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
└── README.md
```

## Support

- Check browser console for errors
- Verify file names and locations
- Reload extension after changes
- Test audio files in a media player

---

**Note**: Reload extension after any file changes.
