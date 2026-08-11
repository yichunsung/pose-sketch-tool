# PoseSketch

PoseSketch 是一個以 Canvas 製作的火柴人姿勢參考工具。使用者可以拖曳關節、套用常用姿勢、標記人物朝向，並輸出適合 AI 圖像生成工作流程使用的 PNG 與結構化 Pose JSON。

目前是 Vanilla TypeScript + Vite 的 Web MVP；程式核心已使用相對資源路徑，後續可以再包裝成 Tauri 桌面版。

## 功能

- Canvas 火柴人編輯：拖曳頭、頸、肩、手肘、手腕、骨盆、膝蓋、腳踝與腳趾。
- 七種姿勢範本：站立、走路、坐姿、舉手、躺下、趴下、跳動。
- 鏡頭方向提示：用四張預覽卡設定拍正面、背面、左側或右側；Canvas 與 AI 姿勢圖會顯示相機、拍攝路徑及 F/B/L/R 標記。
- AI 辨識提示：左右肢體顏色、頭部方向箭頭、腳尖方向箭頭，以及 `FACE UP`、`FACE DOWN`、`AIRBORNE` 標籤。
- 人物管理：多人物圖層、選取、顯示／隱藏、鎖定、命名、線條顏色與複製。
- 整體操作：上下左右移動、旋轉、縮放與左右鏡像。
- 骨長鎖定：拖曳關節時維持相鄰骨架的原始長度，減少骨架被拉伸變形。
- 畫布設定：背景色、`1:1`、`3:4`、`16:9` 比例，以及背景參考圖片。
- 編輯流程：復原／重做、瀏覽器自動保存與舊專案 schema 遷移。
- 匯出：一般參考 PNG、AI 姿勢 PNG、標準 Pose JSON、可再次編輯的專案 JSON。

## 快速開始

需求：Node.js 18 以上與 npm。

```bash
npm install
npm run dev
```

開啟終端機顯示的網址；預設為：

```text
http://127.0.0.1:5173/
```

## NPM 指令

| 指令 | 用途 |
| --- | --- |
| `npm install` | 安裝依賴 |
| `npm run dev` | 啟動 Vite 開發伺服器 |
| `npm run build` | 執行 TypeScript 檢查並建立 production 靜態檔 |
| `npm run preview` | 預覽 `dist/` 的 production build |
| `npm run check:pose -- /path/to/posesketch-pose.json` | 驗證標準 Pose JSON |

建置結果會放在 `dist/`。目前沒有 Tauri 設定，因此 `npm run build` 產生的是 Web 靜態檔，不是 `.app`、`.dmg` 或 Windows 安裝程式。

## 使用方式

1. 從左側選擇姿勢範本，或按「新增火柴人」建立人物。
2. 在畫布上拖曳彩色關節調整姿勢。紅色代表左側肢體，藍色代表右側肢體。
3. 在右側「目前人物」檢查器設定姿態、鏡頭拍攝方向與頭部方向。鏡頭卡片會說明目前看到胸口、背部、左側身或右側身。
4. 需要保留骨架比例時開啟「鎖定骨長」；需要整體調整時使用移動、旋轉、縮放、鏡像按鈕。
5. 從左側設定畫布比例，或按「背景參考」匯入描姿勢用的圖片。
6. 在右側匯出區選擇 PNG 寬度（1024、1536 或 2048 px），再選擇輸出格式。

快捷操作：

- `V`：選取／拖曳工具
- `H`：平移畫布工具
- 滑鼠滾輪：縮放畫布
- `Space`：平移畫布
- `⌘/Ctrl + S`：匯出可編輯專案 JSON
- `⌘/Ctrl + Z`：復原
- `⇧⌘/Ctrl + Y`：重做

## 匯出格式

### 一般參考 PNG

檔名為 `posesketch-reference.png`。只繪製姿勢骨架，不包含控制點與畫布操作介面，適合當作一般構圖參考。

### AI 姿勢 PNG

檔名為 `posesketch-ai-pose.png`。使用深色背景與較粗線條，並附加以下訊號：

- `L/R`：左、右肢體的顏色與腳尖箭頭。
- 相機與虛線箭頭：顯示鏡頭從哪裡拍向人物。
- `F/B/L/R`：鏡頭看到正面、背面、人物左側或人物右側。
- 頭部方向箭頭：左、右、上或下。
- `LYING / FACE UP`：躺下、仰面。
- `PRONE / FACE DOWN`：趴下、俯面。
- `JUMP / AIRBORNE`：跳動、離地，並顯示向上的動勢箭頭。

這些標記是通用的第一版提示，不代表特定 ControlNet 或姿態模型的正式格式。

### 標準 Pose JSON

檔名為 `posesketch-pose.json`，格式如下：

```json
{
  "format": "posesketch-pose",
  "version": 2,
  "canvas": { "width": 1024, "height": 1024 },
  "figures": [
    {
      "id": "...",
      "name": "Figure 1",
      "visible": true,
      "pose": "stand",
      "cameraView": "front",
      "orientation": "front",
      "headFacing": "right",
      "keypoints": [
        { "name": "head", "x": 0.5, "y": 0.16, "visibility": 1 }
      ]
    }
  ]
}
```

每個人物固定輸出 17 個關節，順序定義在 `src/pose-types.ts`，可用以下指令檢查匯出檔：

```bash
npm run check:pose -- /path/to/posesketch-pose.json
```

### 專案 JSON

檔名為 `posesketch-project.stickpose.json`，保留可編輯的所有人物、關節、鏡頭方向、畫布與背景資料，目前 schema 為 `3`，並能遷移 schema `1`／`2` 專案。舊版 `side` 會遷移為 `left-side`。

瀏覽器自動保存時，人物與畫布 metadata 放在 `localStorage`，背景圖片 Data URL 放在 IndexedDB；手動匯出的專案 JSON 仍會把背景資料嵌入檔案，方便搬移與備份。

## 專案結構

```text
index.html                         頁面入口
src/main.ts                        UI、Canvas 渲染、互動、保存與匯出
src/pose-types.ts                  姿勢資料型別、關節與骨架常數
src/templates.ts                   基準骨架、姿勢範本與範本定位
src/styles.css                     介面樣式
scripts/validate-pose-export.mjs  Pose JSON 驗證腳本
HANDOFF.md                         開發交接與後續工作紀錄
```

## 驗證與開發備註

提交前至少執行：

```bash
npm run build
npm run check:pose -- /path/to/posesketch-pose.json
```

目前沒有獨立的單元測試或 E2E 測試套件；互動驗證以開發伺服器搭配瀏覽器操作完成。背景圖片、`localStorage` 與 IndexedDB 都屬於瀏覽器本機資料，不會自動同步到其他裝置。

## 已知限制與後續方向

- 關節拖曳已有骨長鎖定，但尚未有完整的 two-bone IK，因此手腕／腳踝拖曳時不會自動求出最自然的手肘／膝蓋位置。
- 背景圖片目前支援透明度與 contain／cover，尚未提供完整的畫布內拖曳定位控制。
- 標準 Pose JSON 尚未直接輸出正式 COCO、OpenPose 或特定 ControlNet adapter。
- 尚未建立 Tauri 2 桌面外殼、原生開啟／儲存、簽章、自動更新與跨平台安裝包。
- 尚未指定專案 license；在正式公開前請補上適用的授權檔案。

建議後續順序請參考 [HANDOFF.md](HANDOFF.md)。
