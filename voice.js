/* Satish's introduction: audio preview and optional genuine video playback.
   Portrait coordinates can be overridden with normalized canvas data attributes.
   To enable a finished video, set data-video-src="assets/intro-video.mp4" on
   .hero-visual or #avatar-canvas. Nothing is requested unless that attribute exists. */
(() => {
  'use strict';

  const PORTRAIT = Object.freeze({
    mouthX: 529 / 1024,
    mouthY: 347 / 1536,
    mouthWidth: 108 / 1024,
    maxOpening: 10 / 1024,
  });
  const INTRO = "Hi, I'm Satish Patil, a Senior Business Analyst based in Pune. I bring ten years of experience across banking, lending, and payments, turning complex business needs into practical digital solutions. My work spans credit risk, loan journeys, and Agile delivery. With SQL, Python, and Generative AI, I connect financial expertise with technology to help teams deliver better experiences.";
  const SENTENCES = INTRO.match(/[^.!?]+[.!?]+/g).map((sentence) => sentence.trim());
  const ESTIMATED_DURATION = 31;
  const PLAY_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5a1 1 0 0 1 1.5-.86l10 6.5a1 1 0 0 1 0 1.72l-10 6.5A1 1 0 0 1 8 18.5z"/></svg>';
  const PAUSE_ICON = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';

  function initialize() {
    const playButton = document.getElementById('intro-play');
    if (!playButton) return;
    const stopButton = document.getElementById('intro-stop');
    const soundButton = document.getElementById('intro-sound');
    const soundLabel = document.getElementById('intro-sound-label');
    const icon = document.getElementById('intro-icon');
    const label = document.getElementById('intro-label');
    const status = document.getElementById('intro-status');
    const caption = document.getElementById('intro-caption');
    const progress = document.getElementById('intro-progress');
    const timeLabel = document.getElementById('intro-time');
    const durationLabel = document.getElementById('intro-duration');
    const canvas = document.getElementById('avatar-canvas');
    const fallback = document.getElementById('avatar-fallback');
    const heroVisual = document.querySelector('.hero-visual');
    const normalized = (value, defaultValue) => {
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : defaultValue;
    };
    const portrait = {
      mouthX: normalized(canvas?.dataset.mouthX, PORTRAIT.mouthX),
      mouthY: normalized(canvas?.dataset.mouthY, PORTRAIT.mouthY),
      mouthWidth: Math.max(0.002, normalized(canvas?.dataset.mouthWidth, PORTRAIT.mouthWidth)),
    };
    portrait.maxOpening = normalized(canvas?.dataset.mouthOpening, portrait.mouthWidth * 0.055);
    const videoSource = canvas?.dataset.videoSrc || heroVisual?.dataset.videoSrc;
    const videoCaptions = canvas?.dataset.videoCaptions || heroVisual?.dataset.videoCaptions;
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const audio = new Audio(playButton.dataset.audio || 'assets/intro.wav');
    audio.preload = 'metadata';
    let state = 'ready';
    let backend = videoSource ? 'video' : 'audio';
    let video;
    let starting = false;
    let inView = false;
    let manualHold = false;
    let playbackWasAutomatic = false;
    let requestId = 0;
    let audioContext;
    let analyser;
    let samples;
    let audioSource;
    let audioGraphAttempted = false;
    let utterance;
    let utteranceToken = 0;
    let speechStartedAt = 0;
    let speechElapsed = 0;
    let frameId = 0;
    let smoothedOpening = 0;
    let lastFrameAt = 0;
    let lastCaption = '';
    let portraitReady = false;
    let portraitImage;
    let context;
    let facePatch;

    const formatTime = (seconds) => {
      const value = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
      return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
    };
    const activeMedia = () => backend === 'video' ? video : audio;
    const duration = () => backend !== 'speech' && Number.isFinite(activeMedia()?.duration) ? activeMedia().duration : ESTIMATED_DURATION;
    const elapsed = () => backend !== 'speech' ? activeMedia()?.currentTime || 0 : speechElapsed + (state === 'playing' ? (performance.now() - speechStartedAt) / 1000 : 0);

    function setCaption(text) {
      if (caption && text !== lastCaption) {
        caption.textContent = text;
        lastCaption = text;
      }
    }

    function updateProgress() {
      const position = elapsed();
      const total = duration();
      const proportion = state === 'ended' ? 1 : Math.min(1, position / Math.max(1, total));
      if (progress) {
        progress.style.transform = `scaleX(${proportion})`;
        progress.setAttribute('aria-valuenow', String(Math.round(proportion * 100)));
      }
      if (timeLabel) timeLabel.textContent = `${formatTime(position)} / ${formatTime(total)}`;
      if (durationLabel) durationLabel.textContent = `${Math.round(total)} sec`;
      // Sentence captions use duration-weighted cues; the complete script is also available in intro.txt.
      if (state === 'playing' && backend !== 'video') {
        const target = proportion * INTRO.length;
        let boundary = 0;
        const sentence = SENTENCES.find((text) => { boundary += text.length + 1; return target <= boundary; });
        setCaption(sentence || SENTENCES[SENTENCES.length - 1]);
      }
    }

    function setState(next, message) {
      state = next;
      document.documentElement.dataset.introState = next;
      document.documentElement.dataset.introMedium = backend;
      const playing = next === 'playing';
      playButton.setAttribute('aria-pressed', String(playing));
      playButton.setAttribute('aria-label', playing ? 'Pause introduction' : next === 'paused' ? 'Resume introduction' : next === 'ended' ? 'Replay introduction' : 'Play introduction');
      if (label) label.textContent = backend === 'video' ? 'Meet Satish' : playing ? 'Pause introduction' : next === 'paused' ? 'Resume introduction' : next === 'ended' ? 'Replay introduction' : 'Meet Satish';
      if (icon) icon.innerHTML = playing ? PAUSE_ICON : PLAY_ICON;
      if (stopButton) stopButton.hidden = !(playing || next === 'paused');
      if (canvas) canvas.classList.toggle('is-speaking', playing && backend === 'audio' && !motionPreference.matches);
      if (video && next === 'ready') video.hidden = true;
      if (status) status.textContent = message || ({ready: backend === 'video' ? 'A digital hello · Captions on' : 'Voice introduction · Sound on', playing: backend === 'video' ? video.muted ? 'Sound off · Captions on' : 'Introducing myself · Sound on' : 'Introducing Satish · Synthetic voice', paused: 'Introduction paused', ended: 'Thanks for listening', error: 'The introduction is unavailable. Read the transcript below.'})[next];
      updateSoundControls();
      if (next === 'ready' || next === 'ended' || next === 'error') setCaption(INTRO);
      if (playing) startFrames();
      else {
        cancelAnimationFrame(frameId);
        frameId = 0;
        smoothedOpening = 0;
        drawPortrait(0);
      }
      updateProgress();
      document.dispatchEvent(new CustomEvent('satish:intro-state', {detail: {state: next}}));
    }

    function updateSoundControls() {
      if (!soundButton) return;
      soundButton.hidden = backend !== 'video';
      const muted = video?.muted !== false;
      soundButton.setAttribute('aria-label', muted ? 'Turn on introduction sound' : 'Mute introduction');
      soundButton.setAttribute('aria-pressed', String(!muted));
      if (soundLabel) soundLabel.textContent = muted ? 'Sound on' : 'Mute';
    }

    function setupVideo() {
      if (!videoSource) return;
      video = document.createElement('video');
      video.id = 'intro-video';
      video.className = 'intro-video';
      video.preload = 'metadata';
      video.playsInline = true;
      video.muted = true;
      video.defaultMuted = true;
      video.loop = !motionPreference.matches;
      video.controls = false;
      video.hidden = true;
      video.setAttribute('aria-label', 'Satish Patil’s video introduction');
      video.setAttribute('playsinline', '');
      video.setAttribute('muted', '');
      video.poster = canvas?.dataset.src || fallback?.getAttribute('src') || '';
      Object.assign(video.style, {position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'contain'});
      if (videoCaptions) {
        const track = document.createElement('track');
        track.kind = 'captions';
        track.label = 'English';
        track.srclang = 'en';
        track.src = videoCaptions;
        track.default = true;
        video.append(track);
      }
      const container = canvas?.parentElement || heroVisual;
      if (!container) { backend = 'audio'; return; }
      container.append(video);
      video.addEventListener('loadedmetadata', updateProgress);
      video.addEventListener('loadeddata', () => { if (backend === 'video' && state !== 'ready') video.hidden = false; });
      video.addEventListener('timeupdate', updateProgress);
      video.addEventListener('ended', () => {
        if (backend === 'video') {
          manualHold = true;
          setState('ended');
        }
      });
      video.addEventListener('volumechange', () => {
        updateSoundControls();
        if (backend === 'video' && state === 'playing') setState('playing');
      });
      video.addEventListener('error', () => {
        if (backend !== 'video') return;
        requestId++;
        video.pause();
        video.hidden = true;
        backend = 'audio';
        starting = false;
        playButton.removeAttribute('aria-busy');
        setState('error', 'Video is unavailable. Select Meet Satish for the voice introduction.');
      });
      video.src = videoSource;
    }

    function setupPortrait() {
      if (!canvas) return;
      context = canvas.getContext('2d', {alpha: true});
      if (!context) return;
      portraitImage = new Image();
      portraitImage.onload = () => {
        portraitReady = true;
        canvas.style.aspectRatio = `${portraitImage.naturalWidth} / ${portraitImage.naturalHeight}`;
        resizePortrait();
        canvas.dataset.ready = 'true';
        if (fallback) fallback.style.opacity = '0';
      };
      portraitImage.onerror = () => { canvas.hidden = true; };
      portraitImage.src = canvas.dataset.src || 'assets/satish-avatar.png';
      if ('ResizeObserver' in window) new ResizeObserver(resizePortrait).observe(canvas);
      else window.addEventListener('resize', resizePortrait, {passive: true});
    }

    function resizePortrait() {
      if (!portraitReady || !context) return;
      const displayedWidth = canvas.getBoundingClientRect().width || portraitImage.naturalWidth;
      const width = Math.min(portraitImage.naturalWidth, Math.ceil(displayedWidth * Math.min(window.devicePixelRatio || 1, 2)));
      const height = Math.round(width * portraitImage.naturalHeight / portraitImage.naturalWidth);
      if (canvas.width === width && canvas.height === height && facePatch) return;
      canvas.width = width;
      canvas.height = height;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.clearRect(0, 0, width, height);
      context.drawImage(portraitImage, 0, 0, width, height);
      const mouthX = width * portrait.mouthX;
      const mouthY = height * portrait.mouthY;
      const mouthWidth = width * portrait.mouthWidth;
      const patch = {
        x: Math.max(0, Math.floor(mouthX - mouthWidth)),
        y: Math.max(0, Math.floor(mouthY - mouthWidth * 0.25)),
      };
      patch.width = Math.min(width - patch.x, Math.ceil(mouthWidth * 2));
      patch.height = Math.min(height - patch.y, Math.ceil(mouthWidth * 1.25));
      try {
        patch.source = context.getImageData(patch.x, patch.y, patch.width, patch.height);
        patch.output = context.createImageData(patch.width, patch.height);
        patch.surface = document.createElement('canvas');
        patch.surface.width = patch.width;
        patch.surface.height = patch.height;
        patch.context = patch.surface.getContext('2d');
        facePatch = patch;
      } catch { facePatch = null; }
    }

    function drawPortrait(opening) {
      if (!portraitReady || !context) return;
      const width = canvas.width;
      const height = canvas.height;
      context.clearRect(0, 0, width, height);
      context.drawImage(portraitImage, 0, 0, width, height);
      if (opening < 0.015 || !facePatch || motionPreference.matches || backend !== 'audio') return;
      const p = facePatch;
      const mouthX = width * portrait.mouthX;
      const mouthY = height * portrait.mouthY;
      const mouthWidth = width * portrait.mouthWidth;
      const amount = width * portrait.maxOpening * opening;
      const pixels = p.source.data;
      const result = p.output.data;
      // Inverse-sample a small facial patch. A smooth falloff keeps the cheeks,
      // neckline and portrait silhouette stationary while the lower lip/jaw move.
      for (let y = 0; y < p.height; y++) {
        const dy = p.y + y - mouthY;
        const lowerLip = Math.max(0, Math.min(1, (dy + mouthWidth * 0.075) / (mouthWidth * 0.18)));
        const vertical = lowerLip * lowerLip * (3 - 2 * lowerLip) * Math.exp(-Math.pow(dy / (mouthWidth * 0.59), 2));
        for (let x = 0; x < p.width; x++) {
          const horizontal = Math.exp(-Math.pow((p.x + x - mouthX) / (mouthWidth * 0.59), 4));
          const sourceY = Math.max(0, Math.min(p.height - 1.001, y - amount * vertical * horizontal));
          const y0 = Math.floor(sourceY);
          const weight = sourceY - y0;
          const from = (y0 * p.width + x) * 4;
          const below = from + p.width * 4;
          const destination = (y * p.width + x) * 4;
          for (let channel = 0; channel < 4; channel++) result[destination + channel] = pixels[from + channel] * (1 - weight) + pixels[below + channel] * weight;
        }
      }
      p.context.putImageData(p.output, 0, 0);
      context.drawImage(p.surface, p.x, p.y);
      // This is a restrained audio-reactive preview, not a substitute for a
      // rendered talking-avatar video. No artificial mouth is painted over it.
    }

    async function setupAudioGraph() {
      if (audioGraphAttempted) {
        if (audioContext?.state === 'suspended') await audioContext.resume().catch(() => {});
        return;
      }
      audioGraphAttempted = true;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      try {
        audioContext = new AudioContextClass();
        await audioContext.resume();
        if (audioContext.state !== 'running') return;
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.55;
        samples = new Uint8Array(analyser.fftSize);
        audioSource = audioContext.createMediaElementSource(audio);
        audioSource.connect(analyser);
        analyser.connect(audioContext.destination);
      } catch {
        analyser = null;
        if (audioSource && audioContext) audioSource.connect(audioContext.destination);
      }
    }

    function audioOpening() {
      if (analyser && samples && backend === 'audio') {
        analyser.getByteTimeDomainData(samples);
        let energy = 0;
        for (let i = 0; i < samples.length; i++) energy += ((samples[i] - 128) / 128) ** 2;
        return Math.min(1, Math.max(0, (Math.sqrt(energy / samples.length) - 0.009) * 7));
      }
      // No simulated lip-sync when a real audio amplitude stream is unavailable.
      return 0;
    }

    function frame(now) {
      if (state !== 'playing') { frameId = 0; return; }
      if (now - lastFrameAt > 1000 / 30) {
        lastFrameAt = now;
        smoothedOpening += (audioOpening(now) - smoothedOpening) * 0.62;
        if (!motionPreference.matches && backend === 'audio') drawPortrait(smoothedOpening);
        updateProgress();
      }
      frameId = requestAnimationFrame(frame);
    }
    function startFrames() { if (!frameId) frameId = requestAnimationFrame(frame); }

    function startBrowserSpeech() {
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) {
        setState('error');
        return;
      }
      backend = 'speech';
      const token = ++utteranceToken;
      utterance = new SpeechSynthesisUtterance(INTRO);
      const voices = speechSynthesis.getVoices();
      utterance.voice = voices.find((voice) => /en[-_]IN/i.test(voice.lang) && /ravi|male/i.test(voice.name))
        || voices.find((voice) => /david|mark|daniel|aaron/i.test(voice.name) && /^en/i.test(voice.lang))
        || voices.find((voice) => /^en[-_]IN/i.test(voice.lang))
        || voices.find((voice) => /^en/i.test(voice.lang)) || null;
      utterance.lang = utterance.voice?.lang || 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1;
      speechElapsed = 0;
      speechStartedAt = performance.now();
      utterance.onstart = () => { if (token === utteranceToken) { speechStartedAt = performance.now(); setState('playing'); } };
      utterance.onend = () => { if (token === utteranceToken) { speechElapsed = duration(); setState('ended'); } };
      utterance.onerror = (event) => { if (token === utteranceToken && !['canceled', 'interrupted'].includes(event.error)) setState('error'); };
      speechSynthesis.speak(utterance);
      setState('playing');
    }

    function pause() {
      if (state !== 'playing' && !starting) return;
      requestId++;
      starting = false;
      playButton.removeAttribute('aria-busy');
      if (backend !== 'speech') activeMedia().pause();
      else {
        speechElapsed += (performance.now() - speechStartedAt) / 1000;
        speechSynthesis.pause();
      }
      setState('paused');
    }

    async function play(automatic = false) {
      if (starting || state === 'playing') return;
      if (automatic && (backend !== 'video' || manualHold || !inView || document.hidden || motionPreference.matches || state === 'ended' || state === 'error')) return;
      playbackWasAutomatic = automatic;
      if (state === 'paused' && backend === 'speech') {
        speechStartedAt = performance.now();
        speechSynthesis.resume();
        setState('playing');
        return;
      }
      if (backend === 'speech') { startBrowserSpeech(); return; }
      starting = true;
      const pending = ++requestId;
      playButton.setAttribute('aria-busy', 'true');
      if (stopButton) stopButton.hidden = false;
      if (status) status.textContent = 'Starting introduction…';
      const media = activeMedia();
      if (state === 'ended') media.currentTime = 0;
      try {
        if (backend === 'audio') await setupAudioGraph();
        if (pending !== requestId) return;
        if (backend === 'video') video.hidden = false;
        await media.play();
        // A newer request owns the element after a cancellation or rapid re-entry.
        if (pending !== requestId) return;
        if (document.hidden || (automatic && (!inView || manualHold || motionPreference.matches))) { media.pause(); setState('paused'); return; }
        setState('playing');
      } catch (error) {
        if (pending !== requestId) return;
        if (automatic || error.name === 'AbortError') {
          media.pause();
          setState('paused', 'Select play to meet Satish');
        }
        else if (error.name === 'NotAllowedError') setState('error', 'Select play to meet Satish, or read the introduction below.');
        else if (backend === 'video') {
          video.hidden = true;
          backend = 'audio';
          setState('error', 'Video is unavailable. Select Meet Satish for the voice introduction.');
        }
        else startBrowserSpeech();
      } finally {
        if (pending === requestId) {
          starting = false;
          playButton.removeAttribute('aria-busy');
        }
      }
    }

    function stop() {
      requestId++;
      utteranceToken++;
      audio.pause();
      audio.currentTime = 0;
      if (video) { video.pause(); video.currentTime = 0; }
      if (backend === 'speech') speechSynthesis.cancel();
      speechElapsed = 0;
      starting = false;
      playButton.removeAttribute('aria-busy');
      setState('ready');
    }

    function syncAutomaticPlayback() {
      if (document.hidden || !inView) pause();
      else void play(true);
    }

    function setupAutomaticPlayback() {
      const frame = canvas?.parentElement || heroVisual;
      if (!video || !frame) return;
      if ('IntersectionObserver' in window) {
        new IntersectionObserver(([entry]) => {
          inView = entry.isIntersecting && entry.intersectionRatio >= 0.35;
          syncAutomaticPlayback();
        }, {threshold: [0, 0.35], rootMargin: '-80px 0px 0px 0px'}).observe(frame);
      } else {
        const checkVisibility = () => {
          const rect = frame.getBoundingClientRect();
          const visibleHeight = Math.max(0, Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 80));
          inView = visibleHeight >= rect.height * 0.35;
          syncAutomaticPlayback();
        };
        window.addEventListener('scroll', checkVisibility, {passive: true});
        window.addEventListener('resize', checkVisibility, {passive: true});
        checkVisibility();
      }
      heroVisual?.addEventListener('pointerenter', (event) => {
        if (event.pointerType === 'mouse') syncAutomaticPlayback();
      });
    }

    playButton.addEventListener('click', () => {
      if (state === 'playing' || starting) {
        manualHold = true;
        pause();
      } else {
        manualHold = false;
        void play();
      }
    });
    stopButton?.addEventListener('click', () => { manualHold = true; stop(); });
    soundButton?.addEventListener('click', () => {
      if (backend !== 'video') return;
      video.muted = !video.muted;
      video.loop = video.muted && !motionPreference.matches;
      updateSoundControls();
      if (!video.muted) {
        playbackWasAutomatic = false;
        if (!manualHold) void play();
      }
    });
    audio.addEventListener('loadedmetadata', updateProgress);
    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('ended', () => { if (backend === 'audio') setState('ended'); });
    audio.addEventListener('error', () => {
      if (backend === 'audio' && state === 'playing') {
        audio.pause();
        setState('error', 'Audio was interrupted. Select Meet Satish to try again.');
      }
    });
    document.addEventListener('visibilitychange', syncAutomaticPlayback);
    window.addEventListener('pagehide', pause);
    window.addEventListener('pageshow', syncAutomaticPlayback);
    const updateMotion = () => {
      canvas?.classList.toggle('is-speaking', state === 'playing' && backend === 'audio' && !motionPreference.matches);
      if (video) video.loop = video.muted && !motionPreference.matches;
      if (motionPreference.matches) {
        drawPortrait(0);
        if (playbackWasAutomatic) pause();
      } else syncAutomaticPlayback();
    };
    if (motionPreference.addEventListener) motionPreference.addEventListener('change', updateMotion);
    else motionPreference.addListener(updateMotion);
    setupVideo();
    setupPortrait();
    setState('ready');
    setupAutomaticPlayback();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, {once: true});
  else initialize();
})();
