import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response } from 'express';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');

const DECISION_MODEL = 'gemini-decision-1';
// Decisions API supports up to 1,000 independent questions in a single shared-input batch.
// With 2-4 questions per vehicle, 120 vehicles safely fits in ONE single batch request.
const MAX_VEHICLES_PER_BATCH = 120;

const SPEED_RUBRIC: string[] = [
  '0% - Full stop required immediately (red light, closed crossing, stopped obstacle within stopping distance, pedestrian, cross-traffic conflict)',
  '25% - Very slow creep, tight intersection turn, heavy congestion, or close lead vehicle (<12m)',
  '50% - Moderate urban caution, approaching intersection, yellow light, or matching slower traffic ahead',
  '80% - Normal steady cruise safely below or near road speed limit with clear gap ahead',
  '100% - Completely clear open road ahead; drive at full road speed limit or brisk overtake',
];

const MANEUVER_CRITERIA: Record<string, string> = {
  accelerate: 'Open road ahead (no close lead obstacle, no red/yellow stop, no crossing/pedestrian); accelerate smoothly toward speed limit.',
  cruise: 'Clear safe following gap ahead; maintain steady cruising speed smoothly in lane.',
  slow_down: 'Approach a slower vehicle, upcoming turn, or yellow light smoothly by easing off and decelerating.',
  hard_brake: 'Apply firm or emergency braking NOW: leadGapM <= stopDistM with slower/stopped obstacle, imminent collision (ttc < 2.2s), close pedestrian, red light close to stop line, or closed railway crossing.',
  stop_hold: 'Hold completely stationary at a red/red_yellow light, stop line, closed railway barrier, crosswalk pedestrian, cross-traffic conflict, or directly behind a stopped car (leadGapM < 12m and leadSpd < 5).',
  yield_shoulder: 'Pull toward the right shoulder and slow down to yield for a nearby emergency siren vehicle or oncoming hazard.',
  lane_left: 'Change or steer into the clear left lane (leftClear=true) to overtake a slower/stopped lead obstacle or align for a left turn.',
  lane_right: 'Change or steer into the clear right lane (rightClear=true) to bypass an obstacle, keep right, or align for a right turn.',
  reverse_recover: 'Vehicle is front-blocked by wall or head-on wedged/stuck (stuckSec >= 2.0) with rearClear=true; reverse briefly to recover.',
};

interface VehiclePerceptionPayload {
  vehId: string;
  type: string;
  archetype: string;
  speedKmh: number;
  speedLimitKmh: number;
  stoppingDistM: number;
  inIntersection: boolean;
  distToStopLineM: number | null;
  trafficLight: 'red' | 'yellow' | 'red_yellow' | 'green' | 'none';
  railwayCrossingClosed: boolean;
  distToCrossingM: number | null;
  mustYieldMainRoad: boolean;
  availableTurns: string[];
  blockedTurns: string[];
  currentPlannedTurn: string;
  hasLeftSameDirLane: boolean;
  leftLaneClear: boolean;
  hasRightSameDirLane: boolean;
  rightLaneClear: boolean;
  downstreamBlocked: boolean;
  leadObstacleType: 'vehicle' | 'prop' | 'none';
  leadGapM: number | null;
  leadSpeedKmh: number | null;
  leadClosingTtcSec: number | null;
  pedestrianAheadM: number | null;
  crossTrafficConflict: boolean;
  oncomingConflict: boolean;
  emergencySirenNearby: boolean;
  stuckSec: number;
  headOnConflict: boolean;
  rearClear: boolean;
  frontWallBlocked: boolean;
}

interface DecisionQuestionSpec {
  type: 'noul' | 'choice' | 'score';
  instructions: string;
  criteria?: Record<string, string> | string[] | { true_description: string; false_description: string };
}

let cachedDecisionsClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

function getDecisionsClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!cachedDecisionsClient || cachedApiKey !== apiKey) {
    cachedApiKey = apiKey;
    cachedDecisionsClient = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return cachedDecisionsClient;
}

