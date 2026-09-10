/* =====================================================
   YOJNASETU - SC LOAN PLATFORM FRONTEND SCRIPT
   Connected to FastAPI Backend with Full Interactivity
   Includes Loan Readiness Engine & Document OCR System
===================================================== */

// Dynamic API Base URL detection
const API_BASE_URL = window.location.origin.includes("8000") 
    ? window.location.origin 
    : "http://127.0.0.1:8000";

let sessionId = null;
let recognition = null;
let isListening = false;
let currentLanguage = "hi-IN";
let partnerMap = null;
let partnerMarkers = null;
let partnerMapMarkersDict = {};
let availableVoices = [];
let stagedOcrFiles = [];

// Geolocation & Partner Filter State
let userCoordinates = { lat: 29.9695, lng: 76.8783 }; // Default to Kurukshetra center
let isLocationPermissionGranted = false;
let activePartnerTypeFilter = "ALL";

/* =====================================================
   INITIALIZATION ON DOM CONTENT LOADED
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Connecting YojnaSetu Frontend to FastAPI at:", API_BASE_URL);
    
    initLanguageSystem();
    initAuthSystem();
    initSpeechRecognition();
    initSpeechSynthesis();
    setupEventListeners();
    setupOcrDropzoneEvents();
    fetchAvailableSchemes();
    loadDefaultPartners();
    checkBackendHealth();
});

/* =====================================================
   BILINGUAL (HINDI & ENGLISH) TRANSLATION SYSTEM
===================================================== */
let lastFetchedPartners = [];

/* =====================================================
   BILINGUAL (HINDI & ENGLISH) TRANSLATION SYSTEM
===================================================== */
const TRANSLATIONS = {
    "hi-IN": {
        langName: "हिंदी",
        tagline: "सपनों को मिलेगा सहारा, आपके साथ है योजनासेतु — “YojnaSetu”",
        loginBtn: "लॉगिन / पंजीकरण",
        navHome: "होम",
        navReadiness: "ऋण तैयारी स्कोर",
        navOcr: "दस्तावेज OCR जाँच",
        navEmi: "EMI कैलकुलेटर",
        navPartners: "चैनल पार्टनर",
        navHelp: "सहायता",
        govTitle: "भारत सरकार",
        govSub: "द्वारा समर्थित",
        heroTitle: 'नमस्ते! मैं <span>योजनासेतु (YojnaSetu)</span> हूँ',
        heroIntro: "मैं आपकी सरकारी ऋण योजनाओं में जानकारी, पात्रता, और ऋण तैयारी स्कोर (Readiness Score) के मूल्यांकन में मदद करने के लिए यहाँ हूँ।",
        speechTitle: "नमस्ते!",
        speechP1: "मैं योजनासेतु हूँ। आप मुझसे अपनी भाषा में बात कर सकते हैं।",
        speechP2: "बताइए, मैं आपकी किस प्रकार मदद कर सकता हूँ?",
        micTitle: "बोलने के लिए बटन दबाएँ",
        micSub: "मैं आपकी बात सुन रहा हूँ...",
        micBtnTitle: "बोलने के लिए दबाएँ",
        resetBtn: "नया संवाद (New Chat)",
        chatPlaceholder: "यहाँ संदेश लिखें या बोलें...",
        sendBtn: "भेजें",
        chipEdu: "शिक्षा ऋण (Education Loan)",
        chipBiz: "व्यवसाय ऋण (Business Loan)",
        chipScore: "तैयारी स्कोर (Readiness)",
        chipOcr: "दस्तावेज OCR (Doc OCR)",
        chipEmi: "EMI कैलकुलेटर",
        chipPartner: "नजदीकी चैनल पार्टनर",
        moreLang: "और भाषाएँ",
        initChatMsg: "<strong>नमस्ते!</strong> मैं आपका AI सहायता एजेंट हूँ। आपको किस प्रकार का ऋण चाहिए? (शिक्षा ऋण / व्यवसाय ऋण)",
        // Steps
        step1B: "1. अपनी भाषा में बात करें",
        step1Span: "बस अपनी बात बताइए",
        step2B: "2. तैयारी स्कोर व योजना पाएँ",
        step2Span: "तत्परता स्कोर व सही योजना",
        step3B: "3. आपका लक्ष्य, हमारा साथ",
        step3Span: "ऋण प्राप्ति तक पूरी सहायता",
        // Rightbar
        helpCardH3: "हम यहाँ आपकी मदद के लिए हैं",
        helpCardP: "चाहे आप पढ़े-लिखे हों या नहीं, योजनासेतु आपकी अपनी भाषा में मार्गदर्शन करेगा।",
        schemesCardH3: "उपलब्ध योजनाएँ (Schemes)",
        helpRow1: "ऋण तत्परता स्कोर (Readiness Score) मूल्यांकन",
        helpRow2: "सरकारी ऋण योजनाओं की जानकारी",
        helpRow3: "पात्रता की जाँच में सहायता",
        helpRow4: "आवेदन प्रक्रिया में मार्गदर्शन",
        helpRow5: "नजदीकी सहायता केंद्र खोजने में मदद",
        secureCardH3: "आपकी जानकारी सुरक्षित है",
        secureCardP: "आपका डेटा पूरी तरह से गोपनीय और सुरक्षित रखा जाएगा।",
        // Partners
        partnerSort: '<i class="fa-solid fa-arrow-down-short-wide"></i> नजदीकी दूरी व प्रासंगिकता के आधार पर',
        partnerCountSuffix: "आधिकारिक NSFDC चैनल पार्टनर उपलब्ध",
        partnerDistanceAway: "km दूर",
        partnerOfficer: "अधिकारी",
        partnerPhone: "फोन",
        partnerTollFree: "टोल-फ्री",
        partnerDirections: "दिशा-निर्देश",
        partnerCall: "कॉल",
        partnerMap: "मैप"
    },
    "en-IN": {
        langName: "English",
        tagline: "Empowering Dreams with NSFDC Concessional Loans — “YojnaSetu”",
        loginBtn: "Login / Register",
        navHome: "Home",
        navReadiness: "Readiness Score",
        navOcr: "Document OCR Check",
        navEmi: "EMI Calculator",
        navPartners: "Channel Partners",
        navHelp: "Help & Support",
        govTitle: "Government of India",
        govSub: "Supported Platform",
        heroTitle: 'Hello! I am <span>YojnaSetu</span>',
        heroIntro: "I am here to guide you through NSFDC concessional loans, eligibility verification, and AI Loan Readiness Score evaluation.",
        speechTitle: "Hello!",
        speechP1: "I am YojnaSetu. You can talk to me in Hindi or English.",
        speechP2: "Tell me, how can I assist you with your loan application today?",
        micTitle: "Click Button to Speak",
        micSub: "I am listening to you...",
        micBtnTitle: "Click to speak",
        resetBtn: "New Chat",
        chatPlaceholder: "Type your message or speak...",
        sendBtn: "Send",
        chipEdu: "Education Loan (ELIS)",
        chipBiz: "Business Loan (MSY/Term)",
        chipScore: "Readiness Score",
        chipOcr: "Document OCR",
        chipEmi: "EMI Calculator",
        chipPartner: "Nearest Partners",
        moreLang: "More Languages",
        initChatMsg: "<strong>Hello!</strong> I am your AI Loan Assistance Agent. Which type of loan do you need? (Education Loan / Business Loan)",
        // Steps
        step1B: "1. Speak in Your Language",
        step1Span: "Just share your details",
        step2B: "2. Get Readiness Score & Scheme",
        step2Span: "Readiness score & ideal scheme",
        step3B: "3. Your Goal, Our Support",
        step3Span: "Complete assistance till loan disbursal",
        // Rightbar
        helpCardH3: "We are here to help you",
        helpCardP: "Whether you are literate or not, YojnaSetu will guide you in your own language.",
        schemesCardH3: "Available Schemes",
        helpRow1: "Loan Readiness Score Evaluation",
        helpRow2: "Government Loan Schemes Information",
        helpRow3: "Eligibility Assessment & Guidance",
        helpRow4: "Application Process Walkthrough",
        helpRow5: "Nearest Support Center & Branch Locator",
        secureCardH3: "Your Information is Safe",
        secureCardP: "Your data is kept completely confidential and secure.",
        // Partners
        partnerSort: '<i class="fa-solid fa-arrow-down-short-wide"></i> Sorted by Nearest Distance & Relevance',
        partnerCountSuffix: "Official NSFDC Channel Partners Available",
        partnerDistanceAway: "km away",
        partnerOfficer: "Officer",
        partnerPhone: "Phone",
        partnerTollFree: "Toll-Free",
        partnerDirections: "Directions",
        partnerCall: "Call",
        partnerMap: "Map"
    }
};

function initLanguageSystem() {
    const savedLang = localStorage.getItem("yojnaSetuLang") || "hi-IN";
    setAppLanguage(savedLang, false);
}

function toggleHeaderLangDropdown(show) {
    const menu = document.getElementById("header-lang-menu");
    const btn = document.getElementById("header-lang-btn");
    if (!menu || !btn) return;

    if (show) {
        menu.style.display = "flex";
        btn.classList.add("menu-open");
        btn.setAttribute("aria-expanded", "true");
    } else {
        menu.style.display = "none";
        btn.classList.remove("menu-open");
        btn.setAttribute("aria-expanded", "false");
    }
}

function setAppLanguage(langCode, speakGreeting = false) {
    const effectiveLang = langCode && langCode.startsWith("en") ? "en-IN" : "hi-IN";
    currentLanguage = effectiveLang;
    localStorage.setItem("yojnaSetuLang", effectiveLang);

    const t = TRANSLATIONS[effectiveLang] || TRANSLATIONS["hi-IN"];

    // 1. Update Header Button Label
    const currentLangLabel = document.getElementById("current-lang-label");
    if (currentLangLabel) {
        currentLangLabel.textContent = t.langName;
    }

    // 2. Update Header Dropdown active states
    document.querySelectorAll("#header-lang-menu .lang-option").forEach(opt => {
        const optLang = opt.getAttribute("data-lang");
        if (optLang === effectiveLang) {
            opt.classList.add("active");
        } else {
            opt.classList.remove("active");
        }
    });

    // 3. Update Hero Language Buttons active states
    document.querySelectorAll(".languages .lang").forEach(btn => {
        const dataLang = btn.getAttribute("data-lang");
        const btnText = btn.textContent.trim().toLowerCase();
        if ((dataLang && dataLang === effectiveLang) || 
            (effectiveLang === "en-IN" && btnText.includes("english")) || 
            (effectiveLang === "hi-IN" && btnText.includes("हिंदी"))) {
            btn.classList.add("active");
        } else if (!dataLang && !btnText.includes("বাংলা") && !btnText.includes("தமிழ்") && !btnText.includes("తెలుగు") && !btnText.includes("भाषाएँ")) {
            btn.classList.remove("active");
        }
    });

    // 4. Update Header & Navigation Text
    const headerTagline = document.getElementById("header-tagline");
    if (headerTagline) headerTagline.textContent = t.tagline;

    const navLoginText = document.getElementById("nav-login-text");
    if (navLoginText) navLoginText.textContent = t.loginBtn;

    const updateSpan = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            const span = el.querySelector("span");
            if (span) span.textContent = text;
        }
    };

    const updateText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    const updateHTML = (id, html) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = html;
    };

    updateSpan("nav-item-home", t.navHome);
    updateSpan("nav-item-readiness", t.navReadiness);
    updateSpan("nav-item-ocr", t.navOcr);
    updateSpan("nav-item-emi", t.navEmi);
    updateSpan("nav-item-partners", t.navPartners);
    updateSpan("help-btn", t.navHelp);

    updateText("gov-badge-title", t.govTitle);
    updateText("gov-badge-sub", t.govSub);

    // 5. Update Hero Section
    updateHTML("hero-title", t.heroTitle);
    updateText("hero-intro", t.heroIntro);
    updateText("speech-title", t.speechTitle);
    updateText("speech-p1", t.speechP1);
    updateText("speech-p2", t.speechP2);
    updateText("mic-title", t.micTitle);
    updateText("mic-sub", t.micSub);

    const heroMicBtn = document.getElementById("hero-mic-btn");
    if (heroMicBtn) heroMicBtn.setAttribute("aria-label", t.micBtnTitle);

    updateText("hero-lang-more", t.moreLang);

    // 6. Update Chat Area
    updateText("reset-btn-text", t.resetBtn);

    const chatInput = document.getElementById("chat-input");
    if (chatInput) chatInput.placeholder = t.chatPlaceholder;

    updateText("send-btn-text", t.sendBtn);

    // Chips
    updateSpan("chip-edu", t.chipEdu);
    updateSpan("chip-biz", t.chipBiz);
    updateSpan("chip-score", t.chipScore);
    updateSpan("chip-ocr", t.chipOcr);
    updateSpan("chip-emi", t.chipEmi);
    updateSpan("chip-partner", t.chipPartner);

    // Initial bot message if not interacted yet
    const initBotMsg = document.getElementById("init-bot-msg-content");
    if (initBotMsg && (!sessionId || sessionId === null)) {
        initBotMsg.innerHTML = t.initChatMsg;
    }

    // 7. Update 3 Steps Strip
    updateText("step1-b", t.step1B);
    updateText("step1-span", t.step1Span);
    updateText("step2-b", t.step2B);
    updateText("step2-span", t.step2Span);
    updateText("step3-b", t.step3B);
    updateText("step3-span", t.step3Span);

    // 8. Update Right Sidebar Cards
    updateText("help-card-h3", t.helpCardH3);
    updateText("help-card-p", t.helpCardP);
    updateSpan("schemes-card-h3", t.schemesCardH3);
    updateText("help-row-1-p", t.helpRow1);
    updateText("help-row-2-p", t.helpRow2);
    updateText("help-row-3-p", t.helpRow3);
    updateText("help-row-4-p", t.helpRow4);
    updateText("help-row-5-p", t.helpRow5);
    updateText("secure-card-h3", t.secureCardH3);
    updateText("secure-card-p", t.secureCardP);

    // 9. Update Channel Partners Sort & Re-render if cached
    updateHTML("partner-sort-indicator", t.partnerSort);
    if (lastFetchedPartners && lastFetchedPartners.length > 0) {
        renderPartnersList(lastFetchedPartners);
    }

    // 10. Update Speech Recognition Language
    if (recognition) {
        recognition.lang = effectiveLang;
    }

    // 11. Speak greeting if user manually switched language
    if (speakGreeting) {
        speakText(t.speechP1 + " " + t.speechP2);
    }

    console.log(`🌍 App Language set to: ${effectiveLang} (${t.langName})`);
}

