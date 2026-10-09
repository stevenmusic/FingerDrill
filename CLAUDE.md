# FingerDrill 專案規則

## 定位
- 鋼琴技巧練習:考級音階/琶音抽考(第一階段)+ 哈農第一部分(第二階段)+ 練習紀錄、離線、上架 App Store(第三階段)
- 對象:考 ABRSM / Trinity 的學生、上課點考的老師。介面繁體中文,手機直式優先(iPhone 放譜架上)

## 絕不能做的事
- **不要有 build step**:可以多檔(data/ 放 JSON、js/ 放 ES modules),但要能直接部署 GitHub Pages(main 根目錄)
- **不要憑記憶編造考試要求當成已核對**:`data/syllabus.json` 每一級有 `verified`,只有使用者核對過才改 true;README 的核對清單用 `node tools/build/checklist.mjs --fingerings` 重新產生
- **不要用合成鋼琴音**:鋼琴讀 ScrollScore 的 Salamander 取樣(`raw.githubusercontent.com/stevenmusic/ScrollScore/main/piano/`),引擎照 HarmonyHands;節拍器用 Naked Drums 的 xstick 取樣
- **哈農不要逐音手打**:用「樣式 + 移位規則」生成,再對照原譜驗證每首前兩小節與轉折處
- 外觀照 HarmonyHands / HarmonyMap 的設計代幣(`css/app.css` 開頭那段逐項相同),圖示用線稿 SVG(24 格、stroke 2、圓端點)

## 樂理/指法
- 音名不查表:字母照級數推、升降照音高差算(`js/theory.js`)
- 指法:音階、三和弦琶音查 `data/fingerings.json`(兩個八度上行字串),屬七/減七/半音階用 `js/fingering.js` 的規則
- 旋律小調下行 = 自然小調,指法表另外寫 `rhDesc` / `lhDesc`

## 驗證(push 前)
- `node tools/test/verify.mjs`:JSON 結構、所有調 × 題型 × 1–4 八度的音高/拼法/指法可彈性、MusicXML 時值
- `cd tools/test && node smoke.mjs`:手機/桌機,ABRSM/Trinity 1–8 級抽題、畫譜(每個指法數字都畫出來)、播放、節拍器、localStorage、沒有橫向捲動
- 改畫面要用 `node shot.mjs <系統:級:項目id:調>` 截圖看過
