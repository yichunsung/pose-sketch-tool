import './styles.css';
import {
  BONE_PAIRS,
  CAMERA_VIEWS,
  JOINT_NAMES,
  cameraViewLabels,
  isCameraView,
  poseLabels,
  type BackgroundLayer,
  type CameraView,
  type Figure,
  type FigurePose,
  type HeadFacing,
  type JointName,
  type Joints,
  type Point,
  type PoseProject,
} from './pose-types';
import { createBaseJoints, createTemplateJoints, isFigurePose, placeTemplateAtFigure } from './templates';

type DrawOptions = {
  showGrid?: boolean;
  showHandles?: boolean;
  includeBackground?: boolean;
  aiMode?: boolean;
};

const leftColor = '#f06a5f';
const rightColor = '#4b8fe8';
const centerColor = '#27333f';
const cameraColor = '#d9902f';
const cameraViewUiLabels: Record<CameraView, { title: string; detail: string; surface: string }> = {
  front: { title: '拍正面', detail: '鏡頭看到胸口', surface: '胸' },
  back: { title: '拍背面', detail: '鏡頭看到背部', surface: '背' },
  'left-side': { title: '拍左側', detail: '鏡頭看到人物左側', surface: '左' },
  'right-side': { title: '拍右側', detail: '鏡頭看到人物右側', surface: '右' },
};
const appRoot = document.querySelector<HTMLDivElement>('#app')!;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function createFigure(index = 0, offsetX = 0, offsetY = 0, scale = 1): Figure {
  return {
    id: crypto.randomUUID(),
    name: `人物 ${index + 1}`,
    joints: createBaseJoints(offsetX, offsetY, scale),
    cameraView: 'front',
    pose: 'stand',
    headFacing: 'right',
    boneLock: false,
    visible: true,
    locked: false,
    color: centerColor,
    accent: `hsl(${195 + index * 45} 76% 52%)`,
  };
}

function createDefaultProject(): PoseProject {
  return {
    schemaVersion: 3,
    canvas: { width: 1024, height: 1024, backgroundColor: '#fbfaf7' },
    figures: [createFigure(0)],
  };
}

const project: PoseProject = createDefaultProject();
let selectedFigureId = project.figures[0].id;
let selectedJoint: JointName | null = null;
let zoom = 1;
let backgroundImage: HTMLImageElement | null = null;
let historyPast: PoseProject[] = [];
let historyFuture: PoseProject[] = [];
let dragStart: PoseProject | null = null;
let dragMoved = false;
let dragBoneLengths: Record<string, number> | null = null;
let exportResolution = 1024;

appRoot.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark"><span></span><span></span><span></span></div>
        <div><strong>PoseSketch</strong><small>AI 姿勢參考畫布</small></div>
      </div>
      <div class="toolbar-group">
        <button class="tool-button" data-action="new" title="建立新畫布">新建</button>
        <button class="tool-button" data-action="open" title="開啟 PoseSketch 專案">開啟</button>
        <button class="tool-button" data-action="save" title="儲存專案">儲存</button>
        <span class="toolbar-divider"></span>
        <button class="icon-button" data-action="undo" title="復原（⌘/Ctrl+Z）">↶</button>
        <button class="icon-button" data-action="redo" title="重做（⇧⌘/Ctrl+Y）">↷</button>
      </div>
      <div class="toolbar-actions">
        <button class="secondary-button" data-action="background">＋ 背景參考</button>
        <button class="primary-button" data-action="export-pose">匯出 AI 姿勢圖 <span>↗</span></button>
      </div>
    </header>

    <main class="workspace">
      <aside class="left-panel panel">
        <div class="panel-heading"><span>工具</span><span class="eyebrow">TOOLS</span></div>
        <div class="tool-stack">
          <button class="side-tool active" data-tool="select"><span class="tool-icon">✥</span><span>選取／拖曳</span><kbd>V</kbd></button>
          <button class="side-tool" data-tool="pan"><span class="tool-icon">✋</span><span>平移畫布</span><kbd>H</kbd></button>
        </div>
        <div class="panel-heading section-heading"><span>人物</span><span class="eyebrow">FIGURES</span></div>
        <button class="add-figure" data-action="add-figure"><span>＋</span> 新增火柴人</button>
        <div class="templates">
          <button class="template-card" data-template="stand"><span class="template-preview stand-preview"></span><span>站立</span></button>
          <button class="template-card" data-template="walk"><span class="template-preview walk-preview"></span><span>走路</span></button>
          <button class="template-card" data-template="sit"><span class="template-preview sit-preview"></span><span>坐姿</span></button>
          <button class="template-card" data-template="raise"><span class="template-preview raise-preview"></span><span>舉手</span></button>
          <button class="template-card" data-template="lying"><span class="template-preview lying-preview"></span><span>躺下</span></button>
          <button class="template-card" data-template="prone"><span class="template-preview prone-preview"></span><span>趴下</span></button>
          <button class="template-card" data-template="jump"><span class="template-preview jump-preview"></span><span>跳動</span></button>
        </div>
        <div class="panel-heading section-heading"><span>畫布</span><span class="eyebrow">CANVAS</span></div>
        <label class="field-label">背景顏色<input id="background-color" type="color" value="${project.canvas.backgroundColor}"></label>
        <div class="canvas-presets">
          <button data-aspect="1:1" class="aspect-chip active">1:1</button>
          <button data-aspect="3:4" class="aspect-chip">3:4</button>
          <button data-aspect="16:9" class="aspect-chip">16:9</button>
        </div>
        <div class="help-card"><span class="help-spark">✦</span><div><strong>姿勢小提示</strong><p>拖曳彩色關節，就能快速調整左右手腳。躺下、趴下、跳動範本會一併留下 AI 辨識提示。</p></div></div>
      </aside>

      <section class="canvas-stage">
        <div class="stage-topline"><div><span class="status-dot"></span><span id="save-status">已自動儲存</span></div><span id="canvas-size">1024 × 1024</span></div>
        <div class="canvas-wrap" id="canvas-wrap"><canvas id="pose-canvas"></canvas><div class="empty-hint" id="empty-hint">拖曳關節開始調整姿勢</div></div>
        <div class="stage-bottomline"><div class="zoom-control"><button data-action="zoom-out">−</button><span id="zoom-label">100%</span><button data-action="zoom-in">＋</button></div><span>Space 平移 · 滾輪縮放 · ⌘/Ctrl+S 儲存</span></div>
      </section>

      <aside class="right-panel panel">
        <div class="panel-heading"><span>圖層</span><span class="eyebrow">LAYERS</span></div>
        <div id="layer-list" class="layer-list"></div>
        <div class="panel-heading section-heading"><span>目前人物</span><span class="eyebrow">INSPECTOR</span></div>
        <div class="inspector" id="inspector"></div>
        <div class="export-card"><div class="export-card-title"><span class="export-icon">✦</span><div><strong>給 AI 的參考圖</strong><small>只保留姿勢，不含控制點</small></div></div><label class="export-resolution">PNG 寬度<select id="export-resolution"><option value="1024">1024 px</option><option value="1536">1536 px</option><option value="2048">2048 px</option></select></label><button class="export-outline" data-action="export-reference">匯出一般參考 PNG <span>↗</span></button><button class="export-outline" data-action="export-pose-reference">匯出 AI 姿勢 PNG <span>↗</span></button><button class="export-outline" data-action="export-json">匯出標準 Pose JSON <span>↗</span></button><button class="export-outline" data-action="export-project-json">匯出專案 JSON <span>↗</span></button></div>
      </aside>
    </main>
    <input id="background-input" type="file" accept="image/*" hidden>
    <input id="project-input" type="file" accept="application/json,.json,.stickpose" hidden>
    <div class="toast" id="toast" role="status"></div>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>('#pose-canvas')!;