/* =====================================================
   BACKEND HEALTH CHECK
===================================================== */
async function checkBackendHealth() {
    const statusBadge = document.querySelector(".status-badge");
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            if (statusBadge) {
                statusBadge.innerHTML = `<span class="pulse-dot"></span> FastAPI Backend Online`;
                statusBadge.style.color = "#2e7d32";
            }
        } else {
            throw new Error("Backend responded with error");
        }
    } catch (e) {
        if (statusBadge) {
            statusBadge.innerHTML = `<span class="pulse-dot" style="background: #e11d48; box-shadow: none;"></span> Backend Offline (Run: python -m uvicorn main:app --reload)`;
            statusBadge.style.color = "#e11d48";
        }
    }
}

/* =====================================================
   EVENT LISTENERS SETUP
===================================================== */
function setupEventListeners() {
    // Chat Form Submission
    const chatForm = document.getElementById("chat-form");
    if (chatForm) {
        chatForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const input = document.getElementById("chat-input");
            const message = input.value.trim();
            if (message) {
                input.value = "";
                await handleUserChatMessage(message);
            }
        });
    }

    // Reset Chat Button
    const resetBtn = document.getElementById("reset-session-btn");
    if (resetBtn) {
        resetBtn.addEventListener("click", () => {
            sessionId = null;
            const messagesContainer = document.getElementById("chat-messages");
            messagesContainer.innerHTML = `
                <div class="message bot-message">
                    <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
                    <div class="msg-content">
                        <strong>संवाद रीसेट हो गया है!</strong> नमस्ते! आपको किस प्रकार का ऋण चाहिए? (शिक्षा ऋण / व्यवसाय ऋण)
                    </div>
                </div>
            `;
            document.getElementById("recommendation-card").style.display = "none";
            startLoanSession();
        });
    }

    // Quick Prompt Chips
    document.querySelectorAll(".chip-btn[data-msg]").forEach(chip => {
        chip.addEventListener("click", () => {
            const msg = chip.getAttribute("data-msg");
            handleUserChatMessage(msg);
        });
    });

    // Mic Toggle Buttons (hero mic & chat mic)
    const micBtn = document.getElementById("mic-toggle-btn");
    const micMain = document.querySelector(".mic");
    if (micBtn) micBtn.addEventListener("click", toggleVoiceInput);
    if (micMain) {
        micMain.addEventListener("click", () => {
            // Scroll down towards AI Loan Assistant chat
            const chatContainer = document.querySelector(".chat-container");
            if (chatContainer) {
                chatContainer.scrollIntoView({ behavior: "smooth", block: "center" });
                chatContainer.classList.add("chat-highlight-pulse");
                setTimeout(() => chatContainer.classList.remove("chat-highlight-pulse"), 1800);
            }

            // Focus chat input box
            const input = document.getElementById("chat-input");
            if (input) {
                setTimeout(() => input.focus(), 300);
            }

            // Start voice recognition
            toggleVoiceInput();
        });
    }

    // Speaker Icon in Hero Card (Reads current speech bubble text)
    const speakerIcon = document.querySelector(".speaker-icon");
    if (speakerIcon) {
        speakerIcon.style.cursor = "pointer";
        speakerIcon.title = "सुनने के लिए क्लिक करें (Click to Listen)";
        speakerIcon.addEventListener("click", () => {
            const speechText = document.querySelector(".speech div p")?.textContent || "नमस्ते! मैं योजनासेतु हूँ।";
            speakText(speechText);
        });
    }

    // Header Language Dropdown Controller
    const headerLangBtn = document.getElementById("header-lang-btn");
    const headerLangMenu = document.getElementById("header-lang-menu");
    if (headerLangBtn && headerLangMenu) {
        headerLangBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const isOpen = headerLangMenu.style.display === "flex";
            toggleHeaderLangDropdown(!isOpen);
        });

        // Language options click inside dropdown
        headerLangMenu.querySelectorAll(".lang-option").forEach(opt => {
            opt.addEventListener("click", (e) => {
                e.stopPropagation();
                const selectedLang = opt.getAttribute("data-lang") || "hi-IN";
                setAppLanguage(selectedLang, true);
                toggleHeaderLangDropdown(false);
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener("click", (e) => {
            if (!headerLangBtn.contains(e.target) && !headerLangMenu.contains(e.target)) {
                toggleHeaderLangDropdown(false);
            }
        });
    }

    // Hero Language Buttons
    const heroLangButtons = document.querySelectorAll(".languages .lang");
    heroLangButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const dataLang = btn.getAttribute("data-lang");
            const text = btn.textContent.trim().toLowerCase();
            let chosenLang = "hi-IN";

            if (dataLang) {
                chosenLang = dataLang;
            } else if (text.includes("english")) {
                chosenLang = "en-IN";
            } else if (text.includes("বাংলা") || text.includes("bangla")) {
                chosenLang = "bn-IN";
            } else if (text.includes("தமிழ்") || text.includes("tamil")) {
                chosenLang = "ta-IN";
            } else if (text.includes("తెలుగు") || text.includes("telugu")) {
                chosenLang = "te-IN";
            }

            setAppLanguage(chosenLang, true);
        });
    });

    // Close user dropdown on clicking outside
    document.addEventListener("click", (e) => {
        const userMenu = document.getElementById("header-user-profile-menu");
        const loginBtn = document.getElementById("header-login-btn");
        if (userMenu && loginBtn && !userMenu.contains(e.target) && !loginBtn.contains(e.target)) {
            userMenu.style.display = "none";
        }
    });

    // Navigation Items
    const navItems = document.querySelectorAll(".nav-item");
    navItems.forEach((item, index) => {
        item.addEventListener("click", () => {
            navItems.forEach(n => n.classList.remove("active"));
            item.classList.add("active");
            if (index === 0) {
                window.scrollTo({ top: 0, behavior: "smooth" });
            } else if (index === 1) {
                scrollToSection("readiness-section");
            } else if (index === 2) {
                scrollToSection("doc-ocr-section");
            } else if (index === 3) {
                scrollToSection("emi-section");
            } else if (index === 4) {
                scrollToSection("partner-section");
            }
        });
    });

    // Loan Readiness Simulator Form
    const readinessForm = document.getElementById("readiness-sim-form");
    if (readinessForm) {
        readinessForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await calculateReadinessFromBackend();
        });
    }

    // EMI Form Submission
    const emiForm = document.getElementById("emi-form");
    if (emiForm) {
        emiForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            await calculateEmiFromBackend();
        });
    }

    // Partner Search & Location Controls
    const findLocationBtn = document.getElementById("find-location-btn");
    if (findLocationBtn) {
        findLocationBtn.addEventListener("click", () => handleLocationPermissionRequest(true));
    }

    const partnerRagSearchBtn = document.getElementById("partner-rag-search-btn");
    if (partnerRagSearchBtn) {
        partnerRagSearchBtn.addEventListener("click", () => fetchPartnersWithFilters());
    }

    const partnerQueryInput = document.getElementById("partner-query-input");
    if (partnerQueryInput) {
        partnerQueryInput.addEventListener("keyup", (e) => {
            if (e.key === "Enter") {
                fetchPartnersWithFilters();
            }
        });
    }

    const partnerStateSelect = document.getElementById("partner-state-select");
    if (partnerStateSelect) {
        partnerStateSelect.addEventListener("change", () => handleStateSelectChange());
    }

    const partnerSchemeSelect = document.getElementById("partner-scheme-select");
    if (partnerSchemeSelect) {
        partnerSchemeSelect.addEventListener("change", () => fetchPartnersWithFilters());
    }

    const citySelect = document.getElementById("city-select");
    if (citySelect) {
        citySelect.addEventListener("change", () => handleCitySelectChange());
    }

    // Type pills
    document.querySelectorAll(".type-pill").forEach(pill => {
        pill.addEventListener("click", () => {
            document.querySelectorAll(".type-pill").forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            activePartnerTypeFilter = pill.getAttribute("data-type") || "ALL";
            fetchPartnersWithFilters();
        });
    });
}

/* =====================================================
   DOCUMENT OCR DROPZONE & SCANNING LOGIC
===================================================== */
function setupOcrDropzoneEvents() {
    const dropzone = document.getElementById("ocr-dropzone");
    const fileInput = document.getElementById("ocr-file-input");
    const cameraBtn = document.getElementById("ocr-camera-btn");
    const sampleBtn = document.getElementById("ocr-sample-btn");
    const clearBtn = document.getElementById("clear-staged-btn");
    const startOcrBtn = document.getElementById("start-ocr-btn");

    if (dropzone) {
        dropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dropzone.classList.add("dragover");
        });

        dropzone.addEventListener("dragleave", () => {
            dropzone.classList.remove("dragover");
        });

        dropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropzone.classList.remove("dragover");
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleNewFilesSelected(Array.from(e.dataTransfer.files));
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleNewFilesSelected(Array.from(e.target.files));
            }
        });
    }

    if (cameraBtn) {
        cameraBtn.addEventListener("click", () => {
            // Camera input trigger (capture attribute)
            const camInput = document.createElement("input");
            camInput.type = "file";
            camInput.accept = "image/*";
            camInput.capture = "environment";
            camInput.onchange = (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleNewFilesSelected(Array.from(e.target.files));
                }
            };
            camInput.click();
        });
    }

    if (sampleBtn) {
        sampleBtn.addEventListener("click", () => {
            loadDemoSampleDocuments();
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            stagedOcrFiles = [];
            renderStagedFiles();
            const resultsBox = document.getElementById("ocr-results-box");
            if (resultsBox) resultsBox.style.display = "none";
        });
    }

    if (startOcrBtn) {
        startOcrBtn.addEventListener("click", async () => {
            await performDocumentOcrAndVerification();
        });
    }
}

function handleNewFilesSelected(newFiles) {
    newFiles.forEach(f => {
        // Avoid duplicate filenames
        if (!stagedOcrFiles.some(sf => sf.name === f.name && sf.size === f.size)) {
            stagedOcrFiles.push(f);
        }
    });
    renderStagedFiles();
}

function loadDemoSampleDocuments() {
    // Generate simulated standard test documents for the borrower
    const sampleFiles = [
        new File([
            "GOVERNMENT OF HARYANA\nSCHEDULED CASTE CERTIFICATE (अनुसूचित जाति प्रमाण पत्र)\nCertificate No: SC/2025/HAR/89421\nThis certifies that the applicant belongs to Scheduled Caste (SC) category.\nIssuing Authority: Tehsildar, Kurukshetra\nValidity: Permanent Valid"
        ], "caste_certificate_SC.txt", { type: "text/plain" }),

        new File([
            "REVENUE DEPARTMENT, GOVT OF HARYANA\nFAMILY INCOME CERTIFICATE (आय प्रमाण पत्र)\nCertificate No: INC/2025/44129\nAnnual Family Income: Rs. 2,20,000/- (Two Lakh Twenty Thousand)\nIssuing Officer: Sub-Divisional Magistrate (SDM)"
        ], "income_certificate_2.2L.txt", { type: "text/plain" }),

        new File([
            "UNIQUE IDENTIFICATION AUTHORITY OF INDIA (UIDAI)\nGovernment of India / भारत सरकार\nAadhaar Card No: XXXX-XXXX-4892\nProof of Identity & Address Verified"
        ], "aadhaar_card_proof.txt", { type: "text/plain" }),

        new File([
            "STATE BANK OF INDIA\nSAVINGS BANK PASSBOOK\nAccount No: 39482910482\nIFSC Code: SBIN0001234\nAccount Status: Active KYC Compliant"
        ], "bank_passbook_sbi.txt", { type: "text/plain" }),

        new File([
            "PROJECT REPORT & ESTIMATE QUOTATION\nProposed Business: Grocery & Dairy Retail Enterprise\nTotal Estimated Project Cost: Rs. 1,40,000/-\nTechno-Economically Feasible"
        ], "project_report_grocery.txt", { type: "text/plain" })
    ];

    stagedOcrFiles = sampleFiles;
    renderStagedFiles();
    alert("✅ 5 डेमो सरकारी दस्तावेज (Caste, Income, Aadhaar, Bank, Project Report) लोड हो गए हैं। अब 'AI OCR से स्कैन व सत्यापन करें' बटन दबाएँ।");
}

