// Manual offer/answer WebRTC connection (copy/paste SDP) for static-site multiplayer.

import { safeJsonParse } from '../utils/jsonHelpers.js';

const PROTOCOL_VERSION = 1;

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForIceGatheringComplete(pc, timeoutMs = 8000) {
    if (pc.iceGatheringState === 'complete') return;

    let done = false;
    const onState = () => {
        if (pc.iceGatheringState === 'complete') {
            done = true;
            pc.removeEventListener('icegatheringstatechange', onState);
        }
    };

    pc.addEventListener('icegatheringstatechange', onState);

    const start = Date.now();
    while (!done && Date.now() - start < timeoutMs) {
        if (pc.iceGatheringState === 'complete') {
            onState();
            break;
        }
        await delay(50);
    }

    pc.removeEventListener('icegatheringstatechange', onState);
}

export function getOptionalPublicStunIceServers() {
    // Optional, OFF by default. Not a gameplay server; used for NAT traversal.
    return [{ urls: ['stun:stun.l.google.com:19302'] }];
}

export class WebRTCManualConnection {
    constructor({ role, iceServers = [] } = {}) {
        if (role !== 'host' && role !== 'client') throw new Error('role must be host or client');
        this.role = role;

        this.pc = new RTCPeerConnection({ iceServers });
        this.channel = null;

        this.onStatus = null;
        this.onMessage = null;

        this.status = 'idle';
        this.lastError = null;

        this.pc.addEventListener('connectionstatechange', () => {
            this.setStatus(`pc:${this.pc.connectionState}`);
        });
        this.pc.addEventListener('iceconnectionstatechange', () => {
            this.setStatus(`ice:${this.pc.iceConnectionState}`);
        });

        if (this.role === 'host') {
            this.channel = this.pc.createDataChannel('game', { ordered: true });
            this.wireChannel(this.channel);
        } else {
            this.pc.addEventListener('datachannel', (e) => {
                if (this.channel) return;
                this.channel = e.channel;
                this.wireChannel(this.channel);
            });
        }
    }

    setStatus(status) {
        this.status = status;
        if (typeof this.onStatus === 'function') this.onStatus(status);
    }

    wireChannel(channel) {
        channel.addEventListener('open', () => this.setStatus('connected'));
        channel.addEventListener('close', () => this.setStatus('disconnected'));
        channel.addEventListener('error', (e) => {
            this.lastError = e;
            this.setStatus('error');
        });
        channel.addEventListener('message', (e) => {
            if (typeof this.onMessage !== 'function') return;
            const parsed = safeJsonParse(e.data);
            if (!parsed) return;
            this.onMessage(parsed);
        });
    }

    isConnected() {
        return !!this.channel && this.channel.readyState === 'open';
    }

    send(message) {
        if (!this.isConnected()) return false;
        this.channel.send(JSON.stringify({ v: PROTOCOL_VERSION, ...message }));
        return true;
    }

    close() {
        // Prevent re-entry or late callbacks
        this.onStatus = null;
        this.onMessage = null;

        try {
            if (this.channel) {
                this.channel.onopen = null;
                this.channel.onclose = null;
                this.channel.onerror = null;
                this.channel.onmessage = null;
                this.channel.close();
            }
        } catch { /* ignore */ }

        try {
            if (this.pc) {
                this.pc.onconnectionstatechange = null;
                this.pc.oniceconnectionstatechange = null;
                this.pc.close();
            }
        } catch { /* ignore */ }

        this.channel = null;
        // We don't null this.pc immediately to allow checking state? 
        // Actually safe to just leave it closed.

        this.status = 'closed';
    }

    async createOfferCode() {
        if (this.role !== 'host') throw new Error('createOfferCode only valid for host');

        this.setStatus('creating-offer');
        const offer = await this.pc.createOffer();
        await this.pc.setLocalDescription(offer);
        await waitForIceGatheringComplete(this.pc);

        const local = this.pc.localDescription;
        if (!local) throw new Error('localDescription missing');
        return JSON.stringify({ type: local.type, sdp: local.sdp });
    }

    async acceptAnswerCode(answerCode) {
        if (this.role !== 'host') throw new Error('acceptAnswerCode only valid for host');

        this.setStatus('setting-answer');
        const parsed = safeJsonParse(answerCode);
        if (!parsed) throw new Error('Invalid answer code (must be JSON)');
        const { type, sdp } = parsed || {};
        if (type !== 'answer' || typeof sdp !== 'string') throw new Error('Invalid answer payload');

        await this.pc.setRemoteDescription({ type, sdp });
        this.setStatus('connecting');
    }

    async acceptOfferCodeAndCreateAnswer(offerCode) {
        if (this.role !== 'client') throw new Error('acceptOfferCodeAndCreateAnswer only valid for client');

        this.setStatus('setting-offer');
        const parsed = safeJsonParse(offerCode);
        if (!parsed) throw new Error('Invalid offer code (must be JSON)');
        const { type, sdp } = parsed || {};
        if (type !== 'offer' || typeof sdp !== 'string') throw new Error('Invalid offer payload');

        await this.pc.setRemoteDescription({ type, sdp });

        this.setStatus('creating-answer');
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        await waitForIceGatheringComplete(this.pc);

        const local = this.pc.localDescription;
        if (!local) throw new Error('localDescription missing');
        this.setStatus('awaiting-host');
        return JSON.stringify({ type: local.type, sdp: local.sdp });
    }
}
