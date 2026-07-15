/**
 * Web Audio API synthesizer for alarms, ambient focus sounds, and synthesized lofi beats
 */

let audioCtx = null;
let activeAmbientSource = null;
let activeAlarmSource = null;
let lofiIntervalId = null;
let lofiBeatsPlaying = false;
let lofiTempo = 75; // BPM
let visualizerAnalyser = null;
let synthGainNode = null;

// Lazily initialize Audio Context
function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    visualizerAnalyser = audioCtx.createAnalyser();
    visualizerAnalyser.fftSize = 64;
    synthGainNode = audioCtx.createGain();
    synthGainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
    synthGainNode.connect(visualizerAnalyser);
    visualizerAnalyser.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Visualizer Data Getter
export function getVisualizerData() {
  if (!visualizerAnalyser) return new Uint8Array(0);
  const dataArray = new Uint8Array(visualizerAnalyser.frequencyBinCount);
  visualizerAnalyser.getByteFrequencyData(dataArray);
  return dataArray;
}

// Adjust global volume
export function setVolume(vol) {
  const ctx = getAudioContext();
  if (synthGainNode) {
    // Volume from 0 to 1
    synthGainNode.gain.setValueAtTime(vol, ctx.currentTime);
  }
}

// --- ALARM SOUNDS SYNTHESIS ---

export function playAlarmSound(type = 'digital') {
  const ctx = getAudioContext();
  stopAlarmSound(); // Stop any current alarm

  const alarmGain = ctx.createGain();
  alarmGain.connect(synthGainNode);
  
  if (type === 'digital') {
    // Digital double beep
    let isBeeping = true;
    const interval = setInterval(() => {
      if (!isBeeping) return;
      
      const now = ctx.currentTime;
      // First beep
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const beepGain = ctx.createGain();
      
      osc1.type = 'square';
      osc2.type = 'sine';
      
      osc1.frequency.setValueAtTime(987.77, now); // B5
      osc2.frequency.setValueAtTime(995.0, now); // subtle detune
      
      beepGain.gain.setValueAtTime(0, now);
      beepGain.gain.linearRampToValueAtTime(0.15, now + 0.02);
      beepGain.gain.setValueAtTime(0.15, now + 0.15);
      beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      
      osc1.connect(beepGain);
      osc2.connect(beepGain);
      beepGain.connect(alarmGain);
      
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.22);
      osc2.stop(now + 0.22);

      // Second beep (0.25s later)
      const now2 = now + 0.25;
      const osc1b = ctx.createOscillator();
      const osc2b = ctx.createOscillator();
      const beepGainb = ctx.createGain();
      
      osc1b.type = 'square';
      osc2b.type = 'sine';
      
      osc1b.frequency.setValueAtTime(987.77, now2);
      osc2b.frequency.setValueAtTime(995.0, now2);
      
      beepGainb.gain.setValueAtTime(0, now2);
      beepGainb.gain.linearRampToValueAtTime(0.15, now2 + 0.02);
      beepGainb.gain.setValueAtTime(0.15, now2 + 0.15);
      beepGainb.gain.exponentialRampToValueAtTime(0.001, now2 + 0.2);
      
      osc1b.connect(beepGainb);
      osc2b.connect(beepGainb);
      beepGainb.connect(alarmGain);
      
      osc1b.start(now2);
      osc2b.start(now2);
      osc1b.stop(now2 + 0.22);
      osc2b.stop(now2 + 0.22);
      
    }, 1000);
    
    activeAlarmSource = {
      stop: () => {
        isBeeping = false;
        clearInterval(interval);
        alarmGain.disconnect();
      }
    };
  } 
  else if (type === 'chime') {
    // Pleasant ambient bells playing arpeggio
    let isPlaying = true;
    const chords = [
      [261.63, 329.63, 392.00, 523.25], // C Major
      [293.66, 349.23, 440.00, 587.33], // D Minor
      [329.63, 392.00, 493.88, 659.25], // E Minor
      [349.23, 440.00, 523.25, 698.46]  // F Major
    ];
    
    let chordIdx = 0;
    
    const playChord = () => {
      if (!isPlaying) return;
      const now = ctx.currentTime;
      const notes = chords[chordIdx];
      
      notes.forEach((freq, noteIdx) => {
        const osc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + noteIdx * 0.15);
        
        // Bell envelope
        bellGain.gain.setValueAtTime(0, now + noteIdx * 0.15);
        bellGain.gain.linearRampToValueAtTime(0.2, now + noteIdx * 0.15 + 0.05);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + noteIdx * 0.15 + 1.8);
        
        // Add metallic ring (frequency multiplier harmonics)
        const harm = ctx.createOscillator();
        harm.type = 'sine';
        harm.frequency.setValueAtTime(freq * 2.5, now + noteIdx * 0.15);
        
        const harmGain = ctx.createGain();
        harmGain.gain.setValueAtTime(0, now + noteIdx * 0.15);
        harmGain.gain.linearRampToValueAtTime(0.05, now + noteIdx * 0.15 + 0.02);
        harmGain.gain.exponentialRampToValueAtTime(0.001, now + noteIdx * 0.15 + 0.5);
        
        osc.connect(bellGain);
        harm.connect(harmGain);
        
        bellGain.connect(alarmGain);
        harmGain.connect(alarmGain);
        
        osc.start(now + noteIdx * 0.15);
        harm.start(now + noteIdx * 0.15);
        osc.stop(now + noteIdx * 0.15 + 2.0);
        harm.stop(now + noteIdx * 0.15 + 2.0);
      });
      
      chordIdx = (chordIdx + 1) % chords.length;
    };
    
    playChord();
    const interval = setInterval(playChord, 3000);
    
    activeAlarmSource = {
      stop: () => {
        isPlaying = false;
        clearInterval(interval);
        alarmGain.disconnect();
      }
    };
  } 
  else if (type === 'zen') {
    // Deep rich Tibetan singing bowl simulation
    let isPlaying = true;
    const playBowl = () => {
      if (!isPlaying) return;
      const now = ctx.currentTime;
      const baseFreq = 180; // F3-ish
      
      const harmonics = [1, 1.5, 2, 2.6, 3, 3.7];
      const gains = [0.3, 0.15, 0.1, 0.05, 0.03, 0.02];
      
      harmonics.forEach((mult, index) => {
        const osc = ctx.createOscillator();
        const bowlGain = ctx.createGain();
        
        osc.type = 'sine';
        // Add slight detuning to create warm chorus beating
        osc.frequency.setValueAtTime(baseFreq * mult + (Math.random() * 2 - 1), now);
        
        bowlGain.gain.setValueAtTime(0, now);
        bowlGain.gain.linearRampToValueAtTime(gains[index], now + 1.5);
        bowlGain.gain.exponentialRampToValueAtTime(0.001, now + 7.5);
        
        osc.connect(bowlGain);
        bowlGain.connect(alarmGain);
        
        osc.start(now);
        osc.stop(now + 8);
      });
    };
    
    playBowl();
    const interval = setInterval(playBowl, 8000);
    
    activeAlarmSource = {
      stop: () => {
        isPlaying = false;
        clearInterval(interval);
        alarmGain.disconnect();
      }
    };
  }
}