function extractApiError(err: unknown): { status: number; message: string } {
  if (err && typeof err === 'object') {
    const anyErr = err as { status?: number; code?: number; message?: string };
    const statusCandidate = Number(anyErr.status || anyErr.code);
    const status = Number.isFinite(statusCandidate) && statusCandidate >= 400 && statusCandidate < 600
      ? statusCandidate
      : 502;
    const rawMsg = typeof anyErr.message === 'string' && anyErr.message.trim().length > 0
      ? anyErr.message.trim()
      : 'Gemini Decisions API request failed.';
    return { status, message: rawMsg };
  }
  return { status: 502, message: String(err || 'Unknown Gemini Decisions API error') };
}

function sanitizeVehicles(raw: unknown): VehiclePerceptionPayload[] {
  if (!Array.isArray(raw)) return [];
  const out: VehiclePerceptionPayload[] = [];
  for (let i = 0; i < raw.length && out.length < MAX_VEHICLES_PER_BATCH; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') continue;
    const v = item as Partial<VehiclePerceptionPayload>;
    if (typeof v.vehId !== 'string' || !v.vehId) continue;
    const speedKmh = Number.isFinite(v.speedKmh) ? Math.max(0, Math.round(Number(v.speedKmh))) : 0;
    const speedMs = speedKmh / 3.6;
    const defaultStopDist = Math.round((speedMs * 1.15 + (speedMs * speedMs) / (2 * 6.5) + 4.5) * 10) / 10;

    out.push({
      vehId: v.vehId.slice(0, 64),
      type: typeof v.type === 'string' ? v.type.slice(0, 32) : 'sedan',
      archetype: typeof v.archetype === 'string' ? v.archetype.slice(0, 24) : 'normal',
      speedKmh,
      speedLimitKmh: Number.isFinite(v.speedLimitKmh) ? Math.round(Number(v.speedLimitKmh)) : 60,
      stoppingDistM: Number.isFinite(v.stoppingDistM) ? Math.round(Number(v.stoppingDistM) * 10) / 10 : defaultStopDist,
      inIntersection: Boolean(v.inIntersection),
      distToStopLineM: v.distToStopLineM === null || v.distToStopLineM === undefined
        ? null
        : Math.round(Number(v.distToStopLineM) * 10) / 10,
      trafficLight: v.trafficLight === 'red' || v.trafficLight === 'yellow' || v.trafficLight === 'red_yellow' || v.trafficLight === 'green'
        ? v.trafficLight
        : 'none',
      railwayCrossingClosed: Boolean(v.railwayCrossingClosed),
      distToCrossingM: v.distToCrossingM === null || v.distToCrossingM === undefined
        ? null
        : Math.round(Number(v.distToCrossingM) * 10) / 10,
      mustYieldMainRoad: Boolean(v.mustYieldMainRoad),
      availableTurns: Array.isArray(v.availableTurns)
        ? v.availableTurns.filter((t): t is string => typeof t === 'string' && /^(straight|left|right|turnaround)$/.test(t))
        : [],
      blockedTurns: Array.isArray(v.blockedTurns)
        ? v.blockedTurns.filter((t): t is string => typeof t === 'string' && /^(straight|left|right|turnaround)$/.test(t))
        : [],
      currentPlannedTurn: typeof v.currentPlannedTurn === 'string' ? v.currentPlannedTurn : 'straight',
      hasLeftSameDirLane: Boolean(v.hasLeftSameDirLane),
      leftLaneClear: Boolean(v.leftLaneClear),
      hasRightSameDirLane: Boolean(v.hasRightSameDirLane),
      rightLaneClear: Boolean(v.rightLaneClear),
      downstreamBlocked: Boolean(v.downstreamBlocked),
      leadObstacleType: v.leadObstacleType === 'vehicle' || v.leadObstacleType === 'prop' ? v.leadObstacleType : 'none',
      leadGapM: v.leadGapM === null || v.leadGapM === undefined ? null : Math.round(Number(v.leadGapM) * 10) / 10,
      leadSpeedKmh: v.leadSpeedKmh === null || v.leadSpeedKmh === undefined ? null : Math.round(Number(v.leadSpeedKmh)),
      leadClosingTtcSec: v.leadClosingTtcSec === null || v.leadClosingTtcSec === undefined
        ? null
        : Math.round(Number(v.leadClosingTtcSec) * 10) / 10,
      pedestrianAheadM: v.pedestrianAheadM === null || v.pedestrianAheadM === undefined
        ? null
        : Math.round(Number(v.pedestrianAheadM) * 10) / 10,
      crossTrafficConflict: Boolean(v.crossTrafficConflict),
      oncomingConflict: Boolean(v.oncomingConflict),
      emergencySirenNearby: Boolean(v.emergencySirenNearby),
      stuckSec: Number.isFinite(v.stuckSec) ? Math.round(Number(v.stuckSec) * 10) / 10 : 0,
      headOnConflict: Boolean(v.headOnConflict),
      rearClear: Boolean(v.rearClear),
      frontWallBlocked: Boolean(v.frontWallBlocked),
    });
  }
  return out;
}

