import './styles.css';

type JointName =
  | 'head'
  | 'neck'
  | 'shoulderL'
  | 'elbowL'
  | 'wristL'
  | 'shoulderR'
  | 'elbowR'
  | 'wristR'
  | 'pelvis'
  | 'hipL'
  | 'kneeL'
  | 'ankleL'
  | 'toeL'
  | 'hipR'
  | 'kneeR'
  | 'ankleR'
  | 'toeR';

type Point = { x: number; y: number };
type Joints = Record<JointName, Point>;
type FigureOrientation = 'front' | 'back' | 'side';
type FigurePose = 'stand' | 'walk' | 'sit' | 'raise' | 'lying' | 'prone' | 'jump';
type HeadFacing = 'left' | 'right' | 'up' | 'down';

type Figure = {
  id: string;
  name: string;
  joints: Joints;
  orientation: FigureOrientation;
  pose: FigurePose;
  headFacing: HeadFacing;
  visible: boolean;
  locked: boolean;
  color: string;
  accent: string;
};

type BackgroundLayer = {
  dataUrl: string;
  opacity: number;
  fit: 'contain' | 'cover';
};

type PoseProject = {
  schemaVersion: 1;
  canvas: { width: number; height: number; backgroundColor: string };
  figures: Figure[];
  background?: BackgroundLayer;
};

type DrawOptions = {
  showGrid?: boolean;
  showHandles?: boolean;
  includeBackground?: boolean;
  aiMode?: boolean;
};

const JOINT_NAMES: JointName[] = [
  'head', 'neck', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR',
  'pelvis', 'hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR',
];

const BONE_PAIRS: Array<[JointName, JointName, 'center' | 'left' | 'right']> = [
  ['head', 'neck', 'center'],
  ['neck', 'shoulderL', 'left'], ['shoulderL', 'elbowL', 'left'], ['elbowL', 'wristL', 'left'],
  ['neck', 'shoulderR', 'right'], ['shoulderR', 'elbowR', 'right'], ['elbowR', 'wristR', 'right'],
  ['neck', 'pelvis', 'center'],
  ['pelvis', 'hipL', 'left'], ['hipL', 'kneeL', 'left'], ['kneeL', 'ankleL', 'left'], ['ankleL', 'toeL', 'left'],
  ['pelvis', 'hipR', 'right'], ['hipR', 'kneeR', 'right'], ['kneeR', 'ankleR', 'right'], ['ankleR', 'toeR', 'right'],
  ['shoulderL', 'shoulderR', 'center'], ['hipL', 'hipR', 'center'],
];

const leftColor = '#f06a5f';
const rightColor = '#4b8fe8';
const centerColor = '#27333f';
const poseLabels: Record<FigurePose, string> = {
  stand: 'STAND',
  walk: 'WALK',
  sit: 'SIT',
  raise: 'RAISE',
  lying: 'LYING / FACE UP',
  prone: 'PRONE / FACE DOWN',
  jump: 'JUMP / AIRBORNE',
};
const appRoot = document.querySelector<HTMLDivElement>('#app')!;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

function createBaseJoints(offsetX = 0, offsetY = 0, scale = 1): Joints {
  const p = (x: number, y: number): Point => ({ x: 0.5 + (x - 0.5) * scale + offsetX, y: y * scale + offsetY });
  return {
    head: p(0.5, 0.16), neck: p(0.5, 0.25),
    shoulderL: p(0.43, 0.28), elbowL: p(0.34, 0.39), wristL: p(0.26, 0.49),
    shoulderR: p(0.57, 0.28), elbowR: p(0.66, 0.39), wristR: p(0.74, 0.49),
    pelvis: p(0.5, 0.52), hipL: p(0.45, 0.54), kneeL: p(0.42, 0.7), ankleL: p(0.4, 0.88), toeL: p(0.34, 0.9),
    hipR: p(0.55, 0.54), kneeR: p(0.58, 0.7), ankleR: p(0.6, 0.88), toeR: p(0.66, 0.9),
  };
}

