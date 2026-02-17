/**
 * app.js
 * Main application controller for Lipi — Telugu Transliterator
 */

const app = (() => {

  // ─── State ────────────────────────────────────────────────────────────────
  let state = {
    inputText: '',
    outputText: '',
    engine: 'claude',
    suggestionsEnabled: true,
    apiKey: '',
    isLoading: false,
    isSpeaking: false,
    currentWord: '',          // word being typed (since last space)
    debounceTimer: null,
    suggestionTimer: null,
    suggestionIndex: -1,
    suggestions: [],
  };

  // ─── DOM refs ──────────────────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const inputEl     = () => $('input-text');
  const outputEl    = () => $('output-text');
  const engineSel   = () => $('engine-select');
  const sugToggle   = () => $('suggestions-toggle');
  const apiKeyEl    = () => $('claude-api-key');
  const sugBox      = () => $('suggestions-box');
  const loadingIcon = () => $('loading-icon');
  const readyIcon   = () => $('ready-icon');
  const engineLabel = () => $('engine-label');
  const outputLabel = () => $('output-engine-label');
  const inputCount  = () => $('input-count');
  const outputCount = () => $('output-count');
  const btnTTS      = () => $('btn-tts');
  const btnDownload = () => $('btn-download');
  const btnDelete   = () => $('btn-delete');

  // ─── Init ──────────────────────────────────────────────────────────────────
  function init() {
    // Restore saved settings
    state.apiKey = localStorage.getItem('lipi_claude_key') || '';
    state.engine = localStorage.getItem('lipi_engine') || 'claude';

    if (state.apiKey) apiKeyEl().value = state.apiKey;
    engineSel().value = state.engine;
    updateEngineLabel();

    // Bind events
    inputEl().addEventListener('input', onInput);
    inputEl().addEventListener('keydown', onKeyDown);
    engineSel().addEventListener('change', () => {
      state.engine = engineSel().value;
      localStorage.setItem('lipi_engine', state.engine);
      updateEngineLabel();
      if (state.inputText) triggerTransliterate(state.inputText, true);
    });
    sugToggle().addEventListener('change', () => {
      state.suggestionsEnabled = sugToggle().checked;
      if (!state.suggestionsEnabled) closeSuggestions();
    });
    apiKeyEl().addEventListener('keydown', e => { if (e.key === 'Enter') saveApiKey(); });

    // Close suggestions on outside click
    document.addEventListener('click', e => {
      if (!sugBox().contains(e.target) && e.target !== inputEl()) {
        closeSuggestions();
      }
    });

    // Check TTS support
    if (!TTS.isSupported()) {
      btnTTS().disabled = true;
      btnDownload().disabled = true;
      btnTTS().title = 'TTS not supported in this browser';
    }

    // Load voices
    TTS.init();

    console.log('Lipi Telugu Transliterator ready 🎉');
  }

  // ─── Engine label ──────────────────────────────────────────────────────────
  function updateEngineLabel() {
    const labels = {
      google: 'Google Input Tools',
      claude: 'Claude AI',
      auto:   'Auto (Google + Claude)',
    };
    engineLabel().textContent = labels[state.engine] || 'Ready';
    $('api-key-section').style.display =
      (state.engine === 'google') ? 'none' : 'flex';
  }

  // ─── Input handler ─────────────────────────────────────────────────────────
  function onInput(e) {
    const text = inputEl().value;
    state.inputText = text;
    updateInputCount(text);

    // Current word (last segment after space/newline)
    const words = text.split(/[\s\n]/);
    state.currentWord = words[words.length - 1] || '';

    // Show suggestions for current word
    if (state.suggestionsEnabled && state.currentWord.length >= 2) {
      clearTimeout(state.suggestionTimer);
      state.suggestionTimer = setTimeout(() => fetchSuggestions(state.currentWord), 250);
    } else {
      closeSuggestions();
    }

    // Debounce full transliteration
    clearTimeout(state.debounceTimer);
    if (!text.trim()) {
      setOutput('');
      return;
    }

    // Instant rule-based preview
    const preview = Transliterator.ruleBasedText(text);
    setOutput(preview, 'Phonetic preview…');

    // Proper engine transliteration after delay
    state.debounceTimer = setTimeout(() => triggerTransliterate(text), 700);
  }

  // ─── Key handler (suggestion navigation) ───────────────────────────────────
  function onKeyDown(e) {
    const open = sugBox().classList.contains('open');
    if (!open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.suggestionIndex = Math.min(state.suggestionIndex + 1, state.suggestions.length - 1);
      renderSuggestionFocus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.suggestionIndex = Math.max(state.suggestionIndex - 1, -1);
      renderSuggestionFocus();
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (state.suggestionIndex >= 0) {
        e.preventDefault();
        applySuggestion(state.suggestions[state.suggestionIndex].telugu);
      }
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  }

  // ─── Transliteration ────────────────────────────────────────────────────────
  async function triggerTransliterate(text, force = false) {
    if (!text.trim()) return;
    if (state.isLoading && !force) return;

    state.isLoading = true;
    showLoading(true);

    try {
      let result = '';
      const engine = state.engine;

      if (engine === 'google') {
        result = await Transliterator.googleTransliterateText(text);
        setOutput(result, 'via Google Input Tools');

      } else if (engine === 'claude') {
        const key = state.apiKey || apiKeyEl().value.trim();
        if (!key) {
          // Fall back to rule-based if no key
          result = Transliterator.ruleBasedText(text);
          setOutput(result, 'Phonetic (add Claude API key for AI)');
          toast('Add a Claude API key for best results', 'info');
        } else {
          result = await Transliterator.claudeTransliterate(text, key);
          setOutput(result, 'via Claude AI ✦');
        }

      } else if (engine === 'auto') {
        // Try Google first
        try {
          result = await Transliterator.googleTransliterateText(text);
          setOutput(result, 'via Google Input Tools');
        } catch {
          // Fall back to Claude
          const key = state.apiKey || apiKeyEl().value.trim();
          if (key) {
            result = await Transliterator.claudeTransliterate(text, key);
            setOutput(result, 'via Claude AI (fallback) ✦');
          } else {
            result = Transliterator.ruleBasedText(text);
            setOutput(result, 'Phonetic fallback');
          }
        }
      }

    } catch (err) {
      console.warn('Transliteration error:', err.message);
      // Fallback to rule-based
      const rb = Transliterator.ruleBasedText(text);
      setOutput(rb, 'Phonetic fallback');
      toast(err.message || 'Transliteration failed, using phonetic fallback', 'error');
    } finally {
      state.isLoading = false;
      showLoading(false);
    }
  }

  // ─── Suggestions ────────────────────────────────────────────────────────────
  async function fetchSuggestions(word) {
    if (!state.suggestionsEnabled || !word) return;

    try {
      const sugs = await Transliterator.getSuggestions(word);
      state.suggestions = sugs;
      state.suggestionIndex = -1;
      renderSuggestions(sugs, word);
    } catch {
      closeSuggestions();
    }
  }

  function renderSuggestions(sugs, word) {
    if (!sugs.length) { closeSuggestions(); return; }

    sugBox().innerHTML = sugs.map((s, i) => `
      <div class="suggestion-item" data-index="${i}" onclick="app.applySuggestion('${s.telugu.replace(/'/g, "\\'")}')">
        <span class="suggestion-telugu">${s.telugu}</span>
        <span class="suggestion-roman">${s.hint || word}</span>
        <span class="suggestion-badge">${s.source}</span>
      </div>
    `).join('');

    sugBox().classList.add('open');
  }

  function renderSuggestionFocus() {
    const items = sugBox().querySelectorAll('.suggestion-item');
    items.forEach((el, i) => {
      el.classList.toggle('focused', i === state.suggestionIndex);
    });
  }

  function closeSuggestions() {
    sugBox().classList.remove('open');
    sugBox().innerHTML = '';
    state.suggestions = [];
    state.suggestionIndex = -1;
  }

  function applySuggestion(teluguWord) {
    // Replace the last typed word in the input with suggested transliteration
    // and append it to the output
    const input = inputEl().value;
    const words = input.split(/(\s+)/);
    words[words.length - 1] = words[words.length - 1]; // keep input as-is

    // Append the chosen Telugu word to the output (replace last predicted segment)
    const outWords = state.outputText.split(/(\s+)/);
    outWords[outWords.length - 1] = teluguWord;
    const newOutput = outWords.join('');
    setOutput(newOutput, 'suggestion applied');

    closeSuggestions();
    inputEl().focus();
  }

  // ─── Output helpers ──────────────────────────────────────────────────────────
  function setOutput(text, sourceLabel = '') {
    state.outputText = text;
    const el = outputEl();

    if (!text) {
      el.innerHTML = '<span class="output-placeholder">తెలుగు అక్షరాలు ఇక్కడ కనిపిస్తాయి…</span>';
      btnTTS().disabled = true;
      btnDownload().disabled = true;
    } else {
      el.textContent = text;
      btnTTS().disabled = false;
      btnDownload().disabled = false;
    }

    if (sourceLabel) outputLabel().textContent = sourceLabel;
    updateOutputCount(text);
  }

  function showLoading(show) {
    loadingIcon().classList.toggle('hidden', !show);
    readyIcon().classList.toggle('hidden', show);
  }

  // ─── Count helpers ────────────────────────────────────────────────────────────
  function countWords(text) {
    return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  }
  function updateInputCount(text) {
    inputCount().textContent = `${text.length} chars · ${countWords(text)} words`;
  }
  function updateOutputCount(text) {
    outputCount().textContent = `${text.length} chars · ${countWords(text)} words`;
  }

  // ─── Public actions ──────────────────────────────────────────────────────────

  function clear() {
    inputEl().value = '';
    state.inputText = '';
    state.currentWord = '';
    setOutput('');
    updateInputCount('');
    closeSuggestions();
    clearTimeout(state.debounceTimer);
    inputEl().focus();
  }

  async function copy() {
    const text = state.outputText;
    if (!text) { toast('Nothing to copy', 'error'); return; }
    try {
      await navigator.clipboard.writeText(text);
      const btn = $('btn-copy');
      btn.classList.add('copied');
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      }, 2000);
      toast('Telugu text copied!', 'success');
    } catch {
      toast('Copy failed — please copy manually', 'error');
    }
  }

  function speak() {
    if (!state.outputText) { toast('Nothing to speak', 'error'); return; }
    if (state.isSpeaking) { TTS.stop(); return; }

    const btn = btnTTS();
    state.isSpeaking = true;
    btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Stop`;

    TTS.speak(state.outputText, {
      onStart: () => {},
      onEnd: () => {
        state.isSpeaking = false;
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Speak`;
      },
      onError: (err) => {
        state.isSpeaking = false;
        btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg> Speak`;
        if (err !== 'canceled') toast('Speech error: ' + err, 'error');
      },
    });

    toast(`🔊 ${TTS.getVoiceInfo()}`, 'info');
  }

  async function downloadAudio() {
    if (!state.outputText) { toast('No Telugu text to download', 'error'); return; }

    const btn = btnDownload();
    btn.disabled = true;
    btn.textContent = 'Fetching…';

    try {
      await TTS.downloadAudio(state.outputText, 'telugu-transliteration.mp3');
      toast('Audio downloaded!', 'success');
    } catch (e) {
      toast(e.message || 'Audio download failed', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Audio`;
    }
  }

  function saveApiKey() {
    const key = apiKeyEl().value.trim();
    if (!key) { toast('Please enter an API key', 'error'); return; }
    if (!key.startsWith('sk-ant-')) {
      toast('Key should start with sk-ant-...', 'error'); return;
    }
    state.apiKey = key;
    localStorage.setItem('lipi_claude_key', key);
    toast('API key saved!', 'success');
    // Re-transliterate if there's text
    if (state.inputText) triggerTransliterate(state.inputText, true);
  }

  // ─── Toast ────────────────────────────────────────────────────────────────────
  let toastTimer;
  function toast(msg, type = '') {
    const el = $('toast');
    el.textContent = msg;
    el.className = 'toast show' + (type ? ' ' + type : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.className = 'toast'; }, 3200);
  }

  // ─── Boot ─────────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', init);

  // Public
  return { clear, copy, speak, downloadAudio, saveApiKey, applySuggestion, toast };

})();
