import fs from 'node:fs';

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: npm run check:pose -- /path/to/posesketch-pose.json');
  process.exit(2);
}

const errors = [];
let payload;
try {
  payload = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
} catch (error) {
  console.error(`Cannot read Pose JSON: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

const expectedJoints = [
  'head', 'neck', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR',
  'pelvis', 'hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR',
];
const poses = new Set(['stand', 'walk', 'sit', 'raise', 'lying', 'prone', 'jump']);
const orientations = new Set(['front', 'back', 'side']);
const headFacings = new Set(['left', 'right', 'up', 'down']);
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

if (payload?.format !== 'posesketch-pose') errors.push('format must be "posesketch-pose"');
if (payload?.version !== 1) errors.push('version must be 1');
if (!Array.isArray(payload?.figures) || payload.figures.length === 0) errors.push('figures must be a non-empty array');

for (const [index, figure] of (payload?.figures ?? []).entries()) {
  if (!figure || typeof figure !== 'object') {
    errors.push(`figures[${index}] is not an object`);
    continue;
  }
  if (typeof figure.id !== 'string' || !figure.id) errors.push(`figures[${index}].id is missing`);
  if (!poses.has(figure.pose)) errors.push(`figures[${index}].pose is invalid`);
  if (!orientations.has(figure.orientation)) errors.push(`figures[${index}].orientation is invalid`);
  if (!headFacings.has(figure.headFacing)) errors.push(`figures[${index}].headFacing is invalid`);
  if (typeof figure.visible !== 'boolean') errors.push(`figures[${index}].visible is invalid`);
  if (!Array.isArray(figure.keypoints)) {
    errors.push(`figures[${index}].keypoints must be an array`);
    continue;
  }
  const names = figure.keypoints.map((keypoint) => keypoint?.name);
  if (names.length !== expectedJoints.length || expectedJoints.some((name, jointIndex) => names[jointIndex] !== name)) {
    errors.push(`figures[${index}].keypoints order does not match PoseSketch`);
  }
  figure.keypoints.forEach((keypoint, jointIndex) => {
    if (!finite(keypoint?.x) || !finite(keypoint?.y)) errors.push(`figures[${index}].keypoints[${jointIndex}] has invalid coordinates`);
    if (![0, 1].includes(keypoint?.visibility)) errors.push(`figures[${index}].keypoints[${jointIndex}].visibility must be 0 or 1`);
  });
}

if (errors.length > 0) {
  console.error(`Pose JSON invalid (${errors.length} error${errors.length === 1 ? '' : 's'}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Pose JSON valid: ${payload.figures.length} figure${payload.figures.length === 1 ? '' : 's'}, ${payload.figures.length * expectedJoints.length} keypoints`);
