"use strict";
import "./styles.css";
const JOINT_NAMES = [
  "head",
  "neck",
  "shoulderL",
  "elbowL",
  "wristL",
  "shoulderR",
  "elbowR",
  "wristR",
  "pelvis",
  "hipL",
  "kneeL",
  "ankleL",
  "toeL",
  "hipR",
  "kneeR",
  "ankleR",
  "toeR"
];
const BONE_PAIRS = [
  ["head", "neck", "center"],
  ["neck", "shoulderL", "left"],
  ["shoulderL", "elbowL", "left"],
  ["elbowL", "wristL", "left"],
  ["neck", "shoulderR", "right"],
  ["shoulderR", "elbowR", "right"],
  ["elbowR", "wristR", "right"],
  ["neck", "pelvis", "center"],
  ["pelvis", "hipL", "left"],
  ["hipL", "kneeL", "left"],
  ["kneeL", "ankleL", "left"],
  ["ankleL", "toeL", "left"],
  ["pelvis", "hipR", "right"],
  ["hipR", "kneeR", "right"],
  ["kneeR", "ankleR", "right"],
  ["ankleR", "toeR", "right"],
  ["shoulderL", "shoulderR", "center"],
  ["hipL", "hipR", "center"]
];
const leftColor = "#f06a5f";
const rightColor = "#4b8fe8";
const centerColor = "#27333f";
const appRoot = document.querySelector("#app");
const clone = (value) => JSON.parse(JSON.stringify(value));
function createBaseJoints(offsetX = 0, offsetY = 0, scale = 1) {
  const p = (x, y) => ({ x: 0.5 + (x - 0.5) * scale + offsetX, y: y * scale + offsetY });
  return {
    head: p(0.5, 0.16),
    neck: p(0.5, 0.25),
    shoulderL: p(0.43, 0.28),
    elbowL: p(0.34, 0.39),
    wristL: p(0.26, 0.49),
    shoulderR: p(0.57, 0.28),
    elbowR: p(0.66, 0.39),
    wristR: p(0.74, 0.49),
    pelvis: p(0.5, 0.52),
    hipL: p(0.45, 0.54),
    kneeL: p(0.42, 0.7),
    ankleL: p(0.4, 0.88),
    toeL: p(0.34, 0.9),
    hipR: p(0.55, 0.54),
    kneeR: p(0.58, 0.7),
    ankleR: p(0.6, 0.88),
    toeR: p(0.66, 0.9)
  };
}
function createFigure(index = 0, offsetX = 0, offsetY = 0, scale = 1) {
  return {
    id: crypto.randomUUID(),
    name: `\u4EBA\u7269 ${index + 1}`,
    joints: createBaseJoints(offsetX, offsetY, scale),
    visible: true,
    locked: false,
    color: centerColor,
    accent: `hsl(${195 + index * 45} 76% 52%)`
  };
}
function createDefaultProject() {
  return {
    schemaVersion: 1,
    canvas: { width: 1024, height: 1024, backgroundColor: "#fbfaf7" },
    figures: [createFigure(0)]
  };
}
const project = createDefaultProject();
let selectedFigureId = project.figures[0].id;
let selectedJoint = null;
let zoom = 1;
let backgroundImage = null;
let historyPast = [];
let historyFuture = [];
let dragStart = null;
let dragMoved = false;
appRoot.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <div class="brand">
        <div class="brand-mark"><span></span><span></span><span></span></div>
        <div><strong>PoseSketch</strong><small>AI \u59FF\u52E2\u53C3\u8003\u756B\u5E03</small></div>
      </div>
      <div class="toolbar-group">
        <button class="tool-button" data-action="new" title="\u5EFA\u7ACB\u65B0\u756B\u5E03">\u65B0\u5EFA</button>
        <button class="tool-button" data-action="open" title="\u958B\u555F PoseSketch \u5C08\u6848">\u958B\u555F</button>
        <button class="tool-button" data-action="save" title="\u5132\u5B58\u5C08\u6848">\u5132\u5B58</button>
        <span class="toolbar-divider"></span>
        <button class="icon-button" data-action="undo" title="\u5FA9\u539F\uFF08\u2318/Ctrl+Z\uFF09">\u21B6</button>
        <button class="icon-button" data-action="redo" title="\u91CD\u505A\uFF08\u21E7\u2318/Ctrl+Y\uFF09">\u21B7</button>
      </div>
      <div class="toolbar-actions">
        <button class="secondary-button" data-action="background">\uFF0B \u80CC\u666F\u53C3\u8003</button>
        <button class="primary-button" data-action="export-pose">\u532F\u51FA AI \u59FF\u52E2\u5716 <span>\u2197</span></button>
      </div>
    </header>

    <main class="workspace">
      <aside class="left-panel panel">
        <div class="panel-heading"><span>\u5DE5\u5177</span><span class="eyebrow">TOOLS</span></div>
        <div class="tool-stack">
          <button class="side-tool active" data-tool="select"><span class="tool-icon">\u2725</span><span>\u9078\u53D6\uFF0F\u62D6\u66F3</span><kbd>V</kbd></button>
          <button class="side-tool" data-tool="pan"><span class="tool-icon">\u270B</span><span>\u5E73\u79FB\u756B\u5E03</span><kbd>H</kbd></button>
        </div>
        <div class="panel-heading section-heading"><span>\u4EBA\u7269</span><span class="eyebrow">FIGURES</span></div>
        <button class="add-figure" data-action="add-figure"><span>\uFF0B</span> \u65B0\u589E\u706B\u67F4\u4EBA</button>
        <div class="templates">
          <button class="template-card" data-template="stand"><span class="template-preview stand-preview"></span><span>\u7AD9\u7ACB</span></button>
          <button class="template-card" data-template="walk"><span class="template-preview walk-preview"></span><span>\u8D70\u8DEF</span></button>
          <button class="template-card" data-template="sit"><span class="template-preview sit-preview"></span><span>\u5750\u59FF</span></button>
          <button class="template-card" data-template="raise"><span class="template-preview raise-preview"></span><span>\u8209\u624B</span></button>
        </div>
        <div class="panel-heading section-heading"><span>\u756B\u5E03</span><span class="eyebrow">CANVAS</span></div>
        <label class="field-label">\u80CC\u666F\u984F\u8272<input id="background-color" type="color" value="${project.canvas.backgroundColor}"></label>
        <div class="canvas-presets">
          <button data-aspect="1:1" class="aspect-chip active">1:1</button>
          <button data-aspect="3:4" class="aspect-chip">3:4</button>
          <button data-aspect="16:9" class="aspect-chip">16:9</button>
        </div>
        <div class="help-card"><span class="help-spark">\u2726</span><div><strong>\u59FF\u52E2\u5C0F\u63D0\u793A</strong><p>\u62D6\u66F3\u5F69\u8272\u95DC\u7BC0\uFF0C\u5C31\u80FD\u5FEB\u901F\u8ABF\u6574\u5DE6\u53F3\u624B\u8173\u3002\u532F\u51FA\u6642\u63A7\u5236\u9EDE\u6703\u81EA\u52D5\u96B1\u85CF\u3002</p></div></div>
      </aside>

      <section class="canvas-stage">
        <div class="stage-topline"><div><span class="status-dot"></span><span id="save-status">\u5DF2\u81EA\u52D5\u5132\u5B58</span></div><span id="canvas-size">1024 \xD7 1024</span></div>
        <div class="canvas-wrap" id="canvas-wrap"><canvas id="pose-canvas"></canvas><div class="empty-hint" id="empty-hint">\u62D6\u66F3\u95DC\u7BC0\u958B\u59CB\u8ABF\u6574\u59FF\u52E2</div></div>
        <div class="stage-bottomline"><div class="zoom-control"><button data-action="zoom-out">\u2212</button><span id="zoom-label">100%</span><button data-action="zoom-in">\uFF0B</button></div><span>Space \u5E73\u79FB \xB7 \u6EFE\u8F2A\u7E2E\u653E \xB7 \u2318/Ctrl+S \u5132\u5B58</span></div>
      </section>

      <aside class="right-panel panel">
        <div class="panel-heading"><span>\u5716\u5C64</span><span class="eyebrow">LAYERS</span></div>
        <div id="layer-list" class="layer-list"></div>
        <div class="panel-heading section-heading"><span>\u76EE\u524D\u4EBA\u7269</span><span class="eyebrow">INSPECTOR</span></div>
        <div class="inspector" id="inspector"></div>
        <div class="export-card"><div class="export-card-title"><span class="export-icon">\u2726</span><div><strong>\u7D66 AI \u7684\u53C3\u8003\u5716</strong><small>\u53EA\u4FDD\u7559\u59FF\u52E2\uFF0C\u4E0D\u542B\u63A7\u5236\u9EDE</small></div></div><button class="export-outline" data-action="export-reference">\u532F\u51FA\u4E00\u822C\u53C3\u8003 PNG <span>\u2197</span></button><button class="export-outline" data-action="export-json">\u532F\u51FA Pose JSON <span>\u2197</span></button></div>
      </aside>
    </main>
    <input id="background-input" type="file" accept="image/*" hidden>
    <input id="project-input" type="file" accept="application/json,.json,.stickpose" hidden>
    <div class="toast" id="toast" role="status"></div>
  </div>
