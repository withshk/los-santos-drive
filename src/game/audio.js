export class SoundManager {
  constructor() {
    this.ctx = null;
    this.initialized = false;
    this.muted = false;

    this.engineOsc1 = null;
    this.engineOsc2 = null;
    this.engineGain = null;
    this.engineFilter = null;

    this.screechGain = null;
    this.screechFilter = null;

    this.nitroGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;

    this.stations = ['RADIO OFF', 'NON-STOP SYNTH FM', 'WEST COAST CRUISE'];
    this.stationIndex = 0;
    this.radioStep = 0;
    this.radioAccum = 0;
  }

  unlock() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    try {
      this.ctx = new AudioCtx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.36;
      this.master.connect(this.ctx.destination);

      // Engine twin oscillators -> lowpass filter -> gain
      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 260;

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.0;

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.value = 55;

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'triangle';
      this.engineOsc2.frequency.value = 110;

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engineOsc1.start();
      this.engineOsc2.start();

      // Shared white noise buffer for tire screech & nitro jet
      const bufSize = this.ctx.sampleRate * 2;
      const noiseBuf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = noiseBuf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

      // Tire screech bandpass
      const screechSrc = this.ctx.createBufferSource();
      screechSrc.buffer = noiseBuf;
      screechSrc.loop = true;
      this.screechFilter = this.ctx.createBiquadFilter();
      this.screechFilter.type = 'bandpass';
      this.screechFilter.frequency.value = 1350;
      this.screechFilter.Q.value = 4.5;
      this.screechGain = this.ctx.createGain();
      this.screechGain.gain.value = 0;
      screechSrc.connect(this.screechFilter);
      this.screechFilter.connect(this.screechGain);
      this.screechGain.connect(this.master);
      screechSrc.start();

      // Nitro jet noise
      const nitroSrc = this.ctx.createBufferSource();
      nitroSrc.buffer = noiseBuf;
      nitroSrc.loop = true;
      const nitroFilter = this.ctx.createBiquadFilter();
      nitroFilter.type = 'bandpass';
      nitroFilter.frequency.value = 520;
      nitroFilter.Q.value = 1.2;
      this.nitroGain = this.ctx.createGain();
      this.nitroGain.gain.value = 0;
      nitroSrc.connect(nitroFilter);
      nitroFilter.connect(this.nitroGain);
      this.nitroGain.connect(this.master);
      nitroSrc.start();

      // LSPD Siren oscillator
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 650;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();

      this.initialized = true;
    } catch {
      this.initialized = false;
    }
  }

  cycleRadio() {
    this.unlock();
    this.stationIndex = (this.stationIndex + 1) % this.stations.length;
    this.radioStep = 0;
    this.radioAccum = 0;
    return this.stations[this.stationIndex];
  }

  get currentStation() {
    return this.stations[this.stationIndex];
  }

  playCollision(intensity = 0.6) {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(115 + intensity * 40, now);
    osc.frequency.exponentialRampToValueAtTime(28, now + 0.22);

    gain.gain.setValueAtTime(Math.min(0.45, 0.14 + intensity * 0.35), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playChime(freq = 660, duration = 0.18) {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.45, now + duration);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  update(dt, time, player, sirenStrength = 0) {
    if (!this.initialized || this.muted) return;
    const now = this.ctx.currentTime;

    // 1. Dynamic Engine / Jet / Helicopter Rotor Audio
    const vType = player.vehicleType;
    if (vType === 'heli') {
      // Rhythmic helicopter rotor blade chop!
      const chopRate = 11 + player.rpm * 10;
      const pulse = 0.55 + 0.45 * Math.sin(time * chopRate * Math.PI * 2);
      this.engineOsc1.frequency.setTargetAtTime(34 + player.rpm * 24, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(68 + player.rpm * 48, now, 0.04);
      this.engineFilter.frequency.setTargetAtTime(160 + pulse * 260, now, 0.03);
      this.engineGain.gain.setTargetAtTime((0.12 + player.rpm * 0.14) * pulse, now, 0.03);
    } else if (vType === 'plane') {
      const isJet = player.spec.bodyStyle === 'jet';
      const baseF = isJet ? 120 : 62;
      const targetF1 = baseF + player.rpm * (isJet ? 290 : 125) + (player.isNitro ? 75 : 0);
      this.engineOsc1.frequency.setTargetAtTime(targetF1, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(isJet ? targetF1 * 2.1 : targetF1 * 1.4, now, 0.04);
      this.engineFilter.frequency.setTargetAtTime(isJet ? 900 + player.rpm * 1800 : 350 + player.rpm * 650, now, 0.05);
      this.engineGain.gain.setTargetAtTime(0.11 + player.rpm * 0.14, now, 0.06);
    } else {
      const baseFreq = player.spec.bodyStyle === 'super' ? 68 : player.spec.bodyStyle === 'suv' ? 42 : 52;
      const targetF1 = baseFreq + player.rpm * 135 + (player.isNitro ? 35 : 0);
      this.engineOsc1.frequency.setTargetAtTime(targetF1, now, 0.04);
      this.engineOsc2.frequency.setTargetAtTime(targetF1 * 1.5, now, 0.04);
      this.engineFilter.frequency.setTargetAtTime(220 + player.rpm * 850, now, 0.05);
      const engineVol = 0.12 + player.rpm * 0.16;
      this.engineGain.gain.setTargetAtTime(engineVol, now, 0.06);
    }

    // 2. Tire Screech (cars only)
    const screechTarget =
      vType === 'car' && player.isDrifting && player.grounded ? Math.min(0.22, player.driftAngle * 0.55) : 0;
    this.screechGain.gain.setTargetAtTime(screechTarget, now, 0.05);

    // 3. Nitro / Jet Exhaust Whoosh
    const jetWhoosh = vType === 'plane' && player.spec.bodyStyle === 'jet' ? 0.09 + player.rpm * 0.16 : 0;
    this.nitroGain.gain.setTargetAtTime(player.isNitro ? 0.28 : jetWhoosh, now, 0.05);

    // 4. LSPD Police Siren
    const activeSiren = player.sirenOn ? 0.2 : sirenStrength * 0.18;
    if (activeSiren > 0.005) {
      const wail = 620 + Math.sin(time * 5.2) * 260;
      this.sirenOsc.frequency.setTargetAtTime(wail, now, 0.03);
      this.sirenGain.gain.setTargetAtTime(activeSiren, now, 0.06);
    } else {
      this.sirenGain.gain.setTargetAtTime(0, now, 0.08);
    }

    // 5. Procedural Los Santos FM Radio
    if (this.stationIndex > 0) {
      const stepTime = this.stationIndex === 1 ? 0.128 : 0.165;
      this.radioAccum += dt;
      if (this.radioAccum >= stepTime) {
        this.radioAccum -= stepTime;
        this.triggerRadioStep(this.stationIndex, this.radioStep++);
      }
    }
  }

  triggerRadioStep(station, step) {
    const now = this.ctx.currentTime;
    const s = step % 16;

    if (station === 1) {
      // NON-STOP SYNTH FM (Los Santos Night Drive Synthwave)
      const bassNotes = [55, 55, 55, 55, 65.4, 65.4, 73.4, 73.4, 49, 49, 49, 49, 61.7, 61.7, 65.4, 73.4];
      const arpNotes = [220, 261.6, 329.6, 392, 329.6, 261.6, 293.7, 349.2];

      // Driving 8th synth bass
      const bOsc = this.ctx.createOscillator();
      const bGain = this.ctx.createGain();
      bOsc.type = 'sawtooth';
      bOsc.frequency.setValueAtTime(bassNotes[s], now);
      bGain.gain.setValueAtTime(0.085, now);
      bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
      bOsc.connect(bGain);
      bGain.connect(this.master);
      bOsc.start(now);
      bOsc.stop(now + 0.12);

      // Kick drum on 0, 4, 8, 12
      if (s % 4 === 0) {
        const kOsc = this.ctx.createOscillator();
        const kGain = this.ctx.createGain();
        kOsc.frequency.setValueAtTime(125, now);
        kOsc.frequency.exponentialRampToValueAtTime(36, now + 0.11);
        kGain.gain.setValueAtTime(0.16, now);
        kGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        kOsc.connect(kGain);
        kGain.connect(this.master);
        kOsc.start(now);
        kOsc.stop(now + 0.13);
      }

      // Shimmering lead arp
      if (s % 2 === 0) {
        const aOsc = this.ctx.createOscillator();
        const aGain = this.ctx.createGain();
        aOsc.type = 'triangle';
        aOsc.frequency.setValueAtTime(arpNotes[(step >> 1) % arpNotes.length], now);
        aGain.gain.setValueAtTime(0.055, now);
        aGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        aOsc.connect(aGain);
        aGain.connect(this.master);
        aOsc.start(now);
        aOsc.stop(now + 0.2);
      }
    } else if (station === 2) {
      // WEST COAST CRUISE (Chill California G-Funk / Lo-Fi)
      const grooveBass = [73.4, 0, 0, 73.4, 0, 82.4, 87.3, 0, 65.4, 0, 0, 65.4, 0, 73.4, 82.4, 0];
      const leadGfunk = [587.3, 659.2, 587.3, 523.2, 440, 523.2, 587.3, 659.2];

      if (grooveBass[s] > 0) {
        const bOsc = this.ctx.createOscillator();
        const bGain = this.ctx.createGain();
        bOsc.type = 'sine';
        bOsc.frequency.setValueAtTime(grooveBass[s], now);
        bGain.gain.setValueAtTime(0.12, now);
        bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        bOsc.connect(bGain);
        bGain.connect(this.master);
        bOsc.start(now);
        bOsc.stop(now + 0.24);
      }
      if (s % 4 === 2) {
        const lOsc = this.ctx.createOscillator();
        const lGain = this.ctx.createGain();
        lOsc.type = 'sine';
        lOsc.frequency.setValueAtTime(leadGfunk[(step >> 2) % leadGfunk.length], now);
        lGain.gain.setValueAtTime(0.045, now);
        lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
        lOsc.connect(lGain);
        lGain.connect(this.master);
        lOsc.start(now);
        lOsc.stop(now + 0.3);
      }
    }
  }
}
