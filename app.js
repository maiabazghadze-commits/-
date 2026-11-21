/**
 * სასწავლო პლატფორმა: "რა არის დომენი?" (V-VI კლასი)
 * ინტერაქტიული ლოგიკა, აუდიო სინთეზი, სიმულატორები, ეთიკური ქეისები, ქვიზი და სერტიფიკატი
 */

(function () {
  'use strict';

  // ========================================================
  // აპლიკაციის მდგომარეობა (State)
  // ========================================================
  const state = {
    soundEnabled: true,
    overallScore: 0,
    activeTab: 'module-intro',
    dnsTested: false,
    builder: {
      hosting: false,
      website: false,
      domain: false
    },
    solvedCases: new Set(),
    quiz: {
      currentIndex: 0,
      score: 0,
      answered: false
    }
  };

  // ========================================================
  // აუდიო ეფექტები (Web Audio API - დამატებითი ფაილების გარეშე)
  // ========================================================
  const AudioEngine = {
    ctx: null,
    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
    },
    playTone(freq, duration, type = 'sine', gainVal = 0.1) {
      if (!state.soundEnabled) return;
      try {
        this.init();
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch (e) {
        console.warn('Audio not allowed yet:', e);
      }
    },
    click() {
      this.playTone(480, 0.08, 'sine', 0.08);
    },
    success() {
      // სასიამოვნო სამმაგი მაჟორული არპეჯიო
      setTimeout(() => this.playTone(523.25, 0.12, 'triangle', 0.12), 0);   // C5
      setTimeout(() => this.playTone(659.25, 0.14, 'triangle', 0.12), 100); // E5
      setTimeout(() => this.playTone(783.99, 0.25, 'triangle', 0.14), 200); // G5
    },
    hint() {
      // გაფრთხილების/მინიშნების ორმაგი ტონი
      setTimeout(() => this.playTone(380, 0.1, 'sine', 0.1), 0);
      setTimeout(() => this.playTone(320, 0.15, 'sine', 0.1), 120);
    },
    fanfare() {
      // სერტიფიკატის საზეიმო მელოდია
      const notes = [
        { f: 523.25, d: 0.12, t: 0 },
        { f: 523.25, d: 0.12, t: 120 },
        { f: 523.25, d: 0.12, t: 240 },
        { f: 659.25, d: 0.25, t: 360 },
        { f: 587.33, d: 0.15, t: 620 },
        { f: 659.25, d: 0.15, t: 780 },
        { f: 783.99, d: 0.45, t: 950 }
      ];
      notes.forEach(n => {
        setTimeout(() => this.playTone(n.f, n.d, 'triangle', 0.15), n.t);
      });
    }
  };

  // ========================================================
  // მასკოტის შეტყობინებები მოდულების მიხედვით
  // ========================================================
  const mascotMessages = {
    'module-intro': '<strong>დოტი:</strong> დაიმახსოვრე — დომენი არის ადამიანის ენა, ხოლო IP მისამართი — კომპიუტერების ენა!',
    'module-house': '<strong>დოტი:</strong> მოდი ავაშენოთ ვებსახლი! ჯერ მიწა (ჰოსტინგი), შემდეგ შენობა (საიტი) და ბოლოს მისამართი (დომენი).',
    'module-levels': '<strong>დოტი:</strong> ყურადღება! დომენის დონეებს ყოველთვის <strong>მარჯვნიდან მარცხნივ</strong> ვითვლით!',
    'module-ethics': '<strong>დოტი:</strong> ინტერნეტშიც ისევე უნდა ვცეთ პატივი სხვებს, როგორც საკლასო ოთახში. შეამოწმე შენი ეთიკური ალღო!',
    'module-lab': '<strong>დოტი:</strong> ლაბორატორიაში შეგიძლია ნებისმიერი დომენი დაშალო ან შენი საოცნებო საიტი შეამოწმო!',
    'module-quiz': '<strong>დოტი:</strong> დროა ცოდნა შევაჯამოთ! ნუ ინერვიულებ შეცდომებზე — ისინი სწავლაში გვეხმარებიან!'
  };

  function updateMascotSpeech(text) {
    const el = document.getElementById('mascotSpeech');
    if (el) {
      el.innerHTML = text;
    }
  }

  function addScore(points) {
    state.overallScore = Math.min(100, state.overallScore + points);
    const scoreEl = document.getElementById('overallScoreText');
    if (scoreEl) {
      scoreEl.textContent = `ქულა: ${state.overallScore}/100`;
    }
  }

  // ========================================================
  // ტაბების ნავიგაცია
  // ========================================================
  function initNavigation() {
    const tabs = document.querySelectorAll('.nav-tab');
    const panels = document.querySelectorAll('.tab-panel');

    function switchTab(tabId) {
      state.activeTab = tabId;
      tabs.forEach(tab => {
        const isActive = tab.getAttribute('data-tab') === tabId;
        tab.classList.toggle('active', isActive);
        tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      });

      panels.forEach(panel => {
        panel.classList.toggle('active', panel.id === tabId);
      });

      if (mascotMessages[tabId]) {
        updateMascotSpeech(mascotMessages[tabId]);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
      AudioEngine.click();
    }

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.getAttribute('data-tab'));
      });
    });

    // წინა / შემდეგი ღილაკები
    document.querySelectorAll('.btn-next, .btn-prev').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-go');
        if (target) switchTab(target);
      });
    });

    // ხმის ჩართვა/გამორთვა
    const soundBtn = document.getElementById('soundToggleBtn');
    const soundIcon = document.getElementById('soundIcon');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        soundIcon.textContent = state.soundEnabled ? '🔊' : '🔇';
        soundBtn.style.opacity = state.soundEnabled ? '1' : '0.6';
        if (state.soundEnabled) AudioEngine.click();
      });
    }
  }

  // ========================================================
  // მოდული 1: DNS სიმულატორი
  // ========================================================
  function initDnsSimulator() {
    const select = document.getElementById('dnsDomainSelect');
    const customInput = document.getElementById('dnsCustomInput');
    const translateBtn = document.getElementById('dnsTranslateBtn');
    const humanDisplay = document.getElementById('humanValueDisplay');
    const ipDisplay = document.getElementById('ipValueDisplay');
    const packet = document.getElementById('dnsPacket');

    const ipMap = {
      'skola.ge': '195.137.164.22',
      'google.ge': '142.250.185.78',
      'wikipedia.org': '208.80.154.224'
    };

    if (select) {
      select.addEventListener('change', () => {
        if (select.value === 'custom') {
          customInput.classList.remove('hidden');
          customInput.focus();
        } else {
          customInput.classList.add('hidden');
          humanDisplay.textContent = select.value;
          ipDisplay.textContent = ipMap[select.value] || '---.---.---.---';
        }
      });
    }

    if (translateBtn) {
      translateBtn.addEventListener('click', () => {
        AudioEngine.click();
        let domain = select.value === 'custom' ? (customInput.value.trim() || 'my-club.ge') : select.value;
        humanDisplay.textContent = domain;

        let ip = ipMap[domain];
        if (!ip) {
          // გენერირება რეალისტური IP მისამართის
          const p1 = 178 + Math.floor(Math.random() * 40);
          const p2 = 62 + Math.floor(Math.random() * 100);
          const p3 = 10 + Math.floor(Math.random() * 200);
          const p4 = 1 + Math.floor(Math.random() * 250);
          ip = `${p1}.${p2}.${p3}.${p4}`;
        }

        // ანიმაცია: პაკეტის გადაადგილება
        packet.style.transition = 'none';
        packet.style.transform = 'translateX(0)';
        ipDisplay.style.opacity = '0.3';

        setTimeout(() => {
          packet.style.transition = 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
          packet.style.transform = 'translateX(180px)';
        }, 50);

        setTimeout(() => {
          ipDisplay.textContent = ip;
          ipDisplay.style.opacity = '1';
          AudioEngine.success();
          if (!state.dnsTested) {
            state.dnsTested = true;
            addScore(15);
            updateMascotSpeech('<strong>დოტი:</strong> ყოჩაღ! ნახე, როგორ გაიგო კომპიუტერმა დომენის IP ციფრები!');
          }
        }, 650);
      });
    }
  }

  // ========================================================
  // მოდული 2: „ააწყვე შენი ვებსახლი“ (Interactive Builder)
  // ========================================================
  function initHouseBuilder() {
    const btnHosting = document.getElementById('btnToggleHosting');
    const btnWebsite = document.getElementById('btnToggleWebsite');
    const btnDomain = document.getElementById('btnToggleDomain');
    const btnReset = document.getElementById('btnResetBuilder');

    const stageGround = document.getElementById('stageGround');
    const groundLabel = document.getElementById('groundLabel');
    const stageBuilding = document.getElementById('stageBuilding');
    const stageSign = document.getElementById('stageSign');
    const stageVisitor = document.getElementById('stageVisitor');
    const statusMsg = document.getElementById('builderStatusMsg');

    const checkHosting = document.getElementById('checkHosting');
    const checkWebsite = document.getElementById('checkWebsite');
    const checkDomain = document.getElementById('checkDomain');

    function updateBuilderState() {
      // ნაბიჯი 1: ჰოსტინგი
      if (state.builder.hosting) {
        btnHosting.classList.add('completed');
        checkHosting.textContent = '✅';
        stageGround.classList.add('active-ground');
        groundLabel.textContent = 'ნაკვეთი მზადაა (ჰოსტინგ-სერვერი 24/7)';
        btnWebsite.disabled = false;
      } else {
        btnHosting.classList.remove('completed');
        checkHosting.textContent = '❌';
        stageGround.classList.remove('active-ground');
        groundLabel.textContent = 'ჰოსტინგი არ არის არჩეული';
        btnWebsite.disabled = true;
      }

      // ნაბიჯი 2: ვებსაიტი
      if (state.builder.website) {
        btnWebsite.classList.add('completed');
        checkWebsite.textContent = '✅';
        stageBuilding.classList.remove('hidden');
        btnDomain.disabled = false;
      } else {
        btnWebsite.classList.remove('completed');
        checkWebsite.textContent = '❌';
        stageBuilding.classList.add('hidden');
        btnDomain.disabled = true;
      }

      // ნაბიჯი 3: დომენი
      if (state.builder.domain) {
        btnDomain.classList.add('completed');
        checkDomain.textContent = '✅';
        stageSign.classList.remove('hidden');
        stageVisitor.classList.remove('hidden');
      } else {
        btnDomain.classList.remove('completed');
        checkDomain.textContent = '❌';
        stageSign.classList.add('hidden');
        stageVisitor.classList.add('hidden');
      }

      // შეტყობინების განახლება
      if (!state.builder.hosting) {
        statusMsg.innerHTML = '👉 დაიწყე პირველი ნაბიჯით: დააჭირე <strong>„მიწის ნაკვეთი (ჰოსტინგი)“</strong> ღილაკს!';
      } else if (!state.builder.website) {
        statusMsg.innerHTML = '⛳ მიწის ნაკვეთი გვაქვს! ახლა დროა ავაშენოთ შენობა: დააჭირე <strong>„სახლის აშენება (ვებსაიტი)“</strong>!';
      } else if (!state.builder.domain) {
        statusMsg.innerHTML = '🏠 სახლი დგას, მაგრამ როგორ მოგვაგნონ სტუმრებმა? დააჭირე <strong>„მისამართის მინიჭება (დომენი)“</strong>!';
      } else {
        statusMsg.innerHTML = '🎉 <strong>სრულყოფილია!</strong> გვაქვს მიწა (ჰოსტინგი), შენობა (საიტი) და მისამართი (დომენი). სტუმრები უკვე შემოდიან!';
        AudioEngine.success();
        addScore(20);
        updateMascotSpeech('<strong>დოტი:</strong> საოცარია! შენ წარმატებით გააცოცხლე ვებსაიტი. სამივე კომპონენტი ერთად მუშაობს!');
      }
    }

    if (btnHosting) {
      btnHosting.addEventListener('click', () => {
        AudioEngine.click();
        state.builder.hosting = true;
        updateBuilderState();
      });
    }

    if (btnWebsite) {
      btnWebsite.addEventListener('click', () => {
        AudioEngine.click();
        state.builder.website = true;
        updateBuilderState();
      });
    }

    if (btnDomain) {
      btnDomain.addEventListener('click', () => {
        AudioEngine.click();
        state.builder.domain = true;
        updateBuilderState();
      });
    }

    if (btnReset) {
      btnReset.addEventListener('click', () => {
        AudioEngine.click();
        state.builder.hosting = false;
        state.builder.website = false;
        state.builder.domain = false;
        updateBuilderState();
      });
    }
  }

  // ========================================================
  // მოდული 4: ეთიკური დეტექტივი (3 ქეისი)
  // ========================================================
  const ethicsCases = [
    {
      id: 1,
      title: 'ქეისი 1: სკოლის რობოტიკის კლუბი',
      story: 'სანდრომ გაიგო, რომ სკოლა ახალ რობოტიკის კლუბს ხსნის. სანდრო ფიქრობს: „მოდი, ჩემს სახელზე დავარეგისტრირებ დომენს robotics-school.ge და მერე სკოლას 50 ლარად მივყიდი“. რას ურჩევდი სანდროს?',
      options: [
        {
          text: '„ძალიან კარგი იდეაა, ასე ბევრ ფულს იშოვი!“',
          correct: false,
          feedback: 'დაფიქრდი: სხვისი სახელის წინასწარ დაკავება მხოლოდ გადაყიდვის მიზნით („დომენური მეკობრეობა“) უსამართლოა და არღვევს ნდობას.'
        },
        {
          text: '„ეს არაეთიკური ქცევაა. სხვისი სახელის დაკავება გადაყიდვისთვის აფერხებს კლუბის მუშაობას და ქმნის კონფლიქტს.“',
          correct: true,
          feedback: 'ზუსტად! ციფრულ სივრცეში კეთილსინდისიერება უმთავრესია. სხვისი პროექტის სახელის უსამართლოდ დაკავება მიუღებელია.'
        },
        {
          text: '„ჯობია 50-ის ნაცვლად 100 ლარი მოსთხოვო მასწავლებელს.“',
          correct: false,
          feedback: 'ფასის გაზრდა პრობლემას ვერ მოაგვარებს. ეს საქციელი არღვევს ციფრულ ეთიკას.'
        }
      ]
    },
    {
      id: 2,
      title: 'ქეისი 2: პირადი უსაფრთხოება და დომენი',
      story: 'მარიამს სურს შექმნას საკუთარი ბლოგი ხატვაზე. მან დომენის სახელად მოიფიქრა: mariam-01024098-saburtalo.ge (პირადი ნომერი და უბანი). სწორია თუ არა ეს არჩევანი?',
      options: [
        {
          text: '„კი, ძალიან კარგია, ყველა ზუსტად გაიგებს სად ცხოვრობს და ვინ არის.“',
          correct: false,
          feedback: 'გაუფრთხილდი პირად მონაცემებს! ინტერნეტში პირადი ნომრისა და ზუსტი მისამართის საჯაროდ გამოფენა სახიფათოა.'
        },
        {
          text: '„ეს სახიფათოა! დომენში არასდროს არ უნდა ჩავწეროთ პირადი საიდუმლოებები. ჯობია აირჩიოს mariam-art.ge.“',
          correct: true,
          feedback: 'ბრავო! კიბერუსაფრთხოება მოითხოვს, რომ პირადი ნომერი, პაროლები და მისამართი არასდროს გამოიყენო საჯარო დომენში.'
        },
        {
          text: '„მხოლოდ ტელეფონის ნომერიც რომ დაემატებინა, უფრო საიმედო იქნებოდა.“',
          correct: false,
          feedback: 'ტელეფონის ნომრის დამატება კიდევ უფრო გაზრდიდა რისკებს. პირადი მონაცემები დაცული უნდა იყოს!'
        }
      ]
    },
    {
      id: 3,
      title: 'ქეისი 3: გლობალური თუ ქართული .ge დომენი?',
      story: 'დათომ დაარეგისტრირა ქართული დომენი sport-kids.ge და გადაწყვიტა, მომავალ კვირას eBay-ს ინტერნეტ-აუქციონზე გაყიდოს. შეძლებს თუ არა ის ამას?',
      options: [
        {
          text: '„დიახ, შეუძლია მილიონ დოლარად გაყიდოს ნებისმიერ დროს.“',
          correct: false,
          feedback: 'გაიხსენე წესები: .ge დომენზე მოქმედებს სპეციალური შეზღუდვა!'
        },
        {
          text: '„არა, .ge დომენის წესებით მფლობელს აქვს მხოლოდ ფლობისა და სარგებლობის უფლება — გაყიდვა ან გაჩუქება აკრძალულია!“',
          correct: true,
          feedback: 'შესანიშნავია! განსხვავებით .com-ისგან, ქართული .ge დომენის გასხვისება (გაყიდვა) ან გაჩუქება აკრძალულია წესებით.'
        },
        {
          text: '„მხოლოდ იმ შემთხვევაში, თუ ICANN-ის დირექტორი დართავს ნებას.“',
          correct: false,
          feedback: 'არა, ICANN გლობალურ წესებს ადგენს, მაგრამ ქვეყნის კოდის (.ge) წესებს საქართველოს ეროვნული რეგულაცია განსაზღვრავს.'
        }
      ]
    }
  ];

  function initEthicsCases() {
    const container = document.getElementById('ethicsCasesContainer');
    if (!container) return;

    container.innerHTML = '';
    ethicsCases.forEach(c => {
      const card = document.createElement('div');
      card.className = 'case-card';
      card.id = `case-${c.id}`;

      card.innerHTML = `
        <div class="case-header">
          <span class="case-num-badge">ქეისი #${c.id}</span>
          <h4 class="case-title">${c.title}</h4>
        </div>
        <p class="case-story">${c.story}</p>
        <div class="case-options">
          ${c.options.map((opt, idx) => `
            <button class="case-opt-btn" data-case="${c.id}" data-opt="${idx}">
              <span>${opt.text}</span>
            </button>
          `).join('')}
        </div>
        <div class="case-feedback hidden" id="case-fb-${c.id}"></div>
      `;

      container.appendChild(card);
    });

    container.addEventListener('click', (e) => {
      const btn = e.target.closest('.case-opt-btn');
      if (!btn || btn.disabled) return;

      const caseId = parseInt(btn.getAttribute('data-case'), 10);
      const optIdx = parseInt(btn.getAttribute('data-opt'), 10);
      const c = ethicsCases.find(item => item.id === caseId);
      if (!c) return;

      const card = document.getElementById(`case-${caseId}`);
      const fbBox = document.getElementById(`case-fb-${caseId}`);
      const opt = c.options[optIdx];

      const allBtns = card.querySelectorAll('.case-opt-btn');

      if (opt.correct) {
        AudioEngine.success();
        allBtns.forEach(b => b.disabled = true);
        btn.classList.add('correct');
        card.classList.add('solved');
        fbBox.className = 'case-feedback success';
        fbBox.innerHTML = `<strong>✅ სწორია!</strong> ${opt.feedback}`;
        fbBox.classList.remove('hidden');

        if (!state.solvedCases.has(caseId)) {
          state.solvedCases.add(caseId);
          addScore(10);
        }
      } else {
        AudioEngine.hint();
        btn.classList.add('incorrect');
        fbBox.className = 'case-feedback hint';
        fbBox.innerHTML = `<strong>💡 მინიშნება:</strong> ${opt.feedback}`;
        fbBox.classList.remove('hidden');
      }
    });
  }

  // ========================================================
  // მოდული 5: დომენ-ლაბორატორია (დეზინტეგრატორი და შემმოწმებელი)
  // ========================================================
  function initLabModule() {
    // აქტივობა 1: დეკონსტრუქტორი
    const deconInput = document.getElementById('deconInput');
    const btnDeconstruct = document.getElementById('btnDeconstruct');
    const resultBox = document.getElementById('deconstructorResult');
    const presetBtns = document.querySelectorAll('.preset-btn');

    function deconstructDomain(domainStr) {
      const clean = domainStr.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      if (!clean) return;

      const parts = clean.split('.');
      if (parts.length < 2) {
        resultBox.innerHTML = `<p style="color: #b91c1c;">⚠️ შეიყვანე სრული დომენი წერტილით (მაგალითად: <code>skola.ge</code> ან <code>order.avangardhosting.com</code>)</p>`;
        return;
      }

      // ათვლა მარჯვნიდან მარცხნივ
      // ბოლო ნაწილი = 1-ლი დონე (TLD)
      // ბოლოსწინა = მე-2 დონე
      // წინა = მე-3 დონე ან ქვედომენი
      const len = parts.length;
      const tld = parts[len - 1];
      const secondLevel = parts[len - 2];
      const subdomains = parts.slice(0, len - 2);

      let html = `<div class="decon-slices-flow">`;

      // ვიზუალურად მარცხნიდან მარჯვნივ ჩანს, მაგრამ ლეიბლები გვიჩვენებს დონეებს
      if (subdomains.length > 0) {
        html += `
          <div class="decon-chip chip-sub">
            <span>${subdomains.join('.')}</span>
            <span class="chip-label">მე-3 დონე (ქვედომენი)</span>
          </div>
          <span style="font-size: 1.5rem; color:#64748b;">.</span>
        `;
      }

      html += `
        <div class="decon-chip chip-main">
          <span>${secondLevel}</span>
          <span class="chip-label">მე-2 დონე (მთავარი სახელი)</span>
        </div>
        <span style="font-size: 1.5rem; color:#64748b;">.</span>
        <div class="decon-chip chip-tld">
          <span>${tld}</span>
          <span class="chip-label">1-ლი დონე (TLD გაფართოება)</span>
        </div>
      `;

      html += `</div>`;

      // ახსნა
      html += `
        <div style="background: #ffffff; padding: 14px; border-radius: 8px; border: 1px solid #cbd5e1; font-size: 0.92rem;">
          <p><strong>⬅️ ათვლის წესი:</strong> ვიწყებთ მარჯვენა ბოლოდან! <strong>.${tld}</strong> არის 1-ლი დონე (გაფართოება), <strong>${secondLevel}</strong> არის მე-2 დონე, ხოლო ${subdomains.length > 0 ? `<strong>${subdomains.join('.')}</strong> არის მე-3 დონე (ქვედომენი).` : `ამ დომენს მე-3 დონე (ქვედომენი) არ აქვს.`}</p>
        </div>
      `;

      resultBox.innerHTML = html;
      AudioEngine.success();
      addScore(5);
    }

    if (btnDeconstruct && deconInput) {
      btnDeconstruct.addEventListener('click', () => {
        deconstructDomain(deconInput.value);
      });

      deconInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') deconstructDomain(deconInput.value);
      });
    }

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dom = btn.getAttribute('data-domain');
        if (deconInput) {
          deconInput.value = dom;
          deconstructDomain(dom);
        }
      });
    });

    // აქტივობა 2: დომენის შემქმნელი & ვალიდატორი
    const creatorInput = document.getElementById('creatorDomainName');
    const creatorTld = document.getElementById('creatorTldSelect');
    const charCountEl = document.getElementById('charCountDisplay');
    const charFill = document.getElementById('charProgressFill');

    const ruleChars = document.getElementById('valRuleChars');
    const ruleLength = document.getElementById('valRuleLength');
    const ruleHyphen = document.getElementById('valRuleHyphen');
    const verdictBox = document.getElementById('creatorVerdictBox');

    function validateCustomDomain() {
      if (!creatorInput) return;
      const raw = creatorInput.value.trim().toLowerCase();
      const tld = creatorTld.value;
      const len = raw.length;

      // მრიცხველი
      if (charCountEl) charCountEl.textContent = len;
      const pct = Math.min(100, (len / 63) * 100);
      if (charFill) {
        charFill.style.width = `${pct}%`;
        charFill.classList.toggle('warning', len > 45 && len <= 63);
        charFill.classList.toggle('danger', len > 63);
      }

      // წესი 1: ასოები, ციფრები, დეფისი
      const validCharsRegex = /^[a-z0-9-]+$/;
      const hasValidChars = len > 0 && validCharsRegex.test(raw);

      // წესი 2: სიგრძე <= 63
      const hasValidLength = len > 0 && len <= 63;

      // წესი 3: დეფისით დაწყება/დასრულება
      const notStartEndHyphen = len > 0 && !raw.startsWith('-') && !raw.endsWith('-');

      // განახლება ჩეკლისტში
      updateRuleUI(ruleChars, hasValidChars, 'მხოლოდ ლათინური ასოები, ციფრები და დეფისი (-)');
      updateRuleUI(ruleLength, hasValidLength, `სიგრძე: მაქსიმუმ 63 სიმბოლო (${len}/63)`);
      updateRuleUI(ruleHyphen, notStartEndHyphen, 'არ იწყება და არ მთავრდება დეფისით (-)');

      // TLD-ის ტიპის განსაზღვრა
      let tldType = '';
      if (tld === '.ge') {
        tldType = '🇬🇪 საქართველოს ეროვნული დომენი (მოქმედებს 1 წელი, მხოლოდ ფლობა/სარგებლობა).';
      } else if (tld === '.com' || tld === '.org' || tld === '.net') {
        tldType = '🌍 გლობალური ზოგადი დომენი (ვადა 1-10 წელი, შესაძლებელია გაყიდვა).';
      } else if (tld === '.tv' || tld === '.museum') {
        tldType = '🎯 სპეციალური თემატური დომენი.';
      }

      if (hasValidChars && hasValidLength && notStartEndHyphen) {
        verdictBox.innerHTML = `
          <div style="color: #065f46; font-weight: 700;">
            ✅ შესანიშნავი არჩევანია! შენი სრული დომენია: <code>${raw}${tld}</code>
          </div>
          <div style="font-size: 0.88rem; color: #334155; margin-top: 4px;">
            ${tldType}
          </div>
        `;
      } else {
        verdictBox.innerHTML = `
          <div style="color: #b91c1c; font-weight: 700;">
            ⚠️ დომენი ჯერ არ აკმაყოფილებს წესებს. გადახედე ზემოთ მოცემულ მწვანე/წითელ პუნქტებს.
          </div>
        `;
      }
    }

    function updateRuleUI(el, isValid, text) {
      if (!el) return;
      el.className = `val-item ${isValid ? 'valid' : 'invalid'}`;
      el.querySelector('.val-icon').textContent = isValid ? '✅' : '❌';
      el.querySelector('.val-text').textContent = text;
    }

    if (creatorInput) {
      creatorInput.addEventListener('input', validateCustomDomain);
    }
    if (creatorTld) {
      creatorTld.addEventListener('change', validateCustomDomain);
    }

    // საწყისი გაშვება
    validateCustomDomain();
  }

  // ========================================================
  // მოდული 6: დიდი ქვიზი & სერტიფიკატი
  // ========================================================
  const quizQuestions = [
    {
      question: 'რა არის DNS სისტემის მთავარი დანიშნულება ინტერნეტში?',
      options: [
        'ადამიანისთვის გასაგები დომენური სახელის გადაყვანა კომპიუტერისთვის გასაგებ IP ციფრებში',
        'კომპიუტერის ეკრანზე თამაშების დაყენება',
        'ინტერნეტის კაბელების ფერის შეცვლა',
        'საიტზე ახალი ფოტოების ავტომატური დახატვა'
      ],
      correctIndex: 0,
      hint: 'გაიხსენე DNS-თარჯიმანი: კომპიუტერებს ციფრები (IP) ესმით, ადამიანებს კი სახელების დამახსოვრება გვირჩევნია.'
    },
    {
      question: 'რეალურ სამყაროსთან შედარებისას, რა არის დომენი, ჰოსტინგი და ვებსაიტი?',
      options: [
        'დომენი = სახურავი, ჰოსტინგი = კარი, ვებსაიტი = ფანჯარა',
        'დომენი = საფოსტო მისამართი, ჰოსტინგი = მიწის ნაკვეთი, ვებსაიტი = თავად შენობა',
        'დომენი = ტელევიზორი, ჰოსტინგი = მაგიდა, ვებსაიტი = დივანი',
        'დომენი = მიწის ნაკვეთი, ჰოსტინგი = მისამართი, ვებსაიტი = აგური'
      ],
      correctIndex: 1,
      hint: 'დაფიქრდი: მისამართის გარეშე ვერავინ გიპოვის (დომენი), მიწის გარეშე შენობას ვერ დადგამ (ჰოსტინგი), თავად შენობა კი არის საიტი!'
    },
    {
      question: 'რა მიმართულებით ვითვლით დომენის დონეებს (სართულებს)?',
      options: [
        'მარცხნიდან მარჯვნივ',
        'მარჯვნიდან მარცხნივ (წერტილებით გამოყოფით)',
        'ზემოდან ქვემოთ',
        'შუიდან ნაპირებისკენ'
      ],
      correctIndex: 1,
      hint: 'გაიხსენე: მაგალითად order.avangardhosting.com-ში .com მარჯვენა ბოლოშია და სწორედ ის არის 1-ლი დონე (TLD)!'
    },
    {
      question: 'რა სიმბოლოებია დაშვებული დომენურ სახელში და რა არის მაქსიმალური სიგრძე?',
      options: [
        'ნებისმიერი სიმბოლო (!@#$) და სიგრძე 500 სიმბოლო',
        'მხოლოდ ქართული ასოები და გამოტოვებები',
        'მხოლოდ ლათინური ასოები, ციფრები და დეფისი (-); მაქსიმუმ 63 სიმბოლო',
        'მხოლოდ ციფრები და წერტილები'
      ],
      correctIndex: 2,
      hint: 'ტექნიკური წესით, დაშვებულია ლათინური ანბანი, ციფრები და დეფისი, ხოლო ლიმიტი 63 სიმბოლოა.'
    },
    {
      question: 'რით განსხვავდება ქართული .ge დომენი გლობალური .com დომენისგან უფლებების კუთხით?',
      options: [
        '.ge დომენის მფლობელს აქვს მხოლოდ ფლობისა და სარგებლობის უფლება (აკრძალულია გაყიდვა/გაჩუქება), .com-ის გაყიდვა კი ნებადართულია',
        '.ge დომენი უფასოა და მას არასდროს სჭირდება განახლება',
        '.com დომენი მხოლოდ 1 კვირით გაიცემა',
        'არანაირი განსხვავება არ არის'
      ],
      correctIndex: 0,
      hint: 'ქართული ზონა დაცულია სპეკულაციისგან: .ge გაიცემა 1 წლით და მისი გადაყიდვა ან გაჩუქება აკრძალულია.'
    },
    {
      question: 'რა ორგანიზაციაა ICANN და რა არის მისი როლი?',
      options: [
        'კომპიუტერული თამაშების მწარმოებელი კომპანია',
        'მსოფლიო საერთაშორისო კორპორაცია, რომელიც არეგულირებს დომენებსა და ინტერნეტ-ნომრებს მთელ დედამიწაზე',
        'სკოლის კომპიუტერული ლაბორატორიის სახელი',
        'ინტერნეტის კაბელების გამწმენდი რობოტი'
      ],
      correctIndex: 1,
      hint: 'ICANN არის Internet Corporation for Assigned Names and Numbers — მსოფლიო ინტერნეტ-არქიტექტორი.'
    }
  ];

  function initQuiz() {
    const qIndexEl = document.getElementById('currentQNum');
    const qTotalEl = document.getElementById('totalQNum');
    const qScoreEl = document.getElementById('quizScoreDisplay');
    const qTextEl = document.getElementById('quizQuestionText');
    const qOptionsList = document.getElementById('quizOptionsList');
    const qProgressFill = document.getElementById('quizProgressFill');

    const feedbackBox = document.getElementById('quizFeedbackBox');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackText = document.getElementById('feedbackText');
    const feedbackIcon = document.getElementById('feedbackIcon');
    const nextBtn = document.getElementById('btnNextQuestion');

    const quizContainer = document.getElementById('quizContainer');
    const finishCard = document.getElementById('quizFinishCard');
    const finalScoreVal = document.getElementById('finalScoreVal');

    if (qTotalEl) qTotalEl.textContent = quizQuestions.length;

    function renderQuestion() {
      state.quiz.answered = false;
      feedbackBox.classList.add('hidden');
      const q = quizQuestions[state.quiz.currentIndex];

      if (qIndexEl) qIndexEl.textContent = state.quiz.currentIndex + 1;
      if (qScoreEl) qScoreEl.textContent = state.quiz.score;
      if (qTextEl) qTextEl.textContent = q.question;

      const progressPct = ((state.quiz.currentIndex) / quizQuestions.length) * 100;
      if (qProgressFill) qProgressFill.style.width = `${progressPct}%`;

      if (qOptionsList) {
        qOptionsList.innerHTML = '';
        const letters = ['A', 'B', 'C', 'D'];
        q.options.forEach((optText, idx) => {
          const btn = document.createElement('button');
          btn.className = 'quiz-opt-btn';
          btn.innerHTML = `
            <span class="quiz-opt-badge">${letters[idx]}</span>
            <span>${optText}</span>
          `;
          btn.addEventListener('click', () => handleOptionClick(idx, btn));
          qOptionsList.appendChild(btn);
        });
      }
    }

    function handleOptionClick(selectedIdx, clickedBtn) {
      if (state.quiz.answered) return;
      const q = quizQuestions[state.quiz.currentIndex];
      const allBtns = qOptionsList.querySelectorAll('.quiz-opt-btn');

      if (selectedIdx === q.correctIndex) {
        state.quiz.answered = true;
        clickedBtn.classList.add('correct');
        allBtns.forEach(b => b.disabled = true);
        state.quiz.score += Math.round(100 / quizQuestions.length);
        if (qScoreEl) qScoreEl.textContent = state.quiz.score;
        addScore(7);

        AudioEngine.success();
        feedbackBox.className = 'quiz-feedback-box correct-box';
        feedbackIcon.textContent = '🎉';
        feedbackTitle.textContent = 'სწორია! ყოჩაღ!';
        feedbackText.textContent = 'შესანიშნავი პასუხია! შენ ზუსტად გაიგე ეს საკითხი.';
        feedbackBox.classList.remove('hidden');
      } else {
        AudioEngine.hint();
        clickedBtn.classList.add('incorrect');
        feedbackBox.className = 'quiz-feedback-box hint-box';
        feedbackIcon.textContent = '💡';
        feedbackTitle.textContent = 'დაფიქრდი... აი მინიშნება:';
        feedbackText.textContent = q.hint;
        feedbackBox.classList.remove('hidden');
      }
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        AudioEngine.click();
        if (state.quiz.currentIndex < quizQuestions.length - 1) {
          state.quiz.currentIndex++;
          renderQuestion();
        } else {
          showQuizFinish();
        }
      });
    }

    function showQuizFinish() {
      if (quizContainer) quizContainer.classList.add('hidden');
      if (finishCard) finishCard.classList.remove('hidden');
      if (finalScoreVal) finalScoreVal.textContent = state.quiz.score;

      AudioEngine.fanfare();
      triggerConfetti();
      updateMascotSpeech('<strong>დოტი:</strong> ვაშა! შენ გაიარე ყველა შეკითხვა! ჩაწერე შენი სახელი და მიიღე ოფიციალური სერტიფიკატი!');
    }

    // თავიდან დაწყება
    const restartBtn = document.getElementById('btnRestartQuiz');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        AudioEngine.click();
        state.quiz.currentIndex = 0;
        state.quiz.score = 0;
        if (finishCard) finishCard.classList.add('hidden');
        if (quizContainer) quizContainer.classList.remove('hidden');
        renderQuestion();
      });
    }

    // სერტიფიკატის გენერირება
    initCertificate();

    // ქვიზის პირველი კითხვა
    renderQuestion();
  }

  // ========================================================
  // სერტიფიკატი და კონფეტი
  // ========================================================
  function initCertificate() {
    const btnGenerate = document.getElementById('btnGenerateCert');
    const nameInput = document.getElementById('studentNameInput');
    const modal = document.getElementById('certificateModal');
    const recipientDisplay = document.getElementById('certRecipientName');
    const dateDisplay = document.getElementById('certDateDisplay');
    const btnClose = document.getElementById('btnCloseCert');
    const btnClose2 = document.getElementById('btnDownloadCertImg');
    const btnPrint = document.getElementById('btnPrintCert');

    if (dateDisplay) {
      const now = new Date();
      const months = ['იანვარი', 'თებერვალი', 'მარტი', 'აპრილი', 'მაისი', 'ივნისი', 'ივლისი', 'აგვისტო', 'სექტემბერი', 'ოქტომბერი', 'ნოემბერი', 'დეკემბერი'];
      dateDisplay.textContent = `${now.getDate()} ${months[now.getMonth()]}, ${now.getFullYear()} წ.`;
    }

    if (btnGenerate && nameInput) {
      btnGenerate.addEventListener('click', () => {
        const name = nameInput.value.trim() || 'ახალგაზრდა მკვლევარი';
        if (recipientDisplay) recipientDisplay.textContent = name;
        if (modal) modal.classList.remove('hidden');
        AudioEngine.fanfare();
        triggerConfetti();
      });
    }

    function closeModal() {
      if (modal) modal.classList.add('hidden');
    }

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnClose2) btnClose2.addEventListener('click', closeModal);

    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }
  }

  // ========================================================
  // კონფეტის ნაწილაკების ძრავი (Canvas)
  // ========================================================
  function triggerConfetti() {
    const canvas = document.getElementById('confettiCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const colors = ['#4f46e5', '#38bdf8', '#f59e0b', '#10b981', '#f43f5e', '#a855f7'];

    for (let i = 0; i < 90; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        r: Math.random() * 6 + 4,
        d: Math.random() * 90,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngleIncremental: (Math.random() * 0.07) + 0.05,
        tiltAngle: 0,
        vx: (Math.random() - 0.5) * 14,
        vy: (Math.random() - 0.8) * 16 - 4,
        gravity: 0.35,
        opacity: 1
      });
    }

    let animationFrame;
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let alive = false;

      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.tiltAngle += p.tiltAngleIncremental;
        p.tilt = Math.sin(p.tiltAngle) * 15;
        p.opacity -= 0.007;

        if (p.opacity > 0 && p.y < canvas.height + 50) {
          alive = true;
          ctx.beginPath();
          ctx.lineWidth = p.r;
          ctx.strokeStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.opacity);
          ctx.moveTo(p.x + p.tilt + (p.r / 2), p.y);
          ctx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.r / 2));
          ctx.stroke();
        }
      });

      if (alive) {
        animationFrame = requestAnimationFrame(draw);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        cancelAnimationFrame(animationFrame);
      }
    }

    draw();
  }

  // ========================================================
  // ინიციალიზაცია გვერდის ჩატვირთვისას
  // ========================================================
  document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initDnsSimulator();
    initHouseBuilder();
    initEthicsCases();
    initLabModule();
    initQuiz();
  });

})();