const canvasWrap = document.querySelector<HTMLDivElement>('#canvas-wrap')!;
const ctx = canvas.getContext('2d')!;
const layerList = document.querySelector<HTMLDivElement>('#layer-list')!;
const inspector = document.querySelector<HTMLDivElement>('#inspector')!;
const saveStatus = document.querySelector<HTMLSpanElement>('#save-status')!;
const zoomLabel = document.querySelector<HTMLSpanElement>('#zoom-label')!;
const canvasSizeLabel = document.querySelector<HTMLSpanElement>('#canvas-size')!;
const toast = document.querySelector<HTMLDivElement>('#toast')!;

function selectedFigure(): Figure | undefined {
  return project.figures.find((figure) => figure.id === selectedFigureId);
}

function setStatus(message: string): void {
  saveStatus.textContent = message;
}

let toastTimer: number | undefined;
function showToast(message: string): void {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}

function commit(): void {
  historyPast.push(clone(project));
  if (historyPast.length > 100) historyPast.shift();
  historyFuture = [];
  setStatus('尚未儲存的變更');
  persistLocal();
}

function undo(): void {
  const previous = historyPast.pop();
  if (!previous) return;
  historyFuture.push(clone(project));
  Object.assign(project, clone(previous));
  selectedFigureId = project.figures[0]?.id ?? '';
  selectedJoint = null;
  renderAll();
  persistLocal();
  setStatus('已復原');
}

function redo(): void {
  const next = historyFuture.pop();
  if (!next) return;
  historyPast.push(clone(project));
  Object.assign(project, clone(next));
  selectedFigureId = project.figures[0]?.id ?? '';
  selectedJoint = null;
  renderAll();
  persistLocal();
  setStatus('已重做');
}

function persistLocal(): void {
  const snapshot = clone(project);
  if (snapshot.background) snapshot.background.dataUrl = '';
  try {
    localStorage.setItem('posesketch:last-project', JSON.stringify(snapshot));
  } catch {
    // Private browsing or quota errors should not block editing.
  }
  saveBackgroundAsset(project.background?.dataUrl ?? null);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function readPoint(value: unknown): Point | null {
  const record = asRecord(value);
  if (!record || !finiteNumber(record.x) || !finiteNumber(record.y)) return null;
  return { x: record.x, y: record.y };
}

function migrateProject(raw: unknown): PoseProject {
  const record = asRecord(raw);
  const schemaVersion = record?.schemaVersion;
  if (!record || (schemaVersion !== 1 && schemaVersion !== 2 && schemaVersion !== 3) || !Array.isArray(record.figures)) {
    throw new Error('invalid-project');
  }

  const canvasRecord = asRecord(record.canvas);
  const width = canvasRecord && finiteNumber(canvasRecord.width) && canvasRecord.width > 0 ? Math.round(canvasRecord.width) : 1024;
  const height = canvasRecord && finiteNumber(canvasRecord.height) && canvasRecord.height > 0 ? Math.round(canvasRecord.height) : 1024;
  const backgroundColor = canvasRecord && typeof canvasRecord.backgroundColor === 'string' ? canvasRecord.backgroundColor : '#fbfaf7';

  const figures = record.figures.map((rawFigure, index) => {
    const figureRecord = asRecord(rawFigure);
    const jointsRecord = figureRecord ? asRecord(figureRecord.joints) : null;
    if (!figureRecord || !jointsRecord) throw new Error('invalid-figure');
    const joints = {} as Joints;
    for (const jointName of JOINT_NAMES) {
      const point = readPoint(jointsRecord[jointName]);
      if (!point) throw new Error('invalid-joints');
      joints[jointName] = point;
    }

    const defaults = createFigure(index);
    const legacyOrientation = figureRecord.orientation;
    const cameraView: CameraView = isCameraView(figureRecord.cameraView)
      ? figureRecord.cameraView
      : legacyOrientation === 'back'
        ? 'back'
        : legacyOrientation === 'side'
          ? 'left-side'
          : 'front';
    const pose = figureRecord.pose === 'walk' || figureRecord.pose === 'sit' || figureRecord.pose === 'raise' || figureRecord.pose === 'lying' || figureRecord.pose === 'prone' || figureRecord.pose === 'jump' ? figureRecord.pose : 'stand';
    const headFacing = figureRecord.headFacing === 'left' || figureRecord.headFacing === 'up' || figureRecord.headFacing === 'down' ? figureRecord.headFacing : 'right';
    return {
      ...defaults,
      id: typeof figureRecord.id === 'string' && figureRecord.id ? figureRecord.id : defaults.id,
      name: typeof figureRecord.name === 'string' && figureRecord.name ? figureRecord.name : defaults.name,
      joints,
      cameraView,
      pose,
      headFacing,
      boneLock: typeof figureRecord.boneLock === 'boolean' ? figureRecord.boneLock : false,
      visible: typeof figureRecord.visible === 'boolean' ? figureRecord.visible : true,
      locked: typeof figureRecord.locked === 'boolean' ? figureRecord.locked : false,
      color: typeof figureRecord.color === 'string' ? figureRecord.color : centerColor,
      accent: typeof figureRecord.accent === 'string' ? figureRecord.accent : defaults.accent,
    } satisfies Figure;
  });

  const backgroundRecord = asRecord(record.background);
  const background = backgroundRecord && typeof backgroundRecord.dataUrl === 'string'
    ? {
        dataUrl: backgroundRecord.dataUrl,
        opacity: finiteNumber(backgroundRecord.opacity) ? Math.max(0, Math.min(1, backgroundRecord.opacity)) : 0.24,
        fit: backgroundRecord.fit === 'cover' ? 'cover' as const : 'contain' as const,
      }
    : undefined;

  return {
    schemaVersion: 3,
    canvas: { width, height, backgroundColor },
    figures,
    ...(background ? { background } : {}),
  };
}

function normalizeFigureMetadata(): void {
  project.figures.forEach((figure) => {
    figure.cameraView = isCameraView(figure.cameraView) ? figure.cameraView : 'front';
    figure.pose = figure.pose ?? 'stand';
    figure.headFacing = figure.headFacing ?? 'right';
    figure.boneLock = figure.boneLock ?? false;
  });
  project.schemaVersion = 3;
}

function setFigurePose(figure: Figure, pose: FigurePose): void {
  figure.pose = pose;
  if (pose === 'lying' || pose === 'prone') {
    figure.cameraView = 'left-side';
    figure.headFacing = 'left';
  }
}

function openAssetDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('indexeddb-unavailable')); return; }
    const request = window.indexedDB.open('posesketch-assets', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('assets');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexeddb-open-failed'));
  });
}