`;
const canvas = document.querySelector("#pose-canvas");
const canvasWrap = document.querySelector("#canvas-wrap");
const ctx = canvas.getContext("2d");
const layerList = document.querySelector("#layer-list");
const inspector = document.querySelector("#inspector");
const saveStatus = document.querySelector("#save-status");
const zoomLabel = document.querySelector("#zoom-label");
const canvasSizeLabel = document.querySelector("#canvas-size");
const toast = document.querySelector("#toast");
function selectedFigure() {
  return project.figures.find((figure) => figure.id === selectedFigureId);
}
function setStatus(message) {
  saveStatus.textContent = message;
}
let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}
function commit() {
  historyPast.push(clone(project));
  if (historyPast.length > 100) historyPast.shift();
  historyFuture = [];
  setStatus("\u5C1A\u672A\u5132\u5B58\u7684\u8B8A\u66F4");
  persistLocal();
}
function undo() {
  const previous = historyPast.pop();
  if (!previous) return;
  historyFuture.push(clone(project));
  Object.assign(project, clone(previous));
  selectedFigureId = project.figures[0]?.id ?? "";
  selectedJoint = null;
  renderAll();
  setStatus("\u5DF2\u5FA9\u539F");
}
function redo() {
  const next = historyFuture.pop();
  if (!next) return;
  historyPast.push(clone(project));
  Object.assign(project, clone(next));
  selectedFigureId = project.figures[0]?.id ?? "";
  selectedJoint = null;
  renderAll();
  setStatus("\u5DF2\u91CD\u505A");
}
function persistLocal() {
  try {
    localStorage.setItem("posesketch:last-project", JSON.stringify(project));
  } catch {
  }
}
function restoreLocal() {
  try {
    const raw = localStorage.getItem("posesketch:last-project");
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved?.schemaVersion !== 1 || !Array.isArray(saved.figures)) return;
    Object.assign(project, saved);
    selectedFigureId = project.figures[0]?.id ?? "";
  } catch {
  }
}
function logicalSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}
function toCanvasPoint(point, width, height) {
  return { x: point.x * width, y: point.y * height };
}
function fromPointer(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height))
  };
}
function drawGrid(context, width, height) {
  context.save();
  context.strokeStyle = "rgba(45, 58, 67, 0.055)";
  context.lineWidth = 1;
  for (let i = 1; i < 10; i += 1) {
    const x = width / 10 * i;
    const y = height / 10 * i;
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }
  context.strokeStyle = "rgba(45, 58, 67, 0.12)";
  context.setLineDash([5, 7]);
  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.stroke();
  context.beginPath();
  context.moveTo(0, height * 0.86);
  context.lineTo(width, height * 0.86);
  context.stroke();
  context.restore();
}
function drawBackground(context, width, height) {
  if (!project.background || !backgroundImage) return;
  const image = backgroundImage;
  const imageRatio = image.naturalWidth / image.naturalHeight;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  if (project.background.fit === "contain" && imageRatio > canvasRatio || project.background.fit === "cover" && imageRatio < canvasRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }
  context.save();
  context.globalAlpha = project.background.opacity;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
  context.restore();
}
function drawFigure(context, figure, width, height, options) {
  if (!figure.visible) return;
  const point = (joint) => toCanvasPoint(figure.joints[joint], width, height);
  const isSelected = figure.id === selectedFigureId;
  const strokeWidth = options.aiMode ? Math.max(7, width / 145) : Math.max(4, width / 205);
  const radius = options.aiMode ? Math.max(10, width / 62) : Math.max(7, width / 82);
  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const [startName, endName, side] of BONE_PAIRS) {
    const start = point(startName);
    const end = point(endName);
    context.strokeStyle = side === "left" ? leftColor : side === "right" ? rightColor : options.aiMode ? "#f6f1e8" : figure.color;
    context.lineWidth = strokeWidth;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }
  const head = point("head");
  const neck = point("neck");
  const headRadius = Math.max(19, Math.hypot(head.x - neck.x, head.y - neck.y) * 0.68);
  context.strokeStyle = options.aiMode ? "#f6f1e8" : figure.color;
  context.lineWidth = strokeWidth;
  context.beginPath();
  context.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
  context.stroke();
  context.strokeStyle = options.aiMode ? "#ffd166" : "rgba(39, 51, 63, .6)";
  context.lineWidth = Math.max(2, strokeWidth * 0.45);
  context.beginPath();
  context.moveTo(head.x, head.y);
  context.lineTo(head.x + headRadius * 0.78, head.y - headRadius * 0.04);
  context.stroke();
  context.beginPath();
  context.moveTo(head.x + headRadius * 0.78, head.y - headRadius * 0.04);
  context.lineTo(head.x + headRadius * 0.5, head.y - headRadius * 0.2);
  context.moveTo(head.x + headRadius * 0.78, head.y - headRadius * 0.04);
  context.lineTo(head.x + headRadius * 0.5, head.y + headRadius * 0.13);
  context.stroke();
  if (options.showHandles && isSelected) {
    for (const jointName of JOINT_NAMES) {
      const joint = point(jointName);
      const isJointSelected = jointName === selectedJoint;
      const side = jointName.endsWith("L") ? leftColor : jointName.endsWith("R") ? rightColor : "#fffaf2";
      context.fillStyle = isJointSelected ? "#f6b84b" : side;
      context.strokeStyle = isJointSelected ? "#9d6014" : "rgba(39, 51, 63, .7)";
      context.lineWidth = 2;
      context.beginPath();
      context.arc(joint.x, joint.y, isJointSelected ? radius * 1.22 : radius, 0, Math.PI * 2);
      context.fill();
      context.stroke();
    }
  }
  context.restore();
}
function drawScene(context, width, height, options = {}) {
  const background = options.aiMode ? "#1d252d" : project.canvas.backgroundColor;
  context.clearRect(0, 0, width, height);
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  if (options.includeBackground) drawBackground(context, width, height);
  if (options.showGrid) drawGrid(context, width, height);
  for (const figure of project.figures) drawFigure(context, figure, width, height, options);
}
function resizeCanvas() {
  const rect = canvasWrap.getBoundingClientRect();
  const available = Math.max(260, Math.min(rect.width - 42, rect.height - 42));
  const aspect = project.canvas.width / project.canvas.height;
  let cssWidth = available;
  let cssHeight = available / aspect;
  if (cssHeight > rect.height - 42) {
    cssHeight = rect.height - 42;
    cssWidth = cssHeight * aspect;
  }
  canvas.style.width = `${cssWidth * zoom}px`;
  canvas.style.height = `${cssHeight * zoom}px`;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawScene(ctx, cssWidth, cssHeight, { showGrid: true, showHandles: true, includeBackground: true });
  zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
}
function renderLayers() {
  layerList.innerHTML = project.figures.map((figure) => `
    <button class="layer-row ${figure.id === selectedFigureId ? "selected" : ""}" data-layer-id="${figure.id}">
      <span class="layer-thumb"><i style="background:${figure.accent}"></i><i style="background:${figure.color}"></i></span>
      <span class="layer-name">${escapeHtml(figure.name)}</span>
      <span class="layer-actions"><span class="visibility ${figure.visible ? "" : "muted"}" data-toggle-visibility="${figure.id}">${figure.visible ? "\u25C9" : "\u25CB"}</span></span>
    </button>
  `).join("");
}
function renderInspector() {
  const figure = selectedFigure();
  if (!figure) {
    inspector.innerHTML = '<p class="muted-copy">\u5C1A\u672A\u9078\u53D6\u4EBA\u7269</p>';
    return;
  }
  inspector.innerHTML = `
    <label class="field-label">\u540D\u7A31<input id="figure-name" type="text" value="${escapeAttr(figure.name)}"></label>
    <div class="inspector-row"><span>\u7DDA\u689D\u984F\u8272</span><input id="figure-color" type="color" value="${figure.color}"></div>
    <label class="toggle-row"><span>\u9396\u5B9A\u4EBA\u7269</span><input id="figure-locked" type="checkbox" ${figure.locked ? "checked" : ""}><i></i></label>
    <div class="legend-row"><span><i class="dot left-dot"></i>\u5DE6\u5074\u80A2\u9AD4</span><span><i class="dot right-dot"></i>\u53F3\u5074\u80A2\u9AD4</span></div>
  `;
  const nameInput = document.querySelector("#figure-name");
  const colorInput = document.querySelector("#figure-color");
  const lockedInput = document.querySelector("#figure-locked");
  nameInput?.addEventListener("change", () => {
    commit();
    figure.name = nameInput.value.trim() || "\u672A\u547D\u540D\u4EBA\u7269";
    renderAll();
  });
  colorInput?.addEventListener("change", () => {
    commit();
    figure.color = colorInput.value;
    renderAll();
  });
  lockedInput?.addEventListener("change", () => {
    commit();
    figure.locked = lockedInput.checked;
    renderAll();
  });
}
function renderAll() {
  renderLayers();
  renderInspector();
  canvasSizeLabel.textContent = `${project.canvas.width} \xD7 ${project.canvas.height}`;
  resizeCanvas();
}
function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char] ?? char);
}
function escapeAttr(value) {
  return escapeHtml(value);
}
function hitTest(point) {
  const figure = selectedFigure();
  if (!figure || figure.locked || !figure.visible) return null;
  const threshold = 0.035 / zoom;
  let closest = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const jointName of JOINT_NAMES) {
    const joint = figure.joints[jointName];
    const current = Math.hypot(joint.x - point.x, joint.y - point.y);
    if (current < threshold && current < distance) {
      closest = jointName;
      distance = current;
    }
  }
  return closest;
}
function addFigure() {
  commit();
  const index = project.figures.length;
  const offset = Math.min(0.28, index * 0.16);
  const newFigure = createFigure(index, offset, index % 2 ? 0.04 : 0, index % 2 ? 0.86 : 0.92);
  project.figures.push(newFigure);
  selectedFigureId = newFigure.id;
  selectedJoint = null;
  renderAll();
  showToast("\u5DF2\u65B0\u589E\u706B\u67F4\u4EBA");
}
function applyTemplate(template) {
  const figure = selectedFigure();
  if (!figure || figure.locked) return;
  commit();
  const base = createBaseJoints();
  if (template === "walk") {
    base.wristL = { x: 0.33, y: 0.39 };
    base.elbowL = { x: 0.4, y: 0.34 };
    base.wristR = { x: 0.69, y: 0.56 };
    base.elbowR = { x: 0.63, y: 0.4 };
    base.kneeL = { x: 0.53, y: 0.68 };
    base.ankleL = { x: 0.67, y: 0.86 };
    base.toeL = { x: 0.73, y: 0.87 };
    base.kneeR = { x: 0.49, y: 0.72 };
    base.ankleR = { x: 0.32, y: 0.87 };
    base.toeR = { x: 0.25, y: 0.88 };
  } else if (template === "sit") {
    base.pelvis = { x: 0.5, y: 0.5 };
    base.hipL = { x: 0.45, y: 0.53 };
    base.hipR = { x: 0.55, y: 0.53 };
    base.kneeL = { x: 0.64, y: 0.61 };
    base.ankleL = { x: 0.75, y: 0.75 };
    base.toeL = { x: 0.8, y: 0.75 };
    base.kneeR = { x: 0.39, y: 0.61 };
    base.ankleR = { x: 0.27, y: 0.75 };
    base.toeR = { x: 0.22, y: 0.75 };
    base.wristL = { x: 0.34, y: 0.46 };
    base.wristR = { x: 0.66, y: 0.46 };
  } else if (template === "raise") {
    base.elbowL = { x: 0.34, y: 0.24 };
    base.wristL = { x: 0.28, y: 0.12 };
    base.elbowR = { x: 0.66, y: 0.24 };
    base.wristR = { x: 0.72, y: 0.12 };
  }
  figure.joints = base;
  selectedJoint = null;
  renderAll();
  showToast("\u5DF2\u5957\u7528\u59FF\u52E2\u7BC4\u672C");
}
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1e3);
}
function exportProject() {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  downloadBlob(blob, "posesketch-project.stickpose.json");
  setStatus("\u5C08\u6848\u5DF2\u532F\u51FA");
}
function renderExport(options, filename) {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportContext = exportCanvas.getContext("2d");
  drawScene(exportContext, 1024, 1024, options);
  exportCanvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, filename);
  }, "image/png");
  showToast("\u6B63\u5728\u6E96\u5099 PNG\u2026");
}
function loadBackground(dataUrl) {
  const image = new Image();
  image.onload = () => {
    backgroundImage = image;
    renderAll();
  };
  image.src = dataUrl;
}
function handleFileOpen(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const loaded = JSON.parse(String(reader.result));
      if (loaded.schemaVersion !== 1 || !Array.isArray(loaded.figures)) throw new Error("invalid");
      commit();
      Object.assign(project, loaded);
      selectedFigureId = project.figures[0]?.id ?? "";
      backgroundImage = null;
      if (project.background?.dataUrl) loadBackground(project.background.dataUrl);
      renderAll();
      showToast("\u5C08\u6848\u5DF2\u958B\u555F");
    } catch {
      showToast("\u7121\u6CD5\u958B\u555F\u9019\u500B\u5C08\u6848\u6A94");
    }
  };
  reader.readAsText(file);
}
function setAspect(aspect) {
  const [w, h] = aspect.split(":").map(Number);
  const nextHeight = Math.round(project.canvas.width * h / w);
  commit();
  project.canvas.height = nextHeight;
  document.querySelectorAll(".aspect-chip").forEach((button) => button.classList.toggle("active", button.dataset.aspect === aspect));
  renderAll();
}
document.addEventListener("click", (event) => {
  const target = event.target;
  const action = target.closest("[data-action]")?.dataset.action;
  if (action === "new") {
    if (!window.confirm("\u5EFA\u7ACB\u65B0\u756B\u5E03\uFF1F\u76EE\u524D\u5C1A\u672A\u5132\u5B58\u7684\u8B8A\u66F4\u6703\u88AB\u6E05\u9664\u3002")) return;
    Object.assign(project, createDefaultProject());
    historyPast = [];
    historyFuture = [];
    selectedFigureId = project.figures[0].id;
    selectedJoint = null;
    backgroundImage = null;
    renderAll();
    setStatus("\u5DF2\u5EFA\u7ACB\u65B0\u756B\u5E03");
  } else if (action === "open") document.querySelector("#project-input")?.click();
  else if (action === "save") exportProject();
  else if (action === "undo") undo();
  else if (action === "redo") redo();
  else if (action === "add-figure") addFigure();
  else if (action === "background") document.querySelector("#background-input")?.click();
  else if (action === "export-pose") renderExport({ showGrid: false, showHandles: false, includeBackground: false, aiMode: true }, "posesketch-ai-pose.png");
  else if (action === "export-reference") renderExport({ showGrid: false, showHandles: false, includeBackground: false }, "posesketch-reference.png");
  else if (action === "export-json") exportProject();
  else if (action === "zoom-in") {
    zoom = Math.min(1.8, zoom + 0.1);
    resizeCanvas();
  } else if (action === "zoom-out") {
    zoom = Math.max(0.6, zoom - 0.1);
    resizeCanvas();
  }
  const layer = target.closest("[data-layer-id]");
  if (layer && !target.closest("[data-toggle-visibility]")) {
    selectedFigureId = layer.dataset.layerId ?? selectedFigureId;
    selectedJoint = null;
    renderAll();
  }
  const visibility = target.closest("[data-toggle-visibility]");
  if (visibility) {
    const figure = project.figures.find((item) => item.id === visibility.dataset.toggleVisibility);
    if (figure) {
      commit();
      figure.visible = !figure.visible;
      renderAll();
    }
  }
  const template = target.closest("[data-template]")?.dataset.template;
  if (template) applyTemplate(template);
  const aspect = target.closest("[data-aspect]")?.dataset.aspect;
  if (aspect) setAspect(aspect);
});
document.querySelector("#background-color")?.addEventListener("input", (event) => {
  project.canvas.backgroundColor = event.target.value;
  renderAll();
  persistLocal();
});
document.querySelector("#background-input")?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    commit();
    project.background = { dataUrl: String(reader.result), opacity: 0.24, fit: "contain" };
    loadBackground(String(reader.result));
    showToast("\u80CC\u666F\u53C3\u8003\u5DF2\u52A0\u5165");
  };
  reader.readAsDataURL(file);
});
document.querySelector("#project-input")?.addEventListener("change", (event) => {
  const file = event.target.files?.[0];
  if (file) handleFileOpen(file);
  event.target.value = "";
});
canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture(event.pointerId);
  const point = fromPointer(event);
  const figure = selectedFigure();
  const hit = hitTest(point);
  if (hit && figure) {
    dragStart = clone(project);
    dragMoved = false;
    selectedJoint = hit;
    renderAll();
    return;
  }
  selectedJoint = null;
  renderAll();
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragStart || !selectedJoint) return;
  const figure = selectedFigure();
  if (!figure || figure.locked) return;
  const point = fromPointer(event);
  figure.joints[selectedJoint] = point;
  dragMoved = true;
  resizeCanvas();
});
function endDrag() {
  if (dragStart && dragMoved) {
    historyPast.push(dragStart);
    if (historyPast.length > 100) historyPast.shift();
    historyFuture = [];
    setStatus("\u5C1A\u672A\u5132\u5B58\u7684\u8B8A\u66F4");
    persistLocal();
  }
  dragStart = null;
  dragMoved = false;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  zoom = Math.max(0.6, Math.min(1.8, zoom + (event.deltaY < 0 ? 0.05 : -0.05)));
  resizeCanvas();
}, { passive: false });
document.addEventListener("keydown", (event) => {
  const modifier = event.metaKey || event.ctrlKey;
  if (modifier && event.key.toLowerCase() === "z") {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  }
  if (modifier && event.key.toLowerCase() === "y") {
    event.preventDefault();
    redo();
  }
  if (modifier && event.key.toLowerCase() === "s") {
    event.preventDefault();
    exportProject();
  }
  if (event.key === "Escape") {
    selectedJoint = null;
    renderAll();
  }
});
window.addEventListener("resize", resizeCanvas);
restoreLocal();
if (project.background?.dataUrl) loadBackground(project.background.dataUrl);
renderAll();