function renderStagedFiles() {
    const stagedContainer = document.getElementById("ocr-staged-files");
    const chipsContainer = document.getElementById("staged-chips-container");
    const countSpan = document.getElementById("staged-count");

    if (!stagedContainer || !chipsContainer) return;

    if (stagedOcrFiles.length === 0) {
        stagedContainer.style.display = "none";
        return;
    }

    stagedContainer.style.display = "flex";
    if (countSpan) countSpan.textContent = stagedOcrFiles.length;

    chipsContainer.innerHTML = stagedOcrFiles.map((file, idx) => {
        const ext = file.name.split('.').pop().toUpperCase();
        let iconClass = "fa-file";
        if (file.name.toLowerCase().includes("caste") || file.name.toLowerCase().includes("jati")) iconClass = "fa-id-card";
        else if (file.name.toLowerCase().includes("income") || file.name.toLowerCase().includes("aay")) iconClass = "fa-file-invoice-dollar";
        else if (file.name.toLowerCase().includes("bank")) iconClass = "fa-building-columns";
        else if (file.name.toLowerCase().includes("aadhaar") || file.name.toLowerCase().includes("aadhar")) iconClass = "fa-address-card";

        return `
            <div class="staged-chip">
                <i class="fa-solid ${iconClass}"></i>
                <span>${escapeHtml(file.name)} (${ext})</span>
                <button type="button" class="remove-chip-btn" onclick="removeStagedFile(${idx})" title="हटाएँ">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
        `;
    }).join("");
}

function removeStagedFile(index) {
    stagedOcrFiles.splice(index, 1);
    renderStagedFiles();
}

