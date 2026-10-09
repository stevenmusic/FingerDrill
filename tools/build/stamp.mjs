/* 版本指紋(快取問題):GitHub Pages 會讓瀏覽器快取 10 分鐘,更新後可能拿到「新 HTML + 舊 CSS/JS」。
   這支程式把每個檔案內容的雜湊寫進 index.html:
   - <link href="css/app.css?v=…">、<script src="vendor/…?v=…">、<script type="module" src="js/app.js?v=…">
   - <script type="importmap">:js/ 底下每個模組 → 帶 ?v= 的網址(模組彼此 import 的相對路徑也會被換掉)
   - <script type="application/json" id="fdVersions">:data/*.json 的版本(app.js fetch 時帶上)
   改了任何 css/js/data 之後執行:node tools/build/stamp.mjs;node tools/build/stamp.mjs --check 只檢查(verify.mjs 會跑) */
import fs from "node:fs";
import crypto from "node:crypto";
const root = new URL("../../", import.meta.url).pathname;
const h = f => crypto.createHash("sha1").update(fs.readFileSync(root + f)).digest("hex").slice(0, 10);
const js = fs.readdirSync(root + "js").filter(f => f.endsWith(".js")).sort().map(f => "js/" + f);
const data = fs.readdirSync(root + "data").filter(f => f.endsWith(".json")).sort().map(f => "data/" + f);
const imap = { imports: Object.fromEntries(js.map(f => ["./" + f, "./" + f + "?v=" + h(f)])) };
const dv = Object.fromEntries(data.map(f => [f, h(f)]));
let html = fs.readFileSync(root + "index.html", "utf8");
const orig = html;
html = html.replace(/href="css\/app\.css(\?v=[^"]*)?"/, `href="css/app.css?v=${h("css/app.css")}"`);
html = html.replace(/src="vendor\/opensheetmusicdisplay\.min\.js(\?v=[^"]*)?"/, `src="vendor/opensheetmusicdisplay.min.js?v=${h("vendor/opensheetmusicdisplay.min.js")}"`);
html = html.replace(/<script type="module" src="js\/app\.js(\?v=[^"]*)?"><\/script>/, `<script type="module" src="js/app.js?v=${h("js/app.js")}"></script>`);
const block = `<script type="importmap">${JSON.stringify(imap)}</script>\n<script type="application/json" id="fdVersions">${JSON.stringify(dv)}</script>\n`;
html = html.replace(/<script type="importmap">.*?<\/script>\n<script type="application\/json" id="fdVersions">.*?<\/script>\n/s, "");
html = html.replace(/(<script src="vendor\/opensheetmusicdisplay)/, block + "$1");
if (process.argv.includes("--check")) {
  if (html !== orig) { console.log("✗ index.html 的版本指紋不是最新的:執行 node tools/build/stamp.mjs"); process.exit(1); }
  console.log("✓ 版本指紋是最新的");
} else { fs.writeFileSync(root + "index.html", html); console.log(html === orig ? "版本指紋沒有變" : "已更新 index.html 的版本指紋"); }
