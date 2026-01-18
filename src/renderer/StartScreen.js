/**
 * StartScreen.js - Main Menu and Navigation System
 *
 * Implements the canvas-based menu system with navigation between Home,
 * Solo, Multiplayer, and Upgrades screens. Handles character/map selection,
 * profile display, and game mode initiation.
 *
 * Key Responsibilities:
 * - Render menu states (Home, Solo, Multiplayer, Upgrades)
 * - Handle character and map selection
 * - Display player profile (level, XP, coins)
 * - Show upgrade shop with purchasable items
 * - Create multiplayer lobby with WebRTC connection
 * - Preload map background images for selection cards
 *
 * Architecture Notes:
 * - State machine with menuState controlling screen transitions
 * - Canvas-based UI to stay consistent with game rendering
 * - EventBus for loose coupling with game systems
 * - Caches background images to prevent load hitching
 *
 * @module renderer/StartScreen
 */

import { CHARACTERS } from '../config/characters.js';
import { resolveMapsUrl, resolveMapBackgroundUrl, warnMissingAsset } from '../utils/assetUrl.js';
import { META_CONFIG } from '../config/metaProgression.js';
import { loadProfile, saveProfile, getXpProgress, purchaseUpgrade, checkRequirements, getUpgradeLevel } from '../core/ProfileStore.js';
import { WebRTCManualConnection, getOptionalPublicStunIceServers } from '../net/WebRTCManualConnection.js';
import { randomSeedUint32 } from '../net/prng.js';
// Import QR Code generator (vendored)
import qrcode from '../vendor/qrcode.js'; 


export class StartScreen {
    constructor(canvas, ctx, assetLoader = null) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.assetLoader = assetLoader;

        // Menu navigation state
        // home: mode selection
        // solo: character + map selection + battle
        // multiplayer: placeholder (coming soon)
        // upgrades: spend coins on upgrades
        // profileStats: view lifetime stats
        this.menuState = 'home';

        // Solo selection flow
        // character: choose character
        // map: choose map (Select starts match)
        this.soloStep = 'character';

        this.selectedCharacter = 'bolt'; // Default selection
        this.selectedCharacterIndex = 0;
        this.selectedMap = null;
        
        // Maps will be loaded dynamically
        this.availableMaps = [];
        this.selectedMapIndex = 0;
        this.mapsLoaded = false;
        
        // Load maps from manifest
        this.loadMapsFromManifest();
        
        // Calculate scaled dimensions based on canvas size
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        
        // Character cards positioning (responsive to canvas size)
        this.cardWidth = Math.min(280, this.canvas.width * 0.38);
        this.cardHeight = Math.min(380, this.canvas.height * 0.45);
        this.cardSpacing = 40;
        this.scrollOffset = 0;
        
        // Map cards positioning
        this.mapCardWidth = 260;
        this.mapCardHeight = 220;
        this.mapCardSpacing = 20;
        this.mapScrollOffset = 0;
        
        // Touch handling
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartScrollOffset = 0;
        this.lastTouchX = 0;
        this.velocity = 0;
        this.isDraggingMaps = false;
        
        // Start button (positioned near bottom)
        this.startButton = {
            x: this.canvas.width / 2,
            y: this.canvas.height - 60 * scale,
            width: 200 * scale,
            height: 50 * scale,
            text: 'BATTLE!'
        };

        // Solo nav buttons (Prev / Select / Next)
        const navY = this.canvas.height - 78 * scale;
        this.soloNavButtons = {
            prev: { x: this.canvas.width * 0.25, y: navY, width: 140 * scale, height: 46 * scale, text: '< PREV' },
            select: { x: this.canvas.width * 0.5, y: navY, width: 160 * scale, height: 46 * scale, text: 'SELECT' },
            next: { x: this.canvas.width * 0.75, y: navY, width: 140 * scale, height: 46 * scale, text: 'NEXT >' }
        };

        // Home/menu buttons
        this.homeButtons = {
            solo: { x: this.canvas.width / 2, y: this.canvas.height * 0.46, width: 260 * scale, height: 54 * scale, text: 'SOLO' },
            multiplayer: { x: this.canvas.width / 2, y: this.canvas.height * 0.46 + 74 * scale, width: 260 * scale, height: 54 * scale, text: 'MULTIPLAYER' },
            upgrades: { x: this.canvas.width / 2, y: this.canvas.height * 0.46 + 148 * scale, width: 260 * scale, height: 54 * scale, text: 'UPGRADES' },
            settings: { x: this.canvas.width / 2, y: this.canvas.height * 0.46 + 222 * scale, width: 260 * scale, height: 54 * scale, text: 'SETTINGS' },
            editor: { x: this.canvas.width / 2, y: this.canvas.height * 0.46 + 296 * scale, width: 260 * scale, height: 54 * scale, text: 'MAP EDITOR' }
        };

        // Back button (used on Solo + Multiplayer)
        this.backButton = {
            x: 70 * scale,
            y: 50 * scale,
            width: 120 * scale,
            height: 38 * scale,
            text: 'BACK'
        };
        
        // Layout positions
        this.titleY = 60 * scale;
        this.cardsY = this.canvas.height * 0.35;
        this.mapSectionY = this.canvas.height * 0.6;
        this.instructionY = this.canvas.height - 25 * scale;

        // Render-time computed (logo bounds)
        this.logoBottomY = this.titleY;
        
        // Start requested flag
        this.startRequested = false;

        // Multiplayer start requested flag
        this.multiplayerStartRequested = false;
        this.multiplayerStartSession = null;

        // Multiplayer lobby state (DOM overlay driven for copy/paste)
        this.mp = {
            role: null, // 'host' | 'client'
            connection: null,
            useStun: false,
            statusText: 'Disconnected',
            offerCode: '',
            answerCode: '',
            remoteReady: false,
            localReady: false,
            countdown: { active: false, secondsLeft: 0, endsAtMs: 0 },
            seed: null,
            mapFile: 'facey.json',
            joinLink: '' // New: Link to share
        };

        this.mpDom = null;

        // Meta profile (shared via localStorage)
        this.profile = loadProfile();

        // Settings State
        this.showSettings = false;
        import('../core/SettingsManager.js').then(m => {
            this.settingsManager = m.settingsManager;
        });

        // Render-time computed hit targets (Upgrades screen)
        this.upgradesBuyButtons = [];

        // Render-time computed hit targets (Home)
        this.profileHudRect = null;

        // Per-map gameConfig overrides set from the menu settings
        this.mapGameConfigOverrides = new Map();

        // Hit rect for map settings row (computed during render)
        this.mapSettingsHitRect = null;

        // Map preview image cache (path -> { img, status })
        this.mapPreviewImages = new Map();
        
        // Setup event listeners
        this.setupEventListeners();

        // Build/version label (CI-stamped on deploy). Loaded at runtime to avoid stale module caching.
        this.buildVersionText = 'vdev';
        this.loadBuildVersion();

        // DOM modal (minimal) for map settings
        this.ensureMapSettingsModal();

