# Vois — Autonomous Phone-to-Peer Offline Voice Network

> **"When the towers collapse, your phone becomes the network."**

Official landing page and interactive simulator for **Vois (P2P)**, an offline, phone-to-peer voice communication tool designed for disaster relief, high-density crowd surges, and industrial dead zones. It operates directly over radio (Wi-Fi Direct and Bluetooth Classic RFCOMM) with zero reliance on cellular networks, internet infrastructure, SIM cards, or central servers.

---

## Live Website & Interactive Simulator

Experience the interactive offline radio mesh simulator, Web Audio walkie-talkie feedback, SOS beacon preview, and direct APK download:

- **Live URL**: [https://rishideep-mandavilli.github.io/P2P-Vois-Landing-Page/](https://rishideep-mandavilli.github.io/P2P-Vois-Landing-Page/)

---

## Narrative Chapters

1. **The Rupture (The Pain):** The fatal fragility of conventional mobile grids — cell towers failing within minutes from power grid outages and crowd surge spectrum saturation.
2. **The Golden 6 Hours (The Suffering):** 78% of disaster mortalities occur within the first six hours when isolated victims and volunteer teams cannot coordinate across 50–150 meters.
3. **The Breakthrough (The Solution):**
   - **Dual-Radio Transport:** Wi-Fi Direct (~50m TCP 8988) with Bluetooth Classic RFCOMM (~10m SPP UUID `00001101`) fallback.
   - **Zero-CPU Undecoded Relaying:** Middle volunteer phones forward raw compressed audio frames without decoding to PCM, consuming <1.2% battery/hour.
   - **Voice-First Push-to-Talk (PTT):** Full-duplex calling and 1-touch walkie-talkie with zero literacy or language barriers.
   - **Pocket-Survivable SOS Siren:** 6 coded presets + GPS fix that overrides Android Do Not Disturb and forces speaker volume to 100%.
   - **Store-and-Forward Offline Queue:** Caches distress beacons out of range (30m TTL) and fires automatically upon proximity to a peer.
   - **Viral Offline APK Beamer:** Phones can beam the 49MB installer to 100+ nearby devices completely off-grid in 30 seconds.
4. **Technical Architecture & Data Pipeline:** 16kHz mono PCM16 &rarr; 8-bit ADPCM compression &rarr; 323-byte wire frames &rarr; 40ms jitter buffer.
5. **Humanitarian & Operational Impact:** Beneficiary profiles for trapped civilians, first responders (NDRF / SDRF), mass festival marshals, and underground industrial workforces.
6. **Market & Sustainable Business Model:** $22.4B TAM / $4.2B SAM with a dual-tier model: 100% free civilian public good + Enterprise/Municipal command fleet consoles.
7. **Competitive Matrix:** Head-to-head comparison against WhatsApp, LoRa/Meshtastic, hardware walkie-talkies, and satellite pucks.
8. **Direct Download Hub:** One-click Android APK download, SHA-256 verification hash, and sideload installation guide.

---

## Production Release APK

- **File Name:** `vois-v1.1.0+2.apk`
- **File Size:** `49.4 MB (49,404,536 bytes)`
- **SHA-256 Checksum:** `d16f263187ed8bc5f4b5549fa33f3b5d23dbc2ff4d06e4bdb442d9c7b00050ca`
- **Target OS:** Android 8.0 (Oreo) and above
- **Architecture:** `arm64-v8a`, `armeabi-v7a`, `x86_64`

Download directly from:
- [downloads/vois-v1.1.0+2.apk](downloads/vois-v1.1.0+2.apk)
- [GitHub Releases](https://github.com/Rishideep-Mandavilli/P2P-Vois-Landing-Page/releases)

---

## Local Development & Preview

This landing page is built with pure semantic HTML5, modern CSS custom properties (tactical field emergency design tokens), and vanilla JavaScript with Web Audio API synthesis—with zero build tooling or third-party dependencies required.

To run locally:
```bash
python3 -m http.server 8080
```
Then visit `http://localhost:8080`.

---

## License & Attribution

Built for humanity and open disaster resilience.
&copy; 2026 Vois P2P Project.
