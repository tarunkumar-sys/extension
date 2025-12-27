# WebVibes - Mechanical Keyboard Sound Extension

A browser extension that adds satisfying mechanical keyboard sounds to your typing experience.

## Features

- 🎹 Multiple sound profiles (Linear, Clicky, Typewriter, Gunshot, Creams)
- 🔊 Volume control
- ⌨️ Per-key sound customization
- 🚫 Site blacklist
- 🔇 Enable/disable toggle

## Installation

1. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the extension folder (`mechVibe`)

## Adding Custom Audio Files

### Step 1: Create a Profile Folder

Create a new folder inside the `audio/` directory with your profile name (e.g., `myprofile/`):

```
audio/
  ├── linear/
  ├── clicky/
  ├── typewriter/
  ├── gunshot/
  ├── creams/
  └── myprofile/  ← Your new profile folder
```

### Step 2: Add Audio Files

Place your audio files in the profile folder. The extension looks for these specific file names:

#### Required Files (in order of priority):

1. **Profile Sound File** (used as fallback):
   - `myprofile.mp3` OR `myprofile.wav` OR `myprofile.ogg`
   - This file will be used for all keys if specific key files are not found

2. **Specific Key Files** (optional, but recommended):
   - `key.mp3` / `key.wav` / `key.ogg` - Default keypress sound
   - `spacebar.mp3` / `spacebar.wav` / `spacebar.ogg` - Spacebar sound
   - `enter.mp3` / `enter.wav` / `enter.ogg` - Enter key sound
   - `backspace.mp3` / `backspace.wav` / `backspace.ogg` - Backspace sound

#### File Format Priority:

The extension tries files in this order:
1. `.mp3`
2. `.wav`
3. `.ogg`

**Example structure:**
```
audio/
  └── myprofile/
      ├── myprofile.ogg          ← Profile fallback sound
      ├── key.ogg                 ← Default key sound
      ├── spacebar.ogg            ← Spacebar sound
      ├── enter.ogg               ← Enter key sound
      └── backspace.ogg           ← Backspace sound
```

### Step 3: Add Profile to HTML

Open `popup.html` and add your profile to the Sound Profile section:

**In the main profile selector** (around line 25-40):
```html
<label class="profile-option">
  <input type="radio" name="profile" value="myprofile" />
  <span>My Profile</span>
</label>
```

**Or add it to the "More" panel** (around line 80-90):
```html
<label class="profile-option">
  <input type="radio" name="profile" value="myprofile" />
  <span>My Profile</span>
</label>
```

### Step 4: Update manifest.json (if needed)

The `manifest.json` already includes a wildcard pattern for audio files:
```json
"web_accessible_resources": [
  {
    "resources": ["audio/*/*.mp3", "audio/*/*.wav", "audio/*/*.ogg"],
    "matches": ["<all_urls>"]
  }
]
```

This means any audio files you add will automatically be accessible. **No changes needed** unless you're using a different file format.

### Step 5: Reload the Extension

1. Go to `chrome://extensions/`
2. Find "WebVibes" extension
3. Click the reload icon (🔄)
4. Open the extension popup
5. Your new profile should appear in the Sound Profile list

## Audio File Requirements

### Supported Formats
- **MP3** (`.mp3`) - Recommended for smaller file sizes
- **WAV** (`.wav`) - Higher quality, larger files
- **OGG** (`.ogg`) - Good balance of quality and size

### File Naming Rules
- Use lowercase names: `key.ogg` ✅, `Key.ogg` ❌
- No spaces in filenames: `my-profile.ogg` ✅, `my profile.ogg` ❌
- Profile folder name must match the `value` in the HTML radio button

### Best Practices

1. **File Size**: Keep files under 100KB each for faster loading
2. **Duration**: 0.05-0.2 seconds works best for key sounds
3. **Sample Rate**: 44.1kHz or 48kHz recommended
4. **Bitrate**: 128kbps for MP3, 16-bit for WAV/OGG

## Troubleshooting

### Sound Not Playing

1. **Check file names**: Must be exactly `key`, `spacebar`, `enter`, or `backspace`
2. **Check file format**: Only `.mp3`, `.wav`, or `.ogg` are supported
3. **Check folder name**: Must match the `value` in HTML (case-sensitive)
4. **Reload extension**: After adding files, always reload the extension
5. **Check browser console**: Open DevTools (F12) and look for errors

### Profile Not Appearing

1. **Check HTML**: Make sure you added the profile option to `popup.html`
2. **Check folder**: Profile folder must be inside `audio/` directory
3. **Reload extension**: Changes to HTML require extension reload

### Fallback Sounds

If specific key files are missing, the extension will:
1. Try to use the profile sound file (e.g., `myprofile.ogg`)
2. If that's missing, generate a simple fallback tone programmatically

## Example: Adding a "Blue Switch" Profile

1. **Create folder**: `audio/blueswitch/`

2. **Add files**:
   ```
   audio/blueswitch/
     ├── blueswitch.ogg
     ├── key.ogg
     ├── spacebar.ogg
     ├── enter.ogg
     └── backspace.ogg
   ```

3. **Update popup.html**:
   ```html
   <label class="profile-option">
     <input type="radio" name="profile" value="blueswitch" />
     <span>Blue Switch</span>
   </label>
   ```

4. **Reload extension** and test!

## File Structure Reference

```
mechVibe/
├── audio/
│   ├── linear/
│   │   └── linear.wav
│   ├── clicky/
│   │   └── clicky.wav
│   ├── typewriter/
│   │   └── cherrymx-black-abs.ogg
│   ├── gunshot/
│   │   └── gunshot.ogg
│   ├── creams/
│   │   └── Creams.ogg
│   └── [your-profile]/
│       ├── [profile-name].ogg
│       ├── key.ogg
│       ├── spacebar.ogg
│       ├── enter.ogg
│       └── backspace.ogg
├── icons/
│   └── icon.png
├── background.js
├── content.js
├── manifest.json
├── popup.html
├── popup.js
├── popup.css
└── README.md
```

## Advanced: Custom Key Sounds

Currently, the extension supports 4 key types:
- `key` - Regular keys (A-Z, 0-9, etc.)
- `spacebar` - Space key
- `enter` - Enter key
- `backspace` - Backspace key

To add support for more specific keys, you would need to modify `content.js` in the `playKeySound()` function.

## Support

For issues or questions:
1. Check the browser console for errors
2. Verify file names and locations
3. Ensure extension is reloaded after changes
4. Check that audio files are valid (play them in a media player)

---

**Note**: After making any changes to files or HTML, always reload the extension for changes to take effect!