export function stopAlarmSound() {
  if (activeAlarmSource) {
    try {
      activeAlarmSource.stop();
    } catch (e) {
      console.error(e);
    }
    activeAlarmSource = null;
  }
}


// --- AMBIENT SOUND GENERATION (White noise/Rain) ---

export function startAmbientSound(type = 'white-noise') {
  const ctx = getAudioContext();
  stopAmbientSound(); // Stop existing

  const bufferSize = 2 * ctx.sampleRate;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  
  if (type === 'white-noise') {
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  } else if (type === 'rain') {
    // Pink noise / Brownian noise mix for rain sound
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Filter to approximate pink/brownian noise
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Amplify
    }
  } else if (type === 'waves') {
    // Waves: modulated white noise
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;

  const filter = ctx.createBiquadFilter();
  const volumeNode = ctx.createGain();

  if (type === 'white-noise') {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(5000, ctx.currentTime);
    volumeNode.gain.setValueAtTime(0.04, ctx.currentTime);
  } else if (type === 'rain') {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, ctx.currentTime);
    volumeNode.gain.setValueAtTime(0.08, ctx.currentTime);
  } else if (type === 'waves') {
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, ctx.currentTime);
    volumeNode.gain.setValueAtTime(0.06, ctx.currentTime);
    
    // Wave modulation LFO (low frequency oscillator)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.1, ctx.currentTime); // 10s wave period
    
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0.04, ctx.currentTime);
    
    lfo.connect(lfoGain);
    lfoGain.connect(volumeNode.gain);
    lfo.start();
    
    // Hold reference to stop LFO
    activeAmbientSource = {
      stop: () => {
        noiseSource.stop();
        lfo.stop();
        noiseSource.disconnect();
        lfo.disconnect();
      }
    };
  }

  if (type !== 'waves') {
    noiseSource.connect(filter);
    filter.connect(volumeNode);
    volumeNode.connect(synthGainNode);
    noiseSource.start();
    
    activeAmbientSource = {
      stop: () => {
        noiseSource.stop();
        noiseSource.disconnect();
        filter.disconnect();
        volumeNode.disconnect();
      }
    };
  } else {
    noiseSource.connect(filter);
    filter.connect(volumeNode);
    volumeNode.connect(synthGainNode);
    noiseSource.start();
  }
}

export function stopAmbientSound() {
  if (activeAmbientSource) {
    try {
      activeAmbientSource.stop();
    } catch (e) {
      console.error(e);
    }
    activeAmbientSource = null;
  }
}


// --- LOFI BEAT GENERATOR (Procedural synthesized lofi) ---