        // Check for join link in URL hash
        this.checkJoinLink();
    }

    checkJoinLink() {
        if (window.location.hash.startsWith('#join=')) {
            try {
                // Parse the hash
                const base64Offer = window.location.hash.substring('#join='.length);
                const offerCode = atob(base64Offer);
                const parsed = JSON.parse(offerCode);

                if (parsed && parsed.type === 'offer' && parsed.sdp) {
                    console.log('Auto-joining via link...');
                    this.menuState = 'multiplayer';

                    // Pre-seed the lobby
                    this.mp.offerCode = offerCode;
                    this.mp.role = 'client';

                    // Trigger join flow after a brief delay to ensure DOM exists
                    setTimeout(() => {
                        this.showMultiplayerLobbyDom();
                        const btnJoin = this.mpDom.root.querySelector('[data-mp="join"]');
                        if (btnJoin) btnJoin.click();
                    }, 100);
                }
            } catch (e) {
                console.error('Failed to parse (join link:', e);
                window.location.hash = ''; // Clear bad hash
            }
        }
    }

    ensureMultiplayerLobbyDom() {
        if (this.mpDom) return;
        const root = document.createElement('div');
        root.className = 'mp-lobby';
        document.body.appendChild(root);

        // Map options (simple for now)
        const mapOptions = this.availableMaps.length > 0 ? this.availableMaps : [{ name: 'Default', file: 'facey.json' }];

        // Character options
        const charOptions = [
            { id: 'bolt', name: 'Bolt' },
            { id: 'boulder', name: 'Boulder' }
        ];

        // Wizard UI Structure
        root.innerHTML = `
            <div class="mp-panel mp-wizard-panel">
                <div class="mp-header">
                    <div class="mp-title">Multiplayer Lobby</div>
                    <button class="mp-close-btn" data-mp="close">×</button>
                </div>

                <!-- STATUS BAR -->
                <div class="mp-status-bar">
                    <span data-mp="statusText">Disconnected</span>
                    <span class="mp-players" data-mp="playerCount">Players: 1/2</span>
                </div>

                <!-- STEP 0: LANDING -->
                <div class="mp-step" data-step="landing">
                    <p class="mp-desc">Play peer-to-peer with a friend nearby.</p>
                    <div class="mp-actions-vertical">
                        <button class="mp-btn mp-primary mp-large" data-mp="btnHost">Host Game</button>
                        <button class="mp-btn mp-large" data-mp="btnJoin">Join Game</button>
                    </div>
                </div>

                <!-- STEP 1-HOST: WAITING -->
                <div class="mp-step hidden" data-step="host_waiting">
                    <div class="mp-section">
                        <div class="mp-step-num">1</div>
                        <div class="mp-step-content">
                            <p>Share this with your friend:</p>
                            <div class="mp-qr-wrapper" data-mp="hostQr"></div>
                            <div class="mp-row-tight">
                                <button class="mp-btn" data-mp="btnCopyLink">Copy Link</button>
                                <button class="mp-btn" data-mp="btnCopyOffer">Copy Code</button>
                            </div>
                        </div>
                    </div>

                    <div class="mp-divider"></div>

                    <div class="mp-section">
                        <div class="mp-step-num">2</div>
                        <div class="mp-step-content">
                            <p>Paste their Reply Code here:</p>
                            <textarea class="mp-input-area" data-mp="hostAnswerInput" rows="2" placeholder="Paste Reply Code..."></textarea>
                            <button class="mp-btn mp-primary" data-mp="btnHostConnect" disabled>Connect to Friend</button>
                        </div>
                    </div>
                </div>

                <!-- STEP 1-JOIN: ENTRY -->
                <div class="mp-step hidden" data-step="join_entry">
                    <div class="mp-section">
                         <div class="mp-step-content">
                            <p>Paste the Host's Invite Link or Code:</p>
                            <textarea class="mp-input-area" data-mp="joinOfferInput" rows="3" placeholder="Paste Link or Code..."></textarea>
                            <button class="mp-btn mp-primary" data-mp="btnJoinGenerate">Generate Reply</button>
                        </div>
                    </div>
                </div>

                <!-- STEP 2-JOIN: RESPONSE -->
                <div class="mp-step hidden" data-step="join_response">
                    <div class="mp-section">
                        <div class="mp-step-content">
                            <p><strong>Reply Generated!</strong><br>Send this back to the Host:</p>
                            <textarea class="mp-input-area" data-mp="joinAnswerDisplay" rows="3" readonly></textarea>
                            <button class="mp-btn mp-primary" data-mp="btnJoinCopyAnswer">Copy Reply Code</button>
                        </div>
                    </div>
                    <div class="mp-status-msg">Waiting for Host to connect...</div>
                </div>

                <!-- STEP 3: SETUP (Map & Character) -->
                <div class="mp-step hidden" data-step="setup">
                    <div class="mp-lobby-status">
                        <div class="mp-connection-dot connected"></div>
                        <span>Setup Match</span>
                    </div>

                    <div class="mp-section-title">Select Map <span data-mp="hostOnlyTag" style="font-size:10px; opacity:0.6; margin-left:5px;">(Host Only)</span></div>
                    <div class="mp-scroll-x" data-mp="mapSelectContainer">
                        ${mapOptions.map((m, i) => `
                            <div class="mp-option-card ${i === 0 ? 'selected' : ''}" data-mp-map="${i}">
                                <div class="mp-card-name">${m.name}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="mp-section-title" style="margin-top:15px;">Select Character</div>
                    <div class="mp-scroll-x" data-mp="charSelectContainer">
                        ${charOptions.map((c, i) => `
                            <div class="mp-option-card ${i === 0 ? 'selected' : ''}" data-mp-char="${c.id}">
                                <div class="mp-card-name">${c.name}</div>
                            </div>
                        `).join('')}
                    </div>

                    <div class="mp-actions-center" style="margin-top: 20px;">
                         <button class="mp-btn mp-ready-btn" data-mp="btnToggleReady">Ready to Battle</button>
                    </div>
                    <div class="mp-countdown" data-mp="countdown"></div>
                </div>

                <!-- STEP: CONNECTED / LOBBY (OLD) -->
                <!-- This step is now replaced by 'setup' -->
                <div class="mp-step hidden" data-step="lobby">
                    <div class="mp-lobby-status">
                        <div class="mp-connection-dot connected"></div>
                        <span>Combined & Ready!</span>
                    </div>

                    <div class="mp-map-select hidden">
                        Map: <span data-mp="mapName">Facey</span>
                    </div>

                    <div class="mp-actions-center">
                         <button class="mp-btn mp-ready-btn" data-mp="btnToggleReady">Ready to Battle</button>
                    </div>
                    <div class="mp-countdown" data-mp="countdown"></div>
                </div>

            </div>
        `;

        // Selectors
        const q = (s) => root.querySelector(s);
        const els = {
            panels: root.querySelectorAll('.mp-step'),
            statusText: q('[data-mp="statusText"]'),
            playerCount: q('[data-mp="playerCount"]'),
            hostQr: q('[data-mp="hostQr"]'),
            hostAnswerInput: q('[data-mp="hostAnswerInput"]'),
            joinOfferInput: q('[data-mp="joinOfferInput"]'),
            joinAnswerDisplay: q('[data-mp="joinAnswerDisplay"]'),
            countdown: q('[data-mp="countdown"]'),
            mapContainer: q('[data-mp="mapSelectContainer"]'),
            charContainer: q('[data-mp="charSelectContainer"]'),
            hostOnlyTag: q('[data-mp="hostOnlyTag"]'),
            btns: {
                host: q('[data-mp="btnHost"]'),
                join: q('[data-mp="btnJoin"]'),
                copyLink: q('[data-mp="btnCopyLink"]'),
                copyOffer: q('[data-mp="btnCopyOffer"]'),
                hostConnect: q('[data-mp="btnHostConnect"]'),
                joinGenerate: q('[data-mp="btnJoinGenerate"]'),
                joinCopyAnswer: q('[data-mp="btnJoinCopyAnswer"]'),
                toggleReady: q('[data-mp="btnToggleReady"]'),
                close: q('[data-mp="close"]')
            }
        };

        // State Helpers
        const setStep = (stepName) => {
            els.panels.forEach(p => {
                if (p.dataset.step === stepName) p.classList.remove('hidden');
                else p.classList.add('hidden');
            });
        };

        const setStatus = (msg) => {
            if (this.mp.statusText !== msg) {
                this.mp.statusText = msg;
                els.statusText.textContent = msg;
            }
        };

        // Initial Selection State
        let selectedMapIndex = 0;
        let selectedCharId = 'bolt';
        // Initialize mp session data
        this.mp.mapFile = mapOptions[0].file;
        this.mp.characterType = 'bolt';

        // Clean up helper
        const shutdown = () => {
            if (this.mp.connection) {
                this.mp.connection.close();
                this.mp.connection = null;
            }
            this.mp.role = null;
            this.mp.offerCode = '';
            this.mp.answerCode = '';
            this.mp.statusText = 'Disconnected';
            this.mp.localReady = false;
            this.mp.remoteReady = false;

            // Re-render to landing
            this.hideMultiplayerLobbyDom();
        };

        // Core Functions
        const wireConnection = (conn) => {
            conn.onStatus = (s) => {
                if (s === 'connected') {
                    setStatus('Connected');
                    els.playerCount.textContent = 'Players: 2/2';
                    els.playerCount.style.color = '#4ade80'; // green
                    setStep('setup');

                    // Client: disable map selection visuals
                    if (this.mp.role === 'client') {
                        els.mapContainer.classList.add('disabled-container');
                        els.hostOnlyTag.style.opacity = '1';
                    } else {
                        els.mapContainer.classList.remove('disabled-container');
                        els.hostOnlyTag.style.display = 'none';
                        // Host sends initial map
                        send({ type: 'map_select', mapIndex: selectedMapIndex, mapFile: mapOptions[selectedMapIndex].file });
                    }
                } else {
                    setStatus(s); // e.g. 'connecting...'
                    if (s === 'closed' || s === 'disconnected') {
                        els.playerCount.textContent = 'Players: 1/2';
                        els.playerCount.style.color = '';
                    }
                }
            };

            conn.onMessage = (msg) => {
                if (!msg || msg.v !== 1) return;
                switch (msg.type) {
                    case 'ready':
                        this.mp.remoteReady = msg.ready;
                        render();
                        // If host, check for start
                        if (this.mp.role === 'host' && this.mp.localReady && this.mp.remoteReady) {
                            tryStartCountdownHost();
                        } else if (this.mp.role === 'host') { // cancel if someone unreadied
                            cancelCountdownHost();
                        }
                        break;
                    case 'map_select':
                        if (this.mp.role === 'client') {
                            const idx = msg.mapIndex;
                            if (typeof idx === 'number' && mapOptions[idx]) {
                                selectedMapIndex = idx;
                                this.mp.mapFile = msg.mapFile;
                                updateSelectionVisuals();
                            }
                        }
                        break;
                    case 'countdown_start':
                        if (this.mp.role === 'client') {
                            const seconds = Number(msg.seconds) || 3;
                            const endsAtMs = Number(msg.endsAtMs) || (Date.now() + seconds * 1000);
                            this.mp.countdown = { active: true, secondsLeft: seconds, endsAtMs };
                            requestAnimationFrame(runCountdown);
                        }
                        break;
                    case 'countdown_cancel':
                        this.mp.countdown = { active: false, secondsLeft: 0, endsAtMs: 0 };
                        render();
                        break;
                    case 'start':
                        // CLIENT START
                        if (this.mp.role === 'client') {
                            this.multiplayerStartRequested = true;
                            // Store session fully
                            this.multiplayerStartSession = {
                                role: 'client',
                                seed: msg.seed,
                                mapFile: msg.mapFile,
                                 characterType: selectedCharId, // My Selected Character
                                 connection: this.mp.connection,
                                 selectedMap: mapOptions.find(m => m.file === msg.mapFile)
                             };
                            // StartScreen checks this property in render()
                        }
                        break;
                }
            };
        };

        const send = (payload) => {
            if (this.mp.connection) this.mp.connection.send(payload);
        };

        const tryStartCountdownHost = () => {
            if (this.mp.countdown.active) return;
            const seconds = 3;
            const endsAtMs = Date.now() + (seconds * 1000);
            this.mp.countdown = { active: true, secondsLeft: seconds, endsAtMs };

            // Send to client
            send({
                type: 'countdown_start',
                seconds,
                endsAtMs
            });
            requestAnimationFrame(runCountdown);
        };

        const cancelCountdownHost = () => {
            this.mp.countdown = { active: false, secondsLeft: 0, endsAtMs: 0 };
            send({ type: 'countdown_cancel' });
            render();
        };

        const finalizeStartHost = () => {
            // HOST START
            const mapFile = this.mp.mapFile || 'facey.json';
            const seed = this.mp.seed || (Math.floor(Math.random() * 4294967296));

            // Send start to client
            send({
                type: 'start',
                seed: seed,
                mapFile: mapFile
            });

            // Trigger local start
            this.multiplayerStartRequested = true;
            this.multiplayerStartSession = {
                role: 'host',
                 seed: seed,
                 mapFile: mapFile,
                 characterType: selectedCharId, // My Selected Character
                 connection: this.mp.connection,
                 selectedMap: mapOptions.find(m => m.file === mapFile)
             };
        };

        const runCountdown = () => {
            if (!this.mp.countdown.active) {
                els.countdown.textContent = '';
                return;
            }
            const msLeft = this.mp.countdown.endsAtMs - Date.now();
            const secLeft = Math.ceil(msLeft / 1000);

            if (secLeft <= 0) {
                this.mp.countdown.active = false;
                els.countdown.textContent = 'GO!';
                if (this.mp.role === 'host') finalizeStartHost();
            } else {
                if (secLeft !== this.mp.countdown.secondsLeft) {
                    this.mp.countdown.secondsLeft = secLeft;
                    els.countdown.textContent = secLeft;
                }
                requestAnimationFrame(runCountdown);
            }
        };

        // Render function (updates UI state based on `this.mp`)
        const render = () => {
            // Host Connect Button Valid?
            els.btns.hostConnect.disabled = !els.hostAnswerInput.value.trim();

            // Ready Button Text
            if (this.mp.localReady) {
                els.btns.toggleReady.textContent = "Waiting for other...";
                els.btns.toggleReady.classList.add('active');
            } else {
                els.btns.toggleReady.textContent = "Ready to Battle";
                els.btns.toggleReady.classList.remove('active');
            }

            // Setup QR if needed
            if (this.mp.role === 'host' && this.mp.joinLink && !els.hostQr.hasChildNodes()) {
                try {
                    const qr = qrcode(0, 'M');
                    qr.addData(this.mp.joinLink);
                    qr.make();
                    els.hostQr.innerHTML = qr.createImgTag(3, 4);
                 } catch (e) { }
             }
        };

        const updateSelectionVisuals = () => {
            // Update Maps
            els.mapContainer.querySelectorAll('.mp-option-card').forEach((el, i) => {
                if (i === selectedMapIndex) el.classList.add('selected');
                else el.classList.remove('selected');
            });

            // Update Chars
            els.charContainer.querySelectorAll('.mp-option-card').forEach((el) => {
                if (el.dataset.mpChar === selectedCharId) el.classList.add('selected');
                else el.classList.remove('selected');
            });
        };


        // --- Event Listeners ---

        els.btns.close.addEventListener('click', shutdown);

        els.btns.host.addEventListener('click', async () => {
            this.mp.role = 'host';
            // Setup connection
            const iceServers = this.mp.useStun ? getOptionalPublicStunIceServers() : [];
            const conn = new WebRTCManualConnection({ role: 'host', iceServers });
            this.mp.connection = conn;
            wireConnection(conn);

            // Create Offer
            setStatus('Creating Offer...');
            try {
                this.mp.offerCode = await conn.createOfferCode();
                 const b64 = btoa(this.mp.offerCode);
                 this.mp.joinLink = window.location.href.split('#')[0] + '#join=' + b64;
                 setStatus('Waiting for reply...');
                 setStep('host_waiting');
                 render();
             } catch (e) {
                 console.error(e);
                 setStatus('Error creating offer');
             }
        });

        els.btns.join.addEventListener('click', () => {
            this.mp.role = 'client';
            setStep('join_entry');
        });

        // HOST: Copy Link
        els.btns.copyLink.addEventListener('click', () => {
            if (this.mp.joinLink) navigator.clipboard.writeText(this.mp.joinLink);
        });

        // HOST: Copy Code (Fallback)
        els.btns.copyOffer.addEventListener('click', () => {
            if (this.mp.offerCode) navigator.clipboard.writeText(this.mp.offerCode);
        });

        // HOST: Connect (Paste Reply)
        els.btns.hostConnect.addEventListener('click', async () => {
            const answer = els.hostAnswerInput.value.trim();
            if (!answer) return;
            try {
                 setStatus('Connecting...');
                 await this.mp.connection.acceptAnswerCode(answer);
             } catch (e) {
                 setStatus('Invalid Reply Code');
                 console.error(e);
             }
        });

        els.hostAnswerInput.addEventListener('input', render);

        // JOIN: Generate Reply (from Link or Paste)
        els.btns.joinGenerate.addEventListener('click', async () => {
            const offer = els.joinOfferInput.value.trim();
            // Handle pure base64 (link format) vs JSON
            let cleanOffer = offer;

            // Try to be smart if they pasted a full URL
            if (offer.includes('#join=')) {
                try {
                    const b64 = offer.split('#join=')[1];
                    cleanOffer = atob(b64);
                  } catch (e) { }
             }

            if (!cleanOffer) return;

            // Start Client Connection
            const iceServers = this.mp.useStun ? getOptionalPublicStunIceServers() : [];
            const conn = new WebRTCManualConnection({ role: 'client', iceServers });
            this.mp.connection = conn;
            wireConnection(conn);

            try {
                 this.mp.answerCode = await conn.acceptOfferCodeAndCreateAnswer(cleanOffer);
                 els.joinAnswerDisplay.value = this.mp.answerCode;
                 setStep('join_response');
                 setStatus('Reply generated. Send back to Host.');
             } catch (e) {
                 console.error(e);
                 setStatus('Invalid Invite Code');
             }
        });

        // JOIN: Copy Reply
        els.btns.joinCopyAnswer.addEventListener('click', () => {
            if (els.joinAnswerDisplay.value) navigator.clipboard.writeText(els.joinAnswerDisplay.value);
        });

        // READY TOGGLE
        els.btns.toggleReady.addEventListener('click', () => {
            if (this.mp.localReady) {
                // unready
                this.mp.localReady = false;
                 if (this.mp.connection) this.mp.connection.send({ type: 'ready', ready: false });
                 if (this.mp.role === 'host') cancelCountdownHost();
             } else {
                 // ready
                 this.mp.localReady = true;
                 if (this.mp.connection) this.mp.connection.send({ type: 'ready', ready: true });
                 // Host checks start in onMessage ('ready')
             }
            render();
        });

        // Card Clicks (Delegated)
        els.mapContainer.addEventListener('click', (e) => {
            if (this.mp.role !== 'host') return;
            const card = e.target.closest('.mp-option-card');
            if (card) {
                const idx = parseInt(card.dataset.mpMap);
                if (!isNaN(idx)) {
                    selectedMapIndex = idx;
                    this.mp.mapFile = mapOptions[idx].file;
                    updateSelectionVisuals();
                    // Send update to client
                    send({ type: 'map_select', mapIndex: idx, mapFile: this.mp.mapFile });
                }
            }
        });

        els.charContainer.addEventListener('click', (e) => {
            const card = e.target.closest('.mp-option-card');
            if (card) {
                selectedCharId = card.dataset.mpChar;
                this.mp.characterType = selectedCharId;
                updateSelectionVisuals();
            }
        });


        // Handle auto-join via link state
        if (this.mp && this.mp.role === 'client' && this.mp.offerCode) {
            // Pre-fill
            els.joinOfferInput.value = this.mp.offerCode;
            setStep('join_entry'); // Start at entry
            // Auto-click generate?
            els.btns.joinGenerate.click();
        }

        this.mpDom = {
            root,
            render,
            shutdown,
            updateLayout: () => {
                const rect = this.canvas.getBoundingClientRect();
                root.style.left = `${rect.left}px`;
                root.style.top = `${rect.top}px`;
                root.style.width = `${rect.width}px`;
                root.style.height = `${rect.height}px`;
            }
        };

        render(); // First render
    }

    showMultiplayerLobbyDom() {
        this.ensureMultiplayerLobbyDom();
        this.mpDom.root.style.display = 'block';
        this.mpDom.updateLayout();
        this.mpDom.render();
    }

    hideMultiplayerLobbyDom() {
        if (!this.mpDom) return;
        this.mpDom.root.style.display = 'none';
    }

    shutdownMultiplayerLobby() {
        if (this.mpDom && typeof this.mpDom.shutdown === 'function') {
            this.mpDom.shutdown();
        }
    }

    drawSettingsOverlay(ctx) {
        // Dim background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Panel
        const width = Math.min(400, this.canvas.width * 0.85);
        const height = 300;
        const x = (this.canvas.width - width) / 2;
        const y = (this.canvas.height - height) / 2;

        ctx.fillStyle = '#2a2a2a';
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, 15);
        ctx.fill();
        ctx.stroke();

        // Title
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SETTINGS', this.canvas.width / 2, y + 50);

        // Audio Toggle (Radio/Checkbox Style)
        const vol = this.settingsManager ? this.settingsManager.get('volume') : 0.5;
        const isEnabled = vol > 0;

        const rowY = y + 120;
        const centerX = this.canvas.width / 2;

        // Label
        ctx.fillStyle = '#fff';
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('Enable Audio', centerX - 20, rowY);

        // Checkbox (Square)
        const boxSize = 24;
        const boxX = centerX + 10;
        const boxY = rowY - boxSize / 2;

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // ctx.roundRect(boxX, boxY, boxSize, boxSize, 4); // Use simple rect for broader compatibility if needed, or roundRect with small radius
        ctx.rect(boxX, boxY, boxSize, boxSize);
        ctx.stroke();

        if (isEnabled) {
            ctx.fillStyle = '#4ade80';
            ctx.fillRect(boxX + 4, boxY + 4, boxSize - 8, boxSize - 8);
        }

        // Close Button
        const closeY = y + 220;
        ctx.fillStyle = '#666';
        ctx.beginPath();
        ctx.roundRect((this.canvas.width - 120) / 2, closeY, 120, 40, 8);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('CLOSE', this.canvas.width / 2, closeY + 26);
    }

    handleSettingsTouch(x, y) {
        const width = Math.min(400, this.canvas.width * 0.85);
        const height = 300;
        const panelY = (this.canvas.height - height) / 2;
        const panelX = (this.canvas.width - width) / 2;

        // Audio Toggle Hit Area
        const rowY = panelY + 120;
        const centerX = this.canvas.width / 2;
        // Hit area covers label + box
        if (x >= centerX - 140 && x <= centerX + 60 && y >= rowY - 25 && y <= rowY + 25) {
            if (this.settingsManager) {
                const currentVol = this.settingsManager.get('volume');
                const newVol = currentVol > 0 ? 0 : 0.5;
                this.settingsManager.set('volume', newVol);

                if (window.game && window.game.audioManager) {
                    window.game.audioManager.setVolume(newVol);
                    if (newVol > 0) window.game.audioManager.playSynthesized('blaster');
                }
            }
            return true;
        }

        // Close Button
        const closeY = panelY + 220;
        const closeX = (this.canvas.width - 120) / 2;

        if (x >= closeX && x <= closeX + 120 && y >= closeY && y <= closeY + 40) {
            this.showSettings = false;
            return true;
        }

        // Click outside panel to close
        if (x < panelX || x > panelX + width || y < panelY || y > panelY + height) {
            this.showSettings = false;
            return true;
        }

        return true; // Consume event if overlay is open
    }

    async loadBuildVersion() {
        try {
            const url = new URL('build-info.json', document.baseURI);
            url.searchParams.set('t', String(Date.now()));

            const res = await fetch(url.toString(), { cache: 'no-store' });
            if (!res.ok) return;
            const data = await res.json();
            const counter = data?.counter;
            if (!counter) return;
            this.buildVersionText = `v${counter}`;
        } catch {
            // Keep default
        }
    }

    renderLogo() {
        const ctx = this.ctx;
        if (!this.assetLoader) return;

        const logoImg = this.assetLoader.getImage('intro_logo');
        if (!logoImg) return;

        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);

        const topMargin = 18 * scale;
        const maxWidth = this.canvas.width * 0.92;
        const maxHeight = this.canvas.height * 0.19;

        const imgRatio = logoImg.width / logoImg.height;
        let drawWidth = maxWidth;
        let drawHeight = drawWidth / imgRatio;
        if (drawHeight > maxHeight) {
            drawHeight = maxHeight;
            drawWidth = drawHeight * imgRatio;
        }

        const x = (this.canvas.width - drawWidth) / 2;
        const y = topMargin;

        ctx.drawImage(logoImg, x, y, drawWidth, drawHeight);

        this.logoBottomY = y + drawHeight;
    }

    getCharacterKeys() {
        return Object.keys(CHARACTERS);
    }

    syncSelectedCharacterIndex() {
        const keys = this.getCharacterKeys();
        const idx = keys.indexOf(this.selectedCharacter);
        this.selectedCharacterIndex = idx >= 0 ? idx : 0;
        this.selectedCharacter = keys[this.selectedCharacterIndex] || this.selectedCharacter;
    }

    setSoloStep(step) {
        if (step !== 'character' && step !== 'map') return;
        this.soloStep = step;
    }

    handleSoloPrev() {
        if (this.soloStep === 'character') {
            const keys = this.getCharacterKeys();
            if (keys.length === 0) return;
            this.selectedCharacterIndex = (this.selectedCharacterIndex - 1 + keys.length) % keys.length;
            this.selectedCharacter = keys[this.selectedCharacterIndex];
            return;
        }

        const count = this.availableMaps.length;
        if (count === 0) return;
        this.selectedMapIndex = (this.selectedMapIndex - 1 + count) % count;
        this.selectedMap = this.availableMaps[this.selectedMapIndex];
    }

    handleSoloNext() {
        if (this.soloStep === 'character') {
            const keys = this.getCharacterKeys();
            if (keys.length === 0) return;
            this.selectedCharacterIndex = (this.selectedCharacterIndex + 1) % keys.length;
            this.selectedCharacter = keys[this.selectedCharacterIndex];
            return;
        }

        const count = this.availableMaps.length;
        if (count === 0) return;
        this.selectedMapIndex = (this.selectedMapIndex + 1) % count;
        this.selectedMap = this.availableMaps[this.selectedMapIndex];
    }

    handleSoloSelect() {
        if (this.soloStep === 'character') {
            this.setSoloStep('map');
            return null;
        }
        this.startRequested = true;
        return 'start';
    }

    renderBackground() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        const gradient = ctx.createLinearGradient(0, 0, w, h);
        gradient.addColorStop(0, '#111827');
        gradient.addColorStop(1, '#1a1a2e');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, w, h);

        const vignette = ctx.createRadialGradient(
            w / 2,
            h * 0.38,
            Math.min(w, h) * 0.15,
            w / 2,
            h * 0.38,
            Math.max(w, h) * 0.75
        );
        vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vignette.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);
    }

    snapCharactersToNearest() {
        const keys = Object.keys(CHARACTERS);
        if (keys.length === 0) return;

        const step = this.cardWidth + this.cardSpacing;
        const centerX = this.canvas.width / 2;
        const totalWidth = step * keys.length;
        const startX = centerX - totalWidth / 2 + this.cardWidth / 2;

        let bestIndex = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < keys.length; i++) {
            const cardCenter = startX + i * step + this.scrollOffset;
            const dist = Math.abs(centerX - cardCenter);
            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = i;
            }
        }

        this.scrollOffset = centerX - (startX + bestIndex * step);
        this.selectedCharacter = keys[bestIndex];
    }

    snapMapsToNearest() {
        const count = this.availableMaps.length;
        if (count === 0) return;

        const padding = 20;
        const step = this.mapCardWidth + this.mapCardSpacing;
        const centerX = this.canvas.width / 2;

        let bestIndex = 0;
        let bestDist = Number.POSITIVE_INFINITY;
        for (let i = 0; i < count; i++) {
            const cardLeft = padding + step * i - this.mapScrollOffset;
            const cardCenter = cardLeft + this.mapCardWidth / 2;
            const dist = Math.abs(centerX - cardCenter);
            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = i;
            }
        }

        const targetScroll = padding + step * bestIndex + this.mapCardWidth / 2 - centerX;
        const maxScroll = Math.max(0, step * count - this.canvas.width + 40);
        this.mapScrollOffset = Math.max(0, Math.min(maxScroll, targetScroll));

        this.selectedMapIndex = bestIndex;
        this.selectedMap = this.availableMaps[bestIndex];
    }
    
    async loadMapsFromManifest() {
        try {
            const manifestUrl = resolveMapsUrl('manifest.json');
            const response = await fetch(manifestUrl);
            if (!response.ok) {
                throw new Error(`Failed to load manifest: ${response.status}`);
            }
            const manifest = await response.json();
            this.availableMaps = manifest.maps || [];
            
            // Load actual map data for accurate previews
            await this.loadMapData();

            // Begin preloading map background preview images (non-blocking)
            this.preloadMapBackgroundPreviews();
            
            if (this.availableMaps.length > 0) {
                this.selectedMap = this.availableMaps[0];
                this.selectedMapIndex = 0;
            }
            
            this.mapsLoaded = true;
            console.log('Loaded maps from manifest:', this.availableMaps.length, 'maps');
        } catch (error) {
            warnMissingAsset('map manifest', 'maps/manifest.json', error?.message || String(error));
            console.error('Error loading maps manifest:', error);
            // Fallback to default map if manifest fails
            this.availableMaps = [{
                file: 'default.json',
                name: 'Default Arena',
                radius: 1400,
                bushCount: 25,
                obstacleCount: 20,
                waterCount: 5,
                background: { type: 'color', value: '#2d3748' },
                mapData: null
            }];
            this.selectedMap = this.availableMaps[0];
            this.selectedMapIndex = 0;
            this.mapsLoaded = true;
        }
    }

    preloadMapBackgroundPreviews() {
        // Fire-and-forget preload so scrolling doesn't hitch.
        // Keep this lightweight; failed loads simply fall back to gradient.
        try {
            for (const map of this.availableMaps) {
                if (map?.background?.type !== 'image') continue;
                const filename = map?.background?.value;
                if (!filename) continue;
                const imagePath = resolveMapBackgroundUrl(filename);
                this.ensureMapPreviewImage(imagePath);
            }
        } catch (e) {
            // Best-effort only
        }
    }

    ensureMapPreviewImage(imagePath) {
        if (!imagePath) return null;
        const existing = this.mapPreviewImages.get(imagePath);
        if (existing) return existing;

        const img = new Image();
        const entry = { img, status: 'loading' };
        this.mapPreviewImages.set(imagePath, entry);

        img.onload = async () => {
            // Try to decode to reduce first-draw hitch; ignore failures.
            try {
                if (typeof img.decode === 'function') {
                    await img.decode();
                }
            } catch (e) {
                // ignore decode failures
            }
            entry.status = 'loaded';
        };
        img.onerror = () => {
            entry.status = 'error';
            warnMissingAsset('map preview background image', imagePath, 'StartScreen preview');
        };
        img.src = imagePath;

        return entry;
    }
    
    async loadMapData() {
        // Load actual map data for each map for accurate previews
        const loadPromises = this.availableMaps.map(async (map) => {
            try {
                const mapUrl = resolveMapsUrl(map.file);
                const response = await fetch(mapUrl);
                if (response.ok) {
                    const data = await response.json();
                    map.mapData = data;

                    // Treat manifest counts as optional metadata.
                    // When we have the real JSON, derive counts from it so UI always matches gameplay.
                    map.bushCount = Array.isArray(data.bushes) ? data.bushes.length : (map.bushCount || 0);
                    map.obstacleCount = Array.isArray(data.obstacles) ? data.obstacles.length : (map.obstacleCount || 0);
                    map.waterCount = Array.isArray(data.waterAreas) ? data.waterAreas.length : (map.waterCount || 0);

                    console.log(`Loaded map data for ${map.name}`);
                } else {
                    console.warn(`Could not load map data for ${map.name}`);
                    warnMissingAsset('map json', `maps/${map.file}`, `HTTP ${response.status}`);
                    map.mapData = null;
                }
            } catch (error) {
                console.warn(`Error loading map data for ${map.name}:`, error);
                warnMissingAsset('map json', `maps/${map.file}`, error?.message || String(error));
                map.mapData = null;
            }
        });
        
        await Promise.all(loadPromises);
    }

    getMapCounts(map) {
        if (map && map.mapData) {
            return {
                bushes: Array.isArray(map.mapData.bushes) ? map.mapData.bushes.length : 0,
                obstacles: Array.isArray(map.mapData.obstacles) ? map.mapData.obstacles.length : 0,
                waterAreas: Array.isArray(map.mapData.waterAreas) ? map.mapData.waterAreas.length : 0
            };
        }

        return {
            bushes: map?.bushCount || 0,
            obstacles: map?.obstacleCount || 0,
            waterAreas: map?.waterCount || 0
        };
    }
    
    setupEventListeners() {
        this.onTouchStartBound = (e) => this.handleTouchStart(e);
        this.onTouchMoveBound = (e) => this.handleTouchMove(e);
        this.onTouchEndBound = (e) => this.handleTouchEnd(e);
        
        this.canvas.addEventListener('touchstart', this.onTouchStartBound, { passive: false });
        this.canvas.addEventListener('touchmove', this.onTouchMoveBound, { passive: false });
        this.canvas.addEventListener('touchend', this.onTouchEndBound, { passive: false });
    }
    
    removeEventListeners(options = {}) {
        this.canvas.removeEventListener('touchstart', this.onTouchStartBound);
        this.canvas.removeEventListener('touchmove', this.onTouchMoveBound);
        this.canvas.removeEventListener('touchend', this.onTouchEndBound);

        // Multiplayer cleanup
        if (!options.preserveMultiplayerConnection) {
            this.shutdownMultiplayerLobby();

            // Initial cleanup
            if (this.mpDom && this.mpDom.root && this.mpDom.root.parentNode) {
                this.mpDom.root.parentNode.removeChild(this.mpDom.root);
            }
            this.mpDom = null;
        } else {
            // Hide UI-only pieces but keep the active RTCPeerConnection alive.
            this.hideMultiplayerLobbyDom();
        }
    }
    
    getCanvasCoordinates(clientX, clientY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }
    
    handleWheel(event) {
        if (this.menuState !== 'solo') return;
        event.preventDefault();
        if (event.deltaY > 0) this.handleSoloNext();
        else this.handleSoloPrev();
    }
    
    handleTouchStart(event) {
        event.preventDefault();
        const touch = event.touches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);

        if (this.menuState !== 'solo') {
            this.isDragging = false;
            this.isDraggingMaps = false;
            this.dragStartX = coords.x;
            this.dragStartY = coords.y;
            return;
        }
        
        // Solo: only track swipe direction
        this.isDragging = true;
        this.isDraggingMaps = false;
        this.dragStartX = coords.x;
        this.dragStartY = coords.y;
    }
    
    handleTouchMove(event) {
        event.preventDefault();
        if (!this.isDragging) return;

        // No live movement; swipe handled on end
        if (this.menuState !== 'solo') return;
    }
    
    handleTouchEnd(event) {
        event.preventDefault();
        
        const touch = event.changedTouches[0];
        const coords = this.getCanvasCoordinates(touch.clientX, touch.clientY);

        if (this.showSettings) {
            this.handleSettingsTouch(coords.x, coords.y);
            return null;
        }

        // Navigation states (home / multiplayer)
        if (this.menuState === 'home') {
            if (this.profileHudRect) {
                const r = this.profileHudRect;
                if (coords.x >= r.x && coords.x <= r.x + r.w && coords.y >= r.y && coords.y <= r.y + r.h) {
                    this.menuState = 'profileStats';
                    return null;
                }
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.solo)) {
                this.menuState = 'solo';
                this.setSoloStep('character');
                this.syncSelectedCharacterIndex();
                return null;
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.multiplayer)) {
                this.menuState = 'multiplayer';
                return null;
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.upgrades)) {
                this.menuState = 'upgrades';
                return null;
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.settings)) {
                this.showSettings = true;
                return null;
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.editor)) {
                window.location.href = 'editor.html';
                return null;
            }
            return null;
        }

        if (this.menuState === 'profileStats') {
            if (this.isPointInButton(coords.x, coords.y, this.backButton)) {
                this.menuState = 'home';
            }
            return null;
        }

        if (this.menuState === 'upgrades') {
            if (this.isPointInButton(coords.x, coords.y, this.backButton)) {
                this.menuState = 'home';
                return null;
            }

            for (const btn of this.upgradesBuyButtons) {
                if (!btn) continue;
                if (coords.x >= btn.x && coords.x <= btn.x + btn.w && coords.y >= btn.y && coords.y <= btn.y + btn.h) {
                    this.profile = loadProfile();
                    const res = purchaseUpgrade(this.profile, btn.upgradeId);
                    if (res.ok) {
                        saveProfile(this.profile);
                    }
                    return null;
                }
            }

            return null;
        }

        if (this.menuState === 'multiplayer') {
            if (this.isPointInButton(coords.x, coords.y, this.backButton)) {
                this.shutdownMultiplayerLobby();
                this.hideMultiplayerLobbyDom();
                this.menuState = 'home';
            }
            return null;
        }

        // Swipe navigation
        const deltaX = coords.x - this.dragStartX;
        const deltaY = coords.y - this.dragStartY;
        if (Math.abs(deltaX) > 40 && Math.abs(deltaY) < 90) {
            if (deltaX > 0) this.handleSoloPrev();
            else this.handleSoloNext();
            this.isDragging = false;
            this.isDraggingMaps = false;
            return null;
        }

        // Back button (solo)
        if (this.isPointInButton(coords.x, coords.y, this.backButton)) {
            if (this.soloStep === 'map') {
                this.setSoloStep('character');
            } else {
                this.menuState = 'home';
            }
            this.isDragging = false;
            this.isDraggingMaps = false;
            return null;
        }

        // Map step: settings row
        if (this.menuState === 'solo' && this.soloStep === 'map' && this.mapSettingsHitRect) {
            const r = this.mapSettingsHitRect;
            if (coords.x >= r.x && coords.x <= r.x + r.w && coords.y >= r.y && coords.y <= r.y + r.h) {
                this.openMapSettingsModal();
                this.isDragging = false;
                this.isDraggingMaps = false;
                return null;
            }
        }
        
        // Buttons
        if (this.isPointInButton(coords.x, coords.y, this.soloNavButtons.prev)) {
            this.handleSoloPrev();
            this.isDragging = false;
            return null;
        }
        if (this.isPointInButton(coords.x, coords.y, this.soloNavButtons.next)) {
            this.handleSoloNext();
            this.isDragging = false;
            return null;
        }
        if (this.isPointInButton(coords.x, coords.y, this.soloNavButtons.select)) {
            const res = this.handleSoloSelect();
            this.isDragging = false;
            return res;
        }
        
        this.isDragging = false;
        this.isDraggingMaps = false;
        return null;
    }
    
    handleMouseDown(event) {
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);

        if (this.menuState !== 'solo') {
            this.isDragging = false;
            this.isDraggingMaps = false;
            this.dragStartX = coords.x;
            this.dragStartY = coords.y;
            return;
        }

        this.isDragging = true;
        this.dragStartX = coords.x;
        this.dragStartY = coords.y;
        
        // Check if starting drag in map section
        if (coords.y >= this.mapSectionY && coords.y <= this.mapSectionY + this.mapCardHeight + 60) {
            this.isDraggingMaps = true;
            this.dragStartScrollOffset = this.mapScrollOffset;
        } else {
            this.isDraggingMaps = false;
            this.dragStartScrollOffset = this.scrollOffset;
        }
    }
    
    handleMouseMove(event) {
        if (!this.isDragging) return;
        if (this.menuState !== 'solo') return;
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);
        const deltaX = coords.x - this.dragStartX;
        
        if (this.isDraggingMaps) {
            this.mapScrollOffset = this.dragStartScrollOffset - deltaX;
            const maxScroll = Math.max(0, (this.mapCardWidth + this.mapCardSpacing) * this.availableMaps.length - this.canvas.width + 40);
            this.mapScrollOffset = Math.max(0, Math.min(maxScroll, this.mapScrollOffset));
        } else {
            this.scrollOffset = this.dragStartScrollOffset + deltaX;
        }
    }
    
    handleMouseUp(event) {
        const coords = this.getCanvasCoordinates(event.clientX, event.clientY);

        if (this.showSettings) {
            this.handleSettingsTouch(coords.x, coords.y);
            return;
        }

        // Navigation states (home / multiplayer)
        if (this.menuState === 'home') {
            if (this.profileHudRect) {
                const r = this.profileHudRect;
                if (coords.x >= r.x && coords.x <= r.x + r.w && coords.y >= r.y && coords.y <= r.y + r.h) {
                    this.menuState = 'profileStats';
                    return null;
                }
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.solo)) {
                this.menuState = 'solo';
                return null;
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.multiplayer)) {
                this.menuState = 'multiplayer';
                return null;
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.upgrades)) {
                this.menuState = 'upgrades';
                return null;
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.settings)) {
                this.showSettings = true;
                return null;
            }
            if (this.isPointInButton(coords.x, coords.y, this.homeButtons.editor)) {
                window.location.href = 'editor.html';
                return null;
            }
            return null;
        }

        if (this.menuState === 'profileStats') {
            if (this.isPointInButton(coords.x, coords.y, this.backButton)) {
                this.menuState = 'home';
            }
            return null;
        }

        if (this.menuState === 'upgrades') {
            if (this.isPointInButton(coords.x, coords.y, this.backButton)) {
                this.menuState = 'home';
                return null;
            }

            for (const btn of this.upgradesBuyButtons) {
                if (!btn) continue;
                if (coords.x >= btn.x && coords.x <= btn.x + btn.w && coords.y >= btn.y && coords.y <= btn.y + btn.h) {
                    this.profile = loadProfile();
                    const res = purchaseUpgrade(this.profile, btn.upgradeId);
                    if (res.ok) {
                        saveProfile(this.profile);
                    }
                    return null;
                }
            }

            return null;
        }

        if (this.menuState === 'multiplayer') {
            if (this.isPointInButton(coords.x, coords.y, this.backButton)) {
                this.menuState = 'home';
            }
            return null;
        }
        
        // Don't process if we were dragging significantly
        const dragDistance = Math.abs(coords.x - this.dragStartX);
        if (dragDistance > 10) {
            if (this.menuState === 'solo') {
                if (this.isDraggingMaps) {
                    this.snapMapsToNearest();
                } else {
                    this.snapCharactersToNearest();
                }
            }
            this.isDragging = false;
            this.isDraggingMaps = false;
            return null;
        }

        // Back button (solo)
        if (this.isPointInButton(coords.x, coords.y, this.backButton)) {
            this.menuState = 'home';
            this.isDragging = false;
            this.isDraggingMaps = false;
            return null;
        }
        
        // Check start button
        if (this.isPointInButton(coords.x, coords.y, this.startButton)) {
            console.log('START button clicked!');
            this.startRequested = true;
            this.isDragging = false;
            return 'start';
        }
        
        // Check map selection
        this.availableMaps.forEach((map, index) => {
            const cardX = this.getMapCardX(index);
            if (this.isPointInMapCard(coords.x, coords.y, cardX)) {
                this.selectedMapIndex = index;
                this.selectedMap = map;
                console.log('Selected map:', map.name);
            }
        });
        
        // Check character selection
        const characterKeys = Object.keys(CHARACTERS);
        characterKeys.forEach((key, index) => {
            const cardX = this.getCardX(index);
            if (this.isPointInCard(coords.x, coords.y, cardX)) {
                this.selectedCharacter = key;
                console.log('Selected character:', key);
            }
        });
        
        this.isDragging = false;
        this.isDraggingMaps = false;
        return null;
    }
    
    getCardX(index) {
        const centerX = this.canvas.width / 2;
        const totalWidth = (this.cardWidth + this.cardSpacing) * Object.keys(CHARACTERS).length;
        const startX = centerX - totalWidth / 2 + this.cardWidth / 2;
        return startX + index * (this.cardWidth + this.cardSpacing) + this.scrollOffset;
    }
    
    getMapCardX(index) {
        const padding = 20;
        return padding + (this.mapCardWidth + this.mapCardSpacing) * index - this.mapScrollOffset;
    }
    
    isPointInCard(x, y, cardX) {
        return x >= cardX - this.cardWidth / 2 &&
               x <= cardX + this.cardWidth / 2 &&
               y >= this.cardsY - this.cardHeight / 2 &&
               y <= this.cardsY + this.cardHeight / 2;
    }
    
    isPointInMapCard(x, y, cardX) {
        return x >= cardX &&
               x <= cardX + this.mapCardWidth &&
               y >= this.mapSectionY + 40 &&
               y <= this.mapSectionY + 40 + this.mapCardHeight;
    }
    
    isPointInButton(x, y, button) {
        return x >= button.x - button.width / 2 &&
               x <= button.x + button.width / 2 &&
               y >= button.y - button.height / 2 &&
               y <= button.y + button.height / 2;
    }
    
    render() {
        const ctx = this.ctx;
        ctx.save();
        
        // Background
        this.renderBackground();
        
        // Calculate font sizes
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const titleSize = Math.max(28, 42 * scale);
        const instructionSize = Math.max(11, 14 * scale);
        
        // Large top logo (Home/Solo/Multiplayer/Upgrades)
        if (this.assetLoader && this.assetLoader.getImage('intro_logo')) {
            this.renderLogo();
        } else {
            // Fallback to text if image not loaded
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${titleSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('BATTLE-2D-EATH', this.canvas.width / 2, this.titleY);
        }
        
        
        if (this.menuState === 'home') {
            this.renderHomeMenu();
            this.hideMultiplayerLobbyDom();
        } else if (this.menuState === 'multiplayer') {
            this.renderBackButton();
            this.renderMultiplayerPlaceholder();
            this.showMultiplayerLobbyDom();
        } else if (this.menuState === 'profileStats') {
            this.renderBackButton();
            this.renderProfileStatsScreen();
            this.hideMultiplayerLobbyDom();
        } else if (this.menuState === 'upgrades') {
            this.renderBackButton();
            this.renderUpgradesScreen();
            this.hideMultiplayerLobbyDom();
        } else {
            // Solo
            this.renderBackButton();
            this.hideMultiplayerLobbyDom();

            if (typeof this.renderSoloSelection === 'function') {
                this.renderSoloSelection();
            } else {
                // Safety fallback for dev hot-reload edge cases (older instance)
                const characterKeys = Object.keys(CHARACTERS);
                characterKeys.forEach((key, index) => {
                    this.renderCharacterCard(key, index);
                });
                this.renderMapSelection();
                this.renderStartButton();
            }
        }

        // Keep overlay aligned if visible
        if (this.menuState === 'multiplayer' && this.mpDom) {
            this.mpDom.updateLayout();
        }

        // Version footer (CI-stamped on deploy)
        this.renderBuildVersion();
        
        ctx.restore();
    }

    renderBuildVersion() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const fontSize = Math.max(10, 12 * scale);
        const pad = 8 * scale;

        const text = this.buildVersionText || 'vdev';

        ctx.save();
        ctx.font = `${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(text, this.canvas.width / 2, this.canvas.height - pad);
        ctx.restore();
    }

    renderHomeMenu() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const headingSize = Math.max(18, 22 * scale);

        ctx.save();

        // Refresh profile so post-match rewards show immediately.
        this.profile = loadProfile();

        this.renderHomeProfileHud();

        this.renderMenuButton(this.homeButtons.solo, '#4ade80');
        this.renderMenuButton(this.homeButtons.multiplayer, '#60a5fa');
        this.renderMenuButton(this.homeButtons.upgrades, '#e5e7eb', '#111827');
    this.renderMenuButton(this.homeButtons.settings, '#9ca3af', '#111827');
        this.renderMenuButton(this.homeButtons.editor, '#fbbf24');

    if (this.showSettings) {
        this.drawSettingsOverlay(ctx);
    }

        ctx.restore();
    }

    renderHomeProfileHud() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);

        const profile = this.profile;
        if (!profile) {
            this.profileHudRect = null;
            return;
        }

        const pad = 14 * scale;
        const w = Math.min(this.canvas.width * 0.78, 520);
        const h = Math.max(64 * scale, 54);

        const x = (this.canvas.width - w) / 2;
        const y = Math.max((this.logoBottomY || this.titleY) + 10 * scale, 74 * scale);

        this.profileHudRect = { x, y, w, h };

        ctx.save();
        ctx.fillStyle = '#e5e7eb';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        this.roundRect(ctx, x, y, w, h, 12);
        ctx.fill();
        ctx.stroke();

        const xpInfo = getXpProgress(profile.xp);
        const xpIntoLevel = profile.xp - xpInfo.currentLevelXp;
        const xpNeeded = Math.max(0, xpInfo.nextLevelXp - xpInfo.currentLevelXp);

        ctx.fillStyle = '#111827';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = `bold ${Math.max(14, 16 * scale)}px Arial`;

        const leftX = x + 16 * scale;
        const midY = y + h / 2;
        ctx.fillText(`🏅 Lv ${xpInfo.level}`, leftX, midY - 12 * scale);
        ctx.fillText(`🪙 ${profile.coins}`, leftX + w * 0.34, midY - 12 * scale);
        ctx.font = `${Math.max(12, 14 * scale)}px Arial`;
        ctx.fillText(`✨ ${xpIntoLevel}/${xpNeeded} XP`, leftX, midY + 12 * scale);

        // Progress bar
        const barX = leftX + w * 0.34;
        const barY = midY + 6 * scale;
        const barW = x + w - barX - 16 * scale;
        const barH = Math.max(8 * scale, 8);
        ctx.fillStyle = 'rgba(17, 24, 39, 0.15)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = 'rgba(17, 24, 39, 0.45)';
        ctx.fillRect(barX, barY, barW * xpInfo.progress01, barH);

        ctx.restore();
    }

    renderProfileStatsScreen() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);

        // Refresh profile so it reflects latest rewards/upgrades.
        this.profile = loadProfile();
        const profile = this.profile;

        const topY = (this.logoBottomY || this.titleY) + 34 * scale;
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(22, 28 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Profile', this.canvas.width / 2, topY);

        if (!profile) {
            ctx.font = `${Math.max(14, 16 * scale)}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.fillText('No profile found.', this.canvas.width / 2, topY + 40 * scale);
            ctx.restore();
            return;
        }

        const panelW = Math.min(this.canvas.width * 0.9, 640);
        const panelH = Math.min(this.canvas.height * 0.65, 520);
        const panelX = (this.canvas.width - panelW) / 2;
        const panelY = topY + 26 * scale;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = 2;
        this.roundRect(ctx, panelX, panelY, panelW, panelH, 14);
        ctx.fill();
        ctx.stroke();

        const xpInfo = getXpProgress(profile.xp);
        const xpIntoLevel = profile.xp - xpInfo.currentLevelXp;
        const xpNeeded = Math.max(0, xpInfo.nextLevelXp - xpInfo.currentLevelXp);

        const lifetime = profile.stats || {};
        const lines = [
            `🏅 Level: ${xpInfo.level}`,
            `✨ XP: ${profile.xp}  (${xpIntoLevel}/${xpNeeded} this level)`,
            `🪙 Coins: ${profile.coins}`,
            '',
            `🎮 Matches: ${lifetime.matchesPlayed ?? 0}`,
            `🏆 Wins: ${lifetime.wins ?? 0}`,
            `⚔️ Kills: ${lifetime.kills ?? 0}`,
            `💥 Damage dealt: ${Math.round(lifetime.damageDealt ?? 0)}`,
            `🩸 Damage taken: ${Math.round(lifetime.damageTaken ?? 0)}`,
            `🧰 Heals used: ${lifetime.healsConsumed ?? 0}`,
            `🛡️ Shields used: ${lifetime.shieldsUsed ?? 0}`,
            `✨ Ability uses: ${lifetime.abilityUsedCount ?? 0}`,
            `🤝 Friendly revives: ${lifetime.friendlyRevives ?? 0}`,
            `🔫 Shots fired: ${lifetime.weaponFiredCount ?? 0}`,
            `🥇 Best placement: ${lifetime.bestPlacement ?? '—'}`
        ];

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.font = `${Math.max(14, 16 * scale)}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';

        const startX = panelX + 18 * scale;
        let y = panelY + 34 * scale;
        const lineH = 24 * scale;
        for (const line of lines) {
            ctx.fillText(line, startX, y);
            y += lineH;
            if (y > panelY + panelH - 18 * scale) break;
        }

        ctx.restore();
    }

    renderUpgradesScreen() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);

        // Reset cached buy button bounds each render
        this.upgradesBuyButtons = [];

        // Refresh profile so post-match rewards show immediately after returning to menu
        this.profile = loadProfile();

        const centerX = this.canvas.width / 2;
        const topY = (this.logoBottomY || this.titleY) + 40 * scale;

        // Title
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(22, 28 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Upgrades', centerX, topY);

        // Level + currencies
        const xpInfo = getXpProgress(this.profile.xp);
        const infoY = topY + 40 * scale;
        ctx.font = `${Math.max(14, 18 * scale)}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillText(`Level ${xpInfo.level}  •  XP ${this.profile.xp}  •  Coins ${this.profile.coins}`, centerX, infoY);

        // XP bar
        const barW = Math.min(this.canvas.width * 0.76, 520);
        const barH = Math.max(10 * scale, 8);
        const barX = centerX - barW / 2;
        const barY = infoY + 16 * scale;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(barX, barY, barW * xpInfo.progress01, barH);
        ctx.font = `${Math.max(10, 12 * scale)}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fillText(`${xpInfo.currentLevelXp} → ${xpInfo.nextLevelXp}`, centerX, barY + barH + 14 * scale);

        // Upgrade list
        const listTop = barY + 48 * scale;
        const rowH = Math.max(70 * scale, 56);
        const rowW = Math.min(this.canvas.width * 0.86, 620);
        const rowX = centerX - rowW / 2;
        const upgrades = Object.values(META_CONFIG.catalog.upgrades || {});

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        for (let i = 0; i < upgrades.length; i++) {
            const upgrade = upgrades[i];
            const y = listTop + i * (rowH + 14 * scale);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
            ctx.lineWidth = 2;
            this.roundRect(ctx, rowX, y, rowW, rowH, 14);
            ctx.fill();
            ctx.stroke();

            const ownedLevel = getUpgradeLevel(this.profile, upgrade.id);
            const nextLevel = ownedLevel + 1;
            const nextDef = (upgrade.levels || []).find(l => l.index === nextLevel) || null;

            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(14, 18 * scale)}px Arial`;
            ctx.fillText(`${upgrade.displayName}  (Lv ${ownedLevel}/${(upgrade.levels || []).length})`, rowX + 18 * scale, y + 26 * scale);

            ctx.font = `${Math.max(11, 14 * scale)}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.fillText(upgrade.description || '', rowX + 18 * scale, y + 48 * scale);

            // Buy button
            const btnW = Math.max(110 * scale, 96);
            const btnH = Math.max(40 * scale, 34);
            const btnX = rowX + rowW - btnW - 16 * scale;
            const btnY = y + (rowH - btnH) / 2;

            let canBuy = false;
            let blockedReason = null;
            let btnLabel = 'MAX';

            if (nextDef) {
                btnLabel = `BUY ${nextDef.cost}`;
                const req = checkRequirements(this.profile, nextDef.requirements);
                if (!req.ok) {
                    blockedReason = req.reason;
                } else if (this.profile.coins < nextDef.cost) {
                    blockedReason = 'not_enough_coins';
                } else {
                    canBuy = true;
                }
            }

            ctx.fillStyle = canBuy ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.08)';
            ctx.strokeStyle = canBuy ? 'rgba(255, 255, 255, 0.35)' : 'rgba(255, 255, 255, 0.14)';
            ctx.lineWidth = 2;
            this.roundRect(ctx, btnX, btnY, btnW, btnH, 12);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = canBuy ? '#ffffff' : 'rgba(255, 255, 255, 0.6)';
            ctx.font = `bold ${Math.max(12, 14 * scale)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(btnLabel, btnX + btnW / 2, btnY + btnH / 2);

            if (nextDef && !canBuy && blockedReason) {
                ctx.textAlign = 'right';
                ctx.textBaseline = 'alphabetic';
                ctx.font = `${Math.max(10, 12 * scale)}px Arial`;
                ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
                const hint = blockedReason === 'requires_xp'
                    ? 'Need more XP'
                    : (blockedReason === 'requires_level' ? 'Need higher level' : (blockedReason === 'not_enough_coins' ? 'Need more coins' : 'Locked'));
                ctx.fillText(hint, btnX - 10 * scale, y + rowH - 12 * scale);
            }

            this.upgradesBuyButtons.push({ upgradeId: upgrade.id, x: btnX, y: btnY, w: btnW, h: btnH });
        }

        ctx.restore();
    }

    renderMultiplayerPlaceholder() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const titleSize = Math.max(22, 28 * scale);
        const bodySize = Math.max(14, 16 * scale);

        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText('Multiplayer', this.canvas.width / 2, this.canvas.height * 0.42);

        ctx.fillStyle = '#bbbbbb';
        ctx.font = `${bodySize}px Arial`;
        ctx.fillText('Connect via copy/paste, then Ready up.', this.canvas.width / 2, this.canvas.height * 0.48);
        ctx.restore();
    }

    

    renderBackButton() {
        this.renderMenuButton(this.backButton, '#e5e7eb', '#111827');
    }

    renderMenuButton(button, fillColor, textColor = '#000000') {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const textSize = Math.max(16, 18 * scale);

        ctx.save();
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;

        this.roundRect(
            ctx,
            button.x - button.width / 2,
            button.y - button.height / 2,
            button.width,
            button.height,
            10
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = textColor;
        ctx.font = `bold ${textSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(button.text, button.x, button.y);

        ctx.restore();
    }

    renderSoloSelection() {
        // Dynamic label for the center button based on step
        this.soloNavButtons.select.text = this.soloStep === 'character' ? 'SELECT' : 'SELECT';

        // Reset hit rect each frame; will be set by map panel.
        this.mapSettingsHitRect = null;

        if (this.soloStep === 'map') {
            this.renderSoloMapSelection();
        } else {
            this.renderSoloCharacterSelection();
        }

        // Nav buttons
        this.renderMenuButton(this.soloNavButtons.prev, '#e5e7eb', '#111827');
        this.renderMenuButton(this.soloNavButtons.select, '#4ade80', '#000000');
        this.renderMenuButton(this.soloNavButtons.next, '#e5e7eb', '#111827');
    }

    renderSoloCharacterSelection() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);

        const keys = this.getCharacterKeys();
        const key = this.selectedCharacter || keys[0];
        const character = CHARACTERS[key];

        const topY = Math.max(this.logoBottomY + 12 * scale, 96 * scale);
        let panelW = Math.min(this.canvas.width * 0.90, 640 * scale);
        const gap = 24 * scale;

        const navTopY = this.soloNavButtons.prev.y - this.soloNavButtons.prev.height / 2;
        const availableH = Math.max(220 * scale, navTopY - topY) - 36;
        const minInfoH = 150 * scale;

        let previewH = panelW * (16 / 9);
        let infoH = availableH - previewH - gap;

        if (infoH < minInfoH) {
            // Shrink preview (keeping 16:9) to make room for info
            previewH = Math.max(120 * scale, availableH - gap - minInfoH);
            panelW = Math.min(panelW, previewH * (16 / 9));
            infoH = availableH - previewH - gap;
        }

        infoH = Math.max(minInfoH, Math.min(infoH, 260 * scale));

        const panelX = (this.canvas.width - panelW) / 2;
        const previewY = topY;
        const infoY = previewY + previewH + gap;

        ctx.save();

        // Preview box
        const characterColor = character?.color || '#4ade80';
        this.fillAnimatedColorGradientRect(panelX, previewY, panelW, previewH, characterColor);
        this.roundRect(ctx, panelX, previewY, panelW, previewH, 14);
        ctx.fill();
        ctx.stroke();

        // Image (big preview)
        const img = this.assetLoader?.getCharacterMenuPreviewImage?.(character?.type) || null;
        if (img) {
            const pad = 14 * scale;
            this.drawImageContain(img, panelX + pad, previewY + pad, panelW - pad * 2, previewH - pad * 2);
        } else {
            // Fallback: use in-game character png or circle
            const radius = Math.min(panelW, previewH) * 0.18;
            const cx = panelX + panelW / 2;
            const cy = previewY + previewH / 2;
            const rendered = this.drawCharacterPreviewImage(character?.type, cx, cy, radius);
            if (!rendered) {
                ctx.fillStyle = character?.color || '#4ade80';
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        }

        // Bottom gradient strip with avatar + stats
        const stripH = Math.min(92 * scale, Math.max(64 * scale, previewH * 0.26));
        const stripY = previewY + previewH - stripH;
        const stripPadX = 14 * scale;

        const stripGrad = ctx.createLinearGradient(panelX, stripY, panelX + panelW, stripY);
        stripGrad.addColorStop(0, 'rgba(15, 16, 28, 0.9)');
        stripGrad.addColorStop(1, 'rgba(15, 16, 28, 0.1)');
        ctx.fillStyle = stripGrad;
        ctx.fillRect(panelX, stripY, panelW, stripH);

        // Avatar
        const avatarR = Math.min(stripH * 0.36, 28 * scale);
        const avatarCX = panelX + stripPadX + avatarR;
        const avatarCY = stripY + stripH / 2;

        // Avatar background derived from character color
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
        ctx.clip();
        const avatarGrad = ctx.createRadialGradient(avatarCX, avatarCY - avatarR * 0.4, avatarR * 0.2, avatarCX, avatarCY, avatarR);
        avatarGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
        avatarGrad.addColorStop(1, characterColor);
        ctx.fillStyle = avatarGrad;
        ctx.fillRect(avatarCX - avatarR, avatarCY - avatarR, avatarR * 2, avatarR * 2);

        const sprite = this.assetLoader?.getCharacterImage?.(character?.type) || null;
        if (sprite) {
            const spritePad = Math.max(4, 6 * scale);
            const box = Math.max(2, avatarR * 2 - spritePad * 2);

            ctx.save();
            ctx.translate(avatarCX, avatarCY);
            ctx.rotate(- Math.PI / 2);
            this.drawImageContain(sprite, -box / 2, -box / 2, box, box);
            ctx.restore();
        }
        ctx.restore();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(avatarCX, avatarCY, avatarR, 0, Math.PI * 2);
        ctx.stroke();

        // Stats (0..100)
        const hp = Number(character?.maxHP ?? 0);
        const speed = Number(character?.moveSpeed ?? 0);
        const hpPct = Math.max(0, Math.min(1, hp / 100));
        const speedPct = Math.max(0, Math.min(1, speed / 100));

        const barsX = avatarCX + avatarR + 14 * scale;
        const barsW = (panelX + panelW) - barsX - stripPadX;
        const barH = Math.max(8 * scale, 9);
        const labelSize = Math.max(12, 14 * scale);
        const labelToBar = Math.max(4, 6 * scale);
        const blockGap = Math.max(8, 10 * scale);

        const blockH = labelSize + labelToBar + barH;
        const totalH = blockH * 2 + blockGap;
        const startY = stripY + (stripH - totalH) / 2;

        const label1Y = startY;
        const bar1Y = label1Y + labelSize + labelToBar;
        const label2Y = bar1Y + barH + blockGap;
        const bar2Y = label2Y + labelSize + labelToBar;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${labelSize}px Arial`;
        ctx.fillText(`Base HP - ${hp}/100`, barsX, label1Y);
        this.drawStatBar(barsX, bar1Y, barsW, barH, hpPct, '#ef4444');

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${labelSize}px Arial`;
        ctx.fillText(`Base Speed - ${speed}/100`, barsX, label2Y);
        this.drawStatBar(barsX, bar2Y, barsW, barH, speedPct, '#22c55e');

        // Info box
        ctx.fillStyle = '#1e2738';
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        this.roundRect(ctx, panelX, infoY, panelW, infoH, 14);
        ctx.fill();
        ctx.stroke();

        const titleSize = Math.max(20, 24 * scale);
        const bodySize = Math.max(14, 16 * scale);
        const padX = panelX + 14 * scale;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.fillText(character?.name || 'Character', padX, infoY + 12 * scale);

        const abilityName = character?.specialAbility?.type === 'dash'
            ? 'Dash'
            : character?.specialAbility?.type === 'groundSlam'
                ? 'Ground Slam'
                : (character?.specialAbility?.type || 'None');

        const abilityDesc = character?.specialAbility?.description || '';

        ctx.fillStyle = characterColor;
        ctx.font = `bold ${Math.max(15, 17 * scale)}px Arial`;
        ctx.fillText(`Special: ${abilityName}`, padX, infoY + 56 * scale);

        if (abilityDesc) {
            ctx.fillStyle = '#cbd5e1';
            ctx.font = `${Math.max(11, 13 * scale)}px Arial`;
            ctx.font = `italic ${Math.max(13, 15 * scale)}px Arial`;
            this.drawWrappedText(abilityDesc, padX, infoY + 88 * scale, panelW - 28 * scale, Math.max(16, 18 * scale), 3);
        }

        ctx.restore();
    }

    renderSoloMapSelection() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);

        const map = this.selectedMap || this.availableMaps[this.selectedMapIndex];

        const topY = Math.max(this.logoBottomY + 12 * scale, 96 * scale);
        let panelW = Math.min(this.canvas.width * 0.90, 640 * scale);
        const gap = 24 * scale;

        const navTopY = this.soloNavButtons.prev.y - this.soloNavButtons.prev.height / 2;
        const availableH = Math.max(220 * scale, navTopY - topY) - 36;
        const minInfoH = 150 * scale;

        let previewH = panelW * (16 / 9);
        let infoH = availableH - previewH - gap;
        if (infoH < minInfoH) {
            previewH = Math.max(120 * scale, availableH - gap - minInfoH);
            panelW = Math.min(panelW, previewH * (16 / 9));
            infoH = availableH - previewH - gap;
        }
        infoH = Math.max(minInfoH, Math.min(infoH, 260 * scale));

        const panelX = (this.canvas.width - panelW) / 2;
        const previewY = topY;
        const infoY = previewY + previewH + gap;

        ctx.save();

        // Preview box
        ctx.fillStyle = '#16213e';
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        this.roundRect(ctx, panelX, previewY, panelW, previewH, 14);
        ctx.fill();
        ctx.stroke();

        if (!this.mapsLoaded) {
            ctx.fillStyle = '#bbbbbb';
            ctx.font = `${Math.max(14, 16 * scale)}px Arial`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Loading maps…', panelX + panelW / 2, previewY + previewH / 2);
        } else if (map) {
            const pad = 12 * scale;
            this.drawMapPreview(map, panelX + pad, previewY + pad, panelW - pad * 2, previewH - pad * 2);
        }

        // Info box
        ctx.fillStyle = '#1e2738';
        ctx.strokeStyle = '#444444';
        ctx.lineWidth = 2;
        this.roundRect(ctx, panelX, infoY, panelW, infoH, 14);
        ctx.fill();
        ctx.stroke();

        const titleSize = Math.max(16, 20 * scale);
        const bodySize = Math.max(12, 14 * scale);
        const padX = panelX + 14 * scale;

        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${titleSize}px Arial`;
        ctx.fillText(map?.name || 'Map', padX, infoY + 12 * scale);

        ctx.fillStyle = '#bbbbbb';
        ctx.font = `${bodySize}px Arial`;
        const settingsY = infoY + 56 * scale;
        ctx.fillText('⚙ Settings', padX, settingsY);

        // Store hit rect for clicking
        // Make this a comfortable tap target (mobile-first): full-row width + ~44px height.
        const tapPaddingX = 10 * scale;
        const tapPaddingTop = 10 * scale;
        const tapHeight = Math.max(44 * scale, bodySize * 2.2);
        this.mapSettingsHitRect = {
            x: panelX + tapPaddingX,
            y: settingsY - tapPaddingTop,
            w: panelW - tapPaddingX * 2,
            h: tapHeight
        };

        ctx.restore();
    }
    
    renderCharacterCard(characterKey, index) {
        const ctx = this.ctx;
        const character = CHARACTERS[characterKey];
        const cardX = this.getCardX(index);
        const cardY = this.cardsY;
        const isSelected = characterKey === this.selectedCharacter;
        
        // Calculate scaled sizes
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const nameSize = Math.max(20, 28 * scale);
        const statsSize = Math.max(12, 16 * scale);
        const circleRadius = Math.max(35, 45 * scale);
        
        ctx.save();
        
        // Card background
        ctx.fillStyle = isSelected ? '#2d4a7c' : '#16213e';
        ctx.strokeStyle = isSelected ? '#4ade80' : '#444444';
        ctx.lineWidth = isSelected ? 4 : 2;
        
        const cornerRadius = 15;
        this.roundRect(ctx,
            cardX - this.cardWidth / 2,
            cardY - this.cardHeight / 2,
            this.cardWidth,
            this.cardHeight,
            cornerRadius
        );
        ctx.fill();
        ctx.stroke();
        
        // Character name
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${nameSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(character.name, cardX, cardY - this.cardHeight / 2 + 45 * scale);
        
        // Character visual - try PNG first, fallback to circle
        const rendered = this.drawCharacterPreviewImage(characterKey, cardX, cardY - 25 * scale, circleRadius);
        
        if (!rendered) {
            // Fallback to colored circle
            ctx.fillStyle = character.color;
            ctx.beginPath();
            ctx.arc(cardX, cardY - 25 * scale, circleRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();
        }
        
        // Character stats
        ctx.font = `${statsSize}px Arial`;
        ctx.textAlign = 'left';
        const statsX = cardX - this.cardWidth / 2 + 15;
        let statsY = cardY + 25 * scale;
        
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('Stats:', statsX, statsY);
        statsY += 22 * scale;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillText(`HP: ${character.maxHP}`, statsX, statsY);
        statsY += 20 * scale;
        ctx.fillText(`Speed: ${character.moveSpeed}`, statsX, statsY);
        statsY += 20 * scale;
        ctx.fillText(`Cooldown: ${(character.weaponCooldownMultiplier * 100).toFixed(0)}%`, statsX, statsY);
        statsY += 20 * scale;
        
        // Special ability
        const abilityName = character.specialAbility.type === 'dash' ? 'Dash' : 'Ground Slam';
        ctx.fillStyle = '#4ade80';
        ctx.fillText(`Ability: ${abilityName}`, statsX, statsY);
        
        ctx.restore();
    }
    
    renderMapSelection() {
        const ctx = this.ctx;
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const labelSize = Math.max(14, 18 * scale);
        
        // Label
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${labelSize}px Arial`;
        ctx.textAlign = 'left';
        ctx.fillText('Select Map:', 20, this.mapSectionY + 25);
        
        if (!this.mapsLoaded) {
            ctx.fillStyle = '#666666';
            ctx.font = `${labelSize}px Arial`;
            ctx.textAlign = 'center';
            ctx.fillText('Loading maps...', this.canvas.width / 2, this.mapSectionY + 120);
            return;
        }
        
        // Clip region for maps
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, this.mapSectionY + 40, this.canvas.width, this.mapCardHeight + 20);
        ctx.clip();
        
        // Render map cards
        this.availableMaps.forEach((map, index) => {
            this.renderMapCard(map, index);
        });
        
        ctx.restore();
        
        // Scroll indicators
        const maxScroll = Math.max(0, (this.mapCardWidth + this.mapCardSpacing) * this.availableMaps.length - this.canvas.width + 40);
        if (maxScroll > 0) {
            // Left arrow
            if (this.mapScrollOffset > 0) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.moveTo(15, this.mapSectionY + 140);
                ctx.lineTo(5, this.mapSectionY + 150);
                ctx.lineTo(15, this.mapSectionY + 160);
                ctx.fill();
            }
            
            // Right arrow
            if (this.mapScrollOffset < maxScroll) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                ctx.beginPath();
                ctx.moveTo(this.canvas.width - 15, this.mapSectionY + 140);
                ctx.lineTo(this.canvas.width - 5, this.mapSectionY + 150);
                ctx.lineTo(this.canvas.width - 15, this.mapSectionY + 160);
                ctx.fill();
            }
        }
    }
    
    renderMapCard(map, index) {
        const ctx = this.ctx;
        const x = this.getMapCardX(index);
        const y = this.mapSectionY + 40;
        const isSelected = index === this.selectedMapIndex;
        
        // Skip if off-screen
        if (x + this.mapCardWidth < 0 || x > this.canvas.width) return;
        
        // Card background
        ctx.fillStyle = isSelected ? '#2a4a2a' : '#1e2738';
        ctx.strokeStyle = isSelected ? '#4ade80' : '#444444';
        ctx.lineWidth = isSelected ? 3 : 2;
        
        this.roundRect(ctx, x, y, this.mapCardWidth, this.mapCardHeight, 10);
        ctx.fill();
        ctx.stroke();
        
        // Map preview
        this.drawMapPreview(map, x + 10, y + 10, this.mapCardWidth - 20, 120);
        
        // Map name
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 15px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(map.name, x + this.mapCardWidth / 2, y + 150);
        
        // Stats
        const counts = this.getMapCounts(map);
        ctx.font = '12px Arial';
        ctx.fillStyle = '#aaaaaa';
        ctx.textAlign = 'left';
        const statsX = x + 10;
        ctx.fillText(`Radius: ${map.radius}m`, statsX, y + 170);
        ctx.fillText(`Bushes: ${counts.bushes}`, statsX, y + 185);
        ctx.fillText(`Rocks: ${counts.obstacles}`, statsX + 80, y + 185);
        ctx.fillText(`Water: ${counts.waterAreas}`, statsX, y + 200);
    }
    
    drawMapPreview(map, x, y, width, height) {
        const ctx = this.ctx;
        const scale = Math.min(width, height) / (map.radius * 2);
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        // Frame
        ctx.save();
        ctx.fillStyle = '#0b1224';
        ctx.fillRect(x, y, width, height);

        const circleRadius = map.radius * scale * 0.9;

        // Clip to map circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
        ctx.clip();

        // Draw the map background INSIDE the circle (true preview)
        if (map.background?.type === 'image') {
            const filename = map?.background?.value;
            const imagePath = filename ? resolveMapBackgroundUrl(filename) : null;
            const entry = imagePath ? this.ensureMapPreviewImage(imagePath) : null;

            if (entry && entry.status === 'loaded' && entry.img) {
                const d = circleRadius * 2;
                this.drawImageContain(entry.img, centerX - circleRadius, centerY - circleRadius, d, d);
            } else {
                const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
                gradient.addColorStop(0, '#3a3a4a');
                gradient.addColorStop(1, '#2a2a3a');
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, width, height);

                if (entry && entry.status === 'loading') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
                    ctx.font = '10px Arial';
                    ctx.textAlign = 'right';
                    ctx.fillText('loading…', x + width - 6, y + 14);
                }
            }
        } else {
            const bgColor = map.background?.value || '#2d3748';
            ctx.fillStyle = bgColor;
            ctx.fillRect(x, y, width, height);
        }

        // Draw actual map data (still clipped)
        if (map.mapData) {
            this.drawActualMapData(map.mapData, centerX, centerY, scale, map.radius);
        } else {
            this.drawSimplifiedIndicators(map, centerX, centerY, scale);
        }

        ctx.restore();

        // Border on top
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
        ctx.stroke();
    }
    
    drawActualMapData(mapData, centerX, centerY, scale, radius) {
        const ctx = this.ctx;
        
        // Calculate offset (map data is centered at 1500,1500 but we're drawing centered at centerX, centerY)
        const mapCenterX = 1500; // Default map center from map.js
        const mapCenterY = 1500;
        
        // Draw water areas (blue circles or rectangles)
        if (mapData.waterAreas && mapData.waterAreas.length > 0) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.5)';
            mapData.waterAreas.forEach(water => {
                const wx = centerX + (water.x - mapCenterX) * scale;
                const wy = centerY + (water.y - mapCenterY) * scale;
                
                if (water.radius !== undefined) {
                    // Circle water
                    const r = water.radius * scale;
                    if (r > 0.5) { // Only draw if visible
                        ctx.beginPath();
                        ctx.arc(wx, wy, r, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }
            });
        }
        
        // Draw obstacles (gray rectangles)
        if (mapData.obstacles && mapData.obstacles.length > 0) {
            ctx.fillStyle = 'rgba(120, 113, 108, 0.7)';
            mapData.obstacles.forEach(obstacle => {
                const ox = centerX + (obstacle.x - mapCenterX) * scale;
                const oy = centerY + (obstacle.y - mapCenterY) * scale;
                const w = obstacle.width * scale;
                const h = obstacle.height * scale;
                
                if (w > 0.5 && h > 0.5) { // Only draw if visible
                    ctx.fillRect(ox - w / 2, oy - h / 2, w, h);
                }
            });
        }
        
        // Draw bushes (green circles)
        if (mapData.bushes && mapData.bushes.length > 0) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.5)';
            mapData.bushes.forEach(bush => {
                const bx = centerX + (bush.x - mapCenterX) * scale;
                const by = centerY + (bush.y - mapCenterY) * scale;
                const r = bush.radius * scale;
                
                if (r > 0.5) { // Only draw if visible
                    ctx.beginPath();
                    ctx.arc(bx, by, r, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        }
    }
    
    drawSimplifiedIndicators(map, centerX, centerY, scale) {
        const ctx = this.ctx;

        const counts = this.getMapCounts(map);
        
        // Simplified indicators (fallback when map data not available)
        if (counts.waterAreas > 0) {
            ctx.fillStyle = 'rgba(59, 130, 246, 0.6)';
            const waterRadius = 6;
            for (let i = 0; i < Math.min(counts.waterAreas, 5); i++) {
                const angle = (Math.PI * 2 * i) / 5;
                const wx = centerX + Math.cos(angle) * (map.radius * scale * 0.5);
                const wy = centerY + Math.sin(angle) * (map.radius * scale * 0.5);
                ctx.beginPath();
                ctx.arc(wx, wy, waterRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        
        if (counts.obstacles > 0) {
            ctx.fillStyle = 'rgba(120, 113, 108, 0.8)';
            const obstacleSize = 5;
            for (let i = 0; i < Math.min(counts.obstacles, 8); i++) {
                const angle = (Math.PI * 2 * i) / 8 + Math.PI / 8;
                const ox = centerX + Math.cos(angle) * (map.radius * scale * 0.3);
                const oy = centerY + Math.sin(angle) * (map.radius * scale * 0.3);
                ctx.fillRect(ox - obstacleSize / 2, oy - obstacleSize / 2, obstacleSize, obstacleSize);
            }
        }
        
        if (counts.bushes > 0) {
            ctx.fillStyle = 'rgba(34, 197, 94, 0.6)';
            const bushRadius = 3;
            for (let i = 0; i < Math.min(counts.bushes, 12); i++) {
                const angle = (Math.PI * 2 * i) / 12;
                const bx = centerX + Math.cos(angle) * (map.radius * scale * 0.7);
                const by = centerY + Math.sin(angle) * (map.radius * scale * 0.7);
                ctx.beginPath();
                ctx.arc(bx, by, bushRadius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
    
    renderStartButton() {
        const ctx = this.ctx;
        const btn = this.startButton;
        
        ctx.save();
        
        // Calculate scaled font size
        const scale = Math.min(this.canvas.width / 720, this.canvas.height / 1280);
        const buttonTextSize = Math.max(18, 22 * scale);
        
        // Button background
        ctx.fillStyle = '#4ade80';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        
        this.roundRect(ctx,
            btn.x - btn.width / 2,
            btn.y - btn.height / 2,
            btn.width,
            btn.height,
            8
        );
        ctx.fill();
        ctx.stroke();
        
        // Button text
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${buttonTextSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(btn.text, btn.x, btn.y);
        
        ctx.restore();
    }
    
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    drawImageCover(img, x, y, width, height) {
        const ctx = this.ctx;
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        if (!imgW || !imgH) {
            ctx.drawImage(img, x, y, width, height);
            return;
        }

        const imgRatio = imgW / imgH;
        const boxRatio = width / height;

        let sx = 0;
        let sy = 0;
        let sw = imgW;
        let sh = imgH;

        if (imgRatio > boxRatio) {
            // Image is wider than box: crop left/right
            sh = imgH;
            sw = Math.round(sh * boxRatio);
            sx = Math.round((imgW - sw) / 2);
        } else {
            // Image is taller than box: crop top/bottom
            sw = imgW;
            sh = Math.round(sw / boxRatio);
            sy = Math.round((imgH - sh) / 2);
        }

        ctx.drawImage(img, sx, sy, sw, sh, x, y, width, height);
    }

    drawImageContain(img, x, y, width, height) {
        const ctx = this.ctx;
        const imgW = img.naturalWidth || img.width;
        const imgH = img.naturalHeight || img.height;
        if (!imgW || !imgH) {
            ctx.drawImage(img, x, y, width, height);
            return;
        }

        const imgRatio = imgW / imgH;
        const boxRatio = width / height;

        let drawW = width;
        let drawH = height;
        if (imgRatio > boxRatio) {
            drawW = width;
            drawH = width / imgRatio;
        } else {
            drawH = height;
            drawW = height * imgRatio;
        }

        const dx = x + (width - drawW) / 2;
        const dy = y + (height - drawH) / 2;
        ctx.drawImage(img, dx, dy, drawW, drawH);
    }

    // ----- Character stat helpers -----

    getMaxCharacterStat(statKey) {
        let max = 0;
        for (const key of Object.keys(CHARACTERS)) {
            const v = Number(CHARACTERS[key]?.[statKey] ?? 0);
            if (v > max) max = v;
        }
        return max;
    }

    drawStatBar(x, y, width, height, pct, baseColor) {
        const ctx = this.ctx;

        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
        this.roundRect(ctx, x, y, width, height, Math.max(3, height / 2));
        ctx.fill();

        const fillW = Math.max(2, Math.floor(width * pct));
        const c1 = this.colorToRgba(this.adjustColor(baseColor, 0.15), 0.95);
        const c2 = this.colorToRgba(this.adjustColor(baseColor, -0.12), 0.95);
        const g = ctx.createLinearGradient(x, y, x + width, y);
        g.addColorStop(0, c1);
        g.addColorStop(1, c2);
        ctx.fillStyle = g;
        this.roundRect(ctx, x, y, fillW, height, Math.max(3, height / 2));
        ctx.fill();
        ctx.restore();
    }

    drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines = 2) {
        const ctx = this.ctx;
        const words = String(text).split(/\s+/).filter(Boolean);
        let line = '';
        let lineCount = 0;
        for (let i = 0; i < words.length; i++) {
            const testLine = line ? `${line} ${words[i]}` : words[i];
            if (ctx.measureText(testLine).width <= maxWidth) {
                line = testLine;
                continue;
            }

            if (line) {
                ctx.fillText(line, x, y + lineCount * lineHeight);
                lineCount++;
                if (lineCount >= maxLines) return;
            }
            line = words[i];
        }
        if (line && lineCount < maxLines) {
            ctx.fillText(line, x, y + lineCount * lineHeight);
        }
    }

    // ----- Animated gradients / color helpers -----

    fillAnimatedColorGradientRect(x, y, width, height, baseColor) {
        const ctx = this.ctx;
        const t = (typeof performance !== 'undefined' ? performance.now() : Date.now()) / 1000;

        const cA = this.adjustColor(baseColor, 0.12);
        const cB = this.adjustColor(baseColor, -0.18);
        const cC = this.adjustColor(baseColor, 0.04);

        const ox = (Math.sin(t * 0.9) + 1) * 0.5;
        const oy = (Math.cos(t * 0.7) + 1) * 0.5;
        const gx0 = x + width * (0.15 + 0.2 * ox);
        const gy0 = y + height * (0.1 + 0.25 * oy);
        const gx1 = x + width * (0.85 - 0.2 * ox);
        const gy1 = y + height * (0.9 - 0.25 * oy);

        const g = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
        g.addColorStop(0, this.colorToRgba(cA, 0.95));
        g.addColorStop(0.55, this.colorToRgba(cC, 0.85));
        g.addColorStop(1, this.colorToRgba(cB, 0.95));

        ctx.fillStyle = g;
    }

    parseHexColor(hex) {
        const h = String(hex || '').replace('#', '').trim();
        if (h.length === 3) {
            const r = parseInt(h[0] + h[0], 16);
            const g = parseInt(h[1] + h[1], 16);
            const b = parseInt(h[2] + h[2], 16);
            return { r, g, b };
        }
        if (h.length === 6) {
            const r = parseInt(h.slice(0, 2), 16);
            const g = parseInt(h.slice(2, 4), 16);
            const b = parseInt(h.slice(4, 6), 16);
            return { r, g, b };
        }
        return { r: 74, g: 222, b: 128 };
    }

    adjustColor(hex, amount) {
        const { r, g, b } = this.parseHexColor(hex);
        const adj = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * amount)));
        return { r: adj(r), g: adj(g), b: adj(b) };
    }

    colorToRgba(color, alpha = 1) {
        if (typeof color === 'string') {
            const { r, g, b } = this.parseHexColor(color);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        const r = Math.max(0, Math.min(255, Math.round(color.r)));
        const g = Math.max(0, Math.min(255, Math.round(color.g)));
        const b = Math.max(0, Math.min(255, Math.round(color.b)));
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // ----- Map settings modal + override plumbing -----

    ensureMapSettingsModal() {
        if (typeof document === 'undefined') return;
        if (document.getElementById('mapSettingsOverlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'mapSettingsOverlay';
        overlay.style.position = 'fixed';
        overlay.style.inset = '0';
        overlay.style.display = 'none';
        overlay.style.zIndex = '2000';
        overlay.style.background = 'rgba(0,0,0,0.6)';
        overlay.style.padding = '16px';
        overlay.style.boxSizing = 'border-box';

        const dialog = document.createElement('div');
        dialog.style.maxWidth = '520px';
        dialog.style.margin = '10vh auto 0';
        dialog.style.background = '#111827';
        dialog.style.border = '1px solid rgba(255,255,255,0.18)';
        dialog.style.borderRadius = '14px';
        dialog.style.padding = '14px';
        dialog.style.color = '#e5e7eb';
        dialog.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

        const title = document.createElement('div');
        title.id = 'mapSettingsTitle';
        title.style.fontWeight = '700';
        title.style.fontSize = '16px';
        title.style.marginBottom = '10px';
        title.textContent = 'Map Settings';

        const form = document.createElement('div');
        form.style.display = 'grid';
        form.style.gridTemplateColumns = '1fr 1fr';
        form.style.gap = '10px';

        const makeField = (id, labelText) => {
            const wrap = document.createElement('label');
            wrap.style.display = 'grid';
            wrap.style.gap = '6px';
            wrap.style.fontSize = '12px';

            const label = document.createElement('div');
            label.textContent = labelText;
            label.style.color = '#cbd5e1';

            const input = document.createElement('input');
            input.id = id;
            input.type = 'number';
            input.inputMode = 'numeric';
            input.style.width = '100%';
            input.style.padding = '10px';
            input.style.borderRadius = '10px';
            input.style.border = '1px solid rgba(255,255,255,0.18)';
            input.style.background = '#0b1224';
            input.style.color = '#e5e7eb';
            input.style.boxSizing = 'border-box';

            wrap.appendChild(label);
            wrap.appendChild(input);
            return wrap;
        };

        form.appendChild(makeField('cfg_aiCount', 'AI Count'));
        form.appendChild(makeField('cfg_targetDuration', 'Target Duration (sec)'));
        form.appendChild(makeField('cfg_shrinkDuration', 'Shrink Duration (sec)'));
        form.appendChild(makeField('cfg_damageTickRate', 'Damage Tick Rate (sec)'));
        form.appendChild(makeField('cfg_initialWeapons', 'Initial Weapons'));
        form.appendChild(makeField('cfg_initialConsumables', 'Initial Consumables'));

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.gap = '10px';
        actions.style.justifyContent = 'flex-end';
        actions.style.marginTop = '12px';

        const btnCancel = document.createElement('button');
        btnCancel.type = 'button';
        btnCancel.textContent = 'Cancel';
        btnCancel.style.padding = '10px 14px';
        btnCancel.style.borderRadius = '10px';
        btnCancel.style.border = '1px solid rgba(255,255,255,0.25)';
        btnCancel.style.background = '#111827';
        btnCancel.style.color = '#e5e7eb';

        const btnSave = document.createElement('button');
        btnSave.type = 'button';
        btnSave.textContent = 'Save';
        btnSave.style.padding = '10px 14px';
        btnSave.style.borderRadius = '10px';
        btnSave.style.border = '0';
        btnSave.style.background = '#4ade80';
        btnSave.style.color = '#000';
        btnSave.style.fontWeight = '700';

        btnCancel.addEventListener('click', () => this.closeMapSettingsModal());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.closeMapSettingsModal();
        });
        btnSave.addEventListener('click', () => this.saveMapSettingsFromModal());

        actions.appendChild(btnCancel);
        actions.appendChild(btnSave);

        dialog.appendChild(title);
        dialog.appendChild(form);
        dialog.appendChild(actions);
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    openMapSettingsModal() {
        if (typeof document === 'undefined') return;
        const overlay = document.getElementById('mapSettingsOverlay');
        if (!overlay) return;

        const map = this.selectedMap || this.availableMaps[this.selectedMapIndex];
        const title = document.getElementById('mapSettingsTitle');
        if (title) title.textContent = `Map Settings — ${map?.name || ''}`;

        const base = (map?.mapData?.gameConfig) || {};
        const override = this.getMapGameConfigOverride(map);
        const merged = this.deepMerge(this.deepClone(base), override);

        const setVal = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = (value ?? '').toString();
        };

        setVal('cfg_aiCount', merged?.match?.aiCount);
        setVal('cfg_targetDuration', merged?.match?.targetDuration);
        setVal('cfg_shrinkDuration', merged?.safeZone?.shrinkDuration);
        setVal('cfg_damageTickRate', merged?.safeZone?.damageTickRate);
        setVal('cfg_initialWeapons', merged?.loot?.initialWeapons);
        setVal('cfg_initialConsumables', merged?.loot?.initialConsumables);

        overlay.style.display = 'block';
    }

    closeMapSettingsModal() {
        if (typeof document === 'undefined') return;
        const overlay = document.getElementById('mapSettingsOverlay');
        if (overlay) overlay.style.display = 'none';
    }

    saveMapSettingsFromModal() {
        if (typeof document === 'undefined') return;
        const map = this.selectedMap || this.availableMaps[this.selectedMapIndex];
        if (!map) return;

        const getNum = (id) => {
            const el = document.getElementById(id);
            if (!el) return undefined;
            const s = String(el.value || '').trim();
            if (s === '') return undefined;
            const n = Number(s);
            return Number.isFinite(n) ? n : undefined;
        };

        const override = {
            match: {
                aiCount: getNum('cfg_aiCount'),
                targetDuration: getNum('cfg_targetDuration')
            },
            safeZone: {
                shrinkDuration: getNum('cfg_shrinkDuration'),
                damageTickRate: getNum('cfg_damageTickRate')
            },
            loot: {
                initialWeapons: getNum('cfg_initialWeapons'),
                initialConsumables: getNum('cfg_initialConsumables')
            }
        };

        const cleaned = this.stripUndefinedDeep(override);
        this.setMapGameConfigOverride(map, cleaned);
        this.closeMapSettingsModal();
    }

    getMapGameConfigOverride(map) {
        const key = map?.file || map?.name;
        return key ? (this.mapGameConfigOverrides.get(key) || {}) : {};
    }

    setMapGameConfigOverride(map, override) {
        const key = map?.file || map?.name;
        if (!key) return;
        this.mapGameConfigOverrides.set(key, override || {});
    }

    deepClone(obj) {
        try {
            return structuredClone(obj);
        } catch (e) {
            return JSON.parse(JSON.stringify(obj || {}));
        }
    }

    deepMerge(target, source) {
        if (!source || typeof source !== 'object') return target;
        for (const [k, v] of Object.entries(source)) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) target[k] = {};
                this.deepMerge(target[k], v);
            } else if (v !== undefined) {
                target[k] = v;
            }
        }
        return target;
    }

    stripUndefinedDeep(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        const out = Array.isArray(obj) ? [] : {};
        for (const [k, v] of Object.entries(obj)) {
            if (v && typeof v === 'object' && !Array.isArray(v)) {
                const child = this.stripUndefinedDeep(v);
                if (child && Object.keys(child).length > 0) out[k] = child;
            } else if (v !== undefined) {
                out[k] = v;
            }
        }
        return out;
    }
    
    // Draw character preview image (for start screen)
    drawCharacterPreviewImage(characterKey, x, y, radius) {
        if (!this.assetLoader) {
            return false;
        }

        const img = this.assetLoader.getCharacterImage(characterKey);
        if (!img) {
            return false;
        }

        const ctx = this.ctx;
        const size = radius * 2;
        
        // Draw character image
        ctx.drawImage(img, x - size / 2, y - size / 2, size, size);
        
        return true;
    }
    
    getSelectedCharacter() {
        return this.selectedCharacter;
    }
    
    getSelectedMap() {
        const map = this.selectedMap;
        if (!map) return null;

        const override = this.getMapGameConfigOverride(map);
        if (!override || Object.keys(override).length === 0) return map;

        const cloned = { ...map };
        if (!map.mapData) return cloned;

        const mapData = this.deepClone(map.mapData);
        mapData.gameConfig = this.deepMerge(mapData.gameConfig || {}, override);
        cloned.mapData = mapData;
        return cloned;
    }
    
    checkStartRequested() {
        const requested = this.menuState === 'solo' && this.startRequested;
        this.startRequested = false;

    // Initialize/resume audio context on user interaction (Start Game)
    if (requested && window.game && window.game.audioManager) {
        window.game.audioManager.init();
    }

        return requested;
    }

    checkMultiplayerStartRequested() {
        const requested = this.menuState === 'multiplayer' && this.multiplayerStartRequested;
        this.multiplayerStartRequested = false;

        const rawSession = this.multiplayerStartSession;
        this.multiplayerStartSession = null;

        if (!requested || !rawSession) return null;

        // Wrap to match expected interface in main.js
        return {
            session: {
                role: rawSession.role,
                seed: rawSession.seed,
                mapFile: rawSession.mapFile,
                connection: rawSession.connection
            },
            characterType: rawSession.characterType,
            selectedMap: rawSession.selectedMap,
            isHost: rawSession.role === 'host'
        };
    }
}