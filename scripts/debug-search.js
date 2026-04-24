const https = require("https");
const { URL } = require("url");

function fetch(url, binary = false) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": binary ? "image/*" : "text/html,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 15000,
    };

    https.get(url, options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const redir = res.headers.location.startsWith("http")
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        return fetch(redir, binary).then(resolve).catch(reject);
      }

      if (binary) {
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => resolve({ status: res.statusCode, data: Buffer.concat(chunks), headers: res.headers }));
      } else {
        let data = "";
        res.on("data", c => data += c);
        res.on("end", () => resolve({ status: res.statusCode, data, headers: res.headers }));
      }
    }).on("error", reject);
  });
}

async function run() {
  // Try Bing image search (often easier to scrape)
  const query = encodeURIComponent("Enerlites 17001-F3 fan control dimmer switch product image");

  console.log("=== Trying Bing Images ===");
  const bingRes = await fetch("https://www.bing.com/images/search?q=" + query + "&form=HDRSC3&first=1");
  console.log("Bing status:", bingRes.status);

  // Extract murl (media URL) from Bing results
  const murlRegex = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/g;
  const murls = [];
  let m;
  while ((m = murlRegex.exec(bingRes.data)) !== null) {
    murls.push(decodeURIComponent(m[1]));
  }
  console.log("Bing media URLs:", murls.length);
  murls.slice(0, 10).forEach(u => console.log("  ", u));

  // Try downloading top results
  for (const url of murls.slice(0, 5)) {
    try {
      const res = await fetch(url, true);
      const ct = res.headers["content-type"] || "unknown";
      console.log(`\n  Download: ${url.substring(0, 100)}`);
      console.log(`  Status: ${res.status}, Type: ${ct}, Size: ${res.data.length} bytes`);
    } catch (e) {
      console.log(`  Failed: ${url.substring(0, 80)} - ${e.message}`);
    }
  }

  // Also try direct Home Depot search
  console.log("\n=== Trying Home Depot ===");
  try {
    const hdRes = await fetch("https://www.homedepot.com/s/enerlites%2017001-F3");
    console.log("HD status:", hdRes.status);
    const hdImgs = bingRes.data.match(/https:\/\/images\.thdstatic\.com\/productImages\/[^\s"']+/g) || [];
    console.log("HD images:", hdImgs.length);
    hdImgs.slice(0, 5).forEach(u => console.log("  ", u));
  } catch (e) {
    console.log("HD failed:", e.message);
  }
}

run().catch(console.error);