function saveBackgroundAsset(dataUrl: string | null): void {
  void openAssetDatabase().then((database) => {
    const transaction = database.transaction('assets', 'readwrite');
    const store = transaction.objectStore('assets');
    if (dataUrl) store.put(dataUrl, 'background');
    else store.delete('background');
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  }).catch(() => {
    // localStorage remains the metadata fallback when IndexedDB is unavailable.
  });
}

function readBackgroundAsset(): Promise<string | null> {
  return openAssetDatabase().then((database) => new Promise<string | null>((resolve, reject) => {
    const request = database.transaction('assets', 'readonly').objectStore('assets').get('background');
    request.onsuccess = () => { database.close(); resolve(typeof request.result === 'string' ? request.result : null); };
    request.onerror = () => { database.close(); reject(request.error ?? new Error('indexeddb-read-failed')); };
  })).catch(() => null);
}

async function restoreLocal(): Promise<void> {
  try {
    const raw = localStorage.getItem('posesketch:last-project');
    if (!raw) return;
    const saved = migrateProject(JSON.parse(raw));
    Object.assign(project, saved);
    normalizeFigureMetadata();
    if (project.background && !project.background.dataUrl) {
      project.background.dataUrl = await readBackgroundAsset() ?? '';
    }
    selectedFigureId = project.figures[0]?.id ?? '';
  } catch {
    // Ignore an invalid local snapshot.
  }
}

function logicalSize(): { width: number; height: number } {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function toCanvasPoint(point: Point, width: number, height: number): Point {
  return { x: point.x * width, y: point.y * height };
}

function fromPointer(event: PointerEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
  };
}

function drawGrid(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.save();
  context.strokeStyle = 'rgba(45, 58, 67, 0.055)';
  context.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const x = (width / 10) * i;
    const y = (height / 10) * i;
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }
  context.strokeStyle = 'rgba(45, 58, 67, 0.12)';
  context.setLineDash([5, 7]);
  context.beginPath(); context.moveTo(width / 2, 0); context.lineTo(width / 2, height); context.stroke();
  context.beginPath(); context.moveTo(0, height * 0.86); context.lineTo(width, height * 0.86); context.stroke();
  context.restore();
}

function drawBackground(context: CanvasRenderingContext2D, width: number, height: number): void {
  if (!project.background || !backgroundImage) return;
  const image = backgroundImage;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  if ((project.background.fit === 'contain' && imageRatio > canvasRatio) || (project.background.fit === 'cover' && imageRatio < canvasRatio)) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }
  context.save();
  context.globalAlpha = project.background.opacity;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  context.restore();
}

function drawArrowHead(context: CanvasRenderingContext2D, from: Point, to: Point, color: string, size: number): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(2, size * 0.14);
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - Math.cos(angle - Math.PI / 6) * size, to.y - Math.sin(angle - Math.PI / 6) * size);
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - Math.cos(angle + Math.PI / 6) * size, to.y - Math.sin(angle + Math.PI / 6) * size);
  context.stroke();
  context.restore();
}

