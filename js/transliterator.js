/**
 * transliterator.js
 * Handles English → Telugu transliteration
 * Engines: Google Input Tools, Claude AI, rule-based fallback
 */

const Transliterator = (() => {

  // ─── Rule-based phonetic fallback ───────────────────────────────────────
  // Comprehensive English → Telugu phonetic map
  const PHONETIC_MAP = [
    // Multi-char first (order matters — longest match first)
    ['ksh', 'క్ష'], ['jna', 'జ్ఞ'], ['shr', 'శ్ర'],
    ['thr', 'థ్ర'], ['dhr', 'ధ్ర'], ['ndr', 'న్ద్ర'],
    ['ntr', 'న్త్ర'], ['str', 'స్త్ర'], ['spr', 'స్ప్ర'],
    // Vowels (long first)
    ['aa', 'ా'], ['ee', 'ీ'], ['ii', 'ీ'], ['oo', 'ూ'], ['uu', 'ూ'],
    ['ai', 'ై'], ['au', 'ౌ'], ['ou', 'ౌ'],
    ['ae', 'ే'], ['ei', 'ై'],
    ['oa', 'ో'],
    // Aspirated consonants
    ['kh', 'ఖ'], ['gh', 'ఘ'], ['ch', 'చ'], ['jh', 'ఝ'],
    ['th', 'థ'], ['dh', 'ధ'], ['ph', 'ఫ'], ['bh', 'భ'],
    ['sh', 'శ'], ['zh', 'ళ'], ['nh', 'ణ'],
    // Retroflex
    ['tt', 'ట'], ['dd', 'డ'], ['nn', 'న'],
    ['ll', 'ళ'], ['rr', 'ర'],
    // Single consonants
    ['k', 'క'], ['g', 'గ'], ['c', 'చ'], ['j', 'జ'],
    ['t', 'త'], ['d', 'ద'], ['p', 'ప'], ['b', 'బ'],
    ['m', 'మ'], ['n', 'న'], ['y', 'య'], ['r', 'ర'],
    ['l', 'ల'], ['v', 'వ'], ['w', 'వ'], ['s', 'స'],
    ['h', 'హ'], ['f', 'ఫ'], ['z', 'జ'], ['q', 'క'],
    ['x', 'క్స'],
    // Single vowels
    ['a', 'అ'], ['e', 'ఎ'], ['i', 'ఇ'], ['o', 'ఒ'], ['u', 'ఉ'],
  ];

  // Common word dictionary for instant lookup
  const WORD_DICT = {
    'nenu': 'నేను', 'meeru': 'మీరు', 'miru': 'మీరు',
    'nuvvu': 'నువ్వు', 'atanu': 'అతను', 'aame': 'ఆమె',
    'memu': 'మేము', 'mana': 'మన', 'vaallu': 'వాళ్ళు',
    'idi': 'ఇది', 'adu': 'అది', 'ivi': 'ఇవి',
    'emiti': 'ఏమిటి', 'emi': 'ఏమి', 'ela': 'ఎలా',
    'ekkada': 'ఎక్కడ', 'enduku': 'ఎందుకు', 'eppudu': 'ఎప్పుడు',
    'evaru': 'ఎవరు', 'entha': 'ఎంత',
    'chala': 'చాలా', 'chala bagundi': 'చాలా బాగుంది',
    'bagundi': 'బాగుంది', 'bagunna': 'బాగున్నా',
    'ledu': 'లేదు', 'undi': 'ఉంది', 'unna': 'ఉన్న',
    'vastanu': 'వస్తాను', 'vellatanu': 'వెళ్తాను',
    'cheyyanu': 'చేయను', 'chestanu': 'చేస్తాను',
    'cheppu': 'చెప్పు', 'cheppandi': 'చెప్పండి',
    'vindu': 'వింది', 'vindu': 'వింది',
    'telugu': 'తెలుగు', 'telugulo': 'తెలుగులో',
    'namaste': 'నమస్తే', 'namasthe': 'నమస్తే',
    'dhanyavadalu': 'ధన్యవాదాలు', 'dhanyavadamulu': 'ధన్యవాదమూలు',
    'sari': 'సరి', 'sare': 'సరే', 'avunu': 'అవును',
    'kaadu': 'కాదు', 'kadu': 'కాదు',
    'illu': 'ఇల్లు', 'uru': 'ఊరు', 'desam': 'దేశం',
    'manchi': 'మంచి', 'manchidi': 'మంచిది',
    'prema': 'ప్రేమ', 'sneham': 'స్నేహం',
    'amma': 'అమ్మ', 'nanna': 'నాన్న', 'akka': 'అక్క',
    'anna': 'అన్న', 'thamma': 'తమ్మ', 'chelli': 'చెల్లి',
    'peru': 'పేరు', 'vayasu': 'వయసు',
    'meeru ela unnaru': 'మీరు ఎలా ఉన్నారు',
    'nenu bagunnanu': 'నేను బాగున్నాను',
    'subhodayam': 'శుభోదయం', 'subharatri': 'శుభరాత్రి',
    'vandanam': 'వందనం',
    'randi': 'రండి', 'vellandi': 'వెళ్ళండి',
    'chudandi': 'చూడండి', 'vinandi': 'వినండి',
    'paatalu': 'పాటలు', 'sinema': 'సినిమా',
    'vidyardhi': 'విద్యార్థి', 'teacher': 'టీచర్',
    'pani': 'పని', 'niru': 'నీరు', 'annam': 'అన్నం',
    'vayyaram': 'వ్యారం', 'nela': 'నెల', 'samvatsaram': 'సంవత్సరం',
    'tella': 'తెల్ల', 'nalla': 'నల్ల', 'erru': 'ఎర్ర',
    'peddha': 'పెద్ద', 'chinna': 'చిన్న',
  };

  /**
   * Rule-based transliteration for a single word
   */
  function ruleBasedWord(word) {
    const lower = word.toLowerCase();
    if (WORD_DICT[lower]) return WORD_DICT[lower];

    let result = '';
    let i = 0;
    while (i < lower.length) {
      let matched = false;
      // Try longest match first
      for (const [rom, tel] of PHONETIC_MAP) {
        if (lower.startsWith(rom, i)) {
          result += tel;
          i += rom.length;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result += lower[i];
        i++;
      }
    }
    return result;
  }

  /**
   * Rule-based transliteration for full text (preserves whitespace/newlines)
   */
  function ruleBasedText(text) {
    return text.replace(/[a-zA-Z]+/g, (word) => ruleBasedWord(word));
  }

  // ─── Google Input Tools ──────────────────────────────────────────────────
  async function googleTransliterate(word) {
    if (!word.trim()) return '';
    try {
      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=te-t-i0-und&num=5&cp=0&cs=1&ie=utf-8&oe=utf-8`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Google API error');
      const data = await res.json();
      if (data?.[0] === 'SUCCESS' && data[1]?.[0]?.[1]?.[0]) {
        return { word: data[1][0][1][0], suggestions: data[1][0][1].slice(0, 4) };
      }
      throw new Error('No result');
    } catch {
      return null;
    }
  }

  /**
   * Transliterate full text word-by-word via Google
   */
  async function googleTransliterateText(text) {
    const parts = text.split(/(\s+)/);
    const results = [];
    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        results.push(part);
      } else if (part) {
        const g = await googleTransliterate(part);
        results.push(g ? g.word : ruleBasedWord(part));
      }
    }
    return results.join('');
  }

  // ─── Claude AI ──────────────────────────────────────────────────────────
  async function claudeTransliterate(text, apiKey) {
    if (!apiKey) throw new Error('No Claude API key');
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 1024,
        system: `You are a professional English to Telugu transliterator. 
Convert the given English (romanized) text into Telugu script accurately.
Rules:
- Output ONLY the Telugu script, nothing else
- Preserve spaces, newlines, and punctuation exactly
- Do not translate — only transliterate phonetically
- Use standard Telugu Unicode characters
- Handle common Telugu words correctly (e.g. "nenu" → నేను, "meeru" → మీరు)`,
        messages: [{ role: 'user', content: text }],
      }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error?.message || 'Claude API error');
    }
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || '';
  }

  // ─── Suggestions ─────────────────────────────────────────────────────────
  async function getSuggestions(word) {
    if (!word || word.length < 2) return [];

    // First try Google for suggestions
    try {
      const url = `https://inputtools.google.com/request?text=${encodeURIComponent(word)}&itc=te-t-i0-und&num=6&cp=0&cs=1&ie=utf-8&oe=utf-8`;
      const res = await fetch(url);
      const data = await res.json();
      if (data?.[0] === 'SUCCESS' && data[1]?.[0]?.[1]) {
        return data[1][0][1].slice(0, 5).map(s => ({ telugu: s, source: 'Google' }));
      }
    } catch {}

    // Rule-based fallback suggestions
    const rb = ruleBasedWord(word);
    const suggestions = [{ telugu: rb, source: 'Phonetic' }];

    // Check dictionary for prefix matches
    for (const [key, val] of Object.entries(WORD_DICT)) {
      if (key.startsWith(word.toLowerCase()) && key !== word.toLowerCase()) {
        suggestions.push({ telugu: val, source: 'Dictionary', hint: key });
        if (suggestions.length >= 5) break;
      }
    }
    return suggestions;
  }

  // ─── Public API ───────────────────────────────────────────────────────────
  return {
    ruleBasedText,
    ruleBasedWord,
    googleTransliterate,
    googleTransliterateText,
    claudeTransliterate,
    getSuggestions,
  };
})();