// Compact shared scene representation (omits false/null defaults to keep one-batch input fast even for 60+ cars)
function toCompactSceneRecord(v: VehiclePerceptionPayload, idx: number): Record<string, unknown> {
  const rec: Record<string, unknown> = {
    slot: `v${idx}`,
    type: v.type,
    driver: v.archetype,
    spd: v.speedKmh,
    limit: v.speedLimitKmh,
    stopDistM: v.stoppingDistM,
  };
  if (v.inIntersection) rec.inInter = true;
  if (v.distToStopLineM !== null) rec.stopLineM = v.distToStopLineM;
  if (v.trafficLight !== 'none') rec.light = v.trafficLight;
  if (v.railwayCrossingClosed) {
    rec.railClosed = true;
    if (v.distToCrossingM !== null) rec.railM = v.distToCrossingM;
  }
  if (v.mustYieldMainRoad) rec.yieldMain = true;
  if (v.downstreamBlocked) rec.downBlocked = true;
  if (v.availableTurns.length > 0 && v.distToStopLineM !== null && v.distToStopLineM <= 65) {
    rec.turns = v.availableTurns;
    if (v.blockedTurns.length > 0) rec.blockedTurns = v.blockedTurns;
    rec.planTurn = v.currentPlannedTurn;
  }
  if (v.hasLeftSameDirLane) rec.leftClear = v.leftLaneClear;
  if (v.hasRightSameDirLane) rec.rightClear = v.rightLaneClear;
  if (v.leadObstacleType !== 'none' && v.leadGapM !== null) {
    rec.lead = v.leadObstacleType;
    rec.leadGapM = v.leadGapM;
    if (v.leadSpeedKmh !== null) rec.leadSpd = v.leadSpeedKmh;
    if (v.leadClosingTtcSec !== null) rec.ttc = v.leadClosingTtcSec;
  }
  if (v.pedestrianAheadM !== null) rec.pedM = v.pedestrianAheadM;
  if (v.crossTrafficConflict) rec.crossConflict = true;
  if (v.oncomingConflict) rec.oncoming = true;
  if (v.emergencySirenNearby) rec.siren = true;
  if (v.stuckSec >= 1.0) rec.stuckSec = v.stuckSec;
  if (v.headOnConflict) rec.headOn = true;
  if (v.frontWallBlocked) rec.wall = true;
  if (v.frontWallBlocked || v.headOnConflict || v.stuckSec >= 1.5) rec.rearClear = v.rearClear;
  return rec;
}

const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '1mb' }));

app.get('/api/traffic/decisions/health', (_req: Request, res: Response) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    model: DECISION_MODEL,
  });
});

