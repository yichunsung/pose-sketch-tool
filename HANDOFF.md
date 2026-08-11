# PoseSketch 交接文件

最後更新：2026-08-12

## 目前目標

正在製作一個「火柴人姿勢參考畫布」：使用者拖曳火柴人的關節調整人物姿勢，然後匯出圖片或結構化資料，提供給 AI 圖像生成工具作為人物姿勢參考。

最終目標是使用同一份 HTML／Canvas 核心，封裝成 macOS、Windows（之後視需要加入 Linux）桌面應用程式。

## 已完成

- 建立 Vanilla TypeScript + Vite 專案。
- 使用 Canvas 2D 繪製火柴人骨架。
- 使用 HTML/CSS 建立完整工作區介面：工具列、人物範本、圖層、人物檢查器、匯出區。
- 可拖曳主要關節：頭、頸、肩膀、手肘、手腕、骨盆、膝蓋、腳踝、腳趾。
- 左右肢體使用不同顏色，方便 AI 及使用者辨識左右側。
- 已加入可設定的臉部方向箭頭（左／右／上／下）。
- 已將身體朝向改為四向「鏡頭拍攝方向」：正面、背面、人物左側、人物右側；Inspector 使用預覽卡，Canvas 與 AI 匯出圖顯示相機、拍攝箭頭與 F/B/L/R 標記。
- 已加入躺下、趴下、跳動三個姿勢範本；AI 匯出圖會補上 FACE UP、FACE DOWN、AIRBORNE、接地線與動勢箭頭。
- 已加入人物整體位移、縮放、旋轉、左右鏡像與複製姿勢控制。
- 已加入可選的骨長鎖定拖曳，避免調整關節時骨架長度任意變形。
- 可新增多個火柴人、選取圖層、顯示／隱藏人物。
- 已加入站立、走路、坐姿、舉手四個姿勢範本。
- 可調整畫布背景色與畫布比例：1:1、3:4、16:9。
- 可匯入背景圖片，作為描姿勢的參考。
- 已實作復原／重做、瀏覽器 localStorage metadata 自動保存，以及 IndexedDB 背景圖片保存。
- 已實作 schemaVersion 3 專案 JSON 匯出／匯入，並支援 schemaVersion 1／2 舊版專案遷移；舊 `side` 會轉成 `left-side`。
- 已實作一般參考 PNG、AI Pose PNG 與標準化 Pose JSON 匯出。
- PNG 匯出會依 1:1、3:4、16:9 畫布比例輸出，並可選 1024／1536／2048 px 寬度。
- 已抽出 `src/pose-types.ts` 與 `src/templates.ts`，並加入 `npm run check:pose` 匯出格式檢查。
- 已實作畫布縮放與高 DPI Canvas 渲染。
- 已通過 TypeScript 與 production build。

## 重要檔案

```text
index.html                 頁面入口
README.md                 專案說明、使用方式與匯出格式
src/main.ts                Canvas 渲染、互動、專案流程與匯出
src/pose-types.ts          姿勢資料型別、關節與骨架常數
src/templates.ts           基準骨架、姿勢範本與範本定位
src/styles.css             介面樣式
scripts/validate-pose-export.mjs  標準 Pose JSON 檢查腳本
package.json               npm scripts 與依賴
package-lock.json          npm lockfile
tsconfig.json              TypeScript 設定
dist/                      npm run build 產出的靜態檔案
我的歌姬/                   原本資料夾中的參考圖片，未修改
```

目前沒有 `vite.config.*`。曾經放置 Vite config 時，在目前執行環境的 Vite config loader 會卡住；移除後正常。為了讓之後 Tauri 使用相對資源路徑，`package.json` 的 build script 已使用 `vite build --base=./`。

## 如何在搬移後繼續

先進入搬移後的專案根目錄：

```bash
npm install
npm run dev
```

瀏覽器開啟：

```text
http://127.0.0.1:5173/
```

做 production build：

```bash
npm run build
```

