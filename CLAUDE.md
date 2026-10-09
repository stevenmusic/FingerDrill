# FingerDrill 專案規則

## 回覆
- 每次改完都用中文條列總結這次改了什麼(使用者要求)

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
- `cd tools/test && node notation.mjs`:大綱每一題實際用 OSMD 畫出來,比對臨時記號/指法/8va
- 改畫面要用 `node shot.mjs <系統:級:項目id:調>` 截圖看過

## 記譜規則(js/musicxml.js,verify.mjs 另外獨立檢查)
- 符桿:一組連桿看離中線最遠的音,中線以上(含)朝下;指法右手在上、左手在下(不跟符桿走)
- 臨時記號:同小節、同譜表、同一實際音高(字母 + 八度)到小節線有效,換譜號、8va 不影響(Gould;OSMD 也這樣算)
- 最後一個音:第 1 拍全音符、第 3 拍二分、其他四分(不在拍點就延到下一拍);休止符從拍點起,二分休止符只在第 1/3 拍,不用附點休止符
- 換譜號:目前譜號超過 2 條加線、另一個比較少才換,回到原譜號 1 條以內就換回;仍超過 3 條 → 8va / 8vb
- 右手起音:1–2 八度 C–F 從 4、G–B 從 3;3 八度從 3;4 八度 C–E 從 3、F–B 從 2(屬七照屬音算)
- 三連音「3」只標每隻手第一組
