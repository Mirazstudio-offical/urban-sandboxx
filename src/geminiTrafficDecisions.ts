export type GeminiTrafficManeuver =
  | 'accelerate'
  | 'cruise'
  | 'slow_down'
  | 'hard_brake'
  | 'stop_hold'
  | 'yield_shoulder'
  | 'lane_left'
  | 'lane_right'
  | 'reverse_recover';

export interface GeminiVehiclePerception {
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

export interface GeminiVehicleDecision {
  vehId: string;
  maneuver: GeminiTrafficManeuver;
  maneuverConfidence: number;
  speedScore: number;
  speedRatio: number;
  speedConfidence: number;
  turnChoice: 'straight' | 'left' | 'right' | 'turnaround' | null;
  turnConfidence: number;
  shouldHonk: boolean;
  honkProb: number;
  receivedAt: number;
}

export interface GeminiTrafficStatusSnapshot {
  enabled: boolean;
  intervalMs: number;
  inFlight: boolean;
  model: string;
  lastLatencyMs: number | null;
  lastVehicleCount: number;
  lastQuestionCount: number;
  totalBatches: number;
  lastError: string | null;
  lastErrorStatus: number | null;
  consecutiveErrors: number;
  lastSuccessAt: number | null;
}

type StatusListener = (status: GeminiTrafficStatusSnapshot) => void;

const VALID_MANEUVERS = new Set<GeminiTrafficManeuver>([
  'accelerate',
  'cruise',
  'slow_down',
  'hard_brake',
  'stop_hold',
  'yield_shoulder',
  'lane_left',
  'lane_right',
  'reverse_recover',
]);

class GeminiTrafficDecisionsController {
  private enabled = false;
  private intervalMs = 500;
  private inFlight = false;
  private lastDispatchAt = 0;
  private lastCompletedAt = 0;
  private nextAllowedAt = 0;
  private lastLatencyMs: number | null = null;
  private lastVehicleCount = 0;
  private lastQuestionCount = 0;
  private totalBatches = 0;
  private lastError: string | null = null;
  private lastErrorStatus: number | null = null;
  private consecutiveErrors = 0;
  private lastSuccessAt: number | null = null;
  private lastNotifiedErrorKey = '';

  private decisions = new Map<string, GeminiVehicleDecision>();
  private listeners = new Set<StatusListener>();
  private activeAbort: AbortController | null = null;