/* =====================================================
   OCR API INVOCATION & REPORT DISPLAY
===================================================== */
async function performDocumentOcrAndVerification() {
    if (stagedOcrFiles.length === 0) {
        alert("कृपया पहले कम से कम एक दस्तावेज चुनें या डेमो लोड करें।");
        return;
    }

    const loader = document.getElementById("ocr-scanning-loader");
    const resultsBox = document.getElementById("ocr-results-box");
    const schemeType = document.getElementById("ocr-scheme-type")?.value || "business";

    if (loader) loader.style.display = "block";
    if (resultsBox) resultsBox.style.display = "none";

    try {
        const formData = new FormData();
        stagedOcrFiles.forEach(file => {
            formData.append("files", file);
        });
        formData.append("loan_type", schemeType);

        const response = await fetch(`${API_BASE_URL}/api/verify-documents`, {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`OCR API failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log("OCR Verification Response:", data);

        if (loader) loader.style.display = "none";

        if (data.success && data.readiness_report) {
            renderOcrResults(data.documents, data.readiness_report);
            if (resultsBox) {
                resultsBox.style.display = "block";
                resultsBox.scrollIntoView({ behavior: "smooth" });
            }
        }

    } catch (error) {
        console.error("Document OCR Error:", error);
        if (loader) loader.style.display = "none";
        alert("दस्तावेज OCR व सत्यापन में त्रुटि हुई। कृपया backend की स्थिति जाँचें।");
    }
}

function renderOcrResults(documents, report) {
    // 1. Overall badge & summary
    const overallBadge = document.getElementById("ocr-overall-badge");
    const summaryElem = document.getElementById("ocr-report-summary");
    const progressLabel = document.getElementById("ocr-progress-label");
    const progressBar = document.getElementById("ocr-progress-bar");

    if (overallBadge) {
        overallBadge.textContent = report.badge;
        overallBadge.style.background = report.color || "#10b981";
    }

    if (summaryElem) {
        summaryElem.textContent = report.summary;
    }

    if (progressLabel) {
        progressLabel.textContent = `${report.satisfied_count} / ${report.total_required} दस्तावेज सत्यापित (${report.readiness_percentage}%)`;
    }

    if (progressBar) {
        progressBar.style.width = `${report.readiness_percentage}%`;
        if (report.readiness_percentage < 60) {
            progressBar.style.background = "linear-gradient(90deg, #f59e0b, #ef4444)";
        } else {
            progressBar.style.background = "linear-gradient(90deg, #6366f1, #10b981)";
        }
    }

    // 2. Verified Document Cards Grid
    const docsGrid = document.getElementById("verified-docs-grid");
    if (docsGrid && documents) {
        docsGrid.innerHTML = documents.map(doc => {
            const fieldsHtml = Object.keys(doc.extracted_fields || {}).map(k => `
                <div class="extracted-field-row">
                    <span class="field-key">${formatFieldKey(k)}:</span>
                    <span class="field-val">${escapeHtml(doc.extracted_fields[k])}</span>
                </div>
            `).join("");

            const notesHtml = (doc.notes || []).map(n => `<li>${escapeHtml(n)}</li>`).join("");

            return `
                <div class="verified-doc-card">
                    <div class="doc-card-header">
                        <div class="doc-card-icon"><i class="fa-solid ${doc.icon}"></i></div>
                        <div class="doc-card-title">
                            <h4>${escapeHtml(doc.title)}</h4>
                            <span>फ़ाइल: ${escapeHtml(doc.filename)}</span>
                        </div>
                        <span class="doc-badge-verified"><i class="fa-solid fa-circle-check"></i> सत्यापित</span>
                    </div>
                    ${fieldsHtml ? `<div class="extracted-fields-list">${fieldsHtml}</div>` : ''}
                    <ul class="doc-notes-list">${notesHtml}</ul>
                </div>
            `;
        }).join("");
    }

    // 3. Checklist items status
    const checklistContainer = document.getElementById("ocr-checklist-items");
    if (checklistContainer && report.checklist) {
        checklistContainer.innerHTML = report.checklist.map(item => {
            const isVerified = item.status === "VERIFIED";
            return `
                <div class="checklist-card ${isVerified ? 'verified' : 'missing'}">
                    <div class="checklist-card-info">
                        <i class="fa-solid ${isVerified ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
                        <div>
                            <strong>${escapeHtml(item.name)}</strong>
                            <div style="font-size: 11px; color: #64748b;">${escapeHtml(item.description)}</div>
                        </div>
                    </div>
                    <span class="checklist-status-tag">${escapeHtml(item.status_text)}</span>
                </div>
            `;
        }).join("");
    }
}

function formatFieldKey(key) {
    const map = {
        "category": "श्रेणी (Category)",
        "certificate_no": "प्रमाण पत्र संख्या (Cert No)",
        "issuing_authority": "जारीकर्ता प्राधिकारी (Authority)",
        "validity": "वैधता (Validity)",
        "annual_income": "वार्षिक पारिवारिक आय (Income)",
        "id_type": "पहचान प्रकार (ID Type)",
        "account_status": "खाता स्थिति (Account)",
        "ifsc_code": "IFSC कोड",
        "proposal_type": "प्रस्ताव प्रकार (Proposal)",
        "feasibility": "व्यवहार्यता (Feasibility)",
        "admission_status": "प्रवेश स्थिति (Admission)",
        "fee_structure": "शुल्क संरचना (Fee Structure)"
    };
    return map[key] || key.replace(/_/g, " ");
}

/* =====================================================
   AI CHAT API INTEGRATION
===================================================== */
async function startLoanSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/ai/new-session`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        sessionId = data.session_id;
        console.log("AI Loan Session Initialized:", sessionId);

        if (data.message) {
            updateSpeakerBubble(data.message);
        }

        return sessionId;
    } catch (error) {
        console.error("Error starting AI loan session:", error);
        appendChatMessage("bot", "⚠️ Backend connect नहीं हो पाया। कृपया सुनिश्चित करें कि FastAPI server (`uvicorn main:app --reload`) चल रहा है।");
        return null;
    }
}

async function handleUserChatMessage(userText) {
    // Clear chat input write box immediately so old chat never stays
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
        chatInput.value = "";
    }

    appendChatMessage("user", userText);

    if (!sessionId) {
        const newSessionId = await startLoanSession();
        if (!newSessionId) return;
    }

    // Typing indicator
    const typingId = appendChatMessage("bot", "<i>योजनासेतु सोच रहा है...</i>");

    try {
        const response = await fetch(`${API_BASE_URL}/api/ai/loan-chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                session_id: sessionId,
                message: userText
            })
        });

        // Remove typing indicator
        const typingElem = document.getElementById(typingId);
        if (typingElem) typingElem.remove();

        if (!response.ok) {
            throw new Error(`Chat API failed with status ${response.status}`);
        }

        const data = await response.json();
        console.log("AI Chat Response:", data);

        if (data.success && data.message) {
            appendChatMessage("bot", data.message);
            updateSpeakerBubble(data.message);
            speakText(data.message);

            // Auto-redirect to Document OCR section if message explains or inquires about documents
            const isDocQueryOrResponse = (data.message && (
                data.message.includes("दस्तावेज OCR") ||
                data.message.includes("जाति प्रमाण पत्र") ||
                data.message.includes("Caste Certificate") ||
                data.message.includes("दस्तावेजों (Documents)")
            )) || (userText && (
                userText.toLowerCase().includes("डॉक्यूमेंट") ||
                userText.toLowerCase().includes("दस्तावेज") ||
                userText.toLowerCase().includes("कागजात") ||
                userText.toLowerCase().includes("document")
            ));

            if (isDocQueryOrResponse) {
                setTimeout(() => {
                    scrollToSection("doc-ocr-section");
                    const ocrSec = document.getElementById("doc-ocr-section");
                    if (ocrSec) {
                        ocrSec.classList.add("chat-highlight-pulse");
                        setTimeout(() => ocrSec.classList.remove("chat-highlight-pulse"), 2500);
                    }
                }, 1400);
            }
        }

        // If conversation is complete, render recommendation, autofill all widgets, and readiness score
        if (data.complete && data.recommendation) {
            let recommendationEmi = data.emi;
            if (!recommendationEmi && data.user_data && data.recommendation.recommended_scheme) {
                recommendationEmi = await calculateRecommendationEmi(
                    data.user_data,
                    data.recommendation.recommended_scheme
                );
            }
            renderRecommendationCard(data.recommendation, recommendationEmi, data.readiness, data.user_data);
            
            // Auto-fill all interactive widgets (Channel Partner, EMI Calculator, Readiness Simulator)
            autoFillAllWidgetsFromRecommendation(data.user_data, data.recommendation.recommended_scheme, recommendationEmi, data.readiness);
            
            // Continue the user journey to nearby channel partners after presentation
            setTimeout(() => scrollToSection("partner-section"), 1400);
        }

    } catch (error) {
        console.error("Loan Chat Error:", error);
        const typingElem = document.getElementById(typingId);
        if (typingElem) typingElem.remove();
        appendChatMessage("bot", "❌ क्षमा करें, संदेश भेजने में त्रुटि हुई। कृपया backend की स्थिति जाँचें।");
    }
}

function appendChatMessage(sender, text) {
    const container = document.getElementById("chat-messages");
    if (!container) return;

    const msgId = "msg-" + Date.now() + "-" + Math.random().toString(36).substr(2, 4);
    const msgDiv = document.createElement("div");
    msgDiv.id = msgId;
    msgDiv.className = `message ${sender === "user" ? "user-message" : "bot-message"}`;

    const avatarIcon = sender === "user" ? "fa-user" : "fa-robot";
    const isTyping = typeof text === "string" && text.includes("योजनासेतु सोच रहा है");

    const listenBtn = sender === "bot" && !isTyping
        ? `<button type="button" class="chat-listen-btn" title="आवाज़ सुनें (Listen Voice)" onclick="speakChatMessage('${msgId}')"><i class="fa-solid fa-volume-high"></i></button>`
        : '';

    // Format newlines and markdown bold text cleanly
    let formattedText = typeof text === "string"
        ? text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")
        : text;

    // Add direct CTA button if bot is describing documents
    if (sender === "bot" && typeof text === "string" && (text.includes("दस्तावेज OCR") || text.includes("जाति प्रमाण पत्र") || text.includes("Caste Certificate"))) {
        formattedText += `
            <div style="margin-top: 10px;">
                <button type="button" class="btn-primary" style="padding: 6px 14px; font-size: 12px; border-radius: 6px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;" onclick="scrollToSection('doc-ocr-section')">
                    <i class="fa-solid fa-file-shield"></i> दस्तावेज OCR पर जाएँ व सत्यापित करें
                </button>
            </div>
        `;
    }

    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid ${avatarIcon}"></i></div>
        <div class="msg-content-wrapper">
            <div class="msg-content">${formattedText}</div>
            ${listenBtn}
        </div>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgId;
}

function speakChatMessage(msgId) {
    const elem = document.getElementById(msgId);
    if (elem) {
        const textElem = elem.querySelector(".msg-content");
        if (textElem) {
            speakText(textElem.innerText || textElem.textContent);
        }
    }
}

function updateSpeakerBubble(text) {
    const speechDiv = document.querySelector(".speech div p");
    if (speechDiv) {
        speechDiv.textContent = text;
    }
}

/* =====================================================
   RECOMMENDATION & READINESS SCORE RENDERING
===================================================== */
function renderRecommendationCard(rec, emi, readiness) {
    const card = document.getElementById("recommendation-card");
    if (!card) return;

    if (rec.success && rec.recommended_scheme) {
        const scheme = rec.recommended_scheme;
        document.getElementById("rec-scheme-name").textContent = scheme.name_hi ? `${scheme.name} (${scheme.name_hi})` : scheme.name;
        document.getElementById("rec-scheme-desc").textContent = scheme.description_hi || scheme.description;
        document.getElementById("rec-max-loan").textContent = "₹" + Number(scheme.max_loan).toLocaleString("en-IN");
        document.getElementById("rec-interest").textContent = scheme.interest_rate + "% p.a.";
        document.getElementById("rec-moratorium").textContent = (scheme.moratorium_months || 0) + " महीने";
        document.getElementById("rec-monthly-emi").textContent = emi
            ? "₹" + Number(emi.monthly_emi).toLocaleString("en-IN", { minimumFractionDigits: 2 })
            : "—";
        document.getElementById("rec-total-payable").textContent = emi
            ? "₹" + Number(emi.total_payment).toLocaleString("en-IN", { minimumFractionDigits: 2 })
            : "—";

        // RAG Match Score Badge
        const matchBadge = document.getElementById("rec-match-badge");
        const matchScoreSpan = document.getElementById("rec-match-score");
        if (matchBadge && matchScoreSpan) {
            const score = rec.match_score || 92;
            matchScoreSpan.textContent = `${score}% मैच`;
            matchBadge.style.display = "inline-flex";
        }

        // RAG Subsidy Details
        const subsidyBanner = document.getElementById("rec-subsidy-banner");
        const subsidyText = document.getElementById("rec-subsidy-text");
        const subsidyInfo = rec.subsidy_info || scheme.subsidy_details;
        if (subsidyBanner && subsidyText && subsidyInfo) {
            subsidyText.textContent = subsidyInfo;
            subsidyBanner.style.display = "flex";
        } else if (subsidyBanner) {
            subsidyBanner.style.display = "none";
        }

        // RAG Matching Reasons
        const reasonsBox = document.getElementById("rec-reasons-box");
        const reasonsList = document.getElementById("rec-reasons-list");
        if (reasonsBox && reasonsList) {
            const reasons = rec.reasons || [];
            if (reasons.length > 0) {
                reasonsList.innerHTML = reasons.map(r => `<li>${escapeHtml(r)}</li>`).join("");
                reasonsBox.style.display = "block";
            } else {
                reasonsBox.style.display = "none";
            }
        }

        // RAG Mandatory Documents Checklist
        const docsBox = document.getElementById("rec-docs-box");
        const docsList = document.getElementById("rec-docs-list");
        if (docsBox && docsList) {
            const docs = rec.documents_required || scheme.mandatory_documents || [];
            if (docs.length > 0) {
                docsList.innerHTML = docs.map(d => `<li>${escapeHtml(d)}</li>`).join("");
                docsBox.style.display = "block";
            } else {
                docsBox.style.display = "none";
            }
        }

        // Render Loan Readiness Score Section
        if (readiness) {
            populateReadinessUI("rec", readiness);
            const readinessBox = document.getElementById("rec-readiness-box");
            if (readinessBox) readinessBox.style.display = "block";
        }

        // Auto-fill all widgets across the app with this recommended scheme's data
        autoFillAllWidgetsFromRecommendation(userData, scheme, emi, readiness);

        // Auto-save recommended scheme & readiness score to SQLite database
        autoSaveCurrentAssessment(rec, readiness, userData);

        card.style.display = "block";
        card.scrollIntoView({ behavior: "smooth" });
    }
}

/**
 * AUTOMATICALLY AUTO-FILLS ALL PLATFORM WIDGETS WHEN AI RECOMMENDS A SCHEME
 * 1. Channel Partner Locator: Auto-selects recommended scheme & user location, triggers RAG partner search
 * 2. EMI Calculator: Auto-fills principal, scheme interest rate, tenure, moratorium & runs EMI calculation
 * 3. Loan Readiness Simulator: Auto-fills purpose, loan amount, income, tenure, caste & document status
 */
function autoFillAllWidgetsFromRecommendation(userData, scheme, emiData, readinessData) {
    if (!scheme) return;
    console.log("⚡ Auto-filling all widgets from AI Recommendation:", scheme.id, scheme.name);

    // =====================================================
    // 1. AUTO-FILL CHANNEL PARTNER LOCATOR
    // =====================================================
    const partnerSchemeSelect = document.getElementById("partner-scheme-select");
    if (partnerSchemeSelect) {
        partnerSchemeSelect.value = scheme.id || "";
        console.log("Partner Scheme Filter auto-selected:", scheme.id);
    }

    const partnerQueryInput = document.getElementById("partner-query-input");
    const partnerStateSelect = document.getElementById("partner-state-select");
    const citySelect = document.getElementById("city-select");

    if (userData && userData.location) {
        const locClean = String(userData.location).trim();
        const locLower = locClean.toLowerCase();

        // If user mentioned a city, match in quick city select or set query
        if (citySelect) {
            for (let i = 0; i < citySelect.options.length; i++) {
                const optText = citySelect.options[i].text.toLowerCase();
                if (optText.includes(locLower) || locLower.includes(optText.split(" ")[0].toLowerCase())) {
                    citySelect.selectedIndex = i;
                    const [lat, lng] = citySelect.value.split(",").map(Number);
                    userCoordinates = { lat, lng };
                    break;
                }
            }
        }

        // Match state if available
        if (partnerStateSelect) {
            for (let i = 0; i < partnerStateSelect.options.length; i++) {
                const stateText = partnerStateSelect.options[i].text.toLowerCase();
                if (stateText.includes(locLower) || locLower.includes(stateText.split(" ")[0].toLowerCase())) {
                    partnerStateSelect.selectedIndex = i;
                    break;
                }
            }
        }

        if (partnerQueryInput && !partnerQueryInput.value) {
            partnerQueryInput.value = `${locClean} ${scheme.name_hi || scheme.name}`;
        }
    } else if (partnerQueryInput && !partnerQueryInput.value) {
        partnerQueryInput.value = scheme.name_hi || scheme.name;
    }

    // Immediately trigger RAG Partner search for the recommended scheme
    fetchPartnersWithFilters();

    // =====================================================
    // 2. AUTO-FILL EMI CALCULATOR
    // =====================================================
    const emiPrincipal = document.getElementById("emi-principal");
    const emiRate = document.getElementById("emi-rate");
    const emiTenure = document.getElementById("emi-tenure");
    const emiMoratorium = document.getElementById("emi-moratorium");

    const loanReqAmount = (userData && Number(userData.loan_required)) || Number(scheme.max_loan) || 100000;
    const loanTenureVal = (userData && Number(userData.tenure_months)) || Number(scheme.repayment_tenure_months) || 36;
    const loanRateVal = Number(scheme.interest_rate) || 6.0;
    const loanMoratoriumVal = Number(scheme.moratorium_months) || 0;

    if (emiPrincipal) emiPrincipal.value = loanReqAmount;
    if (emiRate) emiRate.value = loanRateVal;
    if (emiTenure) emiTenure.value = loanTenureVal;
    if (emiMoratorium) emiMoratorium.value = loanMoratoriumVal;

    // Trigger instant calculation and result rendering
    calculateEmiFromBackend();

    // =====================================================
    // 3. AUTO-FILL LOAN READINESS SIMULATOR
    // =====================================================
    const simLoanType = document.getElementById("sim-loan-type");
    const simLoanAmount = document.getElementById("sim-loan-amount");
    const simIncome = document.getElementById("sim-income");
    const simTenure = document.getElementById("sim-tenure");
    const simPurpose = document.getElementById("sim-purpose");
    const simLocation = document.getElementById("sim-location");
    const simCaste = document.getElementById("sim-caste-status");
    const simDocs = document.getElementById("sim-docs-status");
    const simExp = document.getElementById("sim-experience");

    if (simLoanType) simLoanType.value = (userData && userData.loan_type) || scheme.loan_type || "business";
    if (simLoanAmount) simLoanAmount.value = loanReqAmount;
    if (simIncome) simIncome.value = (userData && Number(userData.income)) || 300000;
    if (simTenure) simTenure.value = loanTenureVal;
    if (simPurpose) {
        simPurpose.value = (userData && (userData.business_type || userData.education_course)) || (scheme.loan_type === "education" ? "Higher Education" : "Small Enterprise");
    }
    if (simLocation) {
        simLocation.value = (userData && userData.location) || "Kurukshetra (कुरुक्षेत्र)";
    }
    if (simCaste && userData && userData.caste_status) simCaste.value = userData.caste_status;
    if (simDocs && userData && userData.docs_status) simDocs.value = userData.docs_status;
    if (simExp && userData && userData.experience) simExp.value = userData.experience;

    // Trigger visual highlight pulses to show user the fields were filled
    [
        document.getElementById("partner-section"),
        document.getElementById("emi-section"),
        document.getElementById("readiness-section")
    ].forEach(elem => {
        if (elem) {
            elem.classList.add("chat-highlight-pulse");
            setTimeout(() => elem.classList.remove("chat-highlight-pulse"), 2000);
        }
    });
}

function populateReadinessUI(prefix, readiness) {
    if (!readiness) return;

    const scoreNum = document.getElementById(`${prefix}-readiness-score-num`);
    if (scoreNum) scoreNum.textContent = readiness.score;

    const summaryElem = document.getElementById(`${prefix}-readiness-summary`);
    if (summaryElem) summaryElem.textContent = readiness.summary;

    const badgeElem = document.getElementById(`${prefix}-readiness-badge`);
    if (badgeElem) {
        badgeElem.textContent = `${readiness.score} / 100 — ${readiness.badge}`;
        badgeElem.style.background = readiness.color || "#10b981";
    }

    const bandLabel = document.getElementById(`${prefix}-readiness-band-label`);
    if (bandLabel) {
        bandLabel.textContent = readiness.badge;
        bandLabel.style.color = readiness.color || "#10b981";
    }

    // Animate SVG Gauge Circle
    const gaugeCircle = document.getElementById(`${prefix}-gauge-circle`);
    if (gaugeCircle) {
        const circumference = 2 * Math.PI * 50; // ~314.159
        const offset = circumference - (circumference * (readiness.score / 100));
        gaugeCircle.style.strokeDasharray = `${circumference}`;
        gaugeCircle.style.strokeDashoffset = `${offset}`;
        gaugeCircle.style.stroke = readiness.color || "#10b981";
    }

    // Populate Pillars Breakdown
    const pillarsContainer = document.getElementById(`${prefix}-readiness-pillars`);
    if (pillarsContainer && readiness.pillars) {
        pillarsContainer.innerHTML = Object.keys(readiness.pillars).map(key => {
            const pillar = readiness.pillars[key];
            const pct = Math.min(100, Math.round((pillar.score / pillar.max) * 100));
            return `
                <div class="pillar-item">
                    <div class="pillar-top-row">
                        <span>${pillar.name}</span>
                        <span><strong>${pillar.score}</strong> / ${pillar.max} pts</span>
                    </div>
                    <div class="pillar-bar-bg">
                        <div class="pillar-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <div class="pillar-details-text">${pillar.details}</div>
                </div>
            `;
        }).join("");
    }

    // Populate Actionable Tips
    const tipsContainer = document.getElementById(`${prefix}-readiness-tips`);
    if (tipsContainer && readiness.tips) {
        tipsContainer.innerHTML = readiness.tips.map(tip => `
            <li><i class="fa-solid fa-circle-check" style="color: #facc15; margin-right: 6px;"></i>${tip}</li>
        `).join("");
    }

    // Populate Document Checklist
    const docsContainer = document.getElementById(`${prefix}-readiness-docs`);
    if (docsContainer && readiness.documents) {
        docsContainer.innerHTML = readiness.documents.map(doc => `
            <div class="doc-item ${doc.required ? 'mandatory' : ''}">
                <i class="fa-solid ${doc.icon || 'fa-file-lines'}"></i>
                <span>${doc.name}</span>
                <span class="doc-tag">${doc.required ? 'अनिवार्य (Required)' : 'वैकल्पिक (Optional)'}</span>
            </div>
        `).join("");
    }
}

/* =====================================================
   STANDALONE READINESS SIMULATOR API INTEGRATION
===================================================== */
async function calculateReadinessFromBackend() {
    const loanTypeSelect = document.getElementById("sim-loan-type");
    const loanType = loanTypeSelect?.value;
    if (!loanType) {
        alert("कृपया ऋण का प्रकार चुनें (Please select a loan type).");
        return;
    }
    const loanAmount = parseFloat(document.getElementById("sim-loan-amount")?.value);
    const income = parseFloat(document.getElementById("sim-income")?.value);
    const tenure = parseInt(document.getElementById("sim-tenure")?.value);
    const purpose = document.getElementById("sim-purpose")?.value || "";
    const location = document.getElementById("sim-location")?.value || "";

    if (!loanAmount || isNaN(loanAmount) || loanAmount <= 0) {
        alert("कृपया वैध ऋण राशि दर्ज करें (Please enter a valid loan amount).");
        return;
    }
    if (!income || isNaN(income) || income <= 0) {
        alert("कृपया वार्षिक पारिवारिक आय दर्ज करें (Please enter annual family income).");
        return;
    }
    if (!tenure || isNaN(tenure) || tenure <= 0) {
        alert("कृपया पुनर्भुगतान अवधि दर्ज करें (Please enter tenure in months).");
        return;
    }

    const casteStatus = document.getElementById("sim-caste-status")?.value || "sc_certified";
    const docsStatus = document.getElementById("sim-docs-status")?.value || "partial_ready";
    const experience = document.getElementById("sim-experience")?.value || "moderate";
    const creditHistory = document.getElementById("sim-credit-history")?.value || "clean";
    const existingEmi = parseFloat(document.getElementById("sim-existing-emi")?.value || 0);

    const simResultBox = document.getElementById("sim-result-box");

    try {
        const payload = {
            loan_type: loanType,
            loan_required: loanAmount,
            income: income,
            tenure_months: tenure,
            location: location,
            caste_status: casteStatus,
            docs_status: docsStatus,
            experience: experience,
            credit_history: creditHistory,
            existing_emi: isNaN(existingEmi) ? 0 : existingEmi
        };

        if (loanType === "education") {
            payload.education_course = purpose;
        } else {
            payload.business_type = purpose;
        }

        const response = await fetch(`${API_BASE_URL}/api/calculate-readiness`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Readiness calculation failed: ${response.status}`);
        }

        const data = await response.json();
        console.log("Readiness Score Result:", data);

        if (data.success && data.readiness) {
            populateReadinessUI("sim", data.readiness);
            if (simResultBox) {
                simResultBox.style.display = "block";
                simResultBox.scrollIntoView({ behavior: "smooth" });
            }

            // Auto-save readiness score calculation to SQLite database
            autoSaveCurrentAssessment(null, data.readiness, {
                loan_type: loanType,
                loan_required: loanAmount,
                income: income,
                tenure_months: tenure,
                location: location,
                business_type: purpose
            });
        }
    } catch (error) {
        console.error("Readiness calculation error:", error);
        alert("ऋण तैयारी स्कोर गणना में त्रुटि हुई। कृपया backend की स्थिति जाँचें।");
    }
}

