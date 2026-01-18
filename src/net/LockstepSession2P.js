// 2-player deterministic lockstep session over an arbitrary message transport.

// Input frames are quantized to ints so both peers consume identical values.

const INPUT_PROTOCOL = 1;

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

function quantizeSignedUnit(value, scale) {
    // value expected in [-1, 1]
    const v = clamp(value, -1, 1);
    return Math.round(v * scale);
}

function dequantizeSignedUnit(value, scale) {
    return clamp(value / scale, -1, 1);
}

function quantizeAngleRad(angleRad) {
    // Keep to [-pi, pi] for stability.
    let a = angleRad;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return Math.round(a * 10000);
}

function dequantizeAngleRad(q) {
    return q / 10000;
}

export function encodeLocalInputFrame({ moveX, moveY, fire, aimAngle, ability, heal }) {
    return {
        p: INPUT_PROTOCOL,
        mx: quantizeSignedUnit(moveX, 127),
        my: quantizeSignedUnit(moveY, 127),
        f: fire ? 1 : 0,
        a: quantizeAngleRad(aimAngle || 0),
        ab: ability ? 1 : 0,
        h: heal ? 1 : 0
    };
}

export function decodeInputFrame(frame) {
    return {
        moveX: dequantizeSignedUnit(frame.mx || 0, 127),
        moveY: dequantizeSignedUnit(frame.my || 0, 127),
        fire: !!frame.f,
        aimAngle: dequantizeAngleRad(frame.a || 0),
        ability: !!frame.ab,
        heal: !!frame.h
    };
}

export class LockstepSession2P {
    constructor({ transport, localPlayerIndex, inputDelayTicks = 2 } = {}) {
        if (!transport) throw new Error('transport required');
        if (localPlayerIndex !== 0 && localPlayerIndex !== 1) throw new Error('localPlayerIndex must be 0 or 1');

        this.transport = transport;
        this.localPlayerIndex = localPlayerIndex;
        this.remotePlayerIndex = localPlayerIndex === 0 ? 1 : 0;

        this.inputDelayTicks = inputDelayTicks;

        this.started = false;
        this.nextTickToSimulate = 0;

        // tick -> [frameForP0, frameForP1]
        this.inputByTick = new Map();
        // track which ticks we already sent to avoid spamming duplicates
        this.sentTicks = new Set();

        this.transport.onMessage = (msg) => this.onNetMessage(msg);

        this.neutralFrame = encodeLocalInputFrame({
            moveX: 0,
            moveY: 0,
            fire: false,
            aimAngle: 0,
            ability: false,
            heal: false
        });
    }

    reset() {
        this.started = false;
        this.nextTickToSimulate = 0;
        this.inputByTick.clear();
        this.sentTicks.clear();
    }

    start() {
        this.started = true;
        // We intentionally treat the first `inputDelayTicks` ticks as neutral input for
        // both players (pipeline delay). This avoids a deadlock on tick 0.
        this.sentTicks.clear();
    }

    onNetMessage(msg) {
        if (!msg || msg.v !== 1) return;
        if (msg.type !== 'input') return;

        const tick = msg.tick;
        if (!Number.isInteger(tick) || tick < 0) return;
        const frame = msg.frame;
        // console.log(`[Lockstep] Received tick ${tick} from remote`);
        if (!frame || frame.p !== INPUT_PROTOCOL) return;

        const bucket = this.inputByTick.get(tick) || [null, null];
        bucket[this.remotePlayerIndex] = frame;
        this.inputByTick.set(tick, bucket);
    }

    recordLocalInputForTick(tick, frame) {
        const bucket = this.inputByTick.get(tick) || [null, null];
        bucket[this.localPlayerIndex] = frame;
        this.inputByTick.set(tick, bucket);
    }

    sendLocalInputForTick(tick, frame) {
        if (this.sentTicks.has(tick)) return;
        this.sentTicks.add(tick);
        // console.log(`[Lockstep] Sending tick ${tick}`, frame);
        this.transport.send({ type: 'input', tick, frame });
    }

    // Call once per fixed timestep.
    // getLocalInput() should return raw input values (floats/bools).
    tick(getLocalInput) {
        if (!this.started) return;

        // Ensure we always send input far enough ahead.
        const targetTick = this.nextTickToSimulate + this.inputDelayTicks;

        // Send the target tick and a couple ahead as extra jitter buffer.
        const sendAhead = 2;
        for (let i = 0; i <= sendAhead; i++) {
            const t = targetTick + i;
            if (this.sentTicks.has(t)) continue;

            const raw = getLocalInput();
            const frame = encodeLocalInputFrame(raw);
            this.recordLocalInputForTick(t, frame);
            this.sendLocalInputForTick(t, frame);
        }
    }

    canSimulateNextTick() {
        if (!this.started) return false;

        if (this.nextTickToSimulate < this.inputDelayTicks) {
            // console.log(`[Lockstep] Simulating neutral tick ${this.nextTickToSimulate}`);
            return true;
        }

        const bucket = this.inputByTick.get(this.nextTickToSimulate);
        const canSim = !!bucket && !!bucket[0] && !!bucket[1];
        if (!canSim && Math.random() < 0.01) {
            console.log(`[Lockstep] Stalled at ${this.nextTickToSimulate}. Bucket:`, bucket);
        }
        return canSim;
    }

    popNextTickInputs() {
        const tick = this.nextTickToSimulate;

        if (tick < this.inputDelayTicks) {
            this.nextTickToSimulate++;
            return {
                tick,
                frames: [decodeInputFrame(this.neutralFrame), decodeInputFrame(this.neutralFrame)]
            };
        }

        const bucket = this.inputByTick.get(tick);
        if (!bucket || !bucket[0] || !bucket[1]) return null;

        this.inputByTick.delete(tick);
        this.nextTickToSimulate++;

        return {
            tick,
            frames: [decodeInputFrame(bucket[0]), decodeInputFrame(bucket[1])]
        };
    }
}