  public configure(opts: { enabled: boolean; intervalMs?: number }) {
    const nextInterval = Math.max(250, Math.min(4000, Math.round(opts.intervalMs ?? this.intervalMs)));
    const changed = opts.enabled !== this.enabled || nextInterval !== this.intervalMs;
    const wasEnabled = this.enabled;
    this.enabled = opts.enabled;
    this.intervalMs = nextInterval;

    if (!this.enabled && wasEnabled) {
      this.activeAbort?.abort();
      this.activeAbort = null;
      this.inFlight = false;
      this.decisions.clear();
      this.lastError = null;
      this.lastErrorStatus = null;
      this.consecutiveErrors = 0;
      this.nextAllowedAt = 0;
      this.lastNotifiedErrorKey = '';
    } else if (this.enabled && !wasEnabled) {
      this.lastError = null;
      this.lastErrorStatus = null;
      this.consecutiveErrors = 0;
      this.nextAllowedAt = 0;
      this.lastDispatchAt = 0;
      this.lastCompletedAt = 0;
      this.lastNotifiedErrorKey = '';
    }

    if (changed) {
      this.emit();
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public getIntervalMs(): number {
    return this.intervalMs;
  }

  public hasError(): boolean {
    return this.lastError !== null;
  }

  public getDecision(vehicleId: string): GeminiVehicleDecision | undefined {
    return this.decisions.get(vehicleId);
  }

  public pruneVehicles(activeVehicleIds: Set<string>) {
    for (const id of this.decisions.keys()) {
      if (!activeVehicleIds.has(id)) {
        this.decisions.delete(id);
      }
    }
  }

  public retryNow() {
    this.lastError = null;
    this.lastErrorStatus = null;
    this.consecutiveErrors = 0;
    this.nextAllowedAt = 0;
    this.lastDispatchAt = 0;
    this.lastCompletedAt = 0;
    this.lastNotifiedErrorKey = '';
    this.emit();
  }

  public consumeNewErrorNotification(): string | null {
    if (!this.lastError) return null;
    const key = `${this.lastErrorStatus ?? 0}:${this.lastError}`;
    if (key === this.lastNotifiedErrorKey) return null;
    this.lastNotifiedErrorKey = key;
    return this.lastError;
  }

  public getStatus(): GeminiTrafficStatusSnapshot {
    return {
      enabled: this.enabled,
      intervalMs: this.intervalMs,
      inFlight: this.inFlight,
      model: 'gemini-decision-1',
      lastLatencyMs: this.lastLatencyMs,
      lastVehicleCount: this.lastVehicleCount,
      lastQuestionCount: this.lastQuestionCount,
      totalBatches: this.totalBatches,
      lastError: this.lastError,
      lastErrorStatus: this.lastErrorStatus,
      consecutiveErrors: this.consecutiveErrors,
      lastSuccessAt: this.lastSuccessAt,
    };
  }

  public subscribe(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    const snap = this.getStatus();
    for (const fn of this.listeners) {
      try {
        fn(snap);
      } catch {
        // ignore listener error
      }
    }
  }

  public maybeDispatchBatch(
    perceptions: GeminiVehiclePerception[],
    onLog?: (type: 'info' | 'deadlock', msg: string) => void,
    urgentDispatch: boolean = false
  ) {
    if (!this.enabled || perceptions.length === 0) return;
    if (this.inFlight) return;

    const now = performance.now();
    if (now < this.nextAllowedAt) return;

    // Schedule next batch relative to completion so roundtrip latency doesn't double-delay,
    // and dispatch promptly (min 150ms gap) when new vehicles spawn or hazards arise.
    const minWait = urgentDispatch ? 150 : this.intervalMs;
    const refTime = this.lastCompletedAt > 0 ? this.lastCompletedAt : this.lastDispatchAt;
    if (refTime > 0 && now - refTime < minWait) return;

    this.lastDispatchAt = now;
    this.inFlight = true;
    this.emit();

    const controller = new AbortController();
    this.activeAbort = controller;

    fetch('/api/traffic/decisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vehicles: perceptions }),
      signal: controller.signal,
    })
      .then(async (res) => {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          data = null;
        }
        if (!res.ok) {
          const msg =
            data && typeof data.error === 'string' && data.error.trim()
              ? data.error.trim()
              : `Gemini Decisions API HTTP ${res.status}`;
          const err = new Error(msg) as Error & { status?: number };
          err.status = res.status;
          throw err;
        }
        return data;
      })
      .then((data) => {
        if (!this.enabled) return;
        const receivedAt = performance.now();
        const list = Array.isArray(data?.decisions) ? data.decisions : [];

        for (let i = 0; i < list.length; i++) {
          const d = list[i];
          if (!d || typeof d.vehId !== 'string') continue;
          const maneuver: GeminiTrafficManeuver = VALID_MANEUVERS.has(d.maneuver)
            ? d.maneuver
            : 'cruise';
          const turnChoice =
            d.turnChoice === 'straight' ||
            d.turnChoice === 'left' ||
            d.turnChoice === 'right' ||
            d.turnChoice === 'turnaround'
              ? d.turnChoice
              : null;

          this.decisions.set(d.vehId, {
            vehId: d.vehId,
            maneuver,
            maneuverConfidence: Number.isFinite(d.maneuverConfidence) ? Number(d.maneuverConfidence) : 0,
            speedScore: Number.isFinite(d.speedScore) ? Number(d.speedScore) : 2,
            speedRatio: Number.isFinite(d.speedRatio) ? Math.max(0, Math.min(1, Number(d.speedRatio))) : 0.5,
            speedConfidence: Number.isFinite(d.speedConfidence) ? Number(d.speedConfidence) : 0,
            turnChoice,
            turnConfidence: Number.isFinite(d.turnConfidence) ? Number(d.turnConfidence) : 0,
            shouldHonk: Boolean(d.shouldHonk),
            honkProb: Number.isFinite(d.honkProb) ? Number(d.honkProb) : 0,
            receivedAt,
          });
        }

        this.lastLatencyMs = Number.isFinite(data?.latencyMs) ? Number(data.latencyMs) : null;
        this.lastVehicleCount = list.length;
        this.lastQuestionCount = Number.isFinite(data?.questionCount) ? Number(data.questionCount) : 0;
        this.totalBatches++;
        this.lastError = null;
        this.lastErrorStatus = null;
        this.consecutiveErrors = 0;
        this.nextAllowedAt = 0;
        this.lastSuccessAt = Date.now();
        this.lastCompletedAt = receivedAt;
        this.lastNotifiedErrorKey = '';

        if (onLog) {
          onLog(
            'info',
            `Gemini Batch (${data?.model || 'gemini-decision-1'}): ${list.length} авто, ${this.lastQuestionCount} вопр., ${this.lastLatencyMs ?? '?'} мс`
          );
        }
      })
      .catch((err: any) => {
        if (err?.name === 'AbortError' || !this.enabled) return;
        this.consecutiveErrors++;
        const status = typeof err?.status === 'number' ? err.status : null;
        const msg = typeof err?.message === 'string' && err.message ? err.message : 'Ошибка соединения с Gemini Decisions API';
        this.lastError = msg;
        this.lastErrorStatus = status;

        // Exponential backoff so errors do not flood the API
        const backoffMs = Math.min(30000, 2000 * Math.pow(2, Math.min(4, this.consecutiveErrors - 1)));
        this.nextAllowedAt = performance.now() + backoffMs;

        if (onLog) {
          onLog('deadlock', `Gemini Decisions API error (${status ?? 'net'}): ${msg}`);
        }
      })
      .finally(() => {
        if (this.activeAbort === controller) {
          this.activeAbort = null;
        }
        this.inFlight = false;
        this.emit();
      });
  }
}

export const geminiTrafficController = new GeminiTrafficDecisionsController();