function drawFootDirectionCue(context: CanvasRenderingContext2D, ankle: Point, toe: Point, label: string, width: number): void {
  const dx = toe.x - ankle.x;
  const dy = toe.y - ankle.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const size = Math.max(12, width / 70);
  const normal = { x: -dy / length, y: dx / length };
  drawArrowHead(context, ankle, toe, '#ffd166', size);
  context.save();
  context.fillStyle = '#ffd166';
  context.font = `700 ${Math.max(16, width / 56)}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, toe.x + normal.x * size * 1.6, toe.y + normal.y * size * 1.6);
  context.restore();
}

function drawHeadDirectionCue(context: CanvasRenderingContext2D, head: Point, headRadius: number, facing: HeadFacing, aiMode: boolean): void {
  const directions: Record<HeadFacing, Point> = {
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
  };
  const vector = directions[facing] ?? directions.right;
  const tip = { x: head.x + vector.x * headRadius * 0.78, y: head.y + vector.y * headRadius * 0.78 };
  const color = aiMode ? '#ffd166' : 'rgba(39, 51, 63, .6)';
  context.save();
  context.strokeStyle = color;
  context.lineWidth = Math.max(2, headRadius * 0.08);
  context.lineCap = 'round';
  context.beginPath(); context.moveTo(head.x, head.y); context.lineTo(tip.x, tip.y); context.stroke();
  drawArrowHead(context, head, tip, color, Math.max(10, headRadius * 0.28));
  context.restore();
}

function drawAiGroundCue(context: CanvasRenderingContext2D, figure: Figure, point: (joint: JointName) => Point, width: number, height: number): number {
  const pose = figure.pose ?? 'stand';
  if (pose !== 'lying' && pose !== 'prone' && pose !== 'jump') return 0;
  const points = JOINT_NAMES.map((jointName) => point(jointName));
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const maxY = Math.max(...points.map(({ y }) => y));
  const size = Math.max(13, width / 78);
  const groundY = pose === 'jump'
    ? Math.min(height - size * 1.7, maxY + size * 5.4)
    : Math.min(height - size * 0.8, maxY + size * 0.9);
  const startX = Math.max(size, minX - size * 1.4);
  const endX = Math.min(width - size, maxX + size * 1.4);

  context.save();
  context.strokeStyle = '#ffd166';
  context.lineWidth = Math.max(2, width / 360);
  context.lineCap = 'round';
  context.setLineDash(pose === 'jump' ? [size * 0.55, size * 0.38] : []);
  context.beginPath(); context.moveTo(startX, groundY); context.lineTo(endX, groundY); context.stroke();
  context.setLineDash([]);
  if (pose === 'jump') {
    for (const toeName of ['toeL', 'toeR'] as const) {
      const toe = point(toeName);
      context.beginPath(); context.ellipse(toe.x, groundY + size * 0.3, size * 0.48, size * 0.14, 0, 0, Math.PI * 2); context.stroke();
    }
  }
  context.restore();
  return groundY;
}

function drawAiPoseCue(context: CanvasRenderingContext2D, figure: Figure, point: (joint: JointName) => Point, width: number, height: number): void {
  const pose = figure.pose ?? 'stand';
  if (pose !== 'lying' && pose !== 'prone' && pose !== 'jump') return;
  const points = JOINT_NAMES.map((jointName) => point(jointName));
  const minX = Math.min(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => y));
  const maxY = Math.max(...points.map(({ y }) => y));
  const pelvis = point('pelvis');
  const chest = point('neck');
  const size = Math.max(16, width / 58);
  const fontSize = Math.max(15, width / 66);
  const label = poseLabels[pose];

  const groundY = drawAiGroundCue(context, figure, point, width, height);
  context.save();
  context.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  const paddingX = size * 0.62;
  const badgeHeight = size * 1.7;
  const badgeWidth = context.measureText(label).width + paddingX * 2;
  const minMargin = size * 0.85;
  const preferredBadgeX = pose === 'jump' ? pelvis.x - badgeWidth / 2 : minX - size * 0.25;
  const badgeX = Math.max(minMargin, Math.min(width - badgeWidth - minMargin, preferredBadgeX));
  const badgeY = pose === 'jump'
    ? Math.min(height - badgeHeight - minMargin, groundY + size * 0.6)
    : Math.max(size * 3.5, minY - badgeHeight - size * 0.7);
  context.fillStyle = 'rgba(29, 37, 45, .94)';
  context.strokeStyle = '#ffd166';
  context.lineWidth = Math.max(2, width / 360);
  context.beginPath(); context.rect(badgeX, badgeY, badgeWidth, badgeHeight); context.fill(); context.stroke();
  context.fillStyle = '#ffd166';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);

  if (pose === 'lying' || pose === 'prone') {
    const direction = pose === 'lying' ? -1 : 1;
    const arrowX = Math.min(width - size * 2, chest.x + size * 2.2);
    const arrowFrom = { x: arrowX, y: chest.y - direction * size * 0.9 };
    const arrowTo = { x: arrowX, y: chest.y + direction * size * 0.9 };
    context.setLineDash([size * 0.35, size * 0.2]);
    context.beginPath(); context.moveTo(arrowFrom.x, arrowFrom.y); context.lineTo(arrowTo.x, arrowTo.y); context.stroke();
    context.setLineDash([]);
    drawArrowHead(context, arrowFrom, arrowTo, '#ffd166', size * 0.6);
  } else {
    const arrowX = maxY < height * 0.78 ? Math.min(width - size * 2, pelvis.x + size * 2.8) : Math.max(size * 2, pelvis.x - size * 2.8);
    const arrowFrom = { x: arrowX, y: pelvis.y + size * 1.35 };
    const arrowTo = { x: arrowX, y: pelvis.y - size * 1.35 };
    context.setLineDash([size * 0.35, size * 0.2]);
    context.beginPath(); context.moveTo(arrowFrom.x, arrowFrom.y); context.lineTo(arrowTo.x, arrowTo.y); context.stroke();
    context.setLineDash([]);
    drawArrowHead(context, arrowFrom, arrowTo, '#ffd166', size * 0.6);
  }
  context.restore();
}

function drawCameraIcon(context: CanvasRenderingContext2D, center: Point, size: number, color: string): void {
  const bodyWidth = size * 1.55;
  const bodyHeight = size * 0.95;
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2, size * 0.14);
  context.lineJoin = 'round';
  context.strokeRect(center.x - bodyWidth / 2, center.y - bodyHeight / 2, bodyWidth, bodyHeight);
  context.beginPath();
  context.arc(center.x, center.y, size * 0.25, 0, Math.PI * 2);
  context.stroke();
  context.fillRect(center.x - bodyWidth * 0.28, center.y - bodyHeight * 0.75, bodyWidth * 0.38, bodyHeight * 0.25);
  context.restore();
}

function drawCameraDirectionCue(
  context: CanvasRenderingContext2D,
  figure: Figure,
  point: (joint: JointName) => Point,
  width: number,
  height: number,
  aiMode: boolean,
): void {
  const view = isCameraView(figure.cameraView) ? figure.cameraView : 'front';
  const metadata = cameraViewLabels[view];
  const ui = cameraViewUiLabels[view];
  const points = JOINT_NAMES.map((jointName) => point(jointName));
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const minY = Math.min(...points.map(({ y }) => y));
  const maxY = Math.max(...points.map(({ y }) => y));
  const shoulderL = point('shoulderL');
  const shoulderR = point('shoulderR');
  const pelvis = point('pelvis');
  const target = {
    x: (shoulderL.x + shoulderR.x) / 2,
    y: (shoulderL.y + shoulderR.y) / 2 + (pelvis.y - (shoulderL.y + shoulderR.y) / 2) * 0.24,
  };
  const size = Math.max(aiMode ? 14 : 11, width / (aiMode ? 72 : 92));
  const margin = size * 1.35;
  const cameraOnRight = view === 'back' || view === 'right-side';
  const sideView = view === 'left-side' || view === 'right-side';
  const desiredSideSpace = size * 4.8;
  const availableSideSpace = cameraOnRight ? width - maxX : minX;
  let preferredX = cameraOnRight ? maxX + size * 3.2 : minX - size * 3.2;
  let preferredY = sideView ? target.y : minY - size * 1.9;
  if (availableSideSpace < desiredSideSpace) {
    const bottomSpace = height - maxY;
    const topSpace = minY;
    if (bottomSpace >= topSpace) {
      preferredX = cameraOnRight ? maxX - size * 1.2 : minX + size * 1.2;
      preferredY = maxY + size * 2.9;
    } else {
      preferredX = cameraOnRight ? maxX - size * 1.2 : minX + size * 1.2;
      preferredY = minY - size * 2.9;
    }
  }
  const camera = {
    x: Math.max(margin, Math.min(width - margin, preferredX)),
    y: Math.max(margin * 1.25, Math.min(height - margin * 1.25, preferredY)),
  };
  const dx = target.x - camera.x;
  const dy = target.y - camera.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const rayStart = { x: camera.x + dx / length * size, y: camera.y + dy / length * size };
  const color = aiMode ? '#58d5c8' : cameraColor;
  const label = aiMode ? `CAMERA ${metadata.title} / ${metadata.surface}` : `鏡頭 ${ui.title}・${ui.surface}`;

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = Math.max(2, size * 0.13);
  context.setLineDash([size * 0.45, size * 0.28]);
  context.beginPath();
  context.moveTo(rayStart.x, rayStart.y);
  context.lineTo(target.x, target.y);
  context.stroke();
  context.setLineDash([]);
  drawArrowHead(context, rayStart, target, color, size * 0.58);
  drawCameraIcon(context, camera, size, color);

  const fontSize = Math.max(aiMode ? 14 : 10, width / (aiMode ? 70 : 96));
  context.font = `800 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  const paddingX = size * 0.42;
  const badgeWidth = context.measureText(label).width + paddingX * 2;
  const badgeHeight = fontSize * 1.65;
  const badgeX = Math.max(size * 0.55, Math.min(width - badgeWidth - size * 0.55, camera.x - badgeWidth / 2));
  const labelBelowCamera = camera.y >= target.y;
  const preferredBadgeY = labelBelowCamera ? camera.y + size * 1.05 : camera.y - size * 1.05 - badgeHeight;
  const badgeY = Math.max(size * 0.55, Math.min(height - badgeHeight - size * 0.55, preferredBadgeY));
  context.fillStyle = aiMode ? 'rgba(29, 37, 45, .94)' : 'rgba(251, 250, 247, .94)';
  context.fillRect(badgeX, badgeY, badgeWidth, badgeHeight);
  context.strokeStyle = color;
  context.strokeRect(badgeX, badgeY, badgeWidth, badgeHeight);
  context.fillStyle = color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, badgeX + badgeWidth / 2, badgeY + badgeHeight / 2);
  context.restore();
}