/* =====================================================
   EMI CALCULATOR API INTEGRATION
===================================================== */
async function calculateEmiFromBackend() {
    const principal = parseFloat(document.getElementById("emi-principal").value) || 0;
    const rate = parseFloat(document.getElementById("emi-rate").value) || 0;
    const tenure = parseInt(document.getElementById("emi-tenure").value) || 12;
    const moratorium = parseInt(document.getElementById("emi-moratorium").value) || 0;

    try {
        const response = await fetch(`${API_BASE_URL}/api/calculate-emi`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                principal: principal,
                annual_interest_rate: rate,
                tenure_months: tenure,
                moratorium_months: moratorium
            })
        });

        if (!response.ok) {
            throw new Error("EMI API Calculation Failed");
        }

        const data = await response.json();
        if (data.success && data.result) {
            const res = data.result;
            document.getElementById("res-monthly-emi").textContent = "₹" + res.monthly_emi.toLocaleString("en-IN", { minimumFractionDigits: 2 });
            document.getElementById("res-total-interest").textContent = "₹" + res.total_interest.toLocaleString("en-IN", { minimumFractionDigits: 2 });
            document.getElementById("res-total-payable").textContent = "₹" + res.total_payment.toLocaleString("en-IN", { minimumFractionDigits: 2 });
            document.getElementById("emi-result-box").style.display = "grid";
        }
    } catch (error) {
        console.error("EMI Calculation error:", error);
        alert("EMI calculation error. Make sure FastAPI server is running.");
    }
}

/* =====================================================
   NSFDC CHANNEL PARTNER FINDER & RAG GEOLOCATION ENGINE
===================================================== */

/**
 * Handles explicit or automatic browser location permission request
 */
function handleLocationPermissionRequest(isExplicitClick = false) {
    const statusBadge = document.getElementById("geo-status-badge");
    const listContainer = document.getElementById("partners-list");

    if (statusBadge) {
        statusBadge.className = "geo-status-badge waiting";
        statusBadge.innerHTML = `<span class="pulse-dot"></span> स्थान प्राप्त किया जा रहा है...`;
    }

    if (listContainer) {
        listContainer.innerHTML = `<div class="loading-placeholder">📍 आपका सटीक स्थान प्राप्त किया जा रहा है...</div>`;
    }

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const accuracy = Math.round(position.coords.accuracy || 0);

                userCoordinates = { lat, lng };
                isLocationPermissionGranted = true;

                console.log(`Geolocation granted: ${lat}, ${lng} (accuracy: ${accuracy}m)`);

                if (statusBadge) {
                    statusBadge.className = "geo-status-badge granted";
                    statusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> स्थान प्राप्त (${lat.toFixed(3)}°, ${lng.toFixed(3)}°)`;
                }

                // Auto select nearest state if in North India
                const stateSelect = document.getElementById("partner-state-select");
                if (stateSelect && (lat >= 27.5 && lat <= 31.5) && (lng >= 74.0 && lng <= 78.5)) {
                    stateSelect.value = "ALL";
                }

                await fetchPartnersWithFilters();
            },
            async (error) => {
                console.warn("Geolocation permission denied/error:", error);
                isLocationPermissionGranted = false;

                if (statusBadge) {
                    statusBadge.className = "geo-status-badge denied";
                    statusBadge.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> स्थान अनुमति अस्वीकृत (डिफ़ॉल्ट सक्रिय)`;
                }

                // Use current dropdown value
                handleCitySelectChange();
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 60000
            }
        );
    } else {
        if (statusBadge) {
            statusBadge.className = "geo-status-badge manual";
            statusBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ब्राउज़र स्थान असमर्थ`;
        }
        handleCitySelectChange();
    }
}

// =====================================================
// STATE-TO-CITY DYNAMIC MAPPING
// =====================================================
const STATE_CITY_MAPPING = {
    "ALL": [
        { name: "कुरुक्षेत्र (Kurukshetra, Haryana)", lat: 29.9695, lng: 76.8783 },
        { name: "दिल्ली केंद्रीय / ITO (Central Delhi - DSFDC HQ)", lat: 28.6294, lng: 77.2435 },
        { name: "रोहिणी (North-West Delhi - DSFDC Branch)", lat: 28.7235, lng: 77.1142 },
        { name: "भीकाजी कामा प्लेस (South Delhi - NSFDC Apex HQ)", lat: 28.5684, lng: 77.1895 },
        { name: "करनाल (Karnal, Haryana)", lat: 29.6857, lng: 76.9905 },
        { name: "अंबाला (Ambala, Haryana)", lat: 30.3782, lng: 76.7767 },
        { name: "पानीपत (Panipat, Haryana)", lat: 29.3909, lng: 76.9635 },
        { name: "पंचकूला (Panchkula, Haryana)", lat: 30.6942, lng: 76.8606 },
        { name: "नोएडा / ग्रेटर नोएडा (Noida, UP)", lat: 28.5355, lng: 77.3910 },
        { name: "लखनऊ (Lucknow, UP)", lat: 26.8833, lng: 80.9462 },
        { name: "आगरा (Agra, UP)", lat: 27.1985, lng: 78.0064 },
        { name: "चंडीगढ़ (Chandigarh, Punjab)", lat: 30.7410, lng: 76.7850 },
        { name: "लुधियाना (Ludhiana, Punjab)", lat: 30.9010, lng: 75.8573 },
        { name: "जयपुर (Jaipur, Rajasthan)", lat: 26.8920, lng: 75.8055 },
        { name: "मुंबई (Mumbai, Maharashtra)", lat: 19.1125, lng: 72.8340 },
        { name: "पुणे (Pune, Maharashtra)", lat: 18.5284, lng: 73.8743 },
        { name: "बेंगलुरु (Bengaluru, Karnataka)", lat: 12.9784, lng: 77.5913 },
        { name: "चेन्नई (Chennai, Tamil Nadu)", lat: 13.0336, lng: 80.2447 }
    ],
    "Delhi": [
        { name: "दिल्ली केंद्रीय / ITO (Central Delhi - DSFDC HQ)", lat: 28.6294, lng: 77.2435 },
        { name: "रोहिणी (North-West Delhi - DSFDC Branch)", lat: 28.7235, lng: 77.1142 },
        { name: "भीकाजी कामा प्लेस (South Delhi - NSFDC Apex HQ)", lat: 28.5684, lng: 77.1895 },
        { name: "पूर्वी दिल्ली / लक्ष्मी नगर (East Delhi)", lat: 28.6304, lng: 77.2773 },
        { name: "द्वारका / पश्चिम दिल्ली (Dwarka / West Delhi)", lat: 28.5921, lng: 77.0460 }
    ],
    "Haryana": [
        { name: "कुरुक्षेत्र (Kurukshetra - HSCFDC Office)", lat: 29.9695, lng: 76.8783 },
        { name: "करनाल (Karnal - HSCFDC & PNB Lead)", lat: 29.6857, lng: 76.9905 },
        { name: "अंबाला (Ambala - HSCFDC District Office)", lat: 30.3782, lng: 76.7767 },
        { name: "पानीपत (Panipat - HSCFDC District Office)", lat: 29.3909, lng: 76.9635 },
        { name: "पंचकूला (Panchkula - HSCFDC State HQ)", lat: 30.6942, lng: 76.8606 },
        { name: "रोहतक (Rohtak - SHGB Gramin Bank HQ)", lat: 28.8955, lng: 76.6066 },
        { name: "गुरुग्राम / फरीदाबाद (Gurugram / Faridabad)", lat: 28.4595, lng: 77.0266 },
        { name: "हिसार (Hisar)", lat: 29.1492, lng: 75.7217 }
    ],
    "Uttar Pradesh": [
        { name: "नोएडा / ग्रेटर नोएडा (Gautam Buddha Nagar - UPSCFDC)", lat: 28.5355, lng: 77.3910 },
        { name: "लखनऊ (Lucknow - UPSCFDC State HQ)", lat: 26.8833, lng: 80.9462 },
        { name: "आगरा (Agra - UPSCFDC District Office)", lat: 27.1985, lng: 78.0064 },
        { name: "गाजियाबाद (Ghaziabad)", lat: 28.6692, lng: 77.4538 },
        { name: "वाराणसी (Varanasi)", lat: 25.3176, lng: 82.9739 },
        { name: "कानपुर (Kanpur)", lat: 26.4499, lng: 80.3319 }
    ],
    "Punjab": [
        { name: "चंडीगढ़ (Chandigarh - PSCFC Head Office)", lat: 30.7410, lng: 76.7850 },
        { name: "लुधियाना (Ludhiana - PSCFC District Office)", lat: 30.9010, lng: 75.8573 },
        { name: "अमृतसर (Amritsar)", lat: 31.6340, lng: 74.8723 },
        { name: "जालंधर (Jalandhar)", lat: 31.3260, lng: 75.5762 },
        { name: "पटियाला (Patiala)", lat: 30.3398, lng: 76.3869 }
    ],
    "Rajasthan": [
        { name: "जयपुर (Jaipur - Anuja Nigam State HQ)", lat: 26.8920, lng: 75.8055 },
        { name: "जोधपुर (Jodhpur)", lat: 26.2389, lng: 73.0243 },
        { name: "कोटा (Kota)", lat: 25.2138, lng: 75.8648 },
        { name: "उदयपुर (Udaipur)", lat: 24.5854, lng: 73.7125 }
    ],
    "Maharashtra": [
        { name: "मुंबई (Mumbai - MPBCDC State HQ)", lat: 19.1125, lng: 72.8340 },
        { name: "पुणे (Pune - MPBCDC District Office)", lat: 18.5284, lng: 73.8743 },
        { name: "नागपुर (Nagpur)", lat: 21.1458, lng: 79.0882 },
        { name: "नाशिक (Nashik)", lat: 19.9975, lng: 73.7898 }
    ],
    "Karnataka": [
        { name: "बेंगलुरु (Bengaluru - Ambedkar Corp HQ)", lat: 12.9784, lng: 77.5913 },
        { name: "मैसूरु (Mysuru)", lat: 12.2958, lng: 76.6394 },
        { name: "हुबली-धारवाड़ (Hubballi-Dharwad)", lat: 15.3647, lng: 75.1240 }
    ],
    "Tamil Nadu": [
        { name: "चेन्नई (Chennai - TAHDCO Head Office)", lat: 13.0336, lng: 80.2447 },
        { name: "कोयंबटूर (Coimbatore)", lat: 11.0168, lng: 76.9558 },
        { name: "मदुरै (Madurai)", lat: 9.9252, lng: 78.1198 }
    ]
};

/**
 * Updates the Quick City dropdown when the user selects a State
 */
function updateCityDropdownForState(stateKey) {
    const citySelect = document.getElementById("city-select");
    if (!citySelect) return;

    const cities = STATE_CITY_MAPPING[stateKey] || STATE_CITY_MAPPING["ALL"];
    
    citySelect.innerHTML = cities.map((c, index) => `
        <option value="${c.lat},${c.lng}" ${index === 0 ? 'selected' : ''}>${escapeHtml(c.name)}</option>
    `).join("");

    // Set coordinates to first city of selected state
    if (cities.length > 0) {
        userCoordinates = { lat: cities[0].lat, lng: cities[0].lng };
    }
}

function handleStateSelectChange() {
    const stateSelect = document.getElementById("partner-state-select");
    const selectedState = stateSelect ? stateSelect.value : "ALL";

    console.log("State selected:", selectedState);

    // Dynamically update cities dropdown to only show cities of this state
    updateCityDropdownForState(selectedState);

    // Update status badge
    const statusBadge = document.getElementById("geo-status-badge");
    if (statusBadge && !isLocationPermissionGranted) {
        statusBadge.className = "geo-status-badge manual";
        statusBadge.innerHTML = `<i class="fa-solid fa-map-pin"></i> राज्य: ${selectedState === "ALL" ? "सभी राज्य" : selectedState}`;
    }

    // Refresh partner results
    fetchPartnersWithFilters();
}

function handleCitySelectChange() {
    const select = document.getElementById("city-select");
    if (!select) return;

    const [lat, lng] = select.value.split(",").map(Number);
    userCoordinates = { lat, lng };

    const statusBadge = document.getElementById("geo-status-badge");
    if (statusBadge && !isLocationPermissionGranted) {
        statusBadge.className = "geo-status-badge manual";
        const selectedText = select.options[select.selectedIndex]?.text || "चयनित शहर";
        statusBadge.innerHTML = `<i class="fa-solid fa-location-dot"></i> ${selectedText.split(" ")[0]}`;
    }

    fetchPartnersWithFilters();
}

async function loadDefaultPartners() {
    // Initial city population for default selected state (Haryana)
    const stateSelect = document.getElementById("partner-state-select");
    const initialState = stateSelect ? stateSelect.value : "Haryana";
    updateCityDropdownForState(initialState);
    await fetchPartnersWithFilters();
}

/**
 * Central RAG + Multi-filter partner retriever
 */
async function fetchPartnersWithFilters() {
    const listContainer = document.getElementById("partners-list");
    const countText = document.getElementById("partner-count-text");

    if (listContainer) {
        listContainer.innerHTML = `<div class="loading-placeholder"><i class="fa-solid fa-spinner fa-spin"></i> NSFDC चैनल पार्टनर खोजे जा रहे हैं...</div>`;
    }

    const queryInput = document.getElementById("partner-query-input");
    const stateSelect = document.getElementById("partner-state-select");
    const schemeSelect = document.getElementById("partner-scheme-select");

    const query = queryInput ? queryInput.value.trim() : "";
    const state = stateSelect ? stateSelect.value : "ALL";
    const schemeId = schemeSelect ? schemeSelect.value : "";
    const partnerType = activePartnerTypeFilter || "ALL";

    try {
        const payload = {
            latitude: userCoordinates.lat,
            longitude: userCoordinates.lng,
            query: query || undefined,
            state: state !== "ALL" ? state : undefined,
            scheme_id: schemeId || undefined,
            partner_type: partnerType !== "ALL" ? partnerType : undefined,
            top_k: 8
        };

        const endpoint = query ? `${API_BASE_URL}/api/partners/rag-search` : `${API_BASE_URL}/api/find-partners`;
        const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to fetch channel partners");

        const data = await response.json();
        const partners = data.partners || [];
        lastFetchedPartners = partners;

        const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS["hi-IN"];
        if (countText) {
            countText.textContent = `${partners.length} ${t.partnerCountSuffix || 'आधिकारिक NSFDC चैनल पार्टनर उपलब्ध'}`;
        }

        renderPartnersList(partners);
        renderPartnerMap(userCoordinates.lat, userCoordinates.lng, partners);

    } catch (error) {
        console.error("Partner locator error:", error);
        if (listContainer) {
            const isEn = currentLanguage && currentLanguage.startsWith("en");
            listContainer.innerHTML = `<div class="loading-placeholder" style="color: #ef4444;">⚠️ ${isEn ? 'Error fetching channel partners. Please verify backend status.' : 'चैनल पार्टनर प्राप्त करने में त्रुटि हुई। कृपया backend की स्थिति जाँचें।'}</div>`;
        }
    }
}

function renderPartnersList(partners) {
    const listContainer = document.getElementById("partners-list");
    if (!listContainer) return;

    const isEn = currentLanguage && currentLanguage.startsWith("en");
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS["hi-IN"];

    const countText = document.getElementById("partner-count-text");
    if (countText && partners) {
        countText.textContent = `${partners.length} ${t.partnerCountSuffix || (isEn ? 'Official NSFDC Channel Partners Available' : 'आधिकारिक NSFDC चैनल पार्टनर उपलब्ध')}`;
    }

    if (!partners || partners.length === 0) {
        listContainer.innerHTML = `
            <div class="loading-placeholder" style="grid-column: 1 / -1; padding: 30px; text-align: center;">
                <i class="fa-solid fa-filter-circle-xmark" style="font-size: 28px; color: #94a3b8; margin-bottom: 10px; display: block;"></i>
                <strong>${isEn ? 'No channel partners found with this filter.' : 'इस फ़िल्टर के साथ कोई चैनल पार्टनर नहीं मिला।'}</strong>
                <p style="font-size: 13px; color: #64748b; margin-top: 4px;">${isEn ? 'Please change state or scheme selection and try again.' : 'कृपया राज्य या योजना का चयन बदलकर पुनः प्रयास करें।'}</p>
            </div>
        `;
        return;
    }

    listContainer.innerHTML = partners.map(p => {
        const typeClass = (p.type || "SCA").toLowerCase();
        const typeBadgeName = p.type === "SCA" 
            ? (isEn ? "🏛️ State Agency (SCA)" : "🏛️ राज्य एजेंसी (SCA)")
            : p.type === "PSB" 
            ? (isEn ? "🏦 Lead Bank (PSB)" : "🏦 सरकारी बैंक (PSB)")
            : (isEn ? "🌾 Gramin Bank (RRB)" : "🌾 ग्रामीण बैंक (RRB)");

        const distanceDisplay = p.distance_km !== null && p.distance_km !== undefined
            ? `📍 ${p.distance_km} ${t.partnerDistanceAway || (isEn ? 'km away' : 'km दूर')}`
            : (p.rag_score ? `🎯 RAG: ${Math.round(p.rag_score)}%` : (isEn ? "📍 Available" : "📍 उपलब्ध"));

        const schemesList = (p.schemes || []).slice(0, 4).map(s => {
            const formatted = s.replace(/_/g, " ");
            return `<span class="partner-scheme-tag">${escapeHtml(formatted)}</span>`;
        }).join("");

        const phoneClean = (p.phone || "").replace(/[^\d+]/g, "");

        return `
            <div class="partner-card" id="card-${p.id}">
                <div class="partner-card-header">
                    <span class="partner-type-badge ${typeClass}">${typeBadgeName}</span>
                    <span class="partner-distance-pill">${distanceDisplay}</span>
                </div>
                
                <h3>${escapeHtml(p.name)}</h3>
                
                <div class="partner-address">
                    <i class="fa-solid fa-location-dot" style="color: #ef4444; margin-top: 2px;"></i>
                    <div>
                        <span>${escapeHtml(p.address || p.city)}</span>
                        ${p.pincode ? ` <strong>(PIN: ${p.pincode})</strong>` : ''}
                    </div>
                </div>

                <div class="partner-contact-row">
                    ${p.nodal_officer ? `<div><strong>${t.partnerOfficer || (isEn ? 'Officer' : 'अधिकारी')}</strong>: ${escapeHtml(p.nodal_officer)}</div>` : ''}
                    ${p.phone ? `<div><strong>${t.partnerPhone || (isEn ? 'Phone' : 'फोन')}</strong>: <a href="tel:${phoneClean}">${escapeHtml(p.phone)}</a></div>` : ''}
                    ${p.helpline ? `<div><strong>${t.partnerTollFree || (isEn ? 'Toll-Free' : 'टोल-फ्री')}</strong>: <a href="tel:${p.helpline}">${escapeHtml(p.helpline)}</a></div>` : ''}
                    ${p.working_hours ? `<div style="color: #64748b; font-size: 11px;"><i class="fa-regular fa-clock"></i> ${escapeHtml(p.working_hours)}</div>` : ''}
                </div>

                <div class="partner-schemes-tags">
                    ${schemesList}
                </div>

                <div class="partner-card-actions">
                    <a href="${p.directions_url || `https://www.google.com/maps/dir/?api=1&destination=${p.latitude},${p.longitude}`}" target="_blank" rel="noopener noreferrer" class="partner-action-btn directions" title="${isEn ? 'Get directions on Google Maps' : 'Google Maps पर रास्ता देखें'}">
                        <i class="fa-solid fa-diamond-turn-right"></i> ${t.partnerDirections || (isEn ? 'Directions' : 'दिशा-निर्देश')}
                    </a>
                    ${p.phone ? `
                        <a href="tel:${phoneClean}" class="partner-action-btn call" title="${isEn ? 'Call directly' : 'सीधे कॉल करें'}">
                            <i class="fa-solid fa-phone"></i> ${t.partnerCall || (isEn ? 'Call' : 'कॉल')}
                        </a>
                    ` : ''}
                    <button type="button" class="partner-action-btn call" onclick="focusPartnerOnMap('${p.id}', ${p.latitude}, ${p.longitude})" title="${isEn ? 'Show on map' : 'मानचित्र पर देखें'}">
                        <i class="fa-solid fa-map-pin"></i> ${t.partnerMap || (isEn ? 'Map' : 'मैप')}
                    </button>
                </div>
            </div>
        `;
    }).join("");
}

function focusPartnerOnMap(partnerId, lat, lng) {
    const mapElement = document.getElementById("partner-map");
    if (!partnerMap || !mapElement) return;

    partnerMap.setView([lat, lng], 15, { animate: true });
    mapElement.scrollIntoView({ behavior: "smooth", block: "center" });

    if (partnerMapMarkersDict[partnerId]) {
        partnerMapMarkersDict[partnerId].openPopup();
    }
}

function initSpeechSynthesis() {
    if (!("speechSynthesis" in window)) return;

    const loadVoices = () => {
        availableVoices = window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
}

async function calculateRecommendationEmi(userData, scheme) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/calculate-emi`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                principal: Number(userData.loan_required),
                annual_interest_rate: Number(scheme.interest_rate),
                tenure_months: Number(userData.tenure_months || 36),
                moratorium_months: Number(scheme.moratorium_months || 0)
            })
        });
        const data = await response.json();
        return data.success ? data.result : null;
    } catch (error) {
        console.error("Recommendation EMI fallback failed:", error);
        return null;
    }
}