app.post('/api/traffic/decisions', async (req: Request, res: Response) => {
  const decisionsAi = getDecisionsClient();
  if (!decisionsAi) {
    res.status(500).json({
      error: 'GEMINI_API_KEY не настроен на сервере. Добавьте ключ в Settings > Secrets.',
      code: 'API_KEY_MISSING',
    });
    return;
  }

  const vehicles = sanitizeVehicles(req.body?.vehicles);
  if (vehicles.length === 0) {
    res.status(400).json({ error: 'No valid vehicles supplied in traffic snapshot.' });
    return;
  }

  // One shared world snapshot passed once as `input`; all vehicles evaluated in ONE batched Decisions API call
  const sceneRecords = vehicles.map((v, idx) => toCompactSceneRecord(v, idx));

  const questions: Record<string, DecisionQuestionSpec> = {};
  let questionCount = 0;

  for (let i = 0; i < vehicles.length; i++) {
    const v = vehicles[i];
    const slot = `v${i}`;

    // Keep total questions strictly under the 1,000-question Decisions API batch limit
    if (questionCount + 2 > 990) break;

    questions[`${slot}_maneuver`] = {
      type: 'choice',
      instructions:
        `Vehicle ${slot} in the shared JSON traffic snapshot: pick the safest immediate driving maneuver. ` +
        `CRITICAL rear-end avoidance: if leadGapM is present and (leadGapM <= stopDistM or ttc < 2.2) with leadSpd < spd, choose hard_brake (or stop_hold if already nearly stopped / leadGapM < 12 and leadSpd < 5), OR lane_left/lane_right ONLY if leftClear/rightClear is true and safe. ` +
        `If leadGapM <= stopDistM * 1.6 and leadSpd < spd, choose slow_down. ` +
        `Obey red/red_yellow light near stopLineM (<= stopDistM + 8), railClosed, pedM <= stopDistM + 5, crossConflict, yieldMain, or downBlocked with hard_brake or stop_hold. ` +
        `Choose yield_shoulder if siren=true; reverse_recover ONLY if wall=true or (headOn/stuckSec>=2 with rearClear=true). ` +
        `If path is clear (no lead obstacle, no red/yellow stop, no hazard), choose accelerate (if spd < limit - 5) or cruise.`,
      criteria: MANEUVER_CRITERIA,
    };
    questionCount++;

    questions[`${slot}_speed`] = {
      type: 'score',
      instructions:
        `Vehicle ${slot} in the shared JSON traffic snapshot: rate target speed tier relative to speed limit (${v.speedLimitKmh} km/h). ` +
        `Rate 0% if red/red_yellow stop, railClosed, pedM < 12, crossConflict, or stopped lead car within stopDistM. ` +
        `Rate 25%-50% when closing on a slower lead car or approaching a turn. Rate 80%-100% when open road ahead.`,
      criteria: SPEED_RUBRIC,
    };
    questionCount++;

    const uniqueTurns = Array.from(new Set(v.availableTurns));
    if (questionCount + 1 <= 990 && uniqueTurns.length >= 2 && v.distToStopLineM !== null && v.distToStopLineM <= 65 && !v.inIntersection) {
      const turnCriteria: Record<string, string> = {};
      for (const turn of uniqueTurns) {
        const isBlocked = v.blockedTurns.includes(turn);
        if (turn === 'straight') {
          turnCriteria[turn] = isBlocked
            ? 'Continue straight through intersection (exit currently congested/blocked).'
            : 'Continue straight through intersection (clear exit).';
        } else if (turn === 'right') {
          turnCriteria[turn] = isBlocked
            ? 'Turn right at intersection (exit currently congested/blocked).'
            : 'Turn right at intersection (clear exit).';
        } else if (turn === 'left') {
          turnCriteria[turn] = isBlocked
            ? 'Turn left at intersection (exit currently congested/blocked).'
            : 'Turn left at intersection (clear exit).';
        } else if (turn === 'turnaround') {
          turnCriteria[turn] = 'Perform a U-turn / turnaround when other exits are unavailable or blocked.';
        }
      }
      if (Object.keys(turnCriteria).length >= 2) {
        questions[`${slot}_turn`] = {
          type: 'choice',
          instructions:
            `Vehicle ${slot} is approaching an intersection (${v.distToStopLineM}m away, planTurn=${v.currentPlannedTurn}). Choose the best turn avoiding blockedTurns.`,
          criteria: turnCriteria,
        };
        questionCount++;
      }
    }

    const hasHornSituation =
      (v.leadClosingTtcSec !== null && v.leadClosingTtcSec < 1.8) ||
      v.headOnConflict ||
      v.crossTrafficConflict ||
      (v.pedestrianAheadM !== null && v.pedestrianAheadM < 7) ||
      v.stuckSec >= 2.0;

    if (questionCount + 1 <= 990 && hasHornSituation) {
      questions[`${slot}_horn`] = {
        type: 'noul',
        instructions: `Should vehicle ${slot} sound its horn right now to warn another road user of an imminent collision threat, cut-off, or obstruction?`,
        criteria: {
          true_description: 'Imminent collision risk, head-on conflict, sudden cut-off, or blocked path requiring an audible warning.',
          false_description: 'Routine stop at a red light, normal car-following, or waiting safely for a pedestrian.',
        },
      };
      questionCount++;
    }
  }

  const startedAt = Date.now();
  try {
    const result = await decisionsAi.decisions.create({
      model: DECISION_MODEL,
      input: [
        {
          type: 'text',
          text:
            'Real-time 2D top-down urban traffic snapshot. All distances are in meters (stopDistM = full stopping distance including reaction buffer), speeds in km/h, TTC in seconds. Omitted booleans are false, omitted nullable fields are absent/clear.\n' +
            JSON.stringify({ vehicles: sceneRecords }),
        },
      ],
      questions: questions as any,
    });

    const latencyMs = Date.now() - startedAt;

    if (!result.answers) {
      const feedback = (result as any).prompt_feedback;
      res.status(400).json({
        error: feedback
          ? `Gemini Decisions API returned no answers (${JSON.stringify(feedback)}).`
          : 'Gemini Decisions API returned no answers for traffic snapshot.',
        code: 'NO_ANSWERS',
      });
      return;
    }

    const decisions = vehicles.map((v, i) => {
      const slot = `v${i}`;
      const maneuverAns = result.answers?.[`${slot}_maneuver`];
      const speedAns = result.answers?.[`${slot}_speed`];
      const turnAns = result.answers?.[`${slot}_turn`];
      const hornAns = result.answers?.[`${slot}_horn`];

      const maneuver = maneuverAns?.type === 'choice' ? maneuverAns.choice : 'cruise';
      const maneuverConfidence = maneuverAns?.type === 'choice' ? maneuverAns.confidence : 0;

      const speedScore = speedAns?.type === 'score' ? speedAns.score : 2;
      const speedRatio = Math.max(0, Math.min(1, speedScore / (SPEED_RUBRIC.length - 1)));
      const speedConfidence = speedAns?.type === 'score' ? speedAns.confidence : 0;

      const turnChoice = turnAns?.type === 'choice' ? turnAns.choice : null;
      const turnConfidence = turnAns?.type === 'choice' ? turnAns.confidence : 0;

      const honkProb = hornAns?.type === 'noul' ? hornAns.noul : 0;
      const shouldHonk = hornAns?.type === 'noul' ? hornAns.noul >= 0.62 : false;

      return {
        vehId: v.vehId,
        maneuver,
        maneuverConfidence,
        speedScore,
        speedRatio,
        speedConfidence,
        turnChoice,
        turnConfidence,
        shouldHonk,
        honkProb,
      };
    });

    res.json({
      model: DECISION_MODEL,
      latencyMs,
      questionCount,
      vehicleCount: vehicles.length,
      decisions,
    });
  } catch (err) {
    const { status, message } = extractApiError(err);
    console.error('[Gemini Decisions Traffic API Error]', status, message);
    res.status(status).json({
      error: message,
      status,
    });
  }
});

const isProd =
  process.env.NODE_ENV === 'production' ||
  (process.env.NODE_ENV !== 'development' && fs.existsSync(path.join(distDir, 'index.html')));

if (isProd) {
  app.use(
    express.static(distDir, {
      etag: true,
      lastModified: true,
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith(`${path.sep}map.json`)) {
          res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
        }
      },
    })
  );

  app.use((req: Request, res: Response, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`);
});
