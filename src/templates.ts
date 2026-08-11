import { BONE_PAIRS, JOINT_NAMES, type Figure, type FigurePose, type Joints, type Point } from './pose-types';

export function createBaseJoints(offsetX = 0, offsetY = 0, scale = 1): Joints {
  const point = (x: number, y: number): Point => ({ x: 0.5 + (x - 0.5) * scale + offsetX, y: y * scale + offsetY });
  return {
    head: point(0.5, 0.16), neck: point(0.5, 0.25),
    shoulderL: point(0.43, 0.28), elbowL: point(0.34, 0.39), wristL: point(0.26, 0.49),
    shoulderR: point(0.57, 0.28), elbowR: point(0.66, 0.39), wristR: point(0.74, 0.49),
    pelvis: point(0.5, 0.52), hipL: point(0.45, 0.54), kneeL: point(0.42, 0.7), ankleL: point(0.4, 0.88), toeL: point(0.34, 0.9),
    hipR: point(0.55, 0.54), kneeR: point(0.58, 0.7), ankleR: point(0.6, 0.88), toeR: point(0.66, 0.9),
  };
}

export function createTemplateJoints(template: string): Joints | null {
  const base = createBaseJoints();
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
  } else if (template !== 'stand') {
    return null;
  }
  return base;
}

function averageBoneLength(joints: Joints): number {
  const lengths = BONE_PAIRS.map(([startName, endName]) => Math.hypot(
    joints[endName].x - joints[startName].x,
    joints[endName].y - joints[startName].y,
  )).filter((length) => length > 0);
  return lengths.reduce((sum, length) => sum + length, 0) / Math.max(1, lengths.length);
}

export function placeTemplateAtFigure(template: Joints, figure: Figure): Joints {
  const scale = Math.max(0.35, Math.min(1.8, averageBoneLength(figure.joints) / averageBoneLength(template)));
  const anchor = figure.joints.pelvis;
  const templateAnchor = template.pelvis;
  const joints = {} as Joints;
  for (const jointName of JOINT_NAMES) {
    joints[jointName] = {
      x: anchor.x + (template[jointName].x - templateAnchor.x) * scale,
      y: anchor.y + (template[jointName].y - templateAnchor.y) * scale,
    };
  }
  return joints;
}

export function isFigurePose(value: string): value is FigurePose {
  return ['stand', 'walk', 'sit', 'raise', 'lying', 'prone', 'jump'].includes(value);
}
