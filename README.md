# 📺 FreeTV

India ke free live TV channels — Hindi, Marathi, English aur Sports. Bina signup, bilkul muft.

**Live site:** https://legendrockkk.github.io/freetv/

## How it works (v2 — curated)

- Sirf **Indian channels**, 4 tabs: **हिंदी** (258), **मराठी** (22), **English** (66), **🏆 Sports** (3).
- Har stream ko build-time par probe kiya gaya — sirf kaam karne wale `https://` streams hi list me hain (dead/`http://`/DASH streams hata diye gaye). Data: `data/{hindi,marathi,english,sports}.json`, last checked `data/meta.json` me.
- Search, category chips, ★ favorites (localStorage), EN/HI app UI (auto-detect, 🌐 toggle).
- Player: fullscreen video player — click karte hi fullscreen, ✕ se back, top bar auto-hide.

## Notes

- Free me Indian sports streams bahut kam hain (DD Sports waghaira) — isliye Sports tab chhota hai.
- Streams [iptv-org](https://iptv-org.github.io/iptv) ke public free streams hain; sab channels unke malikon ke hain.
- Playback: [hls.js](https://github.com/video-dev/hls.js) for HLS, native otherwise.