/* =====================================================
   PARTNER MAP (Leaflet + User Radar + Custom Pins)
===================================================== */
function renderPartnerMap(latitude, longitude, partners) {
    const mapElement = document.getElementById("partner-map");
    if (!mapElement || !window.L) return;

    if (!partnerMap) {
        partnerMap = L.map(mapElement).setView([latitude, longitude], 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors | NSFDC Network"
        }).addTo(partnerMap);
        partnerMarkers = L.layerGroup().addTo(partnerMap);
    } else {
        partnerMap.setView([latitude, longitude], 11);
        partnerMarkers.clearLayers();
    }

    partnerMapMarkersDict = {};

    // 1. User Marker (High-visibility pulsing blue beacon)
    const userMarker = L.circleMarker([latitude, longitude], {
        radius: 10,
        color: "#ffffff",
        weight: 3,
        fillColor: "#0072bc",
        fillOpacity: 1
    }).bindPopup("<div style='text-align: center; font-weight: bold;'>📍 आपका वर्तमान स्थान<br><span style='font-size: 11px; color: #64748b;'>यहाँ से दूरी मापी जा रही है</span></div>");
    partnerMarkers.addLayer(userMarker);

    const mapBounds = [[latitude, longitude]];

    // 2. Add Partner Markers
    partners.forEach((partner) => {
        if (typeof partner.latitude !== "number" || typeof partner.longitude !== "number") return;

        const typeColor = partner.type === "SCA" ? "#d97706" : partner.type === "PSB" ? "#16a34a" : "#ea580c";
        const typeLabel = partner.type === "SCA" ? "🏛️ SCA" : partner.type === "PSB" ? "🏦 PSB" : "🌾 RRB";

        const markerHtml = `
            <div style="background: ${typeColor}; color: #ffffff; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; border: 2px solid #ffffff; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: inline-flex; align-items: center; gap: 4px;">
                ${typeLabel}
            </div>
        `;

        const customIcon = L.divIcon({
            html: markerHtml,
            className: "partner-map-custom-pin",
            iconSize: [80, 26],
            iconAnchor: [40, 13]
        });

        const popupContent = `
            <div style="min-width: 200px; font-family: sans-serif;">
                <strong style="color: #003366; font-size: 13px; display: block; margin-bottom: 4px;">${escapeHtml(partner.name)}</strong>
                <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">📍 ${escapeHtml(partner.address || partner.city)}</div>
                ${partner.distance_km !== null ? `<div style="font-size: 12px; font-weight: bold; color: #16a34a; margin-bottom: 8px;">दूरी: ${partner.distance_km} km</div>` : ''}
                <div style="display: flex; gap: 6px;">
                    <a href="${partner.directions_url || `https://www.google.com/maps/dir/?api=1&destination=${partner.latitude},${partner.longitude}`}" target="_blank" rel="noopener noreferrer" style="background: #003366; color: #ffffff; text-decoration: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">
                        🗺️ नेविगेट करें
                    </a>
                    ${partner.phone ? `<a href="tel:${partner.phone.replace(/[^\d+]/g, '')}" style="background: #e2e8f0; color: #0f172a; text-decoration: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">📞 कॉल</a>` : ''}
                </div>
            </div>
        `;

        const marker = L.marker([partner.latitude, partner.longitude], { icon: customIcon })
            .bindPopup(popupContent);

        partnerMarkers.addLayer(marker);
        partnerMapMarkersDict[partner.id] = marker;
        mapBounds.push([partner.latitude, partner.longitude]);
    });

    if (mapBounds.length > 1) {
        partnerMap.fitBounds(mapBounds, { padding: [40, 40], maxZoom: 14 });
    }
    setTimeout(() => partnerMap.invalidateSize(), 100);
}

function escapeHtml(value) {
    const element = document.createElement("div");
    element.textContent = String(value || "");
    return element.innerHTML;
}

/* =====================================================
   FETCH ALL SCHEMES FOR SIDEBAR
===================================================== */
async function fetchAvailableSchemes() {
    const container = document.getElementById("quick-schemes-list");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/schemes`);
        if (!response.ok) throw new Error("Failed to fetch schemes");

        const data = await response.json();
        if (data.success && data.schemes) {
            container.innerHTML = data.schemes.map(s => `
                <div style="padding: 8px 0; border-bottom: 1px dashed #e2e8f0; text-align: center;">
                    <strong style="color: #003366; display: block; text-align: center;">${s.name}</strong>
                    <span style="color: #64748b; font-size: 12px; display: block; text-align: center;">अधिकतम ऋण: ₹${Number(s.max_loan).toLocaleString("en-IN")} | ब्याज: ${s.interest_rate}%</span>
                </div>
            `).join("");
        }
    } catch (error) {
        console.error("Schemes load error:", error);
        container.innerHTML = `<div style="color: #ef4444; text-align: center;">योजनाएं लोडिंग में समस्या आई।</div>`;
    }
}

