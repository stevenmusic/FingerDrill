# FingerDrill 專案規則

## 回覆
- 每次改完都用中文條列總結這次改了什麼(使用者要求)

## 定位與架構(使用者選的折衷方案)
- 底部四個分頁:音階 / 琶音 / 哈農 / 考級。音階、琶音、哈農同等重要,考級只是篩選 + 抽考(不是主結構)
- 第一次打開問「在準備考級嗎?」:選了 → 打開考級分頁,音階/琶音分頁上方列出該級要求(可收起);不考 → 自由練習
- 對象:考 ABRSM / Trinity 的學生、上課點考的老師、只想練手指的人。手機直式優先(iPhone 放譜架上)
- 中英雙語:頂欄順序照其他工具 = 左:品牌名 + 副標;右:(工具按鈕)→ 主題 → 語言(EN / 中)。新字串一律走 js/i18n.js(data-i18n 或 tr("中", "EN"))
- 先做鋼琴,之後可能加吉他(練習內容與樂器規則分開)

## 絕不能做的事
- **不要有 build step**:可以多檔(data/ 放 JSON、js/ 放 ES modules),但要能直接部署 GitHub Pages(main 根目錄)
- **考試要求只能照官方大綱**:改 `tools/build/syllabus_src.py` 再執行它產生 `data/syllabus.json`;每一級有 source(頁碼)與 official;
  核對由我們自己做(使用者要求,不用請使用者核對):改了大綱資料要跑 `python3 tools/build/crosscheck.py <ABRSM txt> <Trinity txt>`(PDF 轉文字)
  並對照 PDF 頁面圖片逐格核對手、力度、奏法、八度、速度,都對了才設 verified = true;README 的清單用 `node tools/build/checklist.mjs --fingerings` 重新產生
- 官方大綱 PDF:ABRSM https://www.abrsm.org/en-gb/piano(Cloudflare 擋 curl,要用 Playwright 開頁面再在頁內 fetch);Trinity https://www.trinitycollege.com/resource/?id=9079
- **不要用合成鋼琴音**:鋼琴讀 ScrollScore 的 Salamander 取樣(`raw.githubusercontent.com/stevenmusic/ScrollScore/main/piano/`),引擎照 HarmonyHands;節拍器用 Naked Drums 的 xstick 取樣
- **哈農不要逐音手打**:用「樣式 + 移位規則」生成,再對照原譜驗證每首前兩小節與轉折處
- 外觀照 HarmonyHands / HarmonyMap 的設計代幣(`css/app.css` 開頭那段逐項相同),圖示用線稿 SVG(24 格、stroke 2、圓端點)

## 樂理/指法
- 音名不查表:字母照級數推、升降照音高差算(`js/theory.js`)
- 指法:音階、三和弦琶音查 `data/fingerings.json`(兩個八度上行字串),屬七/減七/半音階用 `js/fingering.js` 的規則
- 旋律小調下行 = 自然小調,指法表另外寫 `rhDesc` / `lhDesc`

## 版面與操作(使用者要求,適用所有工具)
- 版面要適配所有尺寸:折疊機 280、SE 320 到 iPad、桌機、1080p,手機直式與橫式;`node layout.mjs` 19 種尺寸全部通過才 push
- 中英文版面要一模一樣(使用者要求):英文比較長就縮短文字(縮寫、拿掉重複的字),中文也可以精簡;固定行高 1.4;會跟著字寬換行的清單改用固定格子。`node bilingual.mjs` 全部通過才 push
- 要模擬真人操作確認沒有 bug:`node human.mjs 200 <種子>`(觸控亂點 + 每步狀態檢查),換幾個種子跑
- 不做獨立節拍器(這是題庫練習,播放鈕就有預備拍與拍點);速度卡只調速度
- 樂譜一律置中;排成一整行,播放軸照 ScrollScore(半透明金線 #B8860B、頂端三角、上下貼著樂譜 +1.2 譜線間距、停在 25%、樂譜捲動)
- 快取:改了 css/js/data 要跑 `node tools/build/stamp.mjs`(index.html 的 ?v= 版本指紋;verify 會檢查),不然手機會拿到新舊混雜的檔案、按鈕失效

## 驗證(push 前)
- `node tools/test/verify.mjs`:JSON 結構、所有調 × 題型 × 1–4 八度的音高/拼法/指法可彈性、MusicXML 時值
- `cd tools/test && node smoke.mjs`:手機/桌機,ABRSM/Trinity 1–8 級抽題、畫譜(每個指法數字都畫出來)、播放、節拍器、localStorage、沒有橫向捲動
- `cd tools/test && node notation.mjs`:大綱每一題實際用 OSMD 畫出來,比對臨時記號/指法/8va
- 改畫面要用 `node shot.mjs '<題目 JSON>' 名稱` 截圖看過(手機直式、橫向、桌機)

## 記譜規則(js/musicxml.js,verify.mjs 另外獨立檢查)
- 符桿:一組連桿看離中線最遠的音,中線以上(含)朝下;指法右手在上、左手在下(不跟符桿走)
- 臨時記號:同小節、同譜表、同一實際音高(字母 + 八度)到小節線有效,換譜號、8va 不影響(Gould;OSMD 也這樣算)
- 最後一個音:第 1 拍全音符、第 3 拍二分、其他四分(不在拍點就延到下一拍);休止符從拍點起,二分休止符只在第 1/3 拍,不用附點休止符
- 換譜號:目前譜號超過 2 條加線、另一個比較少才換,回到原譜號 1 條以內就換回;仍超過 3 條 → 8va / 8vb
- 右手起音:1–2 八度 C–F 從 4、G–B 從 3;3 八度從 3;4 八度 C–E 從 3、F–B 從 2(屬七照屬音算)
- 三連音「3」只標每隻手第一組
