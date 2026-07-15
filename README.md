# Windows 11 Clock Web & Android App

A high-performance clone of the **Windows 11 Clock App** built as a progressive web application and packaged for native Android deployment using **Ionic Capacitor**. 

This repository focuses on **rich aesthetics (Mica/Acrylic glass design)** and **maximum runtime performance** by avoiding heavy, complex UI frameworks, opting instead for optimized Vanilla JS, CSS3, and browser-native APIs.

---

## 🚀 Key Features

### ⏱️ 1. Focus Sessions
* **Circular Progress Timer**: Radial SVG indicator tracking Focus vs. Break cycles (Blue for Focus, Green for Break).
* **Microsoft To-Do Sync**: Authentic Microsoft Graph API integration. Connect your Microsoft account to load real task lists, add new items, tick off completed tasks, and delete them. Automatically falls back to local storage task management when offline or unauthenticated.
* **Spotify OAuth & Embed Player**: Authenticate directly with Spotify via OAuth 2.0. Fetches your real personal playlists. Selecting a playlist embeds the official **Spotify Iframe Web Player** to stream real tracks (works for both Free and Premium users).
* **Synthesized Audio Presets**: Includes a procedural lofi beat generator (synthesized kicks, snares, hats, warm triangle chords, and a vinyl crackle noise filter) and ambient sleep noise generators (rain, waves, white noise) built completely offline using the **Web Audio API**. Includes a 9-bar reactive visualizer.
* **Streak Tracker**: Tracks focused minutes per day and streak indicators.

### ⏰ 2. Alarms
* **Overview Board**: Toggle alarms on and off instantly.
* **Inline Editor**: Click cards to expand options for name tags, repeat days selection, snooze intervals, and sound alerts.
* **Alert System**: Monitored on a background checker. Rings with synthesized sound presets (Classic chime, Zen Tibetan bowl, Digital beep) and displays a Fluent snooze/dismiss prompt.

### ⏳ 3. Timers
* **Multi-Timer Grid**: Run multiple countdown timers simultaneously.
* **Preset Timers**: Built-in configs for standard presets (1 min, 3 min egg timer, 5 min tea timer, etc.).
* **FullScreen Desk Clock (Zoom Mode)**: Enlarge any active timer into a massive desk-clock view with a dark ambient backdrop.

### ⏱️ 4. Stopwatch
* **Millisecond Precision**: Utilizes a high-precision `requestAnimationFrame` loop that calculates elapsed time down to the centisecond.
* **Lap Delta Analyzer**: Tracks lap lists, automatically color-coding the **Fastest Lap (Green)** and **Slowest Lap (Red)** in real-time.

### 🌍 5. World Clock
* **Local Clock Card**: Large digital display of local system time, date, and timezone.
* **Vector SVG Map**: Translucent outline of landmasses displaying pulsing coordinate dots indicating pinned city clocks.
* **Meeting Comparison Timeline**: Drag a comparative horizontal slider (-12h to +12h) to view what time it will be globally during scheduled meetings.

### ⚙️ 6. Settings
* **App Themes**: Light, Dark, or System-matching views.
* **Accent Colors**: Choose from Blue, Green, Orange, Purple, or Red to override highlight outlines.
* **Data Reset**: Clear local caches and reload the application.

---

## 🛠️ Architecture & Tech Stack

* **Build Tooling**: Vite
* **Frontend**: Vanilla JS (ES Modules) & CSS3 (Fluent design rules, grid/flex, backdrop blurs)
* **Audio Synthesis**: Web Audio API (zero network bandwidth consumption for audio alerts)
* **Native Wrappers**: Capacitor Core + Capacitor Android

---

## 💻 How to Run Locally (Web Preview)

1. Clone this repository.
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Boot the Vite development server:
   ```bash
   npm run dev
   ```
4. Access the web view in your browser at `http://localhost:5173`.

---

## 🤖 Compile Native Android APK

This repository is pre-configured with a native Android Gradle workspace.

1. Build the Vite production bundle and sync the assets to the Android folder:
   ```bash
   npm run build
   && npx cap sync
   ```
2. Compile optimized, architecture-specific release APKs using Gradle:
   ```bash
   cd android
   && ./gradlew assembleRelease
   ```
3. Find your compiled APK files under:
   `android/app/build/outputs/apk/release/`