/* =====================================================
   WEB SPEECH API & VOICE INPUT/OUTPUT
===================================================== */
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        console.warn("Speech Recognition API is not supported in this browser.");
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = currentLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        isListening = true;
        updateMicUI(true);
        setSoundWave(true);
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("Voice Transcript:", transcript);
        const input = document.getElementById("chat-input");
        if (input) input.value = "";
        handleUserChatMessage(transcript);
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
        updateMicUI(false);
        setSoundWave(false);
    };

    recognition.onend = () => {
        isListening = false;
        updateMicUI(false);
        setSoundWave(false);
    };
}

function toggleVoiceInput() {
    if (!recognition) {
        alert("आपका ब्राउज़र voice input का समर्थन नहीं करता है। कृपया लिखकर संदेश भेजें।");
        return;
    }

    if (isListening) {
        recognition.stop();
    } else {
        recognition.start();
    }
}

function updateMicUI(listening) {
    const micBtn = document.getElementById("mic-toggle-btn");
    const micText = document.querySelector(".mic-area p");
    if (micBtn) {
        if (listening) {
            micBtn.classList.add("listening");
            if (micText) micText.textContent = "मैं आपकी बात सुन रहा हूँ...";
        } else {
            micBtn.classList.remove("listening");
            if (micText) micText.textContent = "बोलने के लिए बटन दबाएँ";
        }
    }
}

function setSoundWave(active) {
    const wave = document.querySelector(".sound-wave");
    if (wave) {
        if (active) wave.classList.add("active");
        else wave.classList.remove("active");
    }
}

/* =====================================================
   SPEECH SYNTHESIS (TEXT TO SPEECH) - VOICE FIRST ENGINE
===================================================== */
let isAudioUnlocked = false;
let speechKeepAliveTimer = null;

function unlockAudio() {
    if (isAudioUnlocked) return;
    if ("speechSynthesis" in window) {
        try {
            window.speechSynthesis.resume();
            const silent = new SpeechSynthesisUtterance("");
            silent.volume = 0;
            window.speechSynthesis.speak(silent);
            isAudioUnlocked = true;
            console.log("SpeechSynthesis Audio Unlocked.");
        } catch (e) {
            console.warn("Audio unlock failed:", e);
        }
    }
}

// Global unlock on any user interaction
["click", "touchstart", "keydown"].forEach(evt => {
    document.addEventListener(evt, unlockAudio, { once: false, passive: true });
});

function initSpeechSynthesis() {
    if (!("speechSynthesis" in window)) {
        console.warn("Speech Synthesis API not supported in this browser.");
        return;
    }

    function populateVoices() {
        availableVoices = window.speechSynthesis.getVoices() || [];
        console.log(`Loaded ${availableVoices.length} TTS voices.`);
    }

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = populateVoices;
    }
}

function getBestVoice(targetLang, text) {
    if (!availableVoices || availableVoices.length === 0) {
        availableVoices = window.speechSynthesis.getVoices() || [];
    }

    const hasHindiChar = /[\u0900-\u097F]/.test(text);
    const effectiveLang = hasHindiChar ? "hi-IN" : (targetLang || "hi-IN");

    // 1. Look for exact language match
    let matchedVoice = availableVoices.find(v => v.lang.toLowerCase() === effectiveLang.toLowerCase());

    // 2. If Hindi or text has Devanagari, search by Hindi names
    if (!matchedVoice && (effectiveLang.startsWith("hi") || hasHindiChar)) {
        matchedVoice = availableVoices.find(v => 
            v.lang.toLowerCase().startsWith("hi") ||
            v.name.toLowerCase().includes("hindi") ||
            v.name.toLowerCase().includes("हिन्दी") ||
            v.name.toLowerCase().includes("kalpana") ||
            v.name.toLowerCase().includes("hemant") ||
            v.name.toLowerCase().includes("swara") ||
            v.name.toLowerCase().includes("madhur")
        );
    }

    // 3. Match by language prefix (e.g. "hi", "bn", "ta", "te")
    if (!matchedVoice) {
        const prefix = effectiveLang.split("-")[0].toLowerCase();
        matchedVoice = availableVoices.find(v => v.lang.toLowerCase().startsWith(prefix));
    }

    // NOTE: If no native Hindi voice object is installed locally, do NOT force
    // an English voice. When utterance.voice is null with lang="hi-IN", Chrome
    // automatically uses its high-quality online Hindi voice synthesizer!
    return {
        voice: matchedVoice || null,
        lang: hasHindiChar ? "hi-IN" : effectiveLang
    };
}

function speakText(text) {
    if (!text || !String(text).trim()) return;

    // Clean emojis, markdown, symbols, and technical formatting for clean spoken Hindi
    let speechText = String(text)
        .replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "") // strip emojis
        .replace(/[*#_`~>\[\]]/g, "") // remove markdown syntax
        .replace(/\n+/g, ". ")
        .replace(/\//g, " या ")
        .replace(/\([^)]*\)/g, "")
        .replace(/EMI/gi, "मासिक किस्त")
        .replace(/p\.a\./gi, "प्रतिवर्ष")
        .replace(/₹/g, "रुपये ")
        .replace(/%/g, " प्रतिशत ")
        .replace(/Readiness Score/gi, "ऋण तैयारी स्कोर")
        .replace(/\s+/g, " ")
        .trim();

    if (!speechText) return;

    let audio = document.getElementById("voice-stream-player");
    if (!audio) {
        audio = new Audio();
        audio.id = "voice-stream-player";
        document.body.appendChild(audio);
    }

    try {
        audio.pause();
        audio.currentTime = 0;
    } catch (e) {}

    // Disable browser speech synthesis so Windows English voices never interfere
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    const langParam = currentLanguage.split("-")[0] || "hi";
    const audioUrl = `${API_BASE_URL}/api/ai/tts?text=${encodeURIComponent(speechText)}&lang=${langParam}&_t=${Date.now()}`;

    console.log("Streaming authentic native Hindi TTS audio for full message...");
    setSoundWave(true);
    updateSpeakerBubble("🔊 योजनासेतु बोल रहा है: " + speechText.substring(0, 80) + "...");

    audio.src = audioUrl;
    audio.onplay = () => setSoundWave(true);
    audio.onended = () => {
        setSoundWave(false);
    };
    audio.onerror = (e) => {
        console.warn("Hindi TTS streaming error:", e);
        setSoundWave(false);
    };

    const playPromise = audio.play();
    if (playPromise !== undefined) {
        playPromise.catch(err => {
            console.warn("Audio play waiting for user click:", err);
            setSoundWave(false);
        });
    }
}

function scrollToSection(id) {
    const elem = document.getElementById(id);
    if (elem) elem.scrollIntoView({ behavior: "smooth" });
}

/* =====================================================
   HELP & SUPPORT MODAL CONTROLLER
===================================================== */
function openHelpModal() {
    const modal = document.getElementById("help-modal");
    if (!modal) return;

    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Close on backdrop click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeHelpModal();
        }
    };
}

function closeHelpModal() {
    const modal = document.getElementById("help-modal");
    if (!modal) return;

    modal.style.display = "none";
    document.body.style.overflow = "auto";
}

// Close on Escape key
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeHelpModal();
    }
});

/**
 * Trigger direct query to AI Assistant from Help Center prompts
 */
function askAiFromHelp(promptText) {
    closeHelpModal();
    
    // Scroll to AI chat container
    const chatContainer = document.querySelector(".chat-container");
    if (chatContainer) {
        chatContainer.scrollIntoView({ behavior: "smooth", block: "center" });
        chatContainer.classList.add("chat-highlight-pulse");
        setTimeout(() => chatContainer.classList.remove("chat-highlight-pulse"), 2000);
    }

    // Put text in input and send
    const chatInput = document.getElementById("chat-input");
    if (chatInput) {
        chatInput.value = promptText;
    }

    setTimeout(() => {
        handleUserChatMessage(promptText);
    }, 400);
}

/* =====================================================
   AUTHENTICATION, OTP VERIFICATION & DATABASE ENGINE
===================================================== */
let currentUser = null;
let pendingAssessmentToSync = null;
let otpCountdownTimer = null;
let currentOtpSecondsRemaining = 600;
let activeAuthPayload = null;
let lastGeneratedOtp = "123456";

/**
 * Initialize Authentication System on page load
 */
function initAuthSystem() {
    setupOtpInputAutoAdvance();

    // Check if user session exists in localStorage
    try {
        const storedUser = localStorage.getItem("yojnasetu_user");
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            console.log("Logged in user restored from localStorage:", currentUser.name);
            updateUserAuthUI();
            refreshUserAssessmentsCount();
        }
    } catch (e) {
        console.warn("Failed to parse stored user profile:", e);
        localStorage.removeItem("yojnasetu_user");
    }

    // Global listener for closing profile menu on outside click
    document.addEventListener("click", (e) => {
        const menu = document.getElementById("header-user-profile-menu");
        const btn = document.getElementById("header-login-btn");
        if (menu && menu.style.display !== "none") {
            if (!menu.contains(e.target) && !btn.contains(e.target)) {
                menu.style.display = "none";
            }
        }
    });
}

/**
 * Opens the Auth modal or toggles the user profile menu if already logged in
 */
function openAuthModal() {
    if (currentUser) {
        const menu = document.getElementById("header-user-profile-menu");
        if (menu) {
            menu.style.display = menu.style.display === "none" ? "flex" : "none";
        }
        return;
    }

    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    goToAuthStep1();
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    // Close on backdrop click
    modal.onclick = (e) => {
        if (e.target === modal) {
            closeAuthModal();
        }
    };
}

/**
 * Closes the Auth modal
 */
function closeAuthModal() {
    const modal = document.getElementById("auth-modal");
    if (!modal) return;

    if (otpCountdownTimer) {
        clearInterval(otpCountdownTimer);
        otpCountdownTimer = null;
    }

    modal.style.display = "none";
    document.body.style.overflow = "auto";
}

/**
 * Switch modal view to Step 1 (Phone & Name form)
 */
function goToAuthStep1() {
    const step1 = document.getElementById("auth-step-1");
    const step2 = document.getElementById("auth-step-2");
    const err1 = document.getElementById("auth-error-msg");

    if (step1) step1.style.display = "block";
    if (step2) step2.style.display = "none";
    if (err1) err1.style.display = "none";

    const title = document.getElementById("auth-modal-title");
    const sub = document.getElementById("auth-modal-sub");
    const isEn = currentLanguage && currentLanguage.startsWith("en");

    if (title) title.textContent = isEn ? "Applicant Login / Registration" : "आवेदक लॉगिन / पंजीकरण";
    if (sub) sub.textContent = isEn ? "YojnaSetu NSFDC Loan Assistance Profile" : "योजनासेतु NSFDC ऋण सहायता प्रोफ़ाइल";
}

/**
 * Switch modal view to Step 2 (6-digit OTP verification)
 */
function goToAuthStep2(phone, email, demoOtp) {
    const step1 = document.getElementById("auth-step-1");
    const step2 = document.getElementById("auth-step-2");
    const err2 = document.getElementById("otp-verify-error-msg");

    if (step1) step1.style.display = "none";
    if (step2) step2.style.display = "block";
    if (err2) err2.style.display = "none";

    const targetElem = document.getElementById("auth-sent-target");
    if (targetElem) {
        targetElem.textContent = `+91 ${phone}${email ? ` | ${email}` : ''}`;
    }

    if (demoOtp) {
        lastGeneratedOtp = demoOtp;
        const demoCodeElem = document.getElementById("otp-demo-code");
        if (demoCodeElem) demoCodeElem.textContent = demoOtp;
        const demoBadge = document.getElementById("otp-demo-badge");
        if (demoBadge) demoBadge.style.display = "flex";
    }

    // Reset OTP boxes
    for (let i = 1; i <= 6; i++) {
        const box = document.getElementById(`otp-${i}`);
        if (box) {
            box.value = "";
            box.classList.remove("error");
        }
    }

    // Focus first OTP box
    setTimeout(() => {
        const first = document.getElementById("otp-1");
        if (first) first.focus();
    }, 150);

    // Start 10-minute countdown timer
    startOtpTimer(600);
}

/**
 * Countdown timer for OTP validity
 */
function startOtpTimer(seconds) {
    if (otpCountdownTimer) {
        clearInterval(otpCountdownTimer);
    }

    currentOtpSecondsRemaining = seconds;
    const timerDisplay = document.getElementById("otp-timer-display");
    const resendBtn = document.getElementById("auth-resend-btn");
    if (resendBtn) resendBtn.disabled = true;

    const updateDisplay = () => {
        const mins = Math.floor(currentOtpSecondsRemaining / 60);
        const secs = currentOtpSecondsRemaining % 60;
        if (timerDisplay) {
            timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }
    };

    updateDisplay();

    otpCountdownTimer = setInterval(() => {
        currentOtpSecondsRemaining--;
        updateDisplay();

        if (currentOtpSecondsRemaining <= 0) {
            clearInterval(otpCountdownTimer);
            otpCountdownTimer = null;
            if (timerDisplay) timerDisplay.textContent = "00:00";
            if (resendBtn) resendBtn.disabled = false;
        }
    }, 1000);
}

/**
 * Handle Step 1 Submit: Send OTP via Backend
 */