本次已確認 build 成功，產出 `dist/`。

檢查標準 Pose JSON：

```bash
npm run check:pose -- /path/to/posesketch-pose.json
```

## 已做過的互動驗證

- 頁面可以正常載入，主要 UI 與 Canvas 可見。
- 「新增火柴人」可建立第二個人物並新增圖層。
- Canvas 初始姿勢可正常渲染。
- 以瀏覽器控制測試過關節拖曳事件，事件有完成執行。
- 實測 16:9 + 1536 px 輸出為 1536 × 864 PNG。
- 實測舊版 localStorage 專案可遷移；目前目標 schemaVersion 為 3。
- 實測範本套用會保留骨盆位置，整體位移與鏡像會反映在 Pose JSON。
- 實測標準 Pose JSON 通過 `npm run check:pose`。

## 尚未完成

### 優先事項：先把 Web MVP 做穩

1. 補上完整的兩段式 IK，讓手腕／腳踝拖曳時更自然地調整手肘／膝蓋。
2. 補充 OpenPose／COCO 與特定 ControlNet exporter。
3. 補上更明確的滑鼠游標狀態與拖曳中的提示。

### 下一階段：桌面版

尚未建立 `src-tauri/`，也尚未安裝 Tauri CLI。預定方案：

- Tauri 2 + Rust 作為桌面外殼。
- Canvas／HTML 核心不直接依賴 Tauri API。
- Tauri 只處理原生開啟／儲存、最近檔案、桌面選單、自動保存及後續更新。
- macOS 先做 `.app`／`.dmg`。
- Windows 再做 NSIS `setup.exe`，企業需求再加 `.msi`。
- 公開發佈前才處理 Apple notarization 與 Windows code signing。

注意：目前 Rust 版本為 1.76，Tauri 2 目前文件要求的最低版本可能高於此版本；開始桌面封裝前先確認並更新 Rust toolchain。

### AI 整合

第一版先維持「匯出後自行上傳」：

- `posesketch-reference.png`：一般圖片 AI 參考圖。
- `posesketch-ai-pose.png`：深色背景、左右肢體配色的姿勢圖。
- `posesketch-pose.json`：標準化關節與姿態 metadata。
- `posesketch-project.stickpose.json`：可編輯專案資料。

後續再加入：

- OpenPose／COCO JSON 匯出。
- 特定模型專用的 ControlNet pose map。
- ComfyUI workflow 連接。
- 雲端圖片 API 或 BYOK API key 儲存。

不要把共享的 AI API key 放進 HTML、JavaScript bundle 或桌面二進制檔。若做正式服務，應由後端代理呼叫 AI；若做個人 BYOK，才考慮用 Tauri Stronghold 保存使用者自己的 key。

## 目前已知限制

- 已有骨長鎖定與整體操作按鈕；尚未加入完整的 two-bone IK 與視覺 bounding box。
- 背景圖片目前只有匯入、透明度與簡單 contain／cover 設計，尚未提供完整的拖曳定位控制；瀏覽器自動保存已使用 IndexedDB 儲存圖片資料。
- 標準 Pose JSON 已完成，但尚未輸出正式 COCO／OpenPose 格式。
- AI Pose PNG 是第一版通用骨架圖，尚未針對特定 ControlNet 模型做顏色與關節順序 adapter。
- 桌面檔案系統、原生選單、簽章、自動更新都還沒做。

## 建議續作順序

1. 補完 two-bone IK 與背景圖片定位控制。
2. 確定主要 AI 目標平台後，完成對應 pose exporter。
3. 建立 Tauri 2 shell，先做 macOS unsigned internal build。
4. 用 GitHub Actions 建 macOS／Windows artifacts。

## 目前沒有做的事情

- 沒有修改 `我的歌姬/` 裡的既有圖片。
- 沒有呼叫任何 AI 圖像 API。
- 沒有安裝或建立 Tauri 專案。
- 沒有刪除使用者原有資料。
