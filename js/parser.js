/* FreeTV - pure M3U playlist parser (no DOM, testable in node) */
function parseM3U(text) {
  var channels = [];
  var seen = {};
  var lines = text.split("\n");
  var meta = null;

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;

    if (line.indexOf("#EXTINF") === 0) {
      var attrs = {};
      var attrRe = /([\w-]+)="([^"]*)"/g;
      var m;
      while ((m = attrRe.exec(line)) !== null) {
        attrs[m[1].toLowerCase()] = m[2];
      }
      var name = line.split(",").pop().trim();
      var group = (attrs["group-title"] || "General").split(";")[0].trim() || "General";
      meta = { n: name, l: attrs["tvg-logo"] || "", g: group };
    } else if (line.charAt(0) === "#") {
      continue; // #EXTVLCOPT, #EXTM3U etc.
    } else if (meta) {
      var url = line;
      if (url && !seen[url] && meta.n) {
        seen[url] = 1;
        channels.push({ n: meta.n, l: meta.l, g: meta.g, u: url });
      }
      meta = null;
    }
  }
  return channels;
}

function qualityOf(name) {
  var m = name.match(/(\d{3,4}p)/);
  return m ? m[1] : "";
}

// node export for tests
if (typeof module !== "undefined" && module.exports) {
  module.exports = { parseM3U: parseM3U, qualityOf: qualityOf };
}