async function handleSendOtpSubmit(event) {
    if (event) event.preventDefault();

    const nameInput = document.getElementById("auth-name-input");
    const phoneInput = document.getElementById("auth-phone-input");
    const emailInput = document.getElementById("auth-email-input");
    const sendBtn = document.getElementById("auth-send-btn");
    const errorElem = document.getElementById("auth-error-msg");

    const name = nameInput ? nameInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim().replace(/\D/g, "") : "";
    const email = emailInput ? emailInput.value.trim() : "";

    const isEn = currentLanguage && currentLanguage.startsWith("en");

    if (!name) {
        if (errorElem) {
            errorElem.textContent = isEn ? "Please enter your full name." : "कृपया अपना पूरा नाम दर्ज करें।";
            errorElem.style.display = "block";
        }
        return;
    }

    if (phone.length !== 10) {
        if (errorElem) {
            errorElem.textContent = isEn ? "Please enter a valid 10-digit mobile number." : "कृपया 10 अंकों का वैध मोबाइल नंबर दर्ज करें।";
            errorElem.style.display = "block";
        }
        return;
    }

    if (errorElem) errorElem.style.display = "none";
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${isEn ? 'Sending OTP...' : 'OTP भेजा जा रहा है...'}`;
    }

    try {
        activeAuthPayload = {
            phone: phone,
            phone_number: phone,
            email: email || undefined,
            name: name,
            full_name: name,
            language: currentLanguage
        };

        const response = await fetch(`${API_BASE_URL}/api/auth/send-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(activeAuthPayload)
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || `Failed to send OTP (status ${response.status})`);
        }

        const data = await response.json();
        console.log("OTP Send Result:", data);

        if (data.success) {
            goToAuthStep2(phone, email, data.demo_otp || "123456");
            showToast(isEn ? `OTP sent successfully to +91 ${phone}` : `सत्यापन OTP +91 ${phone} पर सफलतापूर्वक भेजा गया`, "success");
        } else {
            throw new Error(data.message || "Failed to generate OTP");
        }
    } catch (err) {
        console.error("Error sending OTP:", err);
        if (errorElem) {
            errorElem.textContent = err.message || (isEn ? "Failed to send OTP. Please check backend." : "OTP भेजने में त्रुटि हुई। कृपया backend की स्थिति जाँचें।");
            errorElem.style.display = "block";
        }
    } finally {
        if (sendBtn) {
            sendBtn.disabled = false;
            sendBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i> ${isEn ? 'Send OTP' : 'OTP प्राप्त करें (Send OTP)'}`;
        }
    }
}

/**
 * Configure automatic focus advance & paste handling for 6-digit OTP inputs
 */
function setupOtpInputAutoAdvance() {
    for (let i = 1; i <= 6; i++) {
        const box = document.getElementById(`otp-${i}`);
        if (!box) continue;

        box.addEventListener("input", (e) => {
            const val = e.target.value.replace(/\D/g, "");
            e.target.value = val ? val.slice(-1) : "";

            if (e.target.value && i < 6) {
                const next = document.getElementById(`otp-${i + 1}`);
                if (next) next.focus();
            }

            // If 6th digit entered, auto submit
            if (i === 6 && e.target.value) {
                const fullCode = getEnteredOtpCode();
                if (fullCode.length === 6) {
                    handleVerifyOtpSubmit();
                }
            }
        });

        box.addEventListener("keydown", (e) => {
            if (e.key === "Backspace" && !box.value && i > 1) {
                const prev = document.getElementById(`otp-${i - 1}`);
                if (prev) {
                    prev.focus();
                    prev.value = "";
                }
            } else if (e.key === "Enter") {
                handleVerifyOtpSubmit();
            }
        });

        box.addEventListener("paste", (e) => {
            e.preventDefault();
            const pasteData = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
            if (pasteData) {
                const digits = pasteData.slice(0, 6).split("");
                digits.forEach((d, idx) => {
                    const input = document.getElementById(`otp-${idx + 1}`);
                    if (input) input.value = d;
                });
                const nextIdx = Math.min(6, digits.length + 1);
                const nextInput = document.getElementById(`otp-${nextIdx}`);
                if (nextInput) nextInput.focus();

                if (digits.length === 6) {
                    handleVerifyOtpSubmit();
                }
            }
        });
    }
}

/**
 * Reads all 6 boxes into a single string
 */
function getEnteredOtpCode() {
    let code = "";
    for (let i = 1; i <= 6; i++) {
        const box = document.getElementById(`otp-${i}`);
        if (box && box.value) {
            code += box.value.trim();
        }
    }
    return code;
}

/**
 * Helper to auto-fill the test demo OTP
 */
function autoFillDemoOtp() {
    const code = String(lastGeneratedOtp || "123456").padStart(6, '0');
    for (let i = 0; i < 6; i++) {
        const box = document.getElementById(`otp-${i + 1}`);
        if (box) box.value = code[i] || "";
    }
    handleVerifyOtpSubmit();
}

/**
 * Handle Step 2 Submit: Verify 6-digit OTP
 */
async function handleVerifyOtpSubmit() {
    const otpCode = getEnteredOtpCode();
    const errorElem = document.getElementById("otp-verify-error-msg");
    const verifyBtn = document.getElementById("auth-verify-submit-btn");
    const isEn = currentLanguage && currentLanguage.startsWith("en");

    if (otpCode.length !== 6) {
        if (errorElem) {
            errorElem.textContent = isEn ? "Please enter complete 6-digit OTP code." : "कृपया पूरा 6-अंकीय OTP कोड दर्ज करें।";
            errorElem.style.display = "block";
        }
        return;
    }

    const currentPhone = (activeAuthPayload && (activeAuthPayload.phone || activeAuthPayload.phone_number)) || "";
    if (!currentPhone) {
        if (errorElem) {
            errorElem.textContent = isEn ? "Session expired. Please request OTP again." : "सत्र समाप्त हो गया। कृपया पुनः OTP प्राप्त करें।";
            errorElem.style.display = "block";
        }
        return;
    }

    if (errorElem) errorElem.style.display = "none";
    if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${isEn ? 'Verifying...' : 'सत्यापित किया जा रहा है...'}`;
    }

    try {
        const payload = {
            phone: currentPhone,
            phone_number: currentPhone,
            email: activeAuthPayload.email,
            name: activeAuthPayload.name || activeAuthPayload.full_name,
            full_name: activeAuthPayload.name || activeAuthPayload.full_name,
            otp_code: otpCode,
            otp: otpCode
        };

        const response = await fetch(`${API_BASE_URL}/api/auth/verify-otp`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });


        const data = await response.json();
        console.log("OTP Verification Result:", data);

        if (response.ok && data.success && data.user) {
            currentUser = data.user;
            localStorage.setItem("yojnasetu_user", JSON.stringify(currentUser));

            updateUserAuthUI();
            closeAuthModal();

            showToast(
                isEn 
                    ? `Welcome back, ${currentUser.name}! Logged in successfully.` 
                    : `स्वागत है, ${currentUser.name}! सफलतापूर्वक लॉगिन हो गए।`, 
                "success"
            );

            // If an assessment was generated prior to login, sync it now
            if (pendingAssessmentToSync) {
                console.log("Syncing cached assessment to SQLite database for user:", currentUser.id);
                autoSaveCurrentAssessment(
                    pendingAssessmentToSync.recommendation,
                    pendingAssessmentToSync.readiness,
                    pendingAssessmentToSync.userData
                );
                pendingAssessmentToSync = null;
            } else {
                refreshUserAssessmentsCount();
            }
        } else {
            throw new Error(data.message || (isEn ? "Invalid or expired OTP." : "अमान्य या समाप्त OTP कोड।"));
        }
    } catch (err) {
        console.error("Verification error:", err);
        if (errorElem) {
            errorElem.textContent = err.message || (isEn ? "OTP verification failed." : "OTP सत्यापन विफल रहा। कृपया सही कोड दर्ज करें।");
            errorElem.style.display = "block";
        }
    } finally {
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = `<i class="fa-solid fa-circle-check"></i> ${isEn ? 'Verify & Login' : 'सत्यापित करें व लॉगिन करें (Verify & Login)'}`;
        }
    }
}

/**
 * Resend OTP to user
 */
async function handleResendOtp() {
    if (!activeAuthPayload) {
        goToAuthStep1();
        return;
    }
    await handleSendOtpSubmit();
}

/**
 * Handle user logout
 */
function handleUserLogout() {
    currentUser = null;
    localStorage.removeItem("yojnasetu_user");
    updateUserAuthUI();

    const menu = document.getElementById("header-user-profile-menu");
    if (menu) menu.style.display = "none";

    const isEn = currentLanguage && currentLanguage.startsWith("en");
    showToast(isEn ? "Logged out successfully." : "सफलतापूर्वक लॉग आउट हो गए।", "info");
}

/**
 * Updates the Header Login / Profile button and Dropdown
 */
function updateUserAuthUI() {
    const loginBtn = document.getElementById("header-login-btn");
    const loginText = document.getElementById("nav-login-text");
    const loginIcon = document.getElementById("login-btn-icon");

    const menuName = document.getElementById("user-menu-name");
    const menuPhone = document.getElementById("user-menu-phone");

    const isEn = currentLanguage && currentLanguage.startsWith("en");

    if (currentUser) {
        const firstName = (currentUser.name || "User").split(" ")[0];
        if (loginBtn) loginBtn.classList.add("logged-in");
        if (loginIcon) loginIcon.className = "fa-solid fa-user-check";
        if (loginText) loginText.textContent = `${firstName}`;

        if (menuName) menuName.textContent = currentUser.name || "आवेदक";
        if (menuPhone) menuPhone.textContent = `+91 ${currentUser.phone || ''}`;
    } else {
        if (loginBtn) loginBtn.classList.remove("logged-in");
        if (loginIcon) loginIcon.className = "fa-regular fa-user";
        if (loginText) {
            const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS["hi-IN"];
            loginText.textContent = t.loginBtn || (isEn ? "Login / Register" : "लॉगिन / पंजीकरण");
        }
    }
}

/**
 * Refreshes user assessments count from database
 */
async function refreshUserAssessmentsCount() {
    if (!currentUser || !currentUser.id) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/user/assessments/${currentUser.id}`);
        if (!response.ok) return;

        const data = await response.json();
        if (data.success && Array.isArray(data.assessments)) {
            const count = data.assessments.length;
            const countElem = document.getElementById("user-menu-saved-count");
            const isEn = currentLanguage && currentLanguage.startsWith("en");
            if (countElem) {
                countElem.textContent = `${count} ${isEn ? 'Saved Scheme Reports' : 'सुरक्षित योजना रिपोर्ट'}`;
            }
        }
    } catch (e) {
        console.warn("Failed to fetch user assessments:", e);
    }
}

/**
 * Automatically saves AI recommended schemes and readiness assessments to SQLite DB
 */
async function autoSaveCurrentAssessment(recommendation, readiness, userData) {
    if (!currentUser) {
        console.log("User not authenticated yet. Caching assessment to sync upon login.");
        pendingAssessmentToSync = {
            recommendation: recommendation,
            readiness: readiness,
            userData: userData
        };
        return;
    }

    try {
        const scheme = recommendation ? (recommendation.scheme || {}) : {};
        const score = readiness ? readiness.score : 85;
        const badge = readiness ? readiness.badge : "स्वीकृति की उच्च संभावना";
        const loanAmount = (userData && Number(userData.loan_required)) || Number(scheme.max_loan) || 100000;
        const loanType = (userData && userData.loan_type) || scheme.loan_type || "business";
        const location = (userData && userData.location) || "Kurukshetra";

        const payload = {
            user_id: currentUser.id,
            scheme_id: scheme.id || (recommendation ? recommendation.scheme_id : "ai_custom_match"),
            scheme_name: scheme.name || (recommendation ? recommendation.name : "NSFDC Custom Loan Scheme"),
            readiness_score: score,
            readiness_badge: badge,
            loan_amount: loanAmount,
            loan_type: loanType,
            applicant_location: location,
            status_details: {
                readiness_summary: readiness ? readiness.summary : undefined,
                reasons: recommendation ? recommendation.reasons : undefined,
                saved_at: new Date().toISOString()
            }
        };

        const response = await fetch(`${API_BASE_URL}/api/user/save-assessment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Failed to save assessment to DB");

        const data = await response.json();
        console.log("Loan Assessment auto-saved to SQLite Database:", data);
        refreshUserAssessmentsCount();

        const isEn = currentLanguage && currentLanguage.startsWith("en");
        showToast(
            isEn 
                ? `Saved "${payload.scheme_name}" to your profile database` 
                : `"${payload.scheme_name}" आपके प्रोफ़ाइल डेटाबेस में सुरक्षित किया गया`, 
            "info"
        );
    } catch (e) {
        console.error("Auto-save assessment error:", e);
    }
}

/**
 * Displays floating toast notifications for user interactions
 */
function showToast(message, type = "info") {
    let toast = document.getElementById("app-toast-notification");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "app-toast-notification";
        toast.className = "toast-notification";
        document.body.appendChild(toast);
    }

    const icon = type === "success" 
        ? '<i class="fa-solid fa-circle-check"></i>' 
        : type === "error" 
        ? '<i class="fa-solid fa-triangle-exclamation"></i>' 
        : '<i class="fa-solid fa-circle-info"></i>';

    toast.className = `toast-notification ${type} show`;
    toast.innerHTML = `${icon} <span>${escapeHtml(message)}</span>`;

    if (window._toastHideTimeout) {
        clearTimeout(window._toastHideTimeout);
    }

    window._toastHideTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 4000);
}