function drawAiCameraSurfaceCue(context: CanvasRenderingContext2D, figure: Figure, point: (joint: JointName) => Point, width: number): void {
  const shoulderL = point('shoulderL');
  const shoulderR = point('shoulderR');
  const pelvis = point('pelvis');
  const shoulderCenter = { x: (shoulderL.x + shoulderR.x) / 2, y: (shoulderL.y + shoulderR.y) / 2 };
  const chest = {
    x: shoulderCenter.x,
    y: shoulderCenter.y + (pelvis.y - shoulderCenter.y) * 0.22,
  };
  const size = Math.max(16, width / 56);
  const cameraView = isCameraView(figure.cameraView) ? figure.cameraView : 'front';
  const label = cameraViewLabels[cameraView].short;

  context.save();
  context.strokeStyle = '#ffd166';
  context.fillStyle = '#ffd166';
  context.lineWidth = Math.max(3, width / 260);
  context.lineCap = 'round';
  if (cameraView === 'front') {
    context.beginPath(); context.arc(chest.x, chest.y, size * 0.72, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.arc(chest.x, chest.y, size * 0.18, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.moveTo(chest.x - size * 1.15, chest.y); context.lineTo(chest.x + size * 1.15, chest.y); context.stroke();
  } else if (cameraView === 'back') {
    context.beginPath(); context.arc(chest.x - size * 0.58, chest.y, size * 0.46, -Math.PI / 2, Math.PI / 2); context.stroke();
    context.beginPath(); context.arc(chest.x + size * 0.58, chest.y, size * 0.46, Math.PI / 2, Math.PI * 1.5); context.stroke();
    context.setLineDash([size * 0.35, size * 0.22]);
    context.beginPath(); context.moveTo(chest.x, chest.y - size * 0.9); context.lineTo(chest.x, chest.y + size * 0.9); context.stroke();
    context.setLineDash([]);
  } else {
    const direction = cameraView === 'left-side' ? 1 : -1;
    context.beginPath();
    context.moveTo(chest.x + size * direction, chest.y);
    context.lineTo(chest.x - size * 0.72 * direction, chest.y - size * 0.72);
    context.lineTo(chest.x - size * 0.72 * direction, chest.y + size * 0.72);
    context.closePath();
    context.fill();
  }
  context.font = `800 ${Math.max(20, width / 46)}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  const labelX = cameraView === 'right-side' ? chest.x - size * 1.55 : chest.x + size * 1.55;
  context.textAlign = cameraView === 'right-side' ? 'right' : 'left';
  context.fillText(label, labelX, chest.y);
  context.restore();
}

function drawAiLegend(context: CanvasRenderingContext2D, width: number): void {
  context.save();
  context.fillStyle = 'rgba(246, 241, 232, .82)';
  const fontSize = Math.max(14, width / 68);
  context.font = `600 ${fontSize}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'top';
  const x = width / 38;
  const y = width / 38;
  context.fillText('CAMERA F/B/L/R = front, back, left side, right side', x, y);
  context.fillText('POSE: LYING face up   PRONE face down   JUMP airborne   arrows = head + toe', x, y + fontSize * 1.45);
  context.restore();
}

function drawFigure(context: CanvasRenderingContext2D, figure: Figure, width: number, height: number, options: DrawOptions): void {
  if (!figure.visible) return;
  const point = (joint: JointName): Point => toCanvasPoint(figure.joints[joint], width, height);
  const isSelected = figure.id === selectedFigureId;
  const strokeWidth = options.aiMode ? Math.max(7, width / 145) : Math.max(4, width / 205);
  const radius = options.aiMode ? Math.max(10, width / 62) : Math.max(7, width / 82);

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  for (const [startName, endName, side] of BONE_PAIRS) {
    const start = point(startName);
    const end = point(endName);
    context.strokeStyle = side === 'left' ? leftColor : side === 'right' ? rightColor : (options.aiMode ? '#f6f1e8' : figure.color);
    context.lineWidth = strokeWidth;
    context.beginPath(); context.moveTo(start.x, start.y); context.lineTo(end.x, end.y); context.stroke();
  }

  const head = point('head');
  const neck = point('neck');
  const headRadius = Math.max(19, Math.hypot(head.x - neck.x, head.y - neck.y) * 0.68);
  context.strokeStyle = options.aiMode ? '#f6f1e8' : figure.color;
  context.lineWidth = strokeWidth;
  context.beginPath(); context.arc(head.x, head.y, headRadius, 0, Math.PI * 2); context.stroke();
  // Face direction marker. It makes left/right/up/down intent easier for image models to read.
  drawHeadDirectionCue(context, head, headRadius, figure.headFacing ?? 'right', Boolean(options.aiMode));

  if (options.aiMode) {
    drawCameraDirectionCue(context, figure, point, width, height, true);
    drawAiCameraSurfaceCue(context, figure, point, width);
    drawAiPoseCue(context, figure, point, width, height);
    drawFootDirectionCue(context, point('ankleL'), point('toeL'), 'L', width);
    drawFootDirectionCue(context, point('ankleR'), point('toeR'), 'R', width);
  } else if (options.showHandles && isSelected) {
    drawCameraDirectionCue(context, figure, point, width, height, false);
  }

  if (options.showHandles && isSelected) {
    for (const jointName of JOINT_NAMES) {
      const joint = point(jointName);
      const isJointSelected = jointName === selectedJoint;
      const side = jointName.endsWith('L') ? leftColor : jointName.endsWith('R') ? rightColor : '#fffaf2';
      context.fillStyle = isJointSelected ? '#f6b84b' : side;
      context.strokeStyle = isJointSelected ? '#9d6014' : 'rgba(39, 51, 63, .7)';
      context.lineWidth = 2;
      context.beginPath(); context.arc(joint.x, joint.y, isJointSelected ? radius * 1.22 : radius, 0, Math.PI * 2); context.fill(); context.stroke();
    }
  }
  context.restore();
}

function drawScene(context: CanvasRenderingContext2D, width: number, height: number, options: DrawOptions = {}): void {
  const background = options.aiMode ? '#1d252d' : project.canvas.backgroundColor;
  context.clearRect(0, 0, width, height);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  if (options.aiMode) drawAiLegend(context, width);
  if (options.includeBackground) drawBackground(context, width, height);
  if (options.showGrid) drawGrid(context, width, height);
  for (const figure of project.figures) drawFigure(context, figure, width, height, options);
}

function resizeCanvas(): void {
  const rect = canvasWrap.getBoundingClientRect();
  const available = Math.max(260, Math.min(rect.width - 42, rect.height - 42));
  const aspect = project.canvas.width / project.canvas.height;
  let cssWidth = available;
  let cssHeight = available / aspect;
  if (cssHeight > rect.height - 42) { cssHeight = rect.height - 42; cssWidth = cssHeight * aspect; }
  canvas.style.width = `${cssWidth * zoom}px`;
  canvas.style.height = `${cssHeight * zoom}px`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(ctx, cssWidth, cssHeight, { showGrid: true, showHandles: true, includeBackground: true });
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}

function renderLayers(): void {
  layerList.innerHTML = project.figures.map((figure) => `
    <button class="layer-row ${figure.id === selectedFigureId ? 'selected' : ''}" data-layer-id="${figure.id}">
      <span class="layer-thumb"><i style="background:${figure.accent}"></i><i style="background:${figure.color}"></i></span>
      <span class="layer-name">${escapeHtml(figure.name)}</span>
      <span class="layer-actions"><span class="visibility ${figure.visible ? '' : 'muted'}" data-toggle-visibility="${figure.id}">${figure.visible ? '◉' : '○'}</span></span>
    </button>
  `).join('');
}

function renderInspector(): void {
  const figure = selectedFigure();
  if (!figure) { inspector.innerHTML = '<p class="muted-copy">尚未選取人物</p>'; return; }
  const currentCameraView = isCameraView(figure.cameraView) ? figure.cameraView : 'front';
  const cameraViewCards = CAMERA_VIEWS.map((view) => {
    const label = cameraViewUiLabels[view];
    const reverse = view === 'back' || view === 'right-side';
    return `
      <button type="button" class="camera-view-card ${currentCameraView === view ? 'active' : ''}" data-camera-view="${view}" role="radio" aria-checked="${currentCameraView === view}" ${figure.locked ? 'disabled' : ''}>
        <span class="camera-view-visual ${reverse ? 'reverse' : ''}" aria-hidden="true"><i class="mini-camera"></i><i class="mini-camera-ray">→</i><b>${label.surface}</b></span>
        <strong>${label.title}</strong><small>${label.detail}</small>
      </button>
    `;
  }).join('');
  inspector.innerHTML = `
    <label class="field-label">名稱<input id="figure-name" type="text" value="${escapeAttr(figure.name)}"></label>
    <label class="field-label">姿態<select id="figure-pose">
      <option value="stand" ${(figure.pose ?? 'stand') === 'stand' ? 'selected' : ''}>站立 STAND</option>
      <option value="walk" ${(figure.pose ?? 'stand') === 'walk' ? 'selected' : ''}>走路 WALK</option>
      <option value="sit" ${(figure.pose ?? 'stand') === 'sit' ? 'selected' : ''}>坐姿 SIT</option>
      <option value="raise" ${(figure.pose ?? 'stand') === 'raise' ? 'selected' : ''}>舉手 RAISE</option>
      <option value="lying" ${(figure.pose ?? 'stand') === 'lying' ? 'selected' : ''}>躺下 LYING / FACE UP</option>
      <option value="prone" ${(figure.pose ?? 'stand') === 'prone' ? 'selected' : ''}>趴下 PRONE / FACE DOWN</option>
      <option value="jump" ${(figure.pose ?? 'stand') === 'jump' ? 'selected' : ''}>跳動 JUMP / AIRBORNE</option>
    </select></label>
    <div class="camera-view-field">
      <div class="camera-view-heading"><span>鏡頭拍攝方向</span><small>鏡頭會看到人物哪一面</small></div>
      <div class="camera-view-grid" role="radiogroup" aria-label="鏡頭拍攝方向">${cameraViewCards}</div>
      <div class="camera-view-summary"><i class="mini-camera"></i><span>${cameraViewUiLabels[currentCameraView].detail}</span></div>
    </div>
    <label class="field-label">頭部方向<select id="figure-head-facing">
      <option value="left" ${(figure.headFacing ?? 'right') === 'left' ? 'selected' : ''}>左 LEFT</option>
      <option value="right" ${(figure.headFacing ?? 'right') === 'right' ? 'selected' : ''}>右 RIGHT</option>
      <option value="up" ${(figure.headFacing ?? 'right') === 'up' ? 'selected' : ''}>上 UP</option>
      <option value="down" ${(figure.headFacing ?? 'right') === 'down' ? 'selected' : ''}>下 DOWN</option>
    </select></label>
    <div class="inspector-row"><span>線條顏色</span><input id="figure-color" type="color" value="${figure.color}"></div>
    <label class="toggle-row"><span>鎖定人物</span><input id="figure-locked" type="checkbox" ${figure.locked ? 'checked' : ''}><i></i></label>
    <label class="toggle-row"><span>鎖定骨長</span><input id="figure-bone-lock" type="checkbox" ${figure.boneLock ? 'checked' : ''}><i></i></label>
    <div class="transform-panel">
      <div class="inspector-subheading">整體操作</div>
      <div class="transform-grid move-grid"><span></span><button data-transform="move-up" title="整體上移">↑</button><span></span><button data-transform="move-left" title="整體左移">←</button><button data-transform="move-down" title="整體下移">↓</button><button data-transform="move-right" title="整體右移">→</button></div>
      <div class="transform-grid"><button data-transform="rotate-left" title="逆時針旋轉">↺</button><button data-transform="scale-down" title="縮小人物">−</button><button data-transform="scale-up" title="放大人物">＋</button><button data-transform="rotate-right" title="順時針旋轉">↻</button></div>
      <div class="transform-actions"><button data-transform="mirror">左右鏡像</button><button data-transform="duplicate">複製人物</button></div>
    </div>
    <div class="legend-row"><span><i class="dot left-dot"></i>左側肢體</span><span><i class="dot right-dot"></i>右側肢體</span></div>
  `;
  const nameInput = document.querySelector<HTMLInputElement>('#figure-name');
  const poseInput = document.querySelector<HTMLSelectElement>('#figure-pose');
  const headFacingInput = document.querySelector<HTMLSelectElement>('#figure-head-facing');
  const colorInput = document.querySelector<HTMLInputElement>('#figure-color');
  const lockedInput = document.querySelector<HTMLInputElement>('#figure-locked');
  const boneLockInput = document.querySelector<HTMLInputElement>('#figure-bone-lock');
  nameInput?.addEventListener('change', () => { commit(); figure.name = nameInput.value.trim() || '未命名人物'; renderAll(); persistLocal(); });
  poseInput?.addEventListener('change', () => { commit(); setFigurePose(figure, poseInput.value as FigurePose); renderAll(); persistLocal(); });
  inspector.querySelectorAll<HTMLButtonElement>('[data-camera-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const nextView = button.dataset.cameraView;
      if (!isCameraView(nextView) || nextView === figure.cameraView || figure.locked) return;
      commit();
      figure.cameraView = nextView;
      renderAll();
      persistLocal();
      showToast(`鏡頭方向：${cameraViewUiLabels[nextView].detail}`);
    });
  });
  headFacingInput?.addEventListener('change', () => { commit(); figure.headFacing = headFacingInput.value as HeadFacing; renderAll(); persistLocal(); });
  colorInput?.addEventListener('change', () => { commit(); figure.color = colorInput.value; renderAll(); persistLocal(); });
  lockedInput?.addEventListener('change', () => { commit(); figure.locked = lockedInput.checked; renderAll(); persistLocal(); });
  boneLockInput?.addEventListener('change', () => { commit(); figure.boneLock = boneLockInput.checked; renderAll(); persistLocal(); });
}

