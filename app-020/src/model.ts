/** 全局数据模型 —— 坐标一律为毫米（mm），距离限值/实测为米（m） */
export type Pt = { x: number; y: number };

export type RoomUsage = 'office' | 'retail' | 'storage' | 'ward' | 'corridor' | 'other';

export type Room = {
  id: string;
  polygon: Pt[];
  name: string;
  usage: RoomUsage;
  areaM2: number;
  occupants?: number;
};

export type FacilityKind =
  | 'extinguisher'
  | 'hydrant'
  | 'exit_sign'
  | 'emergency_light'
  | 'exit'
  | 'sprinkler';

export type CheckStatus = 'ok' | 'low_pressure' | 'expired' | 'damaged' | 'missing';

export type CheckRecord = {
  date: string; // YYYY-MM-DD
  status: CheckStatus;
  photoKey?: string; // IndexedDB key，照片仅存本地
  note?: string;
};

export type Facility = {
  id: string;
  kind: FacilityKind;
  x: number; // mm
  y: number; // mm
  code: string; // 楼层-类型-序号，如 3F-EX-01
  spec?: {
    extType?: 'dry_powder' | 'co2' | 'water';
    weightKg?: number;
  };
  checks: CheckRecord[];
};

export type Underlay = {
  key: string; // IndexedDB key
  wPx: number;
  hPx: number;
  offsetX: number; // mm，底图左上角在图纸坐标中的位置
  offsetY: number;
  scaleMmPerPx: number; // 仅影响底图显示，不影响校验
  opacity: number; // 0~1
  visible: boolean;
};

export type Floor = {
  id: string;
  buildingId: string;
  level: number; // 1,2,3... 地下为 -1,-2
  scaleMmPerUnit: number; // 兼容字段：毫米坐标存储，此值仅影响底图显示
  rooms: Room[];
  facilities: Facility[];
  exits: string[]; // kind === 'exit' 的设施 id
  underlay?: Underlay;
  version: number; // 每次编辑 +1，用于触发校验
  lastValidation?: ValidationResult;
};

export type BuildingKind = 'office' | 'retail' | 'factory' | 'school';

export type Building = {
  id: string;
  name: string;
  kind: BuildingKind;
  floors: string[];
  createdAt: string;
};

/**
 * 各类校验项默认适用的条文键。规则集 clauses 中未配置时回退到 RULE_TYPE_CLAUSE_KEYS。
 * - travel/deadEnd/coverage/exit 为几何/数量判定，条文随建筑类别不同；
 * - noDoor 是模型推断提示，不绑定规范条文；
 * - check_* 为运维检查项，依据不在建筑规范规则集内（企业制度/GB 50444 等）。
 */
export type RuleClauseKey =
  | 'travel'
  | 'deadEnd'
  | 'extinguisher'
  | 'exitArea'
  | 'exitOccupants'
  | 'check'
  | 'connection';

export type RuleSet = {
  buildingKind: BuildingKind;
  maxTravelDistanceM: number;
  deadEndDistanceM: number;
  extinguisherRadiusM: number;
  exitMinAreaM2: number; // 超过此面积需 ≥2 个安全出口
  exitMaxOccupants: number; // 超过此人数需 ≥2 个安全出口
  source: string; // 依据文号，报告中打印
  version: number; // 规则版本，修改即 +1，校验结果记录当时版本
  updatedAt: string; // 最近一次修改时间（ISO），与 version 一起留痕
  /** 每条限值对应的具体条文（文号 + 条/表号），随校验项一路带入结果 */
  clauses: Record<RuleClauseKey, string>;
};

export type ValidationSeverity = 'error' | 'warning';

/** 校验项的判定依据：照哪一版规则、哪一条文判的 */
export type ValidationBasis = {
  buildingKind: BuildingKind;
  rulesVersion: number;
  source: string; // 依据文号
  clause: string | null; // 具体条文（如「GB 50016-2014(2018年版) 表5.5.17」），无对应条文时为 null
};

export const RULE_TYPE_CLAUSE_KEYS: Record<string, RuleClauseKey> = {
  TRAVEL_EXCEED: 'travel',
  DEADEND_EXCEED: 'deadEnd',
  COVERAGE_UNCOVERED: 'extinguisher',
  EXIT_COUNT: 'exitArea', // 面积触发时用；人数触发时引擎按 exitOccupants 覆盖
  EXIT_NOT_CONNECTED: 'connection',
  FACILITY_DEFECT: 'check',
  CHECK_MISSING: 'check',
  CHECK_OVERDUE: 'check',
};

export type ValidationItem = {
  severity: ValidationSeverity;
  type: string;
  message: string;
  roomId?: string;
  facilityId?: string;
  point?: Pt; // 图纸定位点 mm
  value?: number; // 实测值（m / m²）
  limit?: number;
  basis?: ValidationBasis; // 本项判定时使用的规则版本与依据条文
};

export type ValidationResult = {
  checkedAt: string;
  pass: boolean;
  items: ValidationItem[];
  travelWorstM: number | null;
  travelWorstPoint?: Pt | null;
  deadEndM: number | null;
  coverage: { uncoveredM2: number; totalM2: number; pass: boolean; samples: Pt[] } | null;
  exits: { present: number; required: number };
  rulesSnapshot: {
    buildingKind: BuildingKind;
    version: number;
    updatedAt: string;
    source: string;
    maxTravelDistanceM: number;
    deadEndDistanceM: number;
    extinguisherRadiusM: number;
    exitMinAreaM2: number;
    exitMaxOccupants: number;
    clauses: Record<RuleClauseKey, string>;
  };
};

export const FACILITY_LABELS: Record<FacilityKind, string> = {
  extinguisher: '灭火器',
  hydrant: '消火栓',
  exit_sign: '疏散指示灯',
  emergency_light: '应急照明',
  exit: '安全出口',
  sprinkler: '喷淋',
};

export const FACILITY_CODES: Record<FacilityKind, string> = {
  extinguisher: 'EX',
  hydrant: 'HY',
  exit_sign: 'ES',
  emergency_light: 'EL',
  exit: 'EXIT',
  sprinkler: 'SP',
};

export const USAGE_LABELS: Record<RoomUsage, string> = {
  office: '办公',
  retail: '商业',
  storage: '仓库',
  ward: '病房',
  corridor: '走道',
  other: '其他',
};
