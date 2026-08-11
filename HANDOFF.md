# PoseSketch 交接文件

最後更新：2026-08-11

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
- 已加入身體朝向設定（正面／背面／側面）與 AI 匯出圖的 F/B/S 標記。
- 已加入躺下、趴下、跳動三個姿勢範本；AI 匯出圖會補上 FACE UP、FACE DOWN、AIRBORNE、接地線與動勢箭頭。
- 可新增多個火柴人、選取圖層、顯示／隱藏人物。
- 已加入站立、走路、坐姿、舉手四個姿勢範本。
- 可調整畫布背景色與畫布比例：1:1、3:4、16:9。
- 可匯入背景圖片，作為描姿勢的參考。
- 已實作復原／重做、瀏覽器 localStorage 自動保存。
- 已實作專案 JSON 匯出／匯入。
- 已實作一般參考 PNG 與 AI Pose PNG 匯出。
- 已實作畫布縮放與高 DPI Canvas 渲染。
- 已通過 TypeScript 與 production build。

## 重要檔案

```text
index.html                 頁面入口
src/main.ts                主要資料模型、Canvas 渲染、互動、匯出
src/styles.css             介面樣式
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

## 已做過的互動驗證

- 頁面可以正常載入，主要 UI 與 Canvas 可見。
- 「新增火柴人」可建立第二個人物並新增圖層。
- Canvas 初始姿勢可正常渲染。
- 以瀏覽器控制測試過關節拖曳事件，事件有完成執行。
- 匯出按鈕點擊後沒有產生 console error。
- 瀏覽器自動化的 download event 沒有攔截到直接由 `<a download>` 觸發的下載；這不代表程式匯出失敗，搬移後應以實際下載檔案再驗證一次。
- 最後一次瀏覽器截圖時瀏覽器連線的 native pipe 中斷，尚未重新做最後的視覺回歸測試。

## 尚未完成

### 優先事項：先把 Web MVP 做穩

1. 重新啟動 dev server，確認搬移後路徑能正常啟動。
2. 測試實際 PNG／JSON 下載檔案。
3. 測試重新載入／開啟 JSON 後姿勢與圖層是否一致。
4. 測試背景圖片匯入與專案保存。
5. 測試 3:4、16:9 畫布比例下的渲染與匯出。
6. 補上更明確的滑鼠游標狀態與拖曳中的提示。

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
- `posesketch-project.stickpose.json`：可編輯專案資料。

後續再加入：

- OpenPose／COCO JSON 匯出。
- 特定模型專用的 ControlNet pose map。
- ComfyUI workflow 連接。
- 雲端圖片 API 或 BYOK API key 儲存。

不要把共享的 AI API key 放進 HTML、JavaScript bundle 或桌面二進制檔。若做正式服務，應由後端代理呼叫 AI；若做個人 BYOK，才考慮用 Tauri Stronghold 保存使用者自己的 key。

## 目前已知限制

- 關節目前是直接拖曳，尚未加入骨長限制或 two-bone IK。
- 尚未有完整的人物整體移動／旋轉／縮放控制框。
- 背景圖片目前只有匯入、透明度與簡單 contain／cover 設計，尚未提供完整的拖曳定位控制。
- `Pose JSON` 目前是完整專案 JSON，不是正式 COCO／OpenPose 輸出格式。
- AI Pose PNG 是第一版通用骨架圖，尚未針對特定 ControlNet 模型做顏色與關節順序 adapter。
- 桌面檔案系統、原生選單、簽章、自動更新都還沒做。

## 建議續作順序

1. 搬移後執行 `npm install && npm run build`。
2. 修正並驗證 Web MVP 的匯入／匯出與多比例畫布。
3. 加入人物整體選取與移動／縮放／旋轉。
4. 建立 Tauri 2 shell，先做 macOS unsigned internal build。
5. 用 GitHub Actions 建 macOS／Windows artifacts。
6. 確定主要 AI 目標平台後，再做對應的 pose exporter。

## 目前沒有做的事情

- 沒有修改 `我的歌姬/` 裡的既有圖片。
- 沒有呼叫任何 AI 圖像 API。
- 沒有安裝或建立 Tauri 專案。
- 沒有刪除使用者原有資料。