function syncAspectChips(): void {
  const aspect = project.canvas.width / project.canvas.height;
  const selectedAspect = Math.abs(aspect - 1) < 0.01
    ? '1:1'
    : Math.abs(aspect - 3 / 4) < 0.01
      ? '3:4'
      : Math.abs(aspect - 16 / 9) < 0.01
        ? '16:9'
        : null;
  document.querySelectorAll<HTMLButtonElement>('.aspect-chip').forEach((button) => {
    button.classList.toggle('active', button.dataset.aspect === selectedAspect);
  });
}

function renderAll(): void {
  renderLayers();
  renderInspector();
  canvasSizeLabel.textContent = `${project.canvas.width} × ${project.canvas.height}`;
  syncAspectChips();
  resizeCanvas();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char] ?? char);
}

function escapeAttr(value: string): string { return escapeHtml(value); }

function hitTest(point: Point): JointName | null {
  const figure = selectedFigure();
  if (!figure || figure.locked || !figure.visible) return null;
  const threshold = 0.035 / zoom;
  let closest: JointName | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const jointName of JOINT_NAMES) {
    const joint = figure.joints[jointName];
    const current = Math.hypot(joint.x - point.x, joint.y - point.y);
    if (current < threshold && current < distance) { closest = jointName; distance = current; }
  }
  return closest;
}