export function startLofiBeats() {
  if (lofiBeatsPlaying) return;
  lofiBeatsPlaying = true;
  
  const ctx = getAudioContext();
  
  // Jazz chords in Roman numerals (Im7 - IV7 - V7 style) in D Minor
  // Chord notes (frequencies)
  const Dm7 = [146.83, 220.00, 261.63, 311.13, 349.23];
  const G7 = [196.00, 246.94, 293.66, 349.23, 392.00];
  const Cmaj7 = [130.81, 196.00, 246.94, 293.66, 329.63];
  const Fmaj7 = [174.61, 220.00, 261.63, 329.63, 349.23];
  
  const chords = [Dm7, G7, Cmaj7, Fmaj7];
  let chordIndex = 0;
  
  let beatCount = 0;
  const timeStep = 60 / lofiTempo; // Quarter note duration in seconds
  
  const playKick = (time) => {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(synthGainNode);
    
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    
    gainNode.gain.setValueAtTime(0.4, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
    
    osc.start(time);
    osc.stop(time + 0.16);
  };
  
  const playSnare = (time) => {
    // White noise snare
    const bufferSize = ctx.sampleRate * 0.15;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000, time);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.12, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(synthGainNode);
    
    noise.start(time);
    noise.stop(time + 0.13);
  };
  
  const playHat = (time) => {
    const bufferSize = ctx.sampleRate * 0.04;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(7000, time);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.05, time);
    gainNode.gain.exponentialRampToValueAtTime(0.001, time + 0.035);
    
    noise.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(synthGainNode);
    
    noise.start(time);
    noise.stop(time + 0.04);
  };
  
  const playChord = (frequencies, time, duration) => {
    const chordGain = ctx.createGain();
    chordGain.gain.setValueAtTime(0, time);
    chordGain.gain.linearRampToValueAtTime(0.06, time + 0.3); // Slow warm lofi attack
    chordGain.gain.setValueAtTime(0.06, time + duration - 0.5);
    chordGain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    chordGain.connect(synthGainNode);
    
    frequencies.forEach((freq) => {
      const osc = ctx.createOscillator();
      // Lofi triangle wave sounds very warm/mellow like a rhodes
      osc.type = 'triangle';
      
      // Mellow detuning and vibrato
      osc.frequency.setValueAtTime(freq + (Math.random() * 0.6 - 0.3), time);
      
      // Lowpass filter on chords to make them super warm/dusty
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, time);
      
      osc.connect(filter);
      filter.connect(chordGain);
      
      osc.start(time);
      osc.stop(time + duration);
    });
  };

  // Add subtle vinyl crackle loop in background
  const crackleGain = ctx.createGain();
  crackleGain.gain.setValueAtTime(0.015, ctx.currentTime);
  crackleGain.connect(synthGainNode);
  
  const crackleBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const crackleData = crackleBuffer.getChannelData(0);
  for (let i = 0; i < crackleData.length; i++) {
    // Mostly silence, occasionally spikes to simulate vinyl dust
    if (Math.random() > 0.9995) {
      crackleData[i] = Math.random() * 2 - 1;
    } else {
      crackleData[i] = 0;
    }
  }
  const crackleSrc = ctx.createBufferSource();
  crackleSrc.buffer = crackleBuffer;
  crackleSrc.loop = true;
  crackleSrc.connect(crackleGain);
  crackleSrc.start();
  
  // Simple scheduling queue (lookahead)
  let nextNoteTime = ctx.currentTime;
  const scheduleAheadTime = 0.1;
  
  const scheduler = () => {
    while (nextNoteTime < ctx.currentTime + scheduleAheadTime) {
      // 1. Play drums based on beat count
      const beat = beatCount % 4; // 4/4 time
      
      // Kick on 0, and on 2.5 (offbeat)
      if (beat === 0) {
        playKick(nextNoteTime);
      } else if (beat === 2) {
        // Double kick sometimes
        playKick(nextNoteTime);
        if (Math.random() > 0.5) playKick(nextNoteTime + timeStep * 0.5);
      }
      
      // Snare on 1 and 3
      if (beat === 1 || beat === 3) {
        playSnare(nextNoteTime);
      }
      
      // Hihats on eighth notes
      playHat(nextNoteTime);
      playHat(nextNoteTime + timeStep * 0.5);
      
      // 2. Play chord on beat 0, lasts for 4 beats (one bar)
      if (beat === 0) {
        const chordFreqs = chords[chordIndex];
        playChord(chordFreqs, nextNoteTime, timeStep * 3.8);
        chordIndex = (chordIndex + 1) % chords.length;
      }
      
      nextNoteTime += timeStep;
      beatCount++;
    }
  };
  
  lofiIntervalId = setInterval(scheduler, 50);
  
  // Save stop handler
  return {
    stop: () => {
      clearInterval(lofiIntervalId);
      crackleSrc.stop();
      crackleSrc.disconnect();
      crackleGain.disconnect();
      lofiBeatsPlaying = false;
    }
  };
}

export function isAmbientPlaying() {
  return activeAmbientSource !== null;
}
