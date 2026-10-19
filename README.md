# 📺 FreeTV

8000+ free live TV channels from 200+ countries — news, sports, movies, music, kids and more. No signup, free forever.

**Live site:** https://legendrockkk.github.io/freetv/

## How it works

- Channel data loads **live at runtime** from [iptv-org](https://iptv-org.github.io/iptv) (CORS-open `.m3u` playlists), so the list is always fresh — nothing to rebuild.
- `data/countries.json` is a build-time snapshot of the country list (200+ countries).
- `data/languages.json` is a build-time snapshot of the content-language list (207 languages, with channel counts) parsed from the iptv-org playlist docs.
- App UI is bilingual — English + Hindi, auto-detected from the browser, switchable from the header (🌐 button), saved in localStorage.
- Playback uses [hls.js](https://github.com/video-dev/hls.js) for HLS streams, native video otherwise.
- Favorites are saved in the browser (localStorage).

## Notes

- A few older streams use plain `http://` links and are blocked by browsers on secure sites — the player says so instead of hanging.
- All streams belong to their respective owners; this site is only a player UI over public free streams.