function applyFigureTransform(figure: Figure, action: string): void {
  const pivot = figure.joints.pelvis;
  let dx = 0;
  let dy = 0;
  let scale = 1;
  let rotation = 0;
  if (action === 'move-up') dy = -0.02;
  if (action === 'move-down') dy = 0.02;
  if (action === 'move-left') dx = -0.02;
  if (action === 'move-right') dx = 0.02;
  if (action === 'scale-up') scale = 1.06;
  if (action === 'scale-down') scale = 0.94;
  if (action === 'rotate-left') rotation = -Math.PI / 36;
  if (action === 'rotate-right') rotation = Math.PI / 36;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  for (const jointName of JOINT_NAMES) {
    const point = figure.joints[jointName];
    const relativeX = (point.x - pivot.x) * scale;
    const relativeY = (point.y - pivot.y) * scale;
    figure.joints[jointName] = {
      x: pivot.x + relativeX * cosine - relativeY * sine + dx,
      y: pivot.y + relativeX * sine + relativeY * cosine + dy,
    };
  }
}

function mirrorFigure(figure: Figure): void {
  const pivot = figure.joints.pelvis;
  const original = clone(figure.joints);
  const centerJoints: JointName[] = ['head', 'neck', 'pelvis'];
  const mirrorPairs: Array<[JointName, JointName]> = [
    ['shoulderL', 'shoulderR'], ['elbowL', 'elbowR'], ['wristL', 'wristR'],
    ['hipL', 'hipR'], ['kneeL', 'kneeR'], ['ankleL', 'ankleR'], ['toeL', 'toeR'],
  ];
  for (const jointName of centerJoints) {
    figure.joints[jointName] = { x: pivot.x - (original[jointName].x - pivot.x), y: original[jointName].y };
  }
  for (const [leftName, rightName] of mirrorPairs) {
    figure.joints[leftName] = { x: pivot.x - (original[rightName].x - pivot.x), y: original[rightName].y };
    figure.joints[rightName] = { x: pivot.x - (original[leftName].x - pivot.x), y: original[leftName].y };
  }
  if (figure.headFacing === 'left') figure.headFacing = 'right';
  else if (figure.headFacing === 'right') figure.headFacing = 'left';
  if (figure.cameraView === 'left-side') figure.cameraView = 'right-side';
  else if (figure.cameraView === 'right-side') figure.cameraView = 'left-side';
}

function duplicateFigure(): void {
  const source = selectedFigure();
  if (!source || source.locked) return;
  commit();
  const copy = clone(source);
  copy.id = crypto.randomUUID();
  copy.name = `${source.name} 複製`;
  copy.locked = false;
  copy.visible = true;
  const shift = 0.08;
  copy.joints = Object.fromEntries(JOINT_NAMES.map((jointName) => [jointName, {
    x: copy.joints[jointName].x + shift,
    y: copy.joints[jointName].y,
  }])) as Joints;
  project.figures.push(copy);
  selectedFigureId = copy.id;
  selectedJoint = null;
  renderAll();
  persistLocal();
  showToast('已複製人物與姿勢');
}

function transformSelectedFigure(action: string): void {
  if (action === 'duplicate') { duplicateFigure(); return; }
  const figure = selectedFigure();
  if (!figure || figure.locked) return;
  commit();
  if (action === 'mirror') mirrorFigure(figure);
  else applyFigureTransform(figure, action);
  selectedJoint = null;
  renderAll();
  persistLocal();
  showToast('已調整人物');
}

function boneLengthKey(startName: JointName, endName: JointName): string {
  return `${startName}:${endName}`;
}

function captureBoneLengths(figure: Figure): Record<string, number> {
  return Object.fromEntries(BONE_PAIRS.map(([startName, endName]) => [
    boneLengthKey(startName, endName),
    Math.hypot(figure.joints[endName].x - figure.joints[startName].x, figure.joints[endName].y - figure.joints[startName].y),
  ]));
}

function enforceBoneLengths(figure: Figure, anchorName: JointName, target: Point, lengths: Record<string, number>): void {
  for (let iteration = 0; iteration < 6; iteration += 1) {
    figure.joints[anchorName] = { ...target };
    for (const [startName, endName] of BONE_PAIRS) {
      const desired = lengths[boneLengthKey(startName, endName)];
      if (!finiteNumber(desired) || desired <= 0) continue;
      const start = figure.joints[startName];
      const end = figure.joints[endName];
      let dx = end.x - start.x;
      let dy = end.y - start.y;
      const current = Math.hypot(dx, dy);
      if (current < 0.0001) { dx = 1; dy = 0; }
      else { dx /= current; dy /= current; }
      if (startName === anchorName) {
        figure.joints[endName] = { x: start.x + dx * desired, y: start.y + dy * desired };
      } else if (endName === anchorName) {
        figure.joints[startName] = { x: end.x - dx * desired, y: end.y - dy * desired };
      } else {
        const correction = (desired - current) * 0.5;
        figure.joints[startName] = { x: start.x - dx * correction, y: start.y - dy * correction };
        figure.joints[endName] = { x: end.x + dx * correction, y: end.y + dy * correction };
      }
    }
  }
  figure.joints[anchorName] = { ...target };
}

function addFigure(): void {
  commit();
  const index = project.figures.length;
  const offset = Math.min(0.28, index * 0.16);
  const newFigure = createFigure(index, offset, index % 2 ? 0.04 : 0, index % 2 ? 0.86 : 0.92);
  project.figures.push(newFigure);
  selectedFigureId = newFigure.id;
  selectedJoint = null;
  renderAll();
  persistLocal();
  showToast('已新增火柴人');
}

function applyTemplate(template: string): void {
  const figure = selectedFigure();
  if (!figure || figure.locked) return;
  const base = createTemplateJoints(template);
  if (!base || !isFigurePose(template)) return;
  commit();
  setFigurePose(figure, template);
  if (template !== 'lying' && template !== 'prone') {
    figure.cameraView = 'front';
    figure.headFacing = 'right';
  }
  figure.joints = placeTemplateAtFigure(base, figure);
  selectedJoint = null;
  renderAll();
  persistLocal();
  showToast('已套用姿勢範本');
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportProject(): void {
  normalizeFigureMetadata();
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'posesketch-project.stickpose.json');
  setStatus('專案已匯出');
}

