/* NOONFALL — language. EN / हिन्दी / Hinglish */
(function (NS) {
  'use strict';

  const tiers = {
    en: {
      code: 'EN',
      name: 'English',
      nav: { play: 'Play', chronicle: 'Chronicle', whispers: 'Whispers', credits: 'Credits', sound: 'Sound', theme: 'Theme', lang: 'Language' },
      title: {
        kicker: 'a game of light & absence',
        tagline: 'The sun took everything. Only shadow is left.',
        play: 'Begin',
        resume: 'Continue',
        hint: 'move the sun with your mouse · walk with A / D · jump with space',
        tiny: 'best played with headphones, in the dark'
      },
      hud: { ink: 'ink', hint: 'hint', pause: 'pause', restart: 'restart', level: 'level', of: 'of' },
      common: {
        back: 'Back', close: 'Close', next: 'Next', replay: 'Again', locked: 'Sealed',
        found: 'found', unknown: 'unknown', of: 'of', on: 'on', off: 'off',
        sound: 'Sound', music: 'Music', all: 'All'
      },
      levels: [
        { name: 'Wake', tag: 'The dark is the only ground. Move the sun, and see what it leaves behind.' },
        { name: 'Bridge', tag: 'Every stone is a brush. The sun decides what it paints.' },
        { name: 'Ascent', tag: 'Lower the sun. The shadow climbs.' },
        { name: 'Glare', tag: 'Moths love a sun. Give them something to chase.' },
        { name: 'Crossing', tag: 'Three stones. One shadow. No shore.' },
        { name: 'Noonfall', tag: 'The sun is going down. Be the last thing it sees.' },
        { name: 'The Garden of Absences', tag: 'A place that only exists when no one is looking.' },
        { name: 'The Long Dark', tag: 'What the light forgot to erase.' }
      ],
      levelHint: [
        'Move the sun with your mouse. The shade it throws is solid — stand on it and walk to the ring.',
        'Shade is one-way: you rise through it from below, never pass it sideways. Light erases; shadow carries.',
        'Pull the sun down and the shadows stretch upward. Climb the old terraces to the ring.',
        'Motes hunger for your light. Shade repels them — keep the sun far, and slip past while they turn.',
        'There is no floor here, only shadow. Push the sun far away and its shadow reaches further.',
        'Stairs of stone and shade. Bring the sun with you — every step is a new angle.',
        'A garden that exists only unwatched. Leap the stones; the moon does not judge.',
        'Walk into the dark. What the light forgot is still solid.'
      ],
      win: {
        title: 'the shade holds',
        inkAll: 'every drop of ink',
        inkSome: 'ink gathered',
        again: 'Again',
        next: 'Next waking',
        done: 'Return to the dark'
      },
      pause: { title: 'Paused', resume: 'Resume', restart: 'Restart level', menu: 'Menu' },
      chronicle: {
        title: 'Chronicle',
        sub: 'Six wakings, and two doors that should not exist.',
        locked: 'Sealed — find it first.',
        play: 'Enter',
        best: 'best',
        time: 'time',
        deaths: 'falls'
      },
      whispers: {
        title: 'Whispers',
        sub: 'Things the world told you when you were not listening.',
        lockedHint: 'A whisper you have not heard yet.',
        count: 'whispers heard'
      },
      credits: {
        title: 'Credits',
        madeBy: 'made by',
        role: 'one person, one canvas, no assets',
        tech: 'hand-written canvas engine · procedural audio · zero dependencies',
        secret: 'everything you hear is arithmetic',
        fWorld: 'world', vWorld: 'one screen · eight doors',
        fEngine: 'engine', vEngine: 'canvas 2d, written by hand',
        fSound: 'sound', vSound: 'oscillators, noise, arithmetic',
        fAssets: 'assets', vAssets: 'none — only code',
        dedication: 'for anyone who ever felt safer in the shade',
        back: 'Back to the dark',
        found: 'You found the smaller author.'
      },
      end: {
        title: 'The world remembers colour.',
        body: 'On the day the light finally let go, the world did not go dark. It remembered that it had always been made of shadow — and colour came back slowly, like a held breath released.',
        again: 'Wake again',
        whispers: 'Read the whispers'
      },
      toasts: {
        secret: 'Secret found',
        glyph: 'A glyph answers',
        drop: 'Ink',
        allInk: 'Every drop of ink',
        moon: 'The moon blinks.',
        konami: 'RITE OF NOONFALL — the garden opens',
        umbra: 'WINGS OF UMBRA — jump twice',
        deathtoll: 'The abyss is patient.',
        console: 'Speak, machine.',
        unlockGarden: 'New door in the Chronicle',
        unlockLong: 'New door in the Chronicle',
        saved: 'progress kept'
      },
      consoleHint: 'try: help · night · umbra · garden · whisper',
      touch: 'drag to move the sun'
    },

    hi: {
      code: 'हिं',
      name: 'हिन्दी',
      nav: { play: 'खेलें', chronicle: 'इतिहास', whispers: 'फुसफुसाहट', credits: 'श्रेय', sound: 'ध्वनि', theme: 'रूप', lang: 'भाषा' },
      title: {
        kicker: 'प्रकाश और अनुपस्थिति का खेल',
        tagline: 'सूरज सब कुछ ले गया। बचा है सिर्फ़ साया।',
        play: 'शुरू करें',
        resume: 'जारी रखें',
        hint: 'माउस से सूरज घुमाएँ · A / D से चलें · स्पेस से कूदें',
        tiny: 'हेडफ़ोन लगाकर, अंधेरे में खेलें'
      },
      hud: { ink: 'स्याही', hint: 'संकेत', pause: 'रुकावट', restart: 'फिर से', level: 'स्तर', of: 'में से' },
      common: {
        back: 'वापस', close: 'बंद', next: 'आगे', replay: 'फिर', locked: 'बंद',
        found: 'मिली', unknown: 'अज्ञात', of: 'में से', on: 'चालू', off: 'बंद',
        sound: 'ध्वनि', music: 'संगीत', all: 'सब'
      },
      levels: [
        { name: 'जागरण', tag: 'अंधेरा ही एकमात्र ज़मीन है। सूरज को घुमाओ, देखो वह क्या छोड़ता है।' },
        { name: 'सेतु', tag: 'हर पत्थर एक ब्रश है। सूरज तय करता है क्या रंगेगा।' },
        { name: 'आरोहण', tag: 'सूरज को नीचे करो। साया ऊपर चढ़ेगा।' },
        { name: 'चमक', tag: 'पतंगों को सूरज पसंद है। उन्हें कुछ पीछा करने दो।' },
        { name: 'पार', tag: 'तीन पत्थर। एक साया। कोई किनारा नहीं।' },
        { name: 'दोपहर-पतन', tag: 'सूरज डूब रहा है। उसकी आख़िरी नज़र में तुम हो।' },
        { name: 'अनुपस्थिति का बाग़', tag: 'एक जगह जो तभी होती है जब कोई न देखे।' },
        { name: 'लंबा अंधेरा', tag: 'जिसे प्रकाश मिटाना भूल गया।' }
      ],
      levelHint: [
        'माउस से सूरज घुमाओ। उसकी छाया ठोस है — उस पर चलो और वलय तक पहुँचो।',
        'छाया एकतरफ़ा है: नीचे से उसके आर-पार ऊपर आ सकते हो, आड़े से नहीं। रोशनी मिटाती है; छाया उठाती है।',
        'सूरज नीचे करो, छायाएँ ऊपर खिंचेंगी। पुरानी सीढ़ियों पर चढ़कर वलय तक जाओ।',
        'पतंगें रोशनी की भूखी हैं। छाया उन्हें दूर रखती है — सूरज दूर रखो और मुड़ते ही निकल जाओ।',
        'यहाँ ज़मीन नहीं, सिर्फ़ छाया है। सूरज को दूर धकेलो, छाया और दूर तक पहुँचेगी।',
        'पत्थर और छाया की सीढ़ियाँ। सूरज को साथ ले चलो — हर कदम नया कोण है।',
        'एक बाग़ जो बिन देखे ही होता है। पत्थरों पर कूदो; चाँद जज नहीं करता।',
        'अंधेरे में चलो। जो रोशनी भूल गई, वह अब भी ठोस है।'
      ],
      win: {
        title: 'साया टिका रहा',
        inkAll: 'हर बूँद स्याही',
        inkSome: 'स्याही मिली',
        again: 'फिर से',
        next: 'अगला जागरण',
        done: 'अंधेरे में लौटो'
      },
      pause: { title: 'रुका हुआ', resume: 'जारी', restart: 'स्तर दोहराएँ', menu: 'मेनू' },
      chronicle: {
        title: 'इतिहास',
        sub: 'छह जागरण, और दो दरवाज़े जिन्हें होना नहीं चाहिए था।',
        locked: 'बंद — पहले उसे ढूँढो।',
        play: 'प्रवेश',
        best: 'सर्वश्रेष्ठ',
        time: 'समय',
        deaths: 'गिरना'
      },
      whispers: {
        title: 'फुसफुसाहट',
        sub: 'वे बातें जो दुनिया ने कहीं जब तुम सुन नहीं रहे थे।',
        lockedHint: 'एक फुसफुसाहट जो अभी अनसुनी है।',
        count: 'फुसफुसाहट सुनी'
      },
      credits: {
        title: 'श्रेय',
        madeBy: 'बनाया',
        role: 'एक इंसान, एक कैनवास, कोई फ़ाइल नहीं',
        tech: 'हाथ से लिखा कैनवास इंजन · ध्वनि सब गणित से · शून्य निर्भरता',
        secret: 'जो कुछ तुम सुनते हो, वह सब अंकगणित है',
        fWorld: 'दुनिया', vWorld: 'एक स्क्रीन · आठ दरवाज़े',
        fEngine: 'इंजन', vEngine: 'कैनवास 2D, हाथ से लिखा',
        fSound: 'ध्वनि', vSound: 'ऑसिलेटर, शोर, अंकगणित',
        fAssets: 'फ़ाइलें', vAssets: 'कोई नहीं — सिर्फ़ कोड',
        dedication: 'उन सबके लिए जिन्हें छाँव में सुरक्षित लगा',
        back: 'अंधेरे में वापस',
        found: 'तुमने छोटे लेखक को ढूँढ लिया।'
      },
      end: {
        title: 'दुनिया को रंग याद आया।',
        body: 'जिस दिन रोशनी ने आख़िरकार छोड़ा, दुनिया अंधेरी नहीं हुई। उसे याद आया कि वह सदा से साये से बनी थी — और रंग धीरे-धीरे लौट आए, जैसे रुकी हुई साँस छूटती है।',
        again: 'फिर जागो',
        whispers: 'फुसफुसाहट पढ़ो'
      },
      toasts: {
        secret: 'रहस्य मिला',
        glyph: 'एक चिह्न ने उत्तर दिया',
        drop: 'स्याही',
        allInk: 'हर बूँद स्याही',
        moon: 'चाँद पलक झपकाता है।',
        konami: 'दोपहर-पतन का अनुष्ठान — बाग़ खुला',
        umbra: 'छाया के पंख — दो बार कूदो',
        deathtoll: 'खाई धैर्यवान है।',
        console: 'बोलो, मशीन।',
        unlockGarden: 'इतिहास में नया दरवाज़ा',
        unlockLong: 'इतिहास में नया दरवाज़ा',
        saved: 'प्रगति सुरक्षित'
      },
      consoleHint: 'लिखो: help · night · umbra · garden · whisper',
      touch: 'सूरज घुमाने के लिए खींचें'
    },

    hg: {
      code: 'HG',
      name: 'Hinglish',
      nav: { play: 'Khelo', chronicle: 'Safarnama', whispers: 'Kaan mein', credits: 'Credit', sound: 'Sound', theme: 'Mood', lang: 'Bhasha' },
      title: {
        kicker: 'light aur andhere ka khel',
        tagline: 'Suraj sab le gaya. Bacha sirf saaya.',
        play: 'Chalo shuru',
        resume: 'Continue',
        hint: 'mouse se suraj ghumao · A / D se chalo · space se koodo',
        tiny: 'headphones lagao, aur light off karo'
      },
      hud: { ink: 'ink', hint: 'hint', pause: 'pause', restart: 'phir se', level: 'level', of: 'of' },
      common: {
        back: 'Wapas', close: 'Band', next: 'Aage', replay: 'Ek aur', locked: 'Locked',
        found: 'mila', unknown: 'pata nahi', of: 'of', on: 'on', off: 'off',
        sound: 'Sound', music: 'Music', all: 'Sab'
      },
      levels: [
        { name: 'Utha', tag: 'Andhera hi asli zameen hai. Suraj ghumao, dekho kya chhodta hai.' },
        { name: 'Pul', tag: 'Har patthar ek brush hai. Suraj decide karta hai kya banega.' },
        { name: 'Chadhai', tag: 'Suraj neeche. Saaya upar. Simple.' },
        { name: 'Chamak', tag: 'Moths ko light pasand hai. Unhe kuch chase karne do.' },
        { name: 'Paar', tag: 'Teen patthar. Ek saaya. Koi kinara nahi.' },
        { name: 'Noonfall', tag: 'Suraj doob raha hai. Uske last look mein tum ho.' },
        { name: 'The Garden of Absences', tag: 'Ek jagah jo tab hi hoti hai jab koi na dekhe.' },
        { name: 'The Long Dark', tag: 'Jo light bhool gayi mitana.' }
      ],
      levelHint: [
        'Mouse se suraj ghumao. Uski shade solid hai — uspe chalo aur ring tak pahuncho.',
        'Shade one-way hai: neeche se upar aa sakte ho, side se nahi. Light mitati hai; shade uthaati hai.',
        'Suraj neeche karo, shade upar khinchegi. Purani seedhiyan chadh ke ring tak jao.',
        'Moths light ke bhookhe hain. Shade unhe door rakhti hai — suraj door rakh, aur mudte hi nikal.',
        'Yahan zameen nahi, sirf shade hai. Suraj ko door dhakelo, shadow aur door tak jaayega.',
        'Patthar aur shade ki seedhiyan. Suraj ko saath le chal — har step naya angle hai.',
        'Ek garden jo bina dekhe hi hota hai. Pattharon pe koodo; chand judge nahi karta.',
        'Andhere mein chalo. Jo light bhool gayi, woh ab bhi solid hai.'
      ],
      win: {
        title: 'saaya tika raha',
        inkAll: 'saari ink',
        inkSome: 'ink mili',
        again: 'Ek aur',
        next: 'Next jagah',
        done: 'Andhere mein wapas'
      },
      pause: { title: 'Ruk gaya', resume: 'Chalo', restart: 'Level restart', menu: 'Menu' },
      chronicle: {
        title: 'Safarnama',
        sub: 'Chhe jagah, aur do darwaze jo hone hi nahi chahiye the.',
        locked: 'Locked — pehle dhoondh.',
        play: 'Ghuso',
        best: 'best',
        time: 'time',
        deaths: 'gire'
      },
      whispers: {
        title: 'Kaan mein',
        sub: 'Jo duniya ne kaha jab tu sun nahi raha tha.',
        lockedHint: 'Ek whisper jo abhi suni nahi.',
        count: 'whispers suni'
      },
      credits: {
        title: 'Credit',
        madeBy: 'banaya',
        role: 'ek banda, ek canvas, zero assets',
        tech: 'hand-written canvas engine · sab sound maths se · zero dependency',
        secret: 'jo bhi tu sun raha hai, woh sab arithmetic hai',
        fWorld: 'duniya', vWorld: 'ek screen · aath darwaze',
        fEngine: 'engine', vEngine: 'canvas 2D, haath se likha',
        fSound: 'sound', vSound: 'oscillators, noise, maths',
        fAssets: 'assets', vAssets: 'zero — sirf code',
        dedication: 'un sabke liye jinko chhaanv mein safe laga',
        back: 'Andhere mein wapas',
        found: 'Chhota lekhak mil gaya.'
      },
      end: {
        title: 'Duniya ko rang yaad aaya.',
        body: 'Jis din light ne finally chhoda, duniya andheri nahi hui. Use yaad aaya ki woh hamesha saaye se bani thi — aur rang dheere-dheere wapas aaye, jaise ruki hui saans chhoot jaati hai.',
        again: 'Phir jago',
        whispers: 'Whispers padho'
      },
      toasts: {
        secret: 'Secret mila',
        glyph: 'Ek glyph ne jawab diya',
        drop: 'Ink',
        allInk: 'Saari ink',
        moon: 'Chand blink karta hai.',
        konami: 'RITE OF NOONFALL — garden khul gaya',
        umbra: 'WINGS OF UMBRA — do baar koodo',
        deathtoll: 'Abyss patient hai.',
        console: 'Bol, machine.',
        unlockGarden: 'Safarnama mein naya darwaza',
        unlockLong: 'Safarnama mein naya darwaza',
        saved: 'progress saved'
      },
      consoleHint: 'likho: help · night · umbra · garden · whisper',
      touch: 'suraj ghumane ke liye drag karo'
    }
  };

  const WHISPERS = [
    { id: 'moon', en: 'You looked at the moon until it looked back. Somewhere, a rabbit put down its pestle.', hi: 'तुमने चाँद को देखा जब तक उसने लौटकर नहीं देखा। कहीं एक खरगोश ने अपनी ओखली रख दी।', hg: 'Tu chand ko dekhta raha jab tak usne wapas na dekha. Kahin ek khargosh ne apni okhli rakh di.' },
    { id: 'konami', en: '↑ ↑ ↓ ↓ ← → ← → B A. The old prayer still opens a door.', hi: '↑ ↑ ↓ ↓ ← → ← → B A. पुरानी प्रार्थना आज भी एक दरवाज़ा खोलती है।', hg: '↑ ↑ ↓ ↓ ← → ← → B A. Purani prayer aaj bhi ek darwaza khol deti hai.' },
    { id: 'umbra', en: 'You said the true name of the dark. It answered with wings.', hi: 'तुमने अंधेरे का सच्चा नाम कहा। उसने पंखों से उत्तर दिया।', hg: 'Tu andhere ka asli naam bol diya. Usne wings se jawab diya.' },
    { id: 'author', en: 'Behind every author there is a smaller author, holding a smaller lantern.', hi: 'हर लेखक के पीछे एक छोटा लेखक होता है, छोटा-सा लालटेन लिए।', hg: 'Har author ke peeche ek chhota author hota hai, chhoti si lantern leke.' },
    { id: 'ink', en: 'You gathered every drop. For a moment the world was written, instead of erased.', hi: 'तुमने हर बूँद बटोर ली। एक पल के लिए दुनिया मिटी नहीं, लिखी गई।', hg: 'Tu saari boondein le aaya. Ek pal ke liye duniya miti nahi, likhi gayi.' },
    { id: 'abyss', en: 'Thirteen times you fell into the light. It did not get easier. It got familiar.', hi: 'तेरह बार तुम रोशनी में गिरे। आसान नहीं हुआ। अपना हो गया।', hg: 'Terah baar tu light mein gira. Aasan nahi hua. Apna ho gaya.' },
    { id: 'glyphs', en: 'You traced every glyph. A garden grew where no light falls.', hi: 'तुमने हर चिह्न छुआ। जहाँ रोशनी नहीं पहुँचती, वहाँ एक बाग़ उग आया।', hg: 'Tu har glyph ko chhu aaya. Jahan light nahi jaati, wahan ek garden ug aaya.' },
    { id: 'longdark', en: 'A door that only opens from the inside.', hi: 'एक दरवाज़ा जो सिर्फ़ अंदर से खुलता है।', hg: 'Ek darwaza jo sirf andar se khulta hai.' }
  ];

  const I18N = {
    lang: 'en',
    tiers,
    whispers: WHISPERS,
    t(path) {
      let obj = tiers[this.lang] || tiers.en;
      let fallback = tiers.en;
      const parts = path.split('.');
      for (const p of parts) {
        obj = obj && obj[p] !== undefined ? obj[p] : undefined;
        fallback = fallback && fallback[p] !== undefined ? fallback[p] : undefined;
      }
      return obj !== undefined ? obj : fallback;
    },
    level(i) {
      const arr = (tiers[this.lang] || tiers.en).levels;
      const fa = tiers.en.levels;
      return (arr && arr[i]) || fa[i] || { name: '', tag: '' };
    },
    hint(i) {
      const arr = (tiers[this.lang] || tiers.en).levelHint;
      const fa = tiers.en.levelHint;
      return (arr && arr[i]) || fa[i] || '';
    },
    whisper(id) {
      const w = WHISPERS.find((x) => x.id === id);
      if (!w) return '';
      return w[this.lang] || w.en;
    },
    set(lang) {
      if (tiers[lang]) this.lang = lang;
      document.documentElement.lang = lang === 'hi' ? 'hi' : 'en';
    }
  };

  NS.I18N = I18N;
})(window.Noonfall = window.Noonfall || {});
