export type JointName =
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

export type Point = { x: number; y: number };
export type Joints = Record<JointName, Point>;
export type CameraView = 'front' | 'back' | 'left-side' | 'right-side';
export type FigurePose = 'stand' | 'walk' | 'sit' | 'raise' | 'lying' | 'prone' | 'jump';
export type HeadFacing = 'left' | 'right' | 'up' | 'down';

export type Figure = {
  id: string;
  name: string;
  joints: Joints;
  cameraView: CameraView;
  pose: FigurePose;
  headFacing: HeadFacing;
  boneLock: boolean;
  visible: boolean;
  locked: boolean;
  color: string;
  accent: string;
};

export type BackgroundLayer = {
  dataUrl: string;
  opacity: number;
  fit: 'contain' | 'cover';
};

export type PoseProject = {
  schemaVersion: 3;
  canvas: { width: number; height: number; backgroundColor: string };
  figures: Figure[];
  background?: BackgroundLayer;
};

export const CAMERA_VIEWS: CameraView[] = ['front', 'back', 'left-side', 'right-side'];

export const cameraViewLabels: Record<CameraView, { short: string; title: string; surface: string }> = {
  front: { short: 'F', title: 'FRONT', surface: 'CHEST' },
  back: { short: 'B', title: 'BACK', surface: 'SPINE' },
  'left-side': { short: 'L', title: 'LEFT SIDE', surface: 'LEFT BODY' },
  'right-side': { short: 'R', title: 'RIGHT SIDE', surface: 'RIGHT BODY' },
};

export function isCameraView(value: unknown): value is CameraView {
  return typeof value === 'string' && CAMERA_VIEWS.includes(value as CameraView);
}

export const JOINT_NAMES: JointName[] = [
  'head', 'neck', 'shoulderL', 'elbowL', 'wristL', 'shoulderR', 'elbowR', 'wristR',
  'pelvis', 'hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR',
];

export const BONE_PAIRS: Array<[JointName, JointName, 'center' | 'left' | 'right']> = [
  ['head', 'neck', 'center'],
  ['neck', 'shoulderL', 'left'], ['shoulderL', 'elbowL', 'left'], ['elbowL', 'wristL', 'left'],
  ['neck', 'shoulderR', 'right'], ['shoulderR', 'elbowR', 'right'], ['elbowR', 'wristR', 'right'],
  ['neck', 'pelvis', 'center'],
  ['pelvis', 'hipL', 'left'], ['hipL', 'kneeL', 'left'], ['kneeL', 'ankleL', 'left'], ['ankleL', 'toeL', 'left'],
  ['pelvis', 'hipR', 'right'], ['hipR', 'kneeR', 'right'], ['kneeR', 'ankleR', 'right'], ['ankleR', 'toeR', 'right'],
  ['shoulderL', 'shoulderR', 'center'], ['hipL', 'hipR', 'center'],
];

export const poseLabels: Record<FigurePose, string> = {
  stand: 'STAND',
  walk: 'WALK',
  sit: 'SIT',
  raise: 'RAISE',
  lying: 'LYING / FACE UP',
  prone: 'PRONE / FACE DOWN',
  jump: 'JUMP / AIRBORNE',
};