function exportPoseJson(): void {
  const payload = {
    format: 'posesketch-pose',
    version: 2,
    canvas: { width: project.canvas.width, height: project.canvas.height },
    figures: project.figures.map((figure) => {
      const cameraView = isCameraView(figure.cameraView) ? figure.cameraView : 'front';
      return {
        id: figure.id,
        name: figure.name,
        visible: figure.visible,
        pose: figure.pose ?? 'stand',
        cameraView,
        orientation: cameraView === 'front' || cameraView === 'back' ? cameraView : 'side',
        headFacing: figure.headFacing ?? 'right',
        keypoints: JOINT_NAMES.map((name) => ({ name, x: figure.joints[name].x, y: figure.joints[name].y, visibility: figure.visible ? 1 : 0 })),
      };
    }),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'posesketch-pose.json');
  setStatus('Pose JSON 已匯出');
}

function renderExport(options: DrawOptions, filename: string): void {
  const exportCanvas = document.createElement('canvas');
  const scale = exportResolution / 1024;
  const width = Math.max(1, Math.round(project.canvas.width * scale));
  const height = Math.max(1, Math.round(project.canvas.height * scale));
  exportCanvas.width = width; exportCanvas.height = height;
  const exportContext = exportCanvas.getContext('2d')!;
  drawScene(exportContext, width, height, options);
  exportCanvas.toBlob((blob) => { if (blob) downloadBlob(blob, filename); }, 'image/png');
  showToast(`正在準備 ${width} × ${height} PNG…`);
}

function loadBackground(dataUrl: string): void {
  const image = new Image();
  image.onload = () => { backgroundImage = image; renderAll(); };
  image.src = dataUrl;
}

function handleFileOpen(file: File): void {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const loaded = migrateProject(JSON.parse(String(reader.result)));
      commit();
      Object.assign(project, loaded);
      normalizeFigureMetadata();
      selectedFigureId = project.figures[0]?.id ?? '';
      backgroundImage = null;
      if (project.background?.dataUrl) loadBackground(project.background.dataUrl);
      renderAll();
      persistLocal();
      showToast('專案已開啟');
    } catch { showToast('無法開啟這個專案檔'); }
  };
  reader.readAsText(file);
}

function setAspect(aspect: string): void {
  const [w, h] = aspect.split(':').map(Number);
  const nextHeight = Math.round(project.canvas.width * h / w);
  commit();
  project.canvas.height = nextHeight;
  renderAll();
  persistLocal();
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (action === 'new') {
    if (!window.confirm('建立新畫布？目前尚未儲存的變更會被清除。')) return;
    Object.assign(project, createDefaultProject()); historyPast = []; historyFuture = []; selectedFigureId = project.figures[0].id; selectedJoint = null; backgroundImage = null; renderAll(); persistLocal(); setStatus('已建立新畫布');
  } else if (action === 'open') document.querySelector<HTMLInputElement>('#project-input')?.click();
  else if (action === 'save') exportProject();
  else if (action === 'undo') undo();
  else if (action === 'redo') redo();
  else if (action === 'add-figure') addFigure();
  else if (action === 'background') document.querySelector<HTMLInputElement>('#background-input')?.click();
  else if (action === 'export-pose') renderExport({ showGrid: false, showHandles: false, includeBackground: false, aiMode: true }, 'posesketch-ai-pose.png');
  else if (action === 'export-reference') renderExport({ showGrid: false, showHandles: false, includeBackground: false }, 'posesketch-reference.png');
  else if (action === 'export-pose-reference') renderExport({ showGrid: false, showHandles: false, includeBackground: false, aiMode: true }, 'posesketch-ai-pose.png');
  else if (action === 'export-json') exportPoseJson();
  else if (action === 'export-project-json') exportProject();
  else if (action === 'zoom-in') { zoom = Math.min(1.8, zoom + 0.1); resizeCanvas(); }
  else if (action === 'zoom-out') { zoom = Math.max(0.6, zoom - 0.1); resizeCanvas(); }

  const layer = target.closest<HTMLElement>('[data-layer-id]');
  if (layer && !target.closest('[data-toggle-visibility]')) { selectedFigureId = layer.dataset.layerId ?? selectedFigureId; selectedJoint = null; renderAll(); }
  const visibility = target.closest<HTMLElement>('[data-toggle-visibility]');
  if (visibility) { const figure = project.figures.find((item) => item.id === visibility.dataset.toggleVisibility); if (figure) { commit(); figure.visible = !figure.visible; renderAll(); persistLocal(); } }
  const template = target.closest<HTMLElement>('[data-template]')?.dataset.template;
  if (template) applyTemplate(template);
  const transform = target.closest<HTMLElement>('[data-transform]')?.dataset.transform;
  if (transform) transformSelectedFigure(transform);
  const aspect = target.closest<HTMLElement>('[data-aspect]')?.dataset.aspect;
  if (aspect) setAspect(aspect);
});

document.querySelector<HTMLInputElement>('#background-color')?.addEventListener('input', (event) => {
  project.canvas.backgroundColor = (event.target as HTMLInputElement).value;
  renderAll(); persistLocal();
});

document.querySelector<HTMLSelectElement>('#export-resolution')?.addEventListener('change', (event) => {
  const next = Number((event.target as HTMLSelectElement).value);
  if (Number.isFinite(next) && next > 0) exportResolution = next;
});

document.querySelector<HTMLInputElement>('#background-input')?.addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => { commit(); project.background = { dataUrl: String(reader.result), opacity: 0.24, fit: 'contain' }; persistLocal(); loadBackground(String(reader.result)); showToast('背景參考已加入'); };
  reader.readAsDataURL(file);
});

document.querySelector<HTMLInputElement>('#project-input')?.addEventListener('change', (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (file) handleFileOpen(file);
  (event.target as HTMLInputElement).value = '';
});

canvas.addEventListener('pointerdown', (event) => {
  canvas.setPointerCapture(event.pointerId);
  const point = fromPointer(event);
  const figure = selectedFigure();
  const hit = hitTest(point);
  if (hit && figure) { dragStart = clone(project); dragBoneLengths = figure.boneLock ? captureBoneLengths(figure) : null; dragMoved = false; selectedJoint = hit; renderAll(); return; }
  selectedJoint = null;
  renderAll();
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragStart || !selectedJoint) return;
  const figure = selectedFigure();
  if (!figure || figure.locked) return;
  const point = fromPointer(event);
  if (figure.boneLock && dragBoneLengths) enforceBoneLengths(figure, selectedJoint, point, dragBoneLengths);
  else figure.joints[selectedJoint] = point;
  dragMoved = true;
  resizeCanvas();
});

function endDrag(): void {
  if (dragStart && dragMoved) { historyPast.push(dragStart); if (historyPast.length > 100) historyPast.shift(); historyFuture = []; setStatus('尚未儲存的變更'); persistLocal(); }
  dragStart = null; dragBoneLengths = null; dragMoved = false;
}
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', (event) => { event.preventDefault(); zoom = Math.max(0.6, Math.min(1.8, zoom + (event.deltaY < 0 ? 0.05 : -0.05))); resizeCanvas(); }, { passive: false });

document.addEventListener('keydown', (event) => {
  const modifier = event.metaKey || event.ctrlKey;
  if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
  if (modifier && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
  if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); exportProject(); }
  if (event.key === 'Escape') { selectedJoint = null; renderAll(); }
});

window.addEventListener('resize', resizeCanvas);
void restoreLocal().then(() => {
  if (project.background?.dataUrl) loadBackground(project.background.dataUrl);
  renderAll();
});
