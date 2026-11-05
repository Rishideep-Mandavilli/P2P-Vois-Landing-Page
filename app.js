/**
 * VOIS P2P LANDING PAGE INTERACTIVE ENGINE
 * Features:
 * 1. Web Audio API radio sound synthesizer (Walkie-talkie squelch, mic click, roger beep, SOS siren)
 * 2. 2D Interactive Canvas Radio Mesh & Grid Blackout Simulator with drag-and-drop nodes
 * 3. Interactive SOS payload inspection & DND bypass preview
 * 4. SHA-256 Checksum clipboard copy
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // WEB AUDIO API SYNTHESIZER
  // ---------------------------------------------------------------------------
  let audioCtx = null;

  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Synthesize walkie-talkie microphone open squelch
  function playPttOpenSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Burst of bandpassed noise (radio squelch)
    const bufferSize = ctx.sampleRate * 0.06; // 60ms
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(3.0, now);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.06);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    whiteNoise.start(now);

    // Initial chirp tone
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, now + 0.02);
    osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05);

    oscGain.gain.setValueAtTime(0.15, now + 0.02);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);
    osc.start(now + 0.02);
    osc.stop(now + 0.06);
  }

  // Synthesize radio release click & roger chirp
  function playPttCloseSound() {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Roger double beep
    const beeps = [1760, 1200];
    beeps.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.04);
    });

    // Final squelch click
    const bufferSize = ctx.sampleRate * 0.04;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(2000, now + 0.1);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.2, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.14);

    whiteNoise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);
    whiteNoise.start(now + 0.1);
  }

  // Synthesize emergency SOS siren
  let sirenInterval = null;
  function playSosSiren() {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
      return;
    }

    let high = true;
    let cycles = 0;

    function toneBurst() {
      if (cycles > 10) {
        clearInterval(sirenInterval);
        sirenInterval = null;
        return;
      }
      cycles++;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(high ? 960 : 640, now);
      high = !high;

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.24);
    }

    toneBurst();
    sirenInterval = setInterval(toneBurst, 250);
  }

  // ---------------------------------------------------------------------------
  // INTERACTIVE PTT WALKIE-TALKIE BUTTON
  // ---------------------------------------------------------------------------
  const pttButton = document.getElementById('pttButton');
  const pttLabel = document.getElementById('ptt-label');
  const audioWaveArea = document.getElementById('audioWaveArea');
  const pttFeedback = document.getElementById('ptt-feedback');
  let isTalking = false;

  function startTalking(e) {
    if (e) e.preventDefault();
    if (isTalking) return;
    isTalking = true;
    pttButton.classList.add('talking');
    audioWaveArea.classList.add('active');
    pttLabel.textContent = 'TRANSMITTING...';
    pttFeedback.textContent = 'Channel open: 16kHz PCM → 8-bit ADPCM (323B/frame) streaming...';
    playPttOpenSound();

    // Trigger canvas packet stream
    spawnVoicePacketsContinuous();
  }

  function stopTalking(e) {
    if (e) e.preventDefault();
    if (!isTalking) return;
    isTalking = false;
    pttButton.classList.remove('talking');
    audioWaveArea.classList.remove('active');
    pttLabel.textContent = 'HOLD TO TALK';
    pttFeedback.textContent = 'Transmission finished. Roger chirp sent to peer jitter buffer.';
    playPttCloseSound();
    stopVoicePacketsContinuous();
  }

  if (pttButton) {
    pttButton.addEventListener('mousedown', startTalking);
    pttButton.addEventListener('mouseup', stopTalking);
    pttButton.addEventListener('mouseleave', stopTalking);

    pttButton.addEventListener('touchstart', startTalking, { passive: false });
    pttButton.addEventListener('touchend', stopTalking, { passive: false });
    pttButton.addEventListener('touchcancel', stopTalking, { passive: false });
  }

  // SOS Distress Siren Button
  const btnFireSos = document.getElementById('btn-fire-sos');
  if (btnFireSos) {
    btnFireSos.addEventListener('click', function () {
      playSosSiren();
      btnFireSos.textContent = sirenInterval ? 'Distress Siren Sounding... (Tap to Silence)' : 'Simulate SOS Distress Siren';
      if (btnFireSos.textContent.includes('Sounding')) {
        btnFireSos.style.backgroundColor = '#EF4444';
        btnFireSos.style.color = '#FFFFFF';
      } else {
        btnFireSos.style.backgroundColor = '';
        btnFireSos.style.color = '';
      }
    });
  }

  // ---------------------------------------------------------------------------
  // INTERACTIVE SOS PRESETS
  // ---------------------------------------------------------------------------
  const sosButtons = document.querySelectorAll('.sos-preset-btn');
  const sosCodePill = document.getElementById('sosCodePill');
  const sosPayloadJson = document.getElementById('sosPayloadJson');

  const sosData = {
    TRAPPED: {
      code: '0x01',
      desc: 'TRAPPED',
      json: {
        beacon_type: 'SOS_DISTRESS',
        preset: 'TRAPPED',
        timestamp_utc: new Date().toISOString(),
        gps: { lat: 13.0827, lon: 80.2707, acc_m: 4.2 },
        situation: 'Debris collapse, pinned limbs',
        battery_pct: 18,
        audio_siren_db: 100,
        hops_remaining: 5
      }
    },
    MEDICAL: {
      code: '0x02',
      desc: 'MEDICAL',
      json: {
        beacon_type: 'SOS_DISTRESS',
        preset: 'MEDICAL',
        timestamp_utc: new Date().toISOString(),
        gps: { lat: 13.0831, lon: 80.2714, acc_m: 3.8 },
        situation: 'Severe hemorrhage or fracture',
        battery_pct: 34,
        audio_siren_db: 100,
        hops_remaining: 5
      }
    },
    FLOOD: {
      code: '0x03',
      desc: 'FLOOD',
      json: {
        beacon_type: 'SOS_DISTRESS',
        preset: 'FLOOD',
        timestamp_utc: new Date().toISOString(),
        gps: { lat: 13.0845, lon: 80.2699, acc_m: 5.0 },
        situation: 'Water reaching 2nd floor, roof evacuation',
        battery_pct: 22,
        audio_siren_db: 100,
        hops_remaining: 5
      }
    },
    FIRE: {
      code: '0x04',
      desc: 'FIRE',
      json: {
        beacon_type: 'SOS_DISTRESS',
        preset: 'FIRE',
        timestamp_utc: new Date().toISOString(),
        gps: { lat: 13.0819, lon: 80.2721, acc_m: 6.1 },
        situation: 'Heavy smoke inhalation, stairway blocked',
        battery_pct: 45,
        audio_siren_db: 100,
        hops_remaining: 5
      }
    },
    WATER: {
      code: '0x05',
      desc: 'NEED WATER / FOOD',
      json: {
        beacon_type: 'SOS_DISTRESS',
        preset: 'NEED_WATER',
        timestamp_utc: new Date().toISOString(),
        gps: { lat: 13.0822, lon: 80.2703, acc_m: 4.5 },
        situation: 'Rations exhausted for 36 hours, infants present',
        battery_pct: 12,
        audio_siren_db: 85,
        hops_remaining: 5
      }
    },
    SAFE: {
      code: '0x06',
      desc: 'SAFE (RESOLVED)',
      json: {
        beacon_type: 'STATUS_UPDATE',
        preset: 'SAFE',
        timestamp_utc: new Date().toISOString(),
        gps: { lat: 13.0835, lon: 80.2709, acc_m: 3.1 },
        situation: 'Reached rescue shelter camp',
        battery_pct: 55,
        audio_siren_db: 0,
        hops_remaining: 5
      }
    }
  };

  sosButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      sosButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      const codeKey = btn.getAttribute('data-code');
      const item = sosData[codeKey];
      if (item) {
        sosCodePill.textContent = `CODE ${item.code}: ${item.desc}`;
        sosPayloadJson.textContent = JSON.stringify(item.json, null, 2);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // SHA-256 CHECKSUM CLIPBOARD COPY
  // ---------------------------------------------------------------------------
  const copyHashBtn = document.getElementById('copyHashBtn');
  const shaCode = document.getElementById('shaCode');
  if (copyHashBtn && shaCode) {
    copyHashBtn.addEventListener('click', () => {
      const text = shaCode.textContent.trim();
      navigator.clipboard.writeText(text).then(() => {
        copyHashBtn.textContent = 'Copied!';
        copyHashBtn.style.backgroundColor = '#10B981';
        copyHashBtn.style.color = '#042F24';
        setTimeout(() => {
          copyHashBtn.textContent = 'Copy Hash';
          copyHashBtn.style.backgroundColor = '';
          copyHashBtn.style.color = '';
        }, 2200);
      });
    });
  }

  // ---------------------------------------------------------------------------
  // INTERACTIVE 2D CANVAS RADIO MESH SIMULATOR
  // ---------------------------------------------------------------------------
  const canvas = document.getElementById('meshCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let isBlackout = false;
  let packets = [];
  let continuousStreamInterval = null;

  // Nodes definition
  const nodes = [
    {
      id: 'tower',
      name: 'Cell Tower (4G/5G)',
      type: 'tower',
      x: 450,
      y: 90,
      r: 26,
      color: '#38BDF8',
      online: true,
      labelOffset: -40
    },
    {
      id: 'victim',
      name: 'Trapped Node A (Victim)',
      type: 'phone',
      sub: 'Floor -2 / Rubble',
      x: 180,
      y: 300,
      r: 18,
      color: '#EF4444',
      signal: 0,
      battery: 18
    },
    {
      id: 'relay',
      name: 'Volunteer Relay B (Middle Phone)',
      type: 'phone',
      sub: 'Zero-CPU Relay',
      x: 450,
      y: 280,
      r: 18,
      color: '#10B981',
      signal: 0,
      battery: 84
    },
    {
      id: 'rescue',
      name: 'Responder Node C (Search Team)',
      type: 'phone',
      sub: 'NDRF Coordinator',
      x: 720,
      y: 300,
      r: 18,
      color: '#F59E0B',
      signal: 0,
      battery: 92
    }
  ];

  // Dragging support
  let draggedNode = null;
  let dragOffset = { x: 0, y: 0 };

  function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  canvas.addEventListener('mousedown', (e) => {
    const pos = getCanvasCoords(e);
    nodes.forEach((n) => {
      const dist = Math.hypot(n.x - pos.x, n.y - pos.y);
      if (dist <= n.r + 10) {
        draggedNode = n;
        dragOffset.x = pos.x - n.x;
        dragOffset.y = pos.y - n.y;
      }
    });
  });

  window.addEventListener('mousemove', (e) => {
    if (!draggedNode) return;
    const pos = getCanvasCoords(e);
    draggedNode.x = Math.max(draggedNode.r + 10, Math.min(canvas.width - draggedNode.r - 10, pos.x - dragOffset.x));
    draggedNode.y = Math.max(draggedNode.r + 10, Math.min(canvas.height - draggedNode.r - 10, pos.y - dragOffset.y));
  });

  window.addEventListener('mouseup', () => {
    draggedNode = null;
  });

  // Touch handlers for mobile
  canvas.addEventListener('touchstart', (e) => {
    const pos = getCanvasCoords(e);
    nodes.forEach((n) => {
      const dist = Math.hypot(n.x - pos.x, n.y - pos.y);
      if (dist <= n.r + 15) {
        draggedNode = n;
        dragOffset.x = pos.x - n.x;
        dragOffset.y = pos.y - n.y;
        e.preventDefault();
      }
    });
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    if (!draggedNode) return;
    const pos = getCanvasCoords(e);
    draggedNode.x = Math.max(draggedNode.r + 10, Math.min(canvas.width - draggedNode.r - 10, pos.x - dragOffset.x));
    draggedNode.y = Math.max(draggedNode.r + 10, Math.min(canvas.height - draggedNode.r - 10, pos.y - dragOffset.y));
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('touchend', () => {
    draggedNode = null;
  });

  // Controls bindings
  const btnToggleBlackout = document.getElementById('btn-toggle-blackout');
  const blackoutBtnText = document.getElementById('blackout-btn-text');
  const btnSendPacket = document.getElementById('btn-send-packet');
  const btnResetMesh = document.getElementById('btn-reset-mesh');
  const simStateText = document.getElementById('sim-state-text');

  function toggleBlackout() {
    isBlackout = !isBlackout;
    const tower = nodes.find((n) => n.id === 'tower');
    if (tower) tower.online = !isBlackout;

    if (isBlackout) {
      btnToggleBlackout.classList.add('active');
      blackoutBtnText.textContent = 'Restore Grid Power';
      simStateText.className = 'sim-state-value blackout';
      simStateText.textContent = 'GRID DOWN: Vois Radio Mesh Engaged';
      // Auto trigger voice packet
      triggerVoicePacketPath();
    } else {
      btnToggleBlackout.classList.remove('active');
      blackoutBtnText.textContent = 'Simulate Grid Blackout';
      simStateText.className = 'sim-state-value normal';
      simStateText.textContent = 'Cellular Grid Online';
    }
  }

  if (btnToggleBlackout) {
    btnToggleBlackout.addEventListener('click', toggleBlackout);
  }

  function triggerVoicePacketPath() {
    const victim = nodes.find((n) => n.id === 'victim');
    const relay = nodes.find((n) => n.id === 'relay');
    const rescue = nodes.find((n) => n.id === 'rescue');

    // Hop 1: Victim -> Relay
    packets.push({
      fromX: victim.x,
      fromY: victim.y,
      toX: relay.x,
      toY: relay.y,
      progress: 0,
      speed: 0.025,
      nextHop: { fromX: relay.x, fromY: relay.y, toX: rescue.x, toY: rescue.y },
      color: '#10B981',
      label: '323B ADPCM'
    });
  }

  function spawnVoicePacketsContinuous() {
    if (continuousStreamInterval) return;
    triggerVoicePacketPath();
    continuousStreamInterval = setInterval(triggerVoicePacketPath, 280);
  }

  function stopVoicePacketsContinuous() {
    if (continuousStreamInterval) {
      clearInterval(continuousStreamInterval);
      continuousStreamInterval = null;
    }
  }

  if (btnSendPacket) {
    btnSendPacket.addEventListener('click', () => {
      triggerVoicePacketPath();
      playPttOpenSound();
      setTimeout(playPttCloseSound, 400);
    });
  }

  if (btnResetMesh) {
    btnResetMesh.addEventListener('click', () => {
      isBlackout = false;
      const tower = nodes.find((n) => n.id === 'tower');
      if (tower) tower.online = true;
      btnToggleBlackout.classList.remove('active');
      blackoutBtnText.textContent = 'Simulate Grid Blackout';
      simStateText.className = 'sim-state-value normal';
      simStateText.textContent = 'Cellular Grid Online';
      // Reset positions
      nodes[0].x = 450; nodes[0].y = 90;
      nodes[1].x = 180; nodes[1].y = 300;
      nodes[2].x = 450; nodes[2].y = 280;
      nodes[3].x = 720; nodes[3].y = 300;
      packets = [];
    });
  }

  // Animation Loop
  let frameCount = 0;

  function render() {
    frameCount++;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const tower = nodes.find((n) => n.id === 'tower');
    const victim = nodes.find((n) => n.id === 'victim');
    const relay = nodes.find((n) => n.id === 'relay');
    const rescue = nodes.find((n) => n.id === 'rescue');

    // Draw background grid lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 1. Cellular connections (if tower is online)
    if (tower && tower.online) {
      [victim, relay, rescue].forEach((target) => {
        ctx.beginPath();
        ctx.setLineDash([4, 6]);
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.moveTo(tower.x, tower.y);
        ctx.lineTo(target.x, target.y);
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Animated tower pulse waves
      const pulseR = (frameCount % 80) * 2;
      ctx.beginPath();
      ctx.arc(tower.x, tower.y, pulseR, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${Math.max(0, 1 - pulseR / 160)})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Tower is dead (Blackout)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(tower.x - 70, tower.y - 45, 140, 90);
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 1;
      ctx.strokeRect(tower.x - 70, tower.y - 45, 140, 90);

      ctx.fillStyle = '#EF4444';
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO CARRIER / DEAD', tower.x, tower.y + 40);

      // Red X over tower
      ctx.beginPath();
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.moveTo(tower.x - 20, tower.y - 20);
      ctx.lineTo(tower.x + 20, tower.y + 20);
      ctx.moveTo(tower.x + 20, tower.y - 20);
      ctx.lineTo(tower.x - 20, tower.y + 20);
      ctx.stroke();
    }

    // 2. Vois P2P Radio Links (Wi-Fi Direct & Relays)
    // Draw link between Victim and Relay
    const distVictimRelay = Math.hypot(victim.x - relay.x, victim.y - relay.y);
    const distRelayRescue = Math.hypot(relay.x - rescue.x, relay.y - rescue.y);
    const distDirect = Math.hypot(victim.x - rescue.x, victim.y - rescue.y);

    // Victim to Relay Link
    ctx.beginPath();
    ctx.strokeStyle = isBlackout ? '#10B981' : 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = isBlackout ? 2.5 : 1.5;
    ctx.moveTo(victim.x, victim.y);
    ctx.lineTo(relay.x, relay.y);
    ctx.stroke();

    // Relay to Rescue Link
    ctx.beginPath();
    ctx.strokeStyle = isBlackout ? '#10B981' : 'rgba(16, 185, 129, 0.5)';
    ctx.lineWidth = isBlackout ? 2.5 : 1.5;
    ctx.moveTo(relay.x, relay.y);
    ctx.lineTo(rescue.x, rescue.y);
    ctx.stroke();

    // Link labels
    ctx.fillStyle = '#A7F3D0';
    ctx.font = '600 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    const mid1X = (victim.x + relay.x) / 2;
    const mid1Y = (victim.y + relay.y) / 2 - 12;
    ctx.fillText(`Wi-Fi Direct: ${(distVictimRelay * 0.18).toFixed(0)}m`, mid1X, mid1Y);

    const mid2X = (relay.x + rescue.x) / 2;
    const mid2Y = (relay.y + rescue.y) / 2 - 12;
    ctx.fillText(`Wi-Fi Direct: ${(distRelayRescue * 0.18).toFixed(0)}m`, mid2X, mid2Y);

    // Direct link if nodes are brought close together (< 250px canvas dist)
    if (distDirect < 260) {
      ctx.beginPath();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.moveTo(victim.x, victim.y);
      ctx.lineTo(rescue.x, rescue.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#38BDF8';
      ctx.fillText(`DIRECT LINK: ${(distDirect * 0.18).toFixed(0)}m`, (victim.x + rescue.x) / 2, (victim.y + rescue.y) / 2 + 20);
    }

    // 3. Render In-flight Packets
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.progress += p.speed;

      const currX = p.fromX + (p.toX - p.fromX) * p.progress;
      const currY = p.fromY + (p.toY - p.fromY) * p.progress;

      // Draw packet pulse
      ctx.beginPath();
      ctx.arc(currX, currY, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#34D399';
      ctx.shadowColor = '#10B981';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Packet label
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 9px JetBrains Mono, monospace';
      ctx.fillText(p.label, currX, currY - 10);

      // When packet reaches destination
      if (p.progress >= 1) {
        if (p.nextHop) {
          // Pass downstream to next hop (Zero-CPU relay)
          packets.push({
            fromX: p.nextHop.fromX,
            fromY: p.nextHop.fromY,
            toX: p.nextHop.toX,
            toY: p.nextHop.toY,
            progress: 0,
            speed: p.speed,
            nextHop: null,
            color: '#F59E0B',
            label: 'ZERO-CPU RELAY'
          });
        }
        packets.splice(i, 1);
      }
    }

    // 4. Render Nodes
    nodes.forEach((n) => {
      // Node halo
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r + 4, 0, Math.PI * 2);
      ctx.fillStyle = n.type === 'tower' ? (n.online ? 'rgba(56, 189, 248, 0.15)' : 'rgba(239, 68, 68, 0.1)') : 'rgba(255, 255, 255, 0.08)';
      ctx.fill();

      // Node core
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = n.type === 'tower' ? (n.online ? '#0C4A6E' : '#27272A') : '#0F172A';
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fill();

      // Inner icon or mark
      ctx.fillStyle = n.color;
      ctx.font = '700 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (n.type === 'tower') {
        ctx.fillText('⛛', n.x, n.y);
      } else {
        ctx.fillText('📱', n.x, n.y);
      }

      // Labels below node
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 12px Plus Jakarta Sans, sans-serif';
      ctx.fillText(n.name, n.x, n.y + n.r + 18);

      if (n.sub) {
        ctx.fillStyle = '#94A3B8';
        ctx.font = '500 10px JetBrains Mono, monospace';
        ctx.fillText(n.sub, n.x, n.y + n.r + 32);
      }
    });

    // Top status banner on canvas
    if (isBlackout) {
      ctx.fillStyle = 'rgba(6, 78, 59, 0.85)';
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(canvas.width / 2 - 210, 15, 420, 32, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#A7F3D0';
      ctx.font = '700 11px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('VOIS AUTONOMOUS MESH ACTIVE • ZERO-CPU RELAY ENGAGED', canvas.width / 2, 35);
    }

    requestAnimationFrame(render);
  }

  // Start rendering
  render();

})();