function createFigure(index = 0, offsetX = 0, offsetY = 0, scale = 1): Figure {
  return {
    id: crypto.randomUUID(),
    name: `人物 ${index + 1}`,
    joints: createBaseJoints(offsetX, offsetY, scale),
    orientation: 'front',
    pose: 'stand',
    headFacing: 'right',
    visible: true,
    locked: false,
    color: centerColor,
    accent: `hsl(${195 + index * 45} 76% 52%)`,
  };
}

function createDefaultProject(): PoseProject {
  return {
    schemaVersion: 1,
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
        <div class="export-card"><div class="export-card-title"><span class="export-icon">✦</span><div><strong>給 AI 的參考圖</strong><small>只保留姿勢，不含控制點</small></div></div><button class="export-outline" data-action="export-reference">匯出一般參考 PNG <span>↗</span></button><button class="export-outline" data-action="export-json">匯出 Pose JSON <span>↗</span></button></div>
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
  try {
    localStorage.setItem('posesketch:last-project', JSON.stringify(project));
  } catch {
    // Private browsing or quota errors should not block editing.
  }
}

function normalizeFigureMetadata(): void {
  project.figures.forEach((figure) => {
    figure.orientation = figure.orientation ?? 'front';
    figure.pose = figure.pose ?? 'stand';
    figure.headFacing = figure.headFacing ?? 'right';
  });
}

function setFigurePose(figure: Figure, pose: FigurePose): void {
  figure.pose = pose;
  if (pose === 'lying' || pose === 'prone') {
    figure.orientation = 'side';
    figure.headFacing = 'left';
  }
}

function restoreLocal(): void {
  try {
    const raw = localStorage.getItem('posesketch:last-project');
    if (!raw) return;
    const saved = JSON.parse(raw) as PoseProject;
    if (saved?.schemaVersion !== 1 || !Array.isArray(saved.figures)) return;
    Object.assign(project, saved);
    normalizeFigureMetadata();
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

function drawAiOrientationCue(context: CanvasRenderingContext2D, figure: Figure, point: (joint: JointName) => Point, width: number): void {
  const shoulderL = point('shoulderL');
  const shoulderR = point('shoulderR');
  const pelvis = point('pelvis');
  const shoulderCenter = { x: (shoulderL.x + shoulderR.x) / 2, y: (shoulderL.y + shoulderR.y) / 2 };
  const chest = {
    x: shoulderCenter.x,
    y: shoulderCenter.y + (pelvis.y - shoulderCenter.y) * 0.22,
  };
  const size = Math.max(16, width / 56);
  const orientation = figure.orientation ?? 'front';
  const label = orientation === 'front' ? 'F' : orientation === 'back' ? 'B' : 'S';

  context.save();
  context.strokeStyle = '#ffd166';
  context.fillStyle = '#ffd166';
  context.lineWidth = Math.max(3, width / 260);
  context.lineCap = 'round';
  if (orientation === 'front') {
    context.beginPath(); context.arc(chest.x, chest.y, size * 0.72, 0, Math.PI * 2); context.stroke();
    context.beginPath(); context.arc(chest.x, chest.y, size * 0.18, 0, Math.PI * 2); context.fill();
    context.beginPath(); context.moveTo(chest.x - size * 1.15, chest.y); context.lineTo(chest.x + size * 1.15, chest.y); context.stroke();
  } else if (orientation === 'back') {
    context.beginPath(); context.arc(chest.x - size * 0.58, chest.y, size * 0.46, -Math.PI / 2, Math.PI / 2); context.stroke();
    context.beginPath(); context.arc(chest.x + size * 0.58, chest.y, size * 0.46, Math.PI / 2, Math.PI * 1.5); context.stroke();
    context.setLineDash([size * 0.35, size * 0.22]);
    context.beginPath(); context.moveTo(chest.x, chest.y - size * 0.9); context.lineTo(chest.x, chest.y + size * 0.9); context.stroke();
    context.setLineDash([]);
  } else {
    context.beginPath();
    context.moveTo(chest.x + size, chest.y);
    context.lineTo(chest.x - size * 0.72, chest.y - size * 0.72);
    context.lineTo(chest.x - size * 0.72, chest.y + size * 0.72);
    context.closePath();
    context.fill();
  }
  context.font = `800 ${Math.max(20, width / 46)}px -apple-system, BlinkMacSystemFont, sans-serif`;
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(label, chest.x + size * 1.55, chest.y);
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
  context.fillText('L/R = limb side   F/B/S = torso facing', x, y);
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
    drawAiOrientationCue(context, figure, point, width);
    drawAiPoseCue(context, figure, point, width, height);
    drawFootDirectionCue(context, point('ankleL'), point('toeL'), 'L', width);
    drawFootDirectionCue(context, point('ankleR'), point('toeR'), 'R', width);
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
    <label class="field-label">身體朝向<select id="figure-orientation">
      <option value="front" ${(figure.orientation ?? 'front') === 'front' ? 'selected' : ''}>正面 FRONT</option>
      <option value="back" ${(figure.orientation ?? 'front') === 'back' ? 'selected' : ''}>背面 BACK</option>
      <option value="side" ${(figure.orientation ?? 'front') === 'side' ? 'selected' : ''}>側面 SIDE</option>
    </select></label>
    <label class="field-label">頭部方向<select id="figure-head-facing">
      <option value="left" ${(figure.headFacing ?? 'right') === 'left' ? 'selected' : ''}>左 LEFT</option>
      <option value="right" ${(figure.headFacing ?? 'right') === 'right' ? 'selected' : ''}>右 RIGHT</option>
      <option value="up" ${(figure.headFacing ?? 'right') === 'up' ? 'selected' : ''}>上 UP</option>
      <option value="down" ${(figure.headFacing ?? 'right') === 'down' ? 'selected' : ''}>下 DOWN</option>
    </select></label>
    <div class="inspector-row"><span>線條顏色</span><input id="figure-color" type="color" value="${figure.color}"></div>
    <label class="toggle-row"><span>鎖定人物</span><input id="figure-locked" type="checkbox" ${figure.locked ? 'checked' : ''}><i></i></label>
    <div class="legend-row"><span><i class="dot left-dot"></i>左側肢體</span><span><i class="dot right-dot"></i>右側肢體</span></div>
  `;
  const nameInput = document.querySelector<HTMLInputElement>('#figure-name');
  const poseInput = document.querySelector<HTMLSelectElement>('#figure-pose');
  const orientationInput = document.querySelector<HTMLSelectElement>('#figure-orientation');
  const headFacingInput = document.querySelector<HTMLSelectElement>('#figure-head-facing');
  const colorInput = document.querySelector<HTMLInputElement>('#figure-color');
  const lockedInput = document.querySelector<HTMLInputElement>('#figure-locked');
  nameInput?.addEventListener('change', () => { commit(); figure.name = nameInput.value.trim() || '未命名人物'; renderAll(); persistLocal(); });
  poseInput?.addEventListener('change', () => { commit(); setFigurePose(figure, poseInput.value as FigurePose); renderAll(); persistLocal(); });
  orientationInput?.addEventListener('change', () => { commit(); figure.orientation = orientationInput.value as FigureOrientation; renderAll(); persistLocal(); });
  headFacingInput?.addEventListener('change', () => { commit(); figure.headFacing = headFacingInput.value as HeadFacing; renderAll(); persistLocal(); });
  colorInput?.addEventListener('change', () => { commit(); figure.color = colorInput.value; renderAll(); persistLocal(); });
  lockedInput?.addEventListener('change', () => { commit(); figure.locked = lockedInput.checked; renderAll(); persistLocal(); });
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
  commit();
  const base = createBaseJoints();
  const pose = template as FigurePose;
  setFigurePose(figure, pose);
  if (template !== 'lying' && template !== 'prone') {
    figure.orientation = 'front';
    figure.headFacing = 'right';
  }
  if (template === 'walk') {
    base.wristL = { x: 0.33, y: 0.39 }; base.elbowL = { x: 0.4, y: 0.34 };
    base.wristR = { x: 0.69, y: 0.56 }; base.elbowR = { x: 0.63, y: 0.4 };
    base.kneeL = { x: 0.53, y: 0.68 }; base.ankleL = { x: 0.67, y: 0.86 }; base.toeL = { x: 0.73, y: 0.87 };
    base.kneeR = { x: 0.49, y: 0.72 }; base.ankleR = { x: 0.32, y: 0.87 }; base.toeR = { x: 0.25, y: 0.88 };
  } else if (template === 'sit') {
    base.pelvis = { x: 0.5, y: 0.5 }; base.hipL = { x: 0.45, y: 0.53 }; base.hipR = { x: 0.55, y: 0.53 };
    base.kneeL = { x: 0.64, y: 0.61 }; base.ankleL = { x: 0.75, y: 0.75 }; base.toeL = { x: 0.8, y: 0.75 };
    base.kneeR = { x: 0.39, y: 0.61 }; base.ankleR = { x: 0.27, y: 0.75 }; base.toeR = { x: 0.22, y: 0.75 };
    base.wristL = { x: 0.34, y: 0.46 }; base.wristR = { x: 0.66, y: 0.46 };
  } else if (template === 'raise') {
    base.elbowL = { x: 0.34, y: 0.24 }; base.wristL = { x: 0.28, y: 0.12 };
    base.elbowR = { x: 0.66, y: 0.24 }; base.wristR = { x: 0.72, y: 0.12 };
  } else if (template === 'lying') {
    base.head = { x: 0.13, y: 0.46 }; base.neck = { x: 0.22, y: 0.5 };
    base.shoulderL = { x: 0.27, y: 0.45 }; base.shoulderR = { x: 0.27, y: 0.55 };
    base.elbowL = { x: 0.34, y: 0.34 }; base.wristL = { x: 0.45, y: 0.34 };
    base.elbowR = { x: 0.34, y: 0.66 }; base.wristR = { x: 0.45, y: 0.66 };
    base.pelvis = { x: 0.62, y: 0.5 }; base.hipL = { x: 0.66, y: 0.45 }; base.hipR = { x: 0.66, y: 0.55 };
    base.kneeL = { x: 0.75, y: 0.4 }; base.ankleL = { x: 0.87, y: 0.4 }; base.toeL = { x: 0.94, y: 0.36 };
    base.kneeR = { x: 0.75, y: 0.6 }; base.ankleR = { x: 0.87, y: 0.6 }; base.toeR = { x: 0.94, y: 0.65 };
  } else if (template === 'prone') {
    base.head = { x: 0.13, y: 0.54 }; base.neck = { x: 0.22, y: 0.5 };
    base.shoulderL = { x: 0.27, y: 0.46 }; base.shoulderR = { x: 0.27, y: 0.54 };
    base.elbowL = { x: 0.2, y: 0.37 }; base.wristL = { x: 0.11, y: 0.37 };
    base.elbowR = { x: 0.2, y: 0.63 }; base.wristR = { x: 0.11, y: 0.63 };
    base.pelvis = { x: 0.62, y: 0.5 }; base.hipL = { x: 0.66, y: 0.45 }; base.hipR = { x: 0.66, y: 0.55 };
    base.kneeL = { x: 0.75, y: 0.43 }; base.ankleL = { x: 0.87, y: 0.43 }; base.toeL = { x: 0.94, y: 0.39 };
    base.kneeR = { x: 0.75, y: 0.57 }; base.ankleR = { x: 0.87, y: 0.57 }; base.toeR = { x: 0.94, y: 0.61 };
  } else if (template === 'jump') {
    base.head = { x: 0.5, y: 0.14 }; base.neck = { x: 0.5, y: 0.24 };
    base.elbowL = { x: 0.34, y: 0.2 }; base.wristL = { x: 0.24, y: 0.11 };
    base.elbowR = { x: 0.66, y: 0.2 }; base.wristR = { x: 0.76, y: 0.11 };
    base.kneeL = { x: 0.38, y: 0.64 }; base.ankleL = { x: 0.3, y: 0.75 }; base.toeL = { x: 0.23, y: 0.71 };
    base.kneeR = { x: 0.62, y: 0.64 }; base.ankleR = { x: 0.7, y: 0.75 }; base.toeR = { x: 0.77, y: 0.71 };
  }
  figure.joints = base;
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
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  downloadBlob(blob, 'posesketch-project.stickpose.json');
  setStatus('專案已匯出');
}

function renderExport(options: DrawOptions, filename: string): void {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 1024; exportCanvas.height = 1024;
  const exportContext = exportCanvas.getContext('2d')!;
  drawScene(exportContext, 1024, 1024, options);
  exportCanvas.toBlob((blob) => { if (blob) downloadBlob(blob, filename); }, 'image/png');
  showToast('正在準備 PNG…');
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
      const loaded = JSON.parse(String(reader.result)) as PoseProject;
      if (loaded.schemaVersion !== 1 || !Array.isArray(loaded.figures)) throw new Error('invalid');
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
  else if (action === 'export-json') exportProject();
  else if (action === 'zoom-in') { zoom = Math.min(1.8, zoom + 0.1); resizeCanvas(); }
  else if (action === 'zoom-out') { zoom = Math.max(0.6, zoom - 0.1); resizeCanvas(); }

  const layer = target.closest<HTMLElement>('[data-layer-id]');
  if (layer && !target.closest('[data-toggle-visibility]')) { selectedFigureId = layer.dataset.layerId ?? selectedFigureId; selectedJoint = null; renderAll(); }
  const visibility = target.closest<HTMLElement>('[data-toggle-visibility]');
  if (visibility) { const figure = project.figures.find((item) => item.id === visibility.dataset.toggleVisibility); if (figure) { commit(); figure.visible = !figure.visible; renderAll(); persistLocal(); } }
  const template = target.closest<HTMLElement>('[data-template]')?.dataset.template;
  if (template) applyTemplate(template);
  const aspect = target.closest<HTMLElement>('[data-aspect]')?.dataset.aspect;
  if (aspect) setAspect(aspect);
});

document.querySelector<HTMLInputElement>('#background-color')?.addEventListener('input', (event) => {
  project.canvas.backgroundColor = (event.target as HTMLInputElement).value;
  renderAll(); persistLocal();
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
  if (hit && figure) { dragStart = clone(project); dragMoved = false; selectedJoint = hit; renderAll(); return; }
  selectedJoint = null;
  renderAll();
});

canvas.addEventListener('pointermove', (event) => {
  if (!dragStart || !selectedJoint) return;
  const figure = selectedFigure();
  if (!figure || figure.locked) return;
  const point = fromPointer(event);
  figure.joints[selectedJoint] = point;
  dragMoved = true;
  resizeCanvas();
});

function endDrag(): void {
  if (dragStart && dragMoved) { historyPast.push(dragStart); if (historyPast.length > 100) historyPast.shift(); historyFuture = []; setStatus('尚未儲存的變更'); persistLocal(); }
  dragStart = null; dragMoved = false;
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
restoreLocal();
if (project.background?.dataUrl) loadBackground(project.background.dataUrl);
renderAll();
