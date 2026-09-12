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
    checkBackendHealth();
    initSavedUserLocation();
    // Show top-floating location banner & request browser GPS permission on reload
    showGlobalLocationBanner();
    handleLocationPermissionRequest(false);
});

/* =====================================================
   BILINGUAL (HINDI & ENGLISH) TRANSLATION SYSTEM
===================================================== */
let lastFetchedPartners = [];
let lastFetchedSchemes = [];
let lastOcrDocuments = null;
let lastOcrReport = null;
let lastReadinessData = null;
let lastReadinessPrefix = "sim";
let lastRecommendationData = null;

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
        // Schemes Prefix
        maxLoanPrefix: "अधिकतम ऋण",
        interestPrefix: "ब्याज",
        moratoriumSuffix: "माह",
        // Partners
        partnerHeaderTitle: "निकटतम NSFDC चैनल पार्टनर (Channel Partner Locator)",
        partnerRagBadgeText: "RAG AI खोज सक्षम",
        partnerHeaderDesc: "आधिकारिक NSFDC स्टेट चैनलाइजिंग एजेंसी (SCA), लीड बैंक (PSB) एवं क्षेत्रीय ग्रामीण बैंक (RRB) खोजें",
        locPermTitle: "स्थान अनुमति (Location Permission)",
        locPermDesc: "सटीक नजदीकी कार्यालय व दूरी देखने के लिए ब्राउज़र स्थान की अनुमति दें। स्थान की जानकारी केवल निकटतम शाखा खोजने हेतु उपयोग होती है।",
        findLocationBtnText: "मेरा स्थान उपयोग करें (Use Current Location)",
        partnerQueryPlaceholder: "प्राकृतिक भाषा में खोजें (जैसे: 'कुरुक्षेत्र में महिला समृद्धि योजना', 'Karnal PNB Bank', 'Delhi DSFDC')...",
        partnerRagBtnText: "खोजें",
        partnerStateLabel: '<i class="fa-solid fa-map"></i> राज्य (State):',
        partnerSchemeLabel: '<i class="fa-solid fa-hand-holding-dollar"></i> योजना (Scheme):',
        citySelectLabel: '<i class="fa-solid fa-city"></i> त्वरित शहर (Quick City):',
        partnerTypePillsLabel: "एजेंसी प्रकार:",
        pillAll: "सभी (All)",
        pillSca: "🏛️ राज्य चैनलाइजिंग एजेंसी (SCA)",
        pillPsb: "🏦 सार्वजनिक बैंक (PSB)",
        pillRrb: "🌾 क्षेत्रीय ग्रामीण बैंक (RRB)",
        partnerSort: '<i class="fa-solid fa-arrow-down-short-wide"></i> नजदीकी दूरी व प्रासंगिकता के आधार पर',
        partnerCountSuffix: "आधिकारिक NSFDC चैनल पार्टनर उपलब्ध",
        partnerDistanceAway: "km दूर",
        partnerOfficer: "अधिकारी",
        partnerPhone: "फोन",
        partnerTollFree: "टोल-फ्री",
        partnerDirections: "दिशा-निर्देश",
        partnerCall: "कॉल",
        partnerMap: "मैप",
        partnerMapTitle: '<i class="fa-solid fa-map-location-dot" style="color: #0072bc;"></i> मानचित्र पर नजदीकी चैनल पार्टनर (Interactive Map)',
        partnerMapNote: "📍 नीले रंग का मार्कर आपका स्थान दर्शाता है",
        // Readiness Simulator
        simHeaderTitle: "ऋण तैयारी स्कोर सिम्युलेटर (Loan Readiness Simulator)",
        simHeaderDesc: "अपनी आय, ऋण मांग और अवधि बदलकर देखें कि आपका लोन अप्रूवल स्कोर कितना बनता है",
        simLabelLoanType: "ऋण का प्रकार (Loan Type)",
        simOptLoanTypeDefault: "चुनें (Select Loan Type)",
        simOptLoanTypeBiz: "💼 व्यवसाय ऋण (Business Loan)",
        simOptLoanTypeEdu: "🎓 शिक्षा ऋण (Education Loan)",
        simLabelLoanAmount: "आवश्यक ऋण राशि (Loan Required ₹)",
        simPlaceholderLoanAmount: "उदा. 120000",
        simLabelIncome: "वार्षिक पारिवारिक आय (Annual Income ₹)",
        simPlaceholderIncome: "उदा. 300000",
        simLabelTenure: "पुनर्भुगतान अवधि (Tenure Months)",
        simPlaceholderTenure: "उदा. 36",
        simLabelPurpose: "व्यवसाय या कोर्स का नाम (Purpose / Course)",
        simPlaceholderPurpose: "उदा. सिलाई, दुकान, B.Tech",
        simLabelLocation: "आपका जिला / शहर (City / Location)",
        simPlaceholderLocation: "उदा. करनाल, अंबाला, दिल्ली",
        simLabelCaste: '<i class="fa-solid fa-id-card" style="color: #0072bc;"></i> जाति श्रेणी व प्रमाण पत्र (Caste Status)',
        simOptCasteSc: "🆔 SC प्रमाण पत्र उपलब्ध है (SC with Certificate)",
        simOptCastePending: "⏳ SC श्रेणी (प्रमाण पत्र बनवाना शेष)",
        simOptCasteOther: "📄 अन्य श्रेणी (Other Category)",
        simLabelDocs: '<i class="fa-solid fa-file-shield" style="color: #39b54a;"></i> दस्तावेज तैयारी स्थिति (Document Readiness)',
        simOptDocsAll: "📁 सभी 5 मुख्य दस्तावेज तैयार हैं (All 5 Ready)",
        simOptDocsPartial: "📑 3-4 दस्तावेज तैयार हैं (Partial Ready)",
        simOptDocsBasic: "📄 केवल 1-2 दस्तावेज हैं (Basic Only)",
        simLabelExp: '<i class="fa-solid fa-briefcase" style="color: #ea580c;"></i> अनुभव / प्रशिक्षण / प्रवेश स्थिति (Experience / Admission)',
        simOptExpHigh: "🛠️ 2+ वर्ष अनुभव / ITI कौशल प्रशिक्षित / पक्का एडमिशन",
        simOptExpMid: "💼 1-2 वर्ष सामान्य अनुभव / प्रक्रियाधीन",
        simOptExpFresher: "🌱 नया प्रयास / फ्रेशर (Fresher)",
        simLabelCredit: '<i class="fa-solid fa-building-columns" style="color: #6366f1;"></i> पूर्व ऋण व क्रेडिट स्थिति (Credit Record)',
        simOptCreditClean: "🟢 कोई बकाया नहीं - स्वच्छ रिकॉर्ड (Clean Record)",
        simOptCreditActive: "🟡 सक्रिय ऋण चालू है (Active Loan)",
        simOptCreditDefault: "🔴 पूर्व में विलंब / डिफ़ॉल्ट (Past Delays)",
        simLabelExistingEmi: "मौजूदा मासिक EMI यदि कोई हो (Existing EMI ₹)",
        simPlaceholderExistingEmi: "उदा. 0 या 2000",
        simSubmitBtnText: "वास्तविक स्कोर की गणना करें (Evaluate Readiness Criteria)",
        simResultTitle: '<i class="fa-solid fa-award"></i> मूल्यांकित ऋण तत्परता स्कोर',
        simTipsTitle: '<i class="fa-solid fa-lightbulb" style="color: #f59e0b;"></i> सुधार सुझाव (Recommendations)',
        simChecklistTitle: '<i class="fa-solid fa-folder-open" style="color: #0284c7;"></i> चेकलिस्ट (Document Checklist)',
        // Document OCR
        ocrHeaderTitle: "दस्तावेज OCR व पात्रता सत्यापन (Document OCR & Scheme Readiness)",
        ocrHeaderDesc: "अपने प्रमाण पत्र (जाति, आय, आधार, पासबुक, प्रोजेक्ट रिपोर्ट) अपलोड करें और योजना हेतु 100% तैयारी जांचें",
        ocrDropzoneTitle: "यहाँ दस्तावेज खींचें या चयन करें (Upload Documents)",
        ocrDropzoneSub: "जाति प्रमाण पत्र, आय प्रमाण पत्र, आधार कार्ड, बैंक पासबुक या प्रोजेक्ट रिपोर्ट (JPG, PNG, PDF, TXT)",
        ocrBrowseBtnText: "फ़ाइलें चुनें (Browse Files)",
        ocrCameraBtnText: "कैमरा से फोटो लें (Camera)",
        ocrSampleBtnText: "डेमो दस्तावेज लोड करें (Demo Sample)",
        ocrStagedHeaderText: "चयनित दस्तावेज",
        clearStagedBtnText: "सभी हटाएँ",
        ocrSchemeLabelText: "ऋण श्रेणी:",
        ocrOptBiz: "💼 व्यवसाय ऋण (Micro Finance / Term Loan)",
        ocrOptEdu: "🎓 शिक्षा ऋण (Education Loan)",
        startOcrBtnText: "AI OCR से स्कैन व सत्यापन करें",
        ocrLoaderText: '<i class="fa-solid fa-microchip fa-spin"></i> AI Vision & OCR इंजन दस्तावेजों का विश्लेषण कर रहा है...',
        ocrResultTitle: '<i class="fa-solid fa-file-circle-check" style="color: #4f46e5;"></i> दस्तावेज सत्यापन रिपोर्ट (Verification Report)',
        ocrReportSummary: "योजना पात्रता के अनुसार दस्तावेजों की स्थिति।",
        ocrProgressTitleText: "दस्तावेज पूर्णता स्कोर (Readiness)",
        ocrEntitiesTitleText: '<i class="fa-solid fa-list-check" style="color: #0284c7;"></i> सत्यापित दस्तावेज विवरण (Extracted Entities):',
        ocrChecklistTitleText: '<i class="fa-solid fa-clipboard-check" style="color: #10b981;"></i> योजना अनुसार चेकलिस्ट स्थिति (Required Checklist Status)',
        ocrNextStepTitle: "🎯 अगला कदम (Next Step):",
        ocrNextStepSub: "दस्तावेज सत्यापित हैं! अब अपने निकटतम NSFDC चैनल पार्टनर से संपर्क करें।",
        ocrNextStepBtnText: "नजदीकी चैनल पार्टनर देखें",
        // EMI Calculator
        emiHeaderTitle: "NSFDC EMI कैलकुलेटर",
        emiHeaderDesc: "मासिक किश्त (EMI) और कुल ब्याज की गणना FastAPI backend से करें",
        emiLabelPrincipal: "ऋण राशि (Principal ₹)",
        emiPlaceholderPrincipal: "उदा. 100000",
        emiLabelRate: "वार्षिक ब्याज दर (% Rate)",
        emiPlaceholderRate: "उदा. 6.5",
        emiLabelTenure: "अवधि (Tenure in Months)",
        emiPlaceholderTenure: "उदा. 36",
        emiLabelMoratorium: "मोरैटोरियम अवधि (Months)",
        emiPlaceholderMoratorium: "उदा. 3",
        emiSubmitBtnText: "EMI की गणना करें",
        emiResMonthlyLabel: "मासिक EMI",
        emiResInterestLabel: "कुल ब्याज (Total Interest)",
        emiResPayableLabel: "कुल भुगतान (Total Payable)",
        // Help Modal
        helpModalTitle: "योजनासेतु सहायता एवं हेल्पलाइन केंद्र",
        helpModalSub: "Help & Support Center — National Scheduled Castes Finance & Dev Corp",
        helpHelplineTitle: '<i class="fa-solid fa-phone-volume" style="color: #16a34a;"></i> आधिकारिक टोल-फ्री हेल्पलाइन (Toll-Free Numbers)',
        helplineBadge1: "राष्ट्रीय निगम (Apex)",
        helplineCard1Title: "NSFDC केंद्रीय हेल्पलाइन",
        helplineCard1Time: "सोमवार से शुक्रवार, 09:30 AM - 06:00 PM",
        helplineCard1Call: '<i class="fa-solid fa-phone"></i> 1800-11-0396 (टोल-फ्री)',
        helplineBadge2: "हरियाणा SCA",
        helplineCard2Title: "HSCFDC हरियाणा सहायता",
        helplineCard2Time: "मुख्यालय पंचकूला व सभी जिले",
        helplineBadge3: "उत्तर प्रदेश SCA",
        helplineCard3Title: "UPSCFDC समाज कल्याण",
        helplineCard3Time: "उत्तर प्रदेश राज्य मुख्यालय",
        helplineBadge4: "दिल्ली SCA",
        helplineCard4Title: "DSFDC दिल्ली सहायता",
        helplineCard4Time: "दिल्ली राज्य मुख्यालय / शाखाएं",
        helpAiTitle: '<i class="fa-solid fa-robot" style="color: #0072bc;"></i> AI सहायक से सीधे पूछें (Instant AI Assistance)',
        helpAiSub: "किसी भी विकल्प पर क्लिक करने पर AI सहायक तुरंत मार्गदर्शन प्रदान करेगा:",
        helpPill1: "💼 व्यवसाय ऋण व ब्याज दरें",
        helpPill2: "👩 महिला समृद्धि योजना सहायता",
        helpPill3: "📁 आवश्यक दस्तावेजों की सूची",
        helpPill4: "🏦 नजदीकी कार्यालय व शाखा खोजें",
        helpPill5: "🎓 शिक्षा ऋण (Education Loan)",
        helpFaqTitle: '<i class="fa-solid fa-circle-question" style="color: #f59e0b;"></i> अक्सर पूछे जाने वाले प्रश्न (FAQs)',
        faqQ1: "योजनासेतु (YojnaSetu) क्या है और यह कैसे मदद करता है?",
        faqA1: "योजनासेतु भारत सरकार के NSFDC द्वारा समर्थित एक AI संचालित प्लेटफ़ॉर्म है। यह अनुसूचित जाति (SC) समुदाय के लाभार्थियों को उनकी पात्रता के अनुसार सबसे उपयुक्त रियायती ऋण योजना, सब्सिडी, मासिक EMI और नजदीकी चैनल पार्टनर खोजने में मातृभाषा (हिंदी) में संपूर्ण सहायता प्रदान करता है।",
        faqQ2: "क्या ₹10 लाख तक के ऋण के लिए कोई गारंटी या संपत्ति गिरवी रखनी होगी?",
        faqA2: "नहीं! NSFDC की अधिकांश योजनाओं में CGTMSE (क्रेडिट गारंटी फंड ट्रस्ट) के तहत ₹10 लाख तक का ऋण बिना किसी तीसरे पक्ष की गारंटी अथवा संपत्ति गिरवी रखे (Collateral-Free) प्रदान किया जाता है।",
        faqQ3: "महिला समृद्धि योजना की मुख्य विशेषताएं क्या हैं?",
        faqA3: "महिला समृद्धि योजना विशेष रूप से अनुसूचित जाति की महिला उद्यमियों के लिए है। इसमें ₹1,40,000 तक की वित्तीय सहायता केवल 4% वार्षिक की अत्यधिक रियायती ब्याज दर पर दी जाती है, जिसमें NSFDC द्वारा परियोजना लागत का 95% तक वित्तपोषण किया जाता है।",
        faqQ4: "ऋण आवेदन के लिए आवश्यक मुख्य दस्तावेज कौन से हैं?",
        faqA4: "मुख्य रूप से 5 दस्तावेज आवश्यक हैं: (1) जाति प्रमाण पत्र (SC Certificate), (2) आय प्रमाण पत्र (Income Certificate), (3) आधार कार्ड / पहचान पत्र, (4) बैंक पासबुक (IFSC सहित), और (5) व्यवसाय परियोजना रिपोर्ट अथवा कॉलेज प्रवेश पत्र।",
        helpEmailLabel: '<i class="fa-regular fa-envelope"></i> आधिकारिक ईमेल:',
        helpHqLabel: '<i class="fa-solid fa-building"></i> प्रधान कार्यालय:',
        helpHqVal: "स्कोप मीनार, कोर 1 व 2, लक्ष्मी नगर / भीकाजी कामा प्लेस, नई दिल्ली",
        helpCloseBtn: "बंद करें (Close)",
        helpPartnersBtnText: "नजदीकी चैनल पार्टनर देखें",
        // Auth Modal & Profile
        authModalTitle: "आवेदक लॉगिन / पंजीकरण",
        authModalSub: "योजनासेतु NSFDC ऋण सहायता प्रोफ़ाइल",
        authStep1Intro: "अपनी ऋण योजना सिफारिशें और ऋण तैयारी स्कोर सुरक्षित रखने के लिए मोबाइल नंबर दर्ज करें:",
        authLabelName: '<i class="fa-regular fa-user" style="color: #0072bc;"></i> आपका पूरा नाम (Full Name)',
        authPlaceholderName: "उदा: रमेश कुमार",
        authLabelPhone: '<i class="fa-solid fa-mobile-screen" style="color: #16a34a;"></i> 10-अंकीय मोबाइल नंबर (Mobile Number) <span style="color: #ef4444;">*</span>',
        authLabelEmail: '<i class="fa-regular fa-envelope" style="color: #f59e0b;"></i> ईमेल पता (Email Address) <small style="color: #64748b; font-weight: normal;">(वैकल्पिक)</small>',
        authSendBtnText: "OTP प्राप्त करें (Send OTP)",
        authStep2Intro: "सत्यापन कोड इस नंबर पर भेजा गया:",
        authEditPhoneBtn: "बदलें (Edit)",
        otpDemoLabel: "परीक्षण OTP:",
        otpAutofillBtn: "स्वतः भरें (Fill)",
        otpTimeLeftLabel: "समय शेष:",
        authResendBtn: "पुनः भेजें (Resend OTP)",
        authVerifyBtnText: "सत्यापित करें व लॉगिन करें (Verify & Login)",
        authSecurityNote: "🔒 आपका डेटा भारत सरकार के डेटा सुरक्षा मानकों के तहत सुरक्षित है।",
        userMenuNameDefault: "आवेदक",
        userMenuSavedSuffix: "सुरक्षित योजना रिपोर्ट",
        userLogoutText: "लॉग आउट (Logout)",
        // Recommendation Card
        recCardBadgeText: "अनुशंसित योजना (Recommended Scheme)",
        recMatchBadgeSub: "(RAG AI Match)",
        recLabelMaxLoan: "अधिकतम राशि",
        recLabelInterest: "ब्याज दर",
        recLabelMoratorium: "छूट अवधि (Moratorium)",
        recLabelMonthlyEmi: "अनुमानित मासिक EMI",
        recLabelTotalPayable: "कुल भुगतान",
        recSubsidyText: "विशेष सरकारी सब्सिडी व ब्याज छूट उपलब्ध है।",
        recReasonsTitle: '<i class="fa-solid fa-circle-check"></i> यह योजना आपके लिए क्यों उपयुक्त है (RAG Match Reasons):',
        recDocsTitle: '<i class="fa-solid fa-folder-open"></i> आवश्यक दस्तावेज (Mandatory Documents Checklist):',
        recReadinessTitle: '<i class="fa-solid fa-gauge-high"></i> आपका ऋण तैयारी स्कोर (Loan Readiness Score)',
        recTipsTitle: '<i class="fa-solid fa-lightbulb"></i> ऋण तैयारी बेहतर करने के सुझाव (Actionable Guidance)',
        recChecklistTitle: '<i class="fa-solid fa-folder-open"></i> आवश्यक दस्तावेज चेकलिस्ट (Required Documents)'
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
        // Schemes Prefix
        maxLoanPrefix: "Max Loan",
        interestPrefix: "Interest",
        moratoriumSuffix: "Months",
        // Partners
        partnerHeaderTitle: "Nearest NSFDC Channel Partners (Channel Partner Locator)",
        partnerRagBadgeText: "RAG AI Search Enabled",
        partnerHeaderDesc: "Locate Official State Channelising Agencies (SCAs), Public Sector Lead Banks (PSBs), and Regional Rural Banks (RRBs)",
        locPermTitle: "Location Permission",
        locPermDesc: "Allow browser location access to calculate accurate distance and driving routes to nearby partner offices.",
        findLocationBtnText: "Use Current Location",
        partnerQueryPlaceholder: "Search in natural language (e.g. 'Kurukshetra Mahila Samriddhi', 'Karnal PNB Bank', 'Delhi DSFDC')...",
        partnerRagBtnText: "Search",
        partnerStateLabel: '<i class="fa-solid fa-map"></i> State:',
        partnerSchemeLabel: '<i class="fa-solid fa-hand-holding-dollar"></i> Scheme:',
        citySelectLabel: '<i class="fa-solid fa-city"></i> Quick City:',
        partnerTypePillsLabel: "Agency Type:",
        pillAll: "All",
        pillSca: "🏛️ State Agency (SCA)",
        pillPsb: "🏦 Public Bank (PSB)",
        pillRrb: "🌾 Regional Rural Bank (RRB)",
        partnerSort: '<i class="fa-solid fa-arrow-down-short-wide"></i> Sorted by Nearest Distance & Relevance',
        partnerCountSuffix: "Official NSFDC Channel Partners Available",
        partnerDistanceAway: "km away",
        partnerOfficer: "Officer",
        partnerPhone: "Phone",
        partnerTollFree: "Toll-Free",
        partnerDirections: "Directions",
        partnerCall: "Call",
        partnerMap: "Map",
        partnerMapTitle: '<i class="fa-solid fa-map-location-dot" style="color: #0072bc;"></i> Channel Partners on Interactive Map',
        partnerMapNote: "📍 Blue marker indicates your current location",
        // Readiness Simulator
        simHeaderTitle: "Loan Readiness Simulator",
        simHeaderDesc: "Adjust your income, loan requirement, and tenure to evaluate your AI loan approval readiness score",
        simLabelLoanType: "Loan Type",
        simOptLoanTypeDefault: "Select Loan Type",
        simOptLoanTypeBiz: "💼 Business Loan (Term / Micro Finance)",
        simOptLoanTypeEdu: "🎓 Education Loan (ELIS / Abroad)",
        simLabelLoanAmount: "Required Loan Amount (₹)",
        simPlaceholderLoanAmount: "e.g. 120000",
        simLabelIncome: "Annual Family Income (₹)",
        simPlaceholderIncome: "e.g. 300000",
        simLabelTenure: "Repayment Tenure (Months)",
        simPlaceholderTenure: "e.g. 36",
        simLabelPurpose: "Business Purpose / Course Name",
        simPlaceholderPurpose: "e.g. Tailoring, Grocery Shop, B.Tech",
        simLabelLocation: "Your District / City (Location)",
        simPlaceholderLocation: "e.g. Karnal, Ambala, Delhi",
        simLabelCaste: '<i class="fa-solid fa-id-card" style="color: #0072bc;"></i> Category & Caste Certificate Status',
        simOptCasteSc: "🆔 SC with Valid Caste Certificate",
        simOptCastePending: "⏳ SC Category (Certificate in process)",
        simOptCasteOther: "📄 Other Category",
        simLabelDocs: '<i class="fa-solid fa-file-shield" style="color: #39b54a;"></i> Document Readiness Status',
        simOptDocsAll: "📁 All 5 Mandatory Documents Ready",
        simOptDocsPartial: "📑 3-4 Documents Ready (Partial)",
        simOptDocsBasic: "📄 Only 1-2 Documents Ready",
        simLabelExp: '<i class="fa-solid fa-briefcase" style="color: #ea580c;"></i> Experience / Skill / Admission Status',
        simOptExpHigh: "🛠️ 2+ Years Experience / ITI Certified / Confirmed Admission",
        simOptExpMid: "💼 1-2 Years General Experience / In Progress",
        simOptExpFresher: "🌱 New Enterprise / Fresher",
        simLabelCredit: '<i class="fa-solid fa-building-columns" style="color: #6366f1;"></i> Credit History & Prior Loan Track',
        simOptCreditClean: "🟢 No Dues / Clean Track Record",
        simOptCreditActive: "🟡 Active Loan (Timely Payments)",
        simOptCreditDefault: "🔴 Past Delays / Overdue Track",
        simLabelExistingEmi: "Existing Monthly EMI if any (₹)",
        simPlaceholderExistingEmi: "e.g. 0 or 2000",
        simSubmitBtnText: "Evaluate Readiness Criteria",
        simResultTitle: '<i class="fa-solid fa-award"></i> Evaluated Loan Readiness Score',
        simTipsTitle: '<i class="fa-solid fa-lightbulb" style="color: #f59e0b;"></i> Actionable Recommendations',
        simChecklistTitle: '<i class="fa-solid fa-folder-open" style="color: #0284c7;"></i> Document Readiness Checklist',
        // Document OCR
        ocrHeaderTitle: "Document OCR & Scheme Eligibility Verification",
        ocrHeaderDesc: "Upload your certificates (Caste, Income, Aadhaar, Bank Passbook, Project Report) to verify 100% loan readiness",
        ocrDropzoneTitle: "Drag & Drop or Select Documents to Upload",
        ocrDropzoneSub: "Caste Certificate, Income Certificate, Aadhaar Card, Bank Passbook or Project Report (JPG, PNG, PDF, TXT)",
        ocrBrowseBtnText: "Browse Files",
        ocrCameraBtnText: "Take Photo (Camera)",
        ocrSampleBtnText: "Load Demo Sample Documents",
        ocrStagedHeaderText: "Selected Documents",
        clearStagedBtnText: "Clear All",
        ocrSchemeLabelText: "Loan Scheme Category:",
        ocrOptBiz: "💼 Business Loan (Micro Finance / Term Loan)",
        ocrOptEdu: "🎓 Education Loan (ELIS)",
        startOcrBtnText: "Scan & Verify with AI OCR",
        ocrLoaderText: '<i class="fa-solid fa-microchip fa-spin"></i> AI Vision & OCR Engine analyzing documents and verifying compliance...',
        ocrResultTitle: '<i class="fa-solid fa-file-circle-check" style="color: #4f46e5;"></i> Document Verification Report',
        ocrReportSummary: "Verification status according to NSFDC SC scheme eligibility.",
        ocrProgressTitleText: "Document Readiness Score",
        ocrEntitiesTitleText: '<i class="fa-solid fa-list-check" style="color: #0284c7;"></i> Verified Document Details (Extracted Entities):',
        ocrChecklistTitleText: '<i class="fa-solid fa-clipboard-check" style="color: #10b981;"></i> Scheme Mandatory Checklist Status',
        ocrNextStepTitle: "🎯 Next Step:",
        ocrNextStepSub: "Documents are verified! Now connect with your nearest official NSFDC Channel Partner.",
        ocrNextStepBtnText: "Find Nearest Channel Partners",
        // EMI Calculator
        emiHeaderTitle: "NSFDC Concessional EMI Calculator",
        emiHeaderDesc: "Calculate monthly installments (EMI) and total interest instantly via FastAPI backend",
        emiLabelPrincipal: "Principal Loan Amount (₹)",
        emiPlaceholderPrincipal: "e.g. 100000",
        emiLabelRate: "Annual Interest Rate (% Rate)",
        emiPlaceholderRate: "e.g. 6.5",
        emiLabelTenure: "Tenure in Months",
        emiPlaceholderTenure: "e.g. 36",
        emiLabelMoratorium: "Moratorium Period (Months)",
        emiPlaceholderMoratorium: "e.g. 3",
        emiSubmitBtnText: "Calculate EMI",
        emiResMonthlyLabel: "Monthly EMI",
        emiResInterestLabel: "Total Interest",
        emiResPayableLabel: "Total Payable Amount",
        // Help Modal
        helpModalTitle: "YojnaSetu Help & Support Center",
        helpModalSub: "Official National Scheduled Castes Finance & Development Corporation (NSFDC) Support",
        helpHelplineTitle: '<i class="fa-solid fa-phone-volume" style="color: #16a34a;"></i> Official Toll-Free Helplines',
        helplineBadge1: "National Apex Corp",
        helplineCard1Title: "NSFDC Central Helpline",
        helplineCard1Time: "Monday to Friday, 09:30 AM - 06:00 PM",
        helplineCard1Call: '<i class="fa-solid fa-phone"></i> 1800-11-0396 (Toll-Free)',
        helplineBadge2: "Haryana SCA",
        helplineCard2Title: "HSCFDC Haryana Support",
        helplineCard2Time: "HQ Panchkula & all districts",
        helplineBadge3: "Uttar Pradesh SCA",
        helplineCard3Title: "UPSCFDC Social Welfare",
        helplineCard3Time: "UP State Headquarters",
        helplineBadge4: "Delhi SCA",
        helplineCard4Title: "DSFDC Delhi Support",
        helplineCard4Time: "Delhi State HQ / Branches",
        helpAiTitle: '<i class="fa-solid fa-robot" style="color: #0072bc;"></i> Ask AI Assistant Directly (Instant Guidance)',
        helpAiSub: "Click any quick option below to receive immediate AI loan guidance:",
        helpPill1: "💼 Business Loans & Concessional Rates",
        helpPill2: "👩 Mahila Samriddhi Yojana (MSY) Support",
        helpPill3: "📁 Mandatory Documents List",
        helpPill4: "🏦 Locate Nearest Offices & Branches",
        helpPill5: "🎓 Education Loans (ELIS / Abroad)",
        helpFaqTitle: '<i class="fa-solid fa-circle-question" style="color: #f59e0b;"></i> Frequently Asked Questions (FAQs)',
        faqQ1: "What is YojnaSetu and how does it help SC borrowers?",
        faqA1: "YojnaSetu is an AI-powered platform supported by NSFDC, Government of India. It guides Scheduled Caste (SC) beneficiaries in their preferred language to identify concessional loans, verify document readiness, calculate EMIs, and connect with official channel partners.",
        faqQ2: "Is collateral or third-party guarantee required for loans up to ₹10 Lakh?",
        faqA2: "No! Most NSFDC schemes are covered under the CGTMSE credit guarantee framework, allowing collateral-free loans up to ₹10 Lakh without third-party guarantee.",
        faqQ3: "What are the key benefits of Mahila Samriddhi Yojana (MSY)?",
        faqA3: "Mahila Samriddhi Yojana provides micro-finance loans up to ₹1,40,000 to SC women entrepreneurs at a subsidized interest rate of only 4% p.a., with NSFDC financing up to 95% of project cost.",
        faqQ4: "What are the 5 mandatory documents for an NSFDC loan application?",
        faqA4: "The 5 primary documents are: (1) SC Caste Certificate, (2) Family Income Certificate, (3) Aadhaar Card / Identity Proof, (4) Active Bank Passbook with IFSC, and (5) Project Quotation or College Admission Letter.",
        helpEmailLabel: '<i class="fa-regular fa-envelope"></i> Official Email:',
        helpHqLabel: '<i class="fa-solid fa-building"></i> Head Office:',
        helpHqVal: "Scope Minar, Core 1 & 2, Laxmi Nagar / Bhikaji Cama Place, New Delhi",
        helpCloseBtn: "Close",
        helpPartnersBtnText: "View Nearest Channel Partners",
        // Auth Modal & Profile
        authModalTitle: "Applicant Login / Registration",
        authModalSub: "YojnaSetu NSFDC Loan Assistance Profile",
        authStep1Intro: "Enter your mobile number to save loan recommendations and track your readiness scores:",
        authLabelName: '<i class="fa-regular fa-user" style="color: #0072bc;"></i> Your Full Name',
        authPlaceholderName: "e.g. Ramesh Kumar",
        authLabelPhone: '<i class="fa-solid fa-mobile-screen" style="color: #16a34a;"></i> 10-Digit Mobile Number <span style="color: #ef4444;">*</span>',
        authLabelEmail: '<i class="fa-regular fa-envelope" style="color: #f59e0b;"></i> Email Address <small style="color: #64748b; font-weight: normal;">(Optional)</small>',
        authSendBtnText: "Send OTP",
        authStep2Intro: "Verification OTP code sent to:",
        authEditPhoneBtn: "Edit",
        otpDemoLabel: "Test Demo OTP:",
        otpAutofillBtn: "Auto Fill",
        otpTimeLeftLabel: "Time Remaining:",
        authResendBtn: "Resend OTP",
        authVerifyBtnText: "Verify & Login",
        authSecurityNote: "🔒 Your data is completely protected under Government of India data privacy guidelines.",
        userMenuNameDefault: "Applicant",
        userMenuSavedSuffix: "Saved Scheme Reports",
        userLogoutText: "Logout",
        // Recommendation Card
        recCardBadgeText: "Recommended Scheme",
        recMatchBadgeSub: "(RAG AI Match)",
        recLabelMaxLoan: "Maximum Loan Amount",
        recLabelInterest: "Interest Rate",
        recLabelMoratorium: "Moratorium Period",
        recLabelMonthlyEmi: "Estimated Monthly EMI",
        recLabelTotalPayable: "Total Payable Amount",
        recSubsidyText: "Special government interest subsidy and margin money concessions available.",
        recReasonsTitle: '<i class="fa-solid fa-circle-check"></i> Why this scheme matches your profile (RAG Match Reasons):',
        recDocsTitle: '<i class="fa-solid fa-folder-open"></i> Required Documents (Mandatory Checklist):',
        recReadinessTitle: '<i class="fa-solid fa-gauge-high"></i> Your Loan Readiness Score',
        recTipsTitle: '<i class="fa-solid fa-lightbulb"></i> Actionable Improvement Guidance',
        recChecklistTitle: '<i class="fa-solid fa-folder-open"></i> Document Checklist'
    },
    "bn-IN": {
        langName: "বাংলা",
        tagline: "স্বপ্নের হবে পূরণ, আপনার পাশে যোজনা সেতু — “YojnaSetu”",
        loginBtn: "লগইন / নিবন্ধন",
        navHome: "হোম",
        navReadiness: "ঋণ প্রস্তুতি স্কোর",
        navOcr: "নথি OCR যাচাই",
        navEmi: "EMI ক্যালকুলেটর",
        navPartners: "চ্যানেল পার্টনার",
        navHelp: "সহায়তা",
        govTitle: "ভারত সরকার",
        govSub: "দ্বারা সমর্থিত",
        heroTitle: 'নমস্কার! আমি <span>যোজনা সেতু (YojnaSetu)</span>',
        heroIntro: "আমি সরকারি ঋণ প্রকল্প, যোগ্যতা এবং AI ঋণ প্রস্তুতি স্কোর মূল্যায়নে আপনাকে সাহায্য করতে এখানে আছি।",
        speechTitle: "নমস্কার!",
        speechP1: "আমি যোজনা সেতু। আপনি আমার সাথে বাংলায় কথা বলতে পারেন।",
        speechP2: "বলুন, আজ আমি আপনার ঋণের আবেদনে কীভাবে সাহায্য করতে পারি?",
        micTitle: "কথা বলতে বোতামে চাপুন",
        micSub: "আমি আপনার কথা শুনছি...",
        micBtnTitle: "কথা বলতে চাপুন",
        resetBtn: "নতুন কথোপকথন (New Chat)",
        chatPlaceholder: "এখানে বার্তা লিখুন বা মুখে বলুন...",
        sendBtn: "পাঠান",
        chipEdu: "শিক্ষা ঋণ (Education Loan)",
        chipBiz: "ব্যবসা ঋণ (Business Loan)",
        chipScore: "প্রস্তুতি স্কোর (Readiness)",
        chipOcr: "নথি OCR (Doc OCR)",
        chipEmi: "EMI ক্যালকুলেটর",
        chipPartner: "নিকটতম পার্টনার",
        moreLang: "+ আরও ভাষা",
        initChatMsg: "<strong>নমস্কার!</strong> আমি আপনার AI ঋণ সহায়তা এজেন্ট। আপনার কী ধরনের ঋণ প্রয়োজন? (শিক্ষা ঋণ / ব্যবসা ঋণ)",
        step1B: "১. আপনার ভাষায় কথা বলুন",
        step1Span: "শুধু আপনার তথ্য জানান",
        step2B: "২. প্রস্তুতি স্কোর ও প্রকল্প পান",
        step2Span: "সঠিক ঋণ ও মূল্যায়ন",
        step3B: "৩. আপনার লক্ষ্য, আমাদের সাথে",
        step3Span: "ঋণ বিতরণ পর্যন্ত সহায়তা",
        helpCardH3: "আমরা আপনাকে সাহায্য করতে প্রস্তুত",
        helpCardP: "যোজনা সেতু আপনার নিজস্ব ভাষায় সম্পূর্ণ ঋণ সহায়তা প্রদান করবে।",
        schemesCardH3: "উপলব্ধ প্রকল্পসমূহ (Schemes)",
        helpRow1: "ঋণ প্রস্তুতি স্কোর মূল্যায়ন",
        helpRow2: "সরকারি ঋণ প্রকল্পের তথ্য",
        helpRow3: "যোগ্যতা যাচাইয়ে সহায়তা",
        helpRow4: "আবেদন প্রক্রিয়ার নির্দেশিকা",
        helpRow5: "নিকটতম চ্যানেল পার্টনার সন্ধান",
        secureCardH3: "আপনার তথ্য সম্পূর্ণ সুরক্ষিত",
        secureCardP: "আপনার তথ্য সম্পূর্ণ গোপন এবং নিরাপদ রাখা হবে।",
        maxLoanPrefix: "সর্বোচ্চ ঋণ",
        interestPrefix: "সুদ",
        moratoriumSuffix: "মাস",
        partnerHeaderTitle: "নিকটতম NSFDC চ্যানেল পার্টনার লোকেটার",
        partnerRagBadgeText: "RAG AI অনুসন্ধান সক্ষম",
        partnerHeaderDesc: "অফিসিয়াল রাজ্য চ্যানেল সংস্থা (SCA), পাবলিক সেক্টর ব্যাংক ও গ্রামীণ ব্যাংক খুঁজুন",
        locPermTitle: "অবস্থান অনুমতি (Location Permission)",
        locPermDesc: "নিকটতম কার্যালয় ও দূরত্ব জানতে ব্রাউজার লোকেশন অনুমতি দিন।",
        findLocationBtnText: "আমার অবস্থান ব্যবহার করুন",
        partnerQueryPlaceholder: "প্রাকৃতিক ভাষায় অনুসন্ধান করুন (যেমন: 'কলকাতা ব্যবসা ঋণ', 'PNB Bank', 'SCA')...",
        partnerRagBtnText: "অনুসন্ধান",
        partnerTypePillsLabel: "সংস্থার ধরন:",
        pillAll: "সকল (All)",
        pillSca: "🏛️ রাজ্য সংস্থা (SCA)",
        pillPsb: "🏦 সরকারি ব্যাংক (PSB)",
        pillRrb: "🌾 গ্রামীণ ব্যাংক (RRB)",
        partnerCountSuffix: "অফিসিয়াল NSFDC চ্যানেল পার্টনার উপলব্ধ",
        partnerDistanceAway: "কিমি দূরে",
        partnerOfficer: "আধিকারিক",
        partnerPhone: "ফোন",
        partnerTollFree: "টোল-ফ্রি",
        partnerDirections: "দিকনির্দেশ",
        partnerCall: "কল",
        partnerMap: "ম্যাপ",
        simHeaderTitle: "ঋণ প্রস্তুতি স্কোর সিমুলেটর",
        simHeaderDesc: "আপনার আয় ও ঋণের পরিমাণ পরিবর্তন করে অনুমোদন স্কোর যাচাই করুন",
        simLabelLoanType: "ঋণের ধরন (Loan Type)",
        simOptLoanTypeDefault: "নির্বাচন করুন",
        simOptLoanTypeBiz: "💼 ব্যবসা ঋণ (Business Loan)",
        simOptLoanTypeEdu: "🎓 শিক্ষা ঋণ (Education Loan)",
        simLabelLoanAmount: "প্রয়োজনীয় ঋণের পরিমাণ (₹)",
        simLabelIncome: "বার্ষিক পারিবারিক আয় (₹)",
        simLabelTenure: "পরিশোধের মেয়াদ (মাস)",
        simSubmitBtnText: "প্রস্তুতি স্কোর গণনা করুন",
        ocrHeaderTitle: "নথি OCR ও স্কিম প্রস্তুতি যাচাই",
        ocrHeaderDesc: "আপনার সার্টিফিকেট আপলোড করুন এবং ঋণ প্রস্তুতির নির্ভুল রিপোর্ট পান",
        ocrDropzoneTitle: "নথি আপলোড করুন (Drag & Drop or Browse)",
        ocrBrowseBtnText: "ফাইল বাছুন",
        ocrCameraBtnText: "ক্যামেরা",
        ocrSampleBtnText: "ডেমো নথি লোড করুন",
        startOcrBtnText: "AI OCR দিয়ে স্ক্যান ও যাচাই করুন",
        emiHeaderTitle: "NSFDC EMI ক্যালকুলেটর",
        emiSubmitBtnText: "EMI গণনা করুন",
        emiResMonthlyLabel: "মাসিক EMI",
        emiResInterestLabel: "মোট সুদ",
        emiResPayableLabel: "মোট পরিশোধযোগ্য"
    },
    "ta-IN": {
        langName: "தமிழ்",
        tagline: "கனவுகள் நனவாகும், உங்களுடன் யோஜனாசேது — “YojnaSetu”",
        loginBtn: "உள்நுழைவு / பதிவு",
        navHome: "முகப்பு",
        navReadiness: "கடன் தயார்நிலை மதிப்பெண்",
        navOcr: "ஆவண OCR சரிபார்ப்பு",
        navEmi: "EMI கால்குலேட்டர்",
        navPartners: "சேனல் பங்குதாரர்கள்",
        navHelp: "உதவி",
        govTitle: "இந்திய அரசு",
        govSub: "ஆதரவுடன்",
        heroTitle: 'வணக்கம்! நான் <span>யோஜனாசேது (YojnaSetu)</span>',
        heroIntro: "NSFDC அரசு மானியக் கடன் திட்டங்கள், தகுதி மற்றும் AI கடன் தயார்நிலை மதிப்பெண்ணை அறிய நான் உங்களுக்கு உதவுகிறேன்.",
        speechTitle: "வணக்கம்!",
        speechP1: "நான் யோஜனாசேது. நீங்கள் என்னிடம் தமிழில் பேசலாம்.",
        speechP2: "சொல்லுங்கள், இன்று உங்கள் கடன் விண்ணப்பத்தில் நான் எவ்வாறு உதவ முடியும்?",
        micTitle: "பேச பொத்தானை அழுத்தவும்",
        micSub: "நான் உங்கள் பேச்சைக் கேட்கிறேன்...",
        micBtnTitle: "பேச அழுத்தவும்",
        resetBtn: "புதிய உரையாடல் (New Chat)",
        chatPlaceholder: "இங்கு தட்டச்சு செய்யவும் அல்லது பேசவும்...",
        sendBtn: "அனுப்பு",
        chipEdu: "கல்விக் கடன் (Education Loan)",
        chipBiz: "தொழில் கடன் (Business Loan)",
        chipScore: "தயார்நிலை மதிப்பெண்",
        chipOcr: "ஆவண OCR",
        chipEmi: "EMI கால்குலேட்டர்",
        chipPartner: "அருகிலுள்ள கிளைகள்",
        moreLang: "+ கூடுதல் மொழிகள்",
        initChatMsg: "<strong>வணக்கம்!</strong> நான் உங்கள் AI கடன் உதவி முகவர். உங்களுக்கு எந்த வகையான கடன் தேவை? (கல்விக் கடன் / தொழில் கடன்)",
        step1B: "1. உங்கள் மொழியில் பேசுங்கள்",
        step1Span: "விவரங்களைப் பகிருங்கள்",
        step2B: "2. மதிப்பெண் மற்றும் திட்டத்தைப் பெறுங்கள்",
        step2Span: "சரியான கடன் திட்டம்",
        step3B: "3. உங்கள் இலக்கு, எங்கள் ஆதரவு",
        step3Span: "கடன் பெறும் வரை முழு உதவி",
        helpCardH3: "நாங்கள் உங்களுக்கு உதவ இங்கு உள்ளோம்",
        helpCardP: "யோஜனாசேது உங்கள் சொந்த மொழியிலேயே முழுமையான வழிகாட்டுதலை வழங்கும்.",
        schemesCardH3: "கிடைக்கும் திட்டங்கள் (Schemes)",
        helpRow1: "கடன் தயார்நிலை மதிப்பீடு",
        helpRow2: "அரசு கடன் திட்டங்கள் தகவல்",
        helpRow3: "தகுதி சரிபார்ப்பு உதவி",
        helpRow4: "விண்ணப்ப செயல்முறை வழிகாட்டுதல்",
        helpRow5: "அருகிலுள்ள ஆதரவு மையம் கண்டறிதல்",
        secureCardH3: "உங்கள் தகவல் பாதுகாப்பானது",
        secureCardP: "உங்கள் தகவல்கள் முற்றிலும் ரகசியமாகவும் பாதுகாப்பாகவும் வைக்கப்படும்.",
        maxLoanPrefix: "அதிகபட்ச கடன்",
        interestPrefix: "வட்டி விகிதம்",
        moratoriumSuffix: "மாதங்கள்",
        partnerHeaderTitle: "அருகிலுள்ள NSFDC சேனல் பங்குதாரர்கள்",
        partnerRagBadgeText: "RAG AI தேடல் இயக்கப்பட்டது",
        partnerHeaderDesc: "மாநில சேனலைசிங் முகமைகள் (SCA) மற்றும் வங்கிகளைக் கண்டறியவும்",
        locPermTitle: "இருப்பிட அனுமதி (Location Permission)",
        locPermDesc: "துல்லியமான தூரத்தைக் கணக்கிட இருப்பிட அனுமதியை வழங்கவும்.",
        findLocationBtnText: "தற்போதைய இருப்பிடத்தைப் பயன்படுத்து",
        partnerQueryPlaceholder: "இயற்கை மொழியில் தேடவும் (எ.கா. 'சென்னை தொழில் கடன்', 'TAHDCO', 'Indian Bank')...",
        partnerRagBtnText: "தேடல்",
        partnerTypePillsLabel: "முகமை வகை:",
        pillAll: "அனைத்தும் (All)",
        pillSca: "🏛️ மாநில முகமை (SCA)",
        pillPsb: "🏦 பொதுத்துறை வங்கி (PSB)",
        pillRrb: "🌾 கிராமிய வங்கி (RRB)",
        partnerCountSuffix: "அதிகாரப்பூர்வ சேனல் பங்குதாரர்கள் உள்ளனர்",
        partnerDistanceAway: "கி.மீ தூரம்",
        partnerOfficer: "அதிகாரி",
        partnerPhone: "தொலைபேசி",
        partnerTollFree: "கட்டணமில்லா எண்",
        partnerDirections: "வழிசெலுத்து",
        partnerCall: "அழைப்பு",
        partnerMap: "வரைபடம்",
        simHeaderTitle: "கடன் தயார்நிலை சிமுலேட்டர்",
        simHeaderDesc: "உங்கள் வருமானம் மற்றும் கடன் தேவையை மாற்றி ஒப்புதல் மதிப்பெண்ணைக் கணக்கிடுங்கள்",
        simLabelLoanType: "கடன் வகை",
        simOptLoanTypeDefault: "தேர்வு செய்க",
        simOptLoanTypeBiz: "💼 தொழில் கடன் (Business Loan)",
        simOptLoanTypeEdu: "🎓 கல்விக் கடன் (Education Loan)",
        simLabelLoanAmount: "தேவையான கடன் தொகை (₹)",
        simLabelIncome: "ஆண்டு குடும்ப வருமானம் (₹)",
        simLabelTenure: "திருப்பிச் செலுத்தும் காலம் (மாதங்கள்)",
        simSubmitBtnText: "தயார்நிலை மதிப்பெண்ணைக் கணக்கிடுங்கள்",
        ocrHeaderTitle: "ஆவண OCR & தகுதி சரிபார்ப்பு",
        ocrHeaderDesc: "உங்கள் சான்றிதழ்களைப் பதிவேற்றி கடன் தயார்நிலையைச் சரிபார்க்கவும்",
        ocrDropzoneTitle: "ஆவணங்களைப் பதிவேற்றவும் (Upload Documents)",
        ocrBrowseBtnText: "கோப்புகளைத் தேர்ந்தெடுக்கவும்",
        ocrCameraBtnText: "கேமரா",
        ocrSampleBtnText: "டெமோ ஆவணங்கள்",
        startOcrBtnText: "AI OCR மூலம் ஸ்கேன் செய்க",
        emiHeaderTitle: "NSFDC EMI கால்குலேட்டர்",
        emiSubmitBtnText: "EMI கணக்கிடுக",
        emiResMonthlyLabel: "மாதாந்திர EMI",
        emiResInterestLabel: "மொத்த வட்டி",
        emiResPayableLabel: "மொத்த திருப்பிச் செலுத்துகை"
    },
    "te-IN": {
        langName: "తెలుగు",
        tagline: "కలలకు లభిస్తుంది ఆసరా, మీతో ఉంది యోజనాసేతు — “YojnaSetu”",
        loginBtn: "లాగిన్ / రిజిస్టర్",
        navHome: "హోమ్",
        navReadiness: "రుణ సంసిద్ధత స్కోర్",
        navOcr: "పత్రాల OCR తనిఖీ",
        navEmi: "EMI కాలిక్యులేటర్",
        navPartners: "ఛానల్ భాగస్వాములు",
        navHelp: "సహాయం",
        govTitle: "భారత ప్రభుత్వం",
        govSub: "ద్వారా మద్దతు",
        heroTitle: 'నమస్కారం! నేను <span>యోజనాసేతు (YojnaSetu)</span>',
        heroIntro: "నేను NSFDC ప్రభుత్వ రాయితీ రుణాలు, అర్హత మరియు AI రుణ సంసిద్ధత స్కోర్ మూల్యాంకనంలో మీకు సహాయం చేయడానికి ఇక్కడ ఉన్నాను.",
        speechTitle: "నమస్కారం!",
        speechP1: "నేను యోజనాసేతును. మీరు నాతో తెలుగులో మాట్లాడవచ్చు.",
        speechP2: "చెప్పండి, మీ రుణ దరఖాస్తులో నేను ఈరోజు మీకు ఎలా సహాయపడగలను?",
        micTitle: "మాట్లాడటానికి బటన్ నొక్కండి",
        micSub: "నేను మీ మాట వింటున్నాను...",
        micBtnTitle: "మాట్లాడటానికి నొక్కండి",
        resetBtn: "కొత్త సంభాషణ (New Chat)",
        chatPlaceholder: "ఇక్కడ సందేశం రాయండి లేదా మాట్లాడండి...",
        sendBtn: "పంపండి",
        chipEdu: "విద్య రుణం (Education Loan)",
        chipBiz: "వ్యాపార రుణం (Business Loan)",
        chipScore: "సంసిద్ధత స్కోర్ (Readiness)",
        chipOcr: "పత్రాల OCR (Doc OCR)",
        chipEmi: "EMI కాలిక్యులేటర్",
        chipPartner: "సమీప భాగస్వాములు",
        moreLang: "+ మరిన్ని భాషలు",
        initChatMsg: "<strong>నమస్కారం!</strong> నేను మీ AI రుణ సహాయ ఏజెంట్‌ను. మీకు ఏ రకమైన రుణం కావాలి? (విద్యా రుణం / వ్యాపార రుణం)",
        step1B: "1. మీ భాషలో మాట్లాడండి",
        step1Span: "మీ వివరాలను పంచుకోండి",
        step2B: "2. స్కోర్ & సరైన పథకం పొందండి",
        step2Span: "ఖచ్చితమైన రుణ ప్రణాళిక",
        step3B: "3. మీ లక్ష్యం, మా తోడ్పాటు",
        step3Span: "రుణ పంపిణీ వరకు పూర్తి సహాయం",
        helpCardH3: "మేము మీకు సహాయం చేయడానికి సిద్ధంగా ఉన్నాము",
        helpCardP: "యోజనాసేతు మీ స్వంత భాషలోనే పూర్తి రుణ మార్గదర్శకత్వాన్ని అందిస్తుంది.",
        schemesCardH3: "అందుబాటులో ఉన్న పథకాలు (Schemes)",
        helpRow1: "రుణ సంసిద్ధత స్కోర్ మూల్యాంకనం",
        helpRow2: "ప్రభుత్వ రుణ పథకాల సమాచారం",
        helpRow3: "అర్హత తనిఖీలో సహాయం",
        helpRow4: "దరఖాస్తు ప్రక్రియ మార్గదర్శకత్వం",
        helpRow5: "సమీప సహాయ కేంద్రం శోధన",
        secureCardH3: "మీ సమాచారం సురక్షితం",
        secureCardP: "మీ డేటా పూర్తిగా గోప్యంగా మరియు సురక్షితంగా ఉంచబడుతుంది.",
        maxLoanPrefix: "గరిష్ట రుణం",
        interestPrefix: "వడ్డీ రేటు",
        moratoriumSuffix: "నెలలు",
        partnerHeaderTitle: "సమీప NSFDC ఛానల్ భాగస్వాముల లొకేటర్",
        partnerRagBadgeText: "RAG AI శోధన ప్రారంభించబడింది",
        partnerHeaderDesc: "అధికారిక స్టేట్ ఛానలైజింగ్ ఏజెన్సీలు (SCA) మరియు బ్యాంకులను కనుగొనండి",
        locPermTitle: "లొకేషన్ అనుమతి (Location Permission)",
        locPermDesc: "సమీప కార్యాలయాలు మరియు దూరాన్ని తెలుసుకోవడానికి లొకేషన్ యాక్సెస్ ఇవ్వండి.",
        findLocationBtnText: "ప్రస్తుత లొకేషన్ ఉపయోగించండి",
        partnerQueryPlaceholder: "సహజ భాషలో శోధించండి (ఉదా: 'హైదరాబాద్ వ్యాపార రుణం', 'ఆంధ్రా బ్యాంక్', 'SCA')...",
        partnerRagBtnText: "శోధన",
        partnerTypePillsLabel: "ఏజెన్సీ రకం:",
        pillAll: "అన్నీ (All)",
        pillSca: "🏛️ రాష్ట్ర ఏజెన్సీ (SCA)",
        pillPsb: "🏦 ప్రభుత్వ బ్యాంకు (PSB)",
        pillRrb: "🌾 గ్రామీణ బ్యాంకు (RRB)",
        partnerCountSuffix: "అధికారిక ఛానల్ భాగస్వాములు అందుబాటులో ఉన్నారు",
        partnerDistanceAway: "కి.మీ దూరం",
        partnerOfficer: "అధికారి",
        partnerPhone: "ఫోన్",
        partnerTollFree: "టోల్-ఫ్రీ",
        partnerDirections: "దిశలు",
        partnerCall: "కాల్",
        partnerMap: "మ్యాప్",
        simHeaderTitle: "రుణ సంసిద్ధత స్కోర్ సిమ్యులేటర్",
        simHeaderDesc: "మీ ఆదాయం మరియు రుణ అవసరాన్ని మార్చి ఆమోద స్కోర్‌ను అంచనా వేయండి",
        simLabelLoanType: "రుణ రకం (Loan Type)",
        simOptLoanTypeDefault: "ఎంచుకోండి",
        simOptLoanTypeBiz: "💼 వ్యాపార రుణం (Business Loan)",
        simOptLoanTypeEdu: "🎓 విద్యా రుణం (Education Loan)",
        simLabelLoanAmount: "అవసరమైన రుణ మొత్తం (₹)",
        simLabelIncome: "వార్షిక కుటుంబ ఆదాయం (₹)",
        simLabelTenure: "తిరిగి చెల్లించే వ్యవధి (నెలలు)",
        simSubmitBtnText: "సంసిద్ధత స్కోర్‌ను లెక్కించండి",
        ocrHeaderTitle: "పత్రాల OCR & పథక సంసిద్ధత తనిఖీ",
        ocrHeaderDesc: "మీ సర్టిఫికేట్‌లను అప్‌లోడ్ చేసి రుణ సంసిద్ధతను ధృవీకరించండి",
        ocrDropzoneTitle: "పత్రాలను అప్‌లోడ్ చేయండి (Upload Documents)",
        ocrBrowseBtnText: "ఫైల్‌లను ఎంచుకోండి",
        ocrCameraBtnText: "కెమెరా",
        ocrSampleBtnText: "డెమో పత్రాలు",
        startOcrBtnText: "AI OCR తో స్కాన్ & ధృవీకరించండి",
        emiHeaderTitle: "NSFDC EMI కాలిక్యులేటర్",
        emiSubmitBtnText: "EMI లెక్కించండి",
        emiResMonthlyLabel: "నెలవారీ EMI",
        emiResInterestLabel: "మొత్తం వడ్డీ",
        emiResPayableLabel: "మొత్తం చెల్లింపు"
    },
    "mr-IN": {
        langName: "मराठी",
        tagline: "स्वप्नांना मिळेल आधार, सोबत आहे योजनासेतू — “YojnaSetu”",
        loginBtn: "लॉगिन / नोंदणी",
        navHome: "मुख्यपृष्ठ",
        navReadiness: "कर्ज तयारी स्कोअर",
        navOcr: "कागदपत्र OCR पडताळणी",
        navEmi: "EMI कॅल्क्युलेटर",
        navPartners: "चॅनेल भागीदार",
        navHelp: "मदत व सहाय्य",
        govTitle: "भारत सरकार",
        govSub: "द्वारे समर्थित",
        heroTitle: 'नमस्कार! मी <span>योजनासेतू (YojnaSetu)</span> आहे',
        heroIntro: "मी तुम्हाला NSFDC सरकारी सवलतीच्या कर्ज योजना, पात्रता आणि AI कर्ज तयारी स्कोअर तपासण्यात मदत करण्यासाठी येथे आहे.",
        speechTitle: "नमस्कार!",
        speechP1: "मी योजनासेतू आहे. तुम्ही माझ्याशी मराठीत बोलू शकता.",
        speechP2: "सांगा, आज मी तुमच्या कर्ज अर्जात कशी मदत करू शकतो?",
        micTitle: "बोलण्यासाठी बटण दाबा",
        micSub: "मी तुमचे ऐकत आहे...",
        micBtnTitle: "बोलण्यासाठी दाबा",
        resetBtn: "नवीन संवाद (New Chat)",
        chatPlaceholder: "येथे संदेश लिहा किंवा बोला...",
        sendBtn: "पाठवा",
        chipEdu: "शिक्षण कर्ज (Education Loan)",
        chipBiz: "व्यवसाय कर्ज (Business Loan)",
        chipScore: "तयारी स्कोअर (Readiness)",
        chipOcr: "कागदपत्र OCR",
        chipEmi: "EMI कॅल्क्युलेटर",
        chipPartner: "जवळचे भागीदार",
        moreLang: "+ इतर भाषा",
        initChatMsg: "<strong>नमस्कार!</strong> मी तुमचा AI कर्ज सहाय्यक आहे. तुम्हाला कोणत्या प्रकारचे कर्ज हवे आहे? (शिक्षण कर्ज / व्यवसाय कर्ज)",
        step1B: "१. तुमच्या भाषेत बोला",
        step1Span: "फक्त माहिती सांगा",
        step2B: "२. स्कोअर व योग्य योजना मिळवा",
        step2Span: "अचूक कर्ज मार्गदर्शन",
        step3B: "३. तुमचे ध्येय, आमची साथ",
        step3Span: "कर्ज मिळेपर्यंत पूर्ण मदत",
        maxLoanPrefix: "कमाल कर्ज",
        interestPrefix: "व्याजदर",
        moratoriumSuffix: "महिने",
        partnerHeaderTitle: "जवळचे NSFDC चॅनेल भागीदार",
        findLocationBtnText: "माझे सध्याचे स्थान वापरा",
        partnerQueryPlaceholder: "शोधा (उदा. 'पुणे व्यवसाय कर्ज', 'MPBCDC', 'बँक')...",
        partnerRagBtnText: "शोधा",
        simHeaderTitle: "कर्ज तयारी स्कोअर सिम्युलेटर",
        simSubmitBtnText: "स्कोअरची गणना करा",
        ocrHeaderTitle: "कागदपत्र OCR व पात्रता पडताळणी",
        startOcrBtnText: "AI OCR द्वारे स्कॅन करा",
        emiHeaderTitle: "NSFDC EMI कॅल्क्युलेटर",
        emiSubmitBtnText: "EMI गणना करा",
        emiResMonthlyLabel: "मासिक EMI",
        emiResInterestLabel: "एकूण व्याज",
        emiResPayableLabel: "एकूण परतफेड"
    },
    "gu-IN": {
        langName: "ગુજરાતી",
        tagline: "સપનાઓને મળશે સહારો, સાથે છે યોજનાસેતુ — “YojnaSetu”",
        loginBtn: "લૉગિન / નોંધણી",
        navHome: "હોમ",
        navReadiness: "લોન તૈયારી સ્કોર",
        navOcr: "દસ્તાવેજ OCR ચકાસણી",
        navEmi: "EMI કેલ્ક્યુલેટર",
        navPartners: "ચેનલ પાર્ટનર્સ",
        navHelp: "સહાય",
        govTitle: "ભારત સરકાર",
        govSub: "દ્વારા સમર્થિત",
        heroTitle: 'નમસ્તે! હું <span>યોજનાસેતુ (YojnaSetu)</span> છું',
        heroIntro: "હું તમને સરકારી લોન યોજનાઓ, પાત્રતા અને AI લોન રેડીનેસ સ્કોર મૂલ્યાંકનમાં મદદ કરવા અહીં છું.",
        speechTitle: "નમસ્તે!",
        speechP1: "હું યોજનાસેતુ છું. તમે મારી સાથે ગુજરાતીમાં વાત કરી શકો છો.",
        speechP2: "કહો, આજે હું તમારી લોન અરજીમાં કેવી રીતે મદદ કરી શકું?",
        micTitle: "બોલવા માટે બટન દબાવો",
        micSub: "હું તમને સાંભળી રહ્યો છું...",
        micBtnTitle: "બોલવા માટે દબાવો",
        resetBtn: "નવો સંવાદ (New Chat)",
        chatPlaceholder: "અહીં સંદેશ લખો અથવા બોલો...",
        sendBtn: "મોકલો",
        chipEdu: "શિક્ષણ લોન (Education Loan)",
        chipBiz: "વ્યવસાય લોન (Business Loan)",
        chipScore: "તૈયારી સ્કોર",
        chipOcr: "દસ્તાવેજ OCR",
        chipEmi: "EMI કેલ્ક્યુલેટર",
        chipPartner: "નજીકના પાર્ટનર",
        moreLang: "+ વધુ ભાષાઓ",
        initChatMsg: "<strong>નમસ્તે!</strong> હું તમારો AI લોન સહાયક છું. તમને કયા પ્રકારની લોન જોઈએ છે? (શિક્ષણ લોન / વ્યવસાય લોન)",
        step1B: "૧. તમારી ભાષામાં બોલો",
        step1Span: "ફક્ત તમારી વિગતો જણાવો",
        step2B: "૨. તૈયારી સ્કોર અને યોજના મેળવો",
        step2Span: "યોગ્ય લોન માર્ગદર્શન",
        step3B: "૩. તમારું લક્ષ્ય, અમારો સાથ",
        step3Span: "લોન મંજૂરી સુધી સંપૂર્ણ સહાય",
        maxLoanPrefix: "મહત્તમ લોન",
        interestPrefix: "વ્યાજ દર",
        moratoriumSuffix: "મહિના",
        partnerHeaderTitle: "નજીકના NSFDC ચેનલ પાર્ટનર",
        findLocationBtnText: "મારું વર્તમાન સ્થાન વાપરો",
        partnerQueryPlaceholder: "શોધો (દા.ત. 'અમદાવાદ બિઝનેસ લોન', 'બેંક')...",
        partnerRagBtnText: "શોધો",
        simHeaderTitle: "લોન તૈયારી સ્કોર સિમ્યુલેટર",
        simSubmitBtnText: "સ્કોર ગણતરી કરો",
        ocrHeaderTitle: "દસ્તાવેજ OCR અને ચકાસણી",
        startOcrBtnText: "AI OCR થી સ્કેન કરો",
        emiHeaderTitle: "NSFDC EMI કેલ્ક્યુલેટર",
        emiSubmitBtnText: "EMI ગણો",
        emiResMonthlyLabel: "માસિક EMI",
        emiResInterestLabel: "કુલ વ્યાજ",
        emiResPayableLabel: "કુલ ચૂકવણી"
    },
    "pa-IN": {
        langName: "ਪੰਜਾਬੀ",
        tagline: "ਸੁਪਨਿਆਂ ਨੂੰ ਮਿਲੇਗਾ ਸਹਾਰਾ, ਤੁਹਾਡੇ ਨਾਲ ਹੈ ਯੋਜਨਾਸੇਤੂ — “YojnaSetu”",
        loginBtn: "ਲਾਗਇਨ / ਰਜਿਸਟਰ",
        navHome: "ਹੋਮ",
        navReadiness: "ਕਰਜ਼ ਤਿਆਰੀ ਸਕੋਰ",
        navOcr: "ਦਸਤਾਵੇਜ਼ OCR ਜਾਂਚ",
        navEmi: "EMI ਕੈਲਕੁਲੇਟਰ",
        navPartners: "ਚੈਨਲ ਪਾਰਟਨਰ",
        navHelp: "ਸਹਾਇਤਾ",
        govTitle: "ਭਾਰਤ ਸਰਕਾਰ",
        govSub: "ਦੁਆਰਾ ਸਮਰਥਿਤ",
        heroTitle: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ <span>ਯੋਜਨਾਸੇਤੂ (YojnaSetu)</span> ਹਾਂ',
        heroIntro: "ਮੈਂ ਤੁਹਾਨੂੰ ਸਰਕਾਰੀ ਕਰਜ਼ਾ ਯੋਜਨਾਵਾਂ, ਯੋਗਤਾ ਅਤੇ AI ਕਰਜ਼ ਤਿਆਰੀ ਸਕੋਰ ਦੇ ਮੁਲਾਂਕਣ ਵਿੱਚ ਮਦਦ ਕਰਨ ਲਈ ਇੱਥੇ ਹਾਂ।",
        speechTitle: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ!",
        speechP1: "ਮੈਂ ਯੋਜਨਾਸੇਤੂ ਹਾਂ। ਤੁਸੀਂ ਮੇਰੇ ਨਾਲ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰ ਸਕਦੇ ਹੋ।",
        speechP2: "ਦੱਸੋ, ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕਰਜ਼ਾ ਅਰਜ਼ੀ ਵਿੱਚ ਕਿਵੇਂ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ?",
        micTitle: "ਬੋਲਣ ਲਈ ਬਟਨ ਦਬਾਓ",
        micSub: "ਮੈਂ ਤੁਹਾਡੀ ਗੱਲ ਸੁਣ ਰਿਹਾ ਹਾਂ...",
        micBtnTitle: "ਬੋਲਣ ਲਈ ਦਬਾਓ",
        resetBtn: "ਨਵੀਂ ਗੱਲਬਾਤ (New Chat)",
        chatPlaceholder: "ਇੱਥੇ ਸੁਨੇਹਾ ਲਿਖੋ ਜਾਂ ਬੋਲੋ...",
        sendBtn: "ਭੇਜੋ",
        chipEdu: "ਸਿੱਖਿਆ ਕਰਜ਼ਾ (Education Loan)",
        chipBiz: "ਵਪਾਰ ਕਰਜ਼ਾ (Business Loan)",
        chipScore: "ਤਿਆਰੀ ਸਕੋਰ",
        chipOcr: "ਦਸਤਾਵੇਜ਼ OCR",
        chipEmi: "EMI ਕੈਲਕੁਲੇਟਰ",
        chipPartner: "ਨੇੜਲੇ ਪਾਰਟਨਰ",
        moreLang: "+ ਹੋਰ ਭਾਸ਼ਾਵਾਂ",
        initChatMsg: "<strong>ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ!</strong> ਮੈਂ ਤੁਹਾਡਾ AI ਲੋਨ ਸਹਾਇਕ ਹਾਂ। ਤੁਹਾਨੂੰ ਕਿਸ ਤਰ੍ਹਾਂ ਦਾ ਕਰਜ਼ਾ ਚਾਹੀਦਾ ਹੈ? (ਸਿੱਖਿਆ ਕਰਜ਼ਾ / ਵਪਾਰ ਕਰਜ਼ਾ)",
        step1B: "੧. ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲੋ",
        step1Span: "ਬਸ ਆਪਣੇ ਵੇਰਵੇ ਦੱਸੋ",
        step2B: "੨. ਤਿਆਰੀ ਸਕੋਰ ਤੇ ਯੋਜਨਾ ਪ੍ਰਾਪਤ ਕਰੋ",
        step2Span: "ਸਹੀ ਕਰਜ਼ਾ ਮਾਰਗਦਰਸ਼ਨ",
        step3B: "੩. ਤੁਹਾਡਾ ਟੀਚਾ, ਸਾਡਾ ਸਾਥ",
        step3Span: "ਕਰਜ਼ਾ ਮਿਲਣ ਤੱਕ ਪੂਰੀ ਸਹਾਇਤਾ",
        maxLoanPrefix: "ਵੱਧ ਤੋਂ ਵੱਧ ਕਰਜ਼ਾ",
        interestPrefix: "ਵਿਆਜ ਦਰ",
        moratoriumSuffix: "ਮਹੀਨੇ",
        partnerHeaderTitle: "ਨੇੜਲੇ NSFDC ਚੈਨਲ ਪਾਰਟਨਰ",
        findLocationBtnText: "ਮੇਰਾ ਮੌਜੂਦਾ ਸਥਾਨ ਵਰਤੋ",
        partnerQueryPlaceholder: "ਖੋਜੋ (ਜਿਵੇਂ 'ਲੁਧਿਆਣਾ ਵਪਾਰ ਕਰਜ਼ਾ', 'PSCFC', 'PNB')...",
        partnerRagBtnText: "ਖੋਜ",
        simHeaderTitle: "ਕਰਜ਼ ਤਿਆਰੀ ਸਕੋਰ ਸਿਮੂਲੇਟਰ",
        simSubmitBtnText: "ਸਕੋਰ ਦੀ ਗਣਨਾ ਕਰੋ",
        ocrHeaderTitle: "ਦਸਤਾਵੇਜ਼ OCR ਅਤੇ ਜਾਂਚ",
        startOcrBtnText: "AI OCR ਨਾਲ ਸਕੈਨ ਕਰੋ",
        emiHeaderTitle: "NSFDC EMI ਕੈਲਕੁਲੇਟਰ",
        emiSubmitBtnText: "EMI ਗਣਨਾ ਕਰੋ",
        emiResMonthlyLabel: "ਮਹੀਨਾਵਾਰ EMI",
        emiResInterestLabel: "ਕੁੱਲ ਵਿਆਜ",
        emiResPayableLabel: "ਕੁੱਲ ਭੁਗਤਾਨ"
    },
    "kn-IN": {
        langName: "ಕನ್ನಡ",
        tagline: "ಕನಸುಗಳಿಗೆ ಸಿಗಲಿದೆ ಆಸರೆ, ನಿಮ್ಮೊಂದಿಗೆ ಯೋಜನೆಸೇತು — “YojnaSetu”",
        loginBtn: "ಲಾಗಿನ್ / ನೋಂದಣಿ",
        navHome: "ಮುಖಪುಟ",
        navReadiness: "ಸಾಲ ಸಿದ್ಧತೆ ಸ್ಕೋರ್",
        navOcr: "ದಾಖಲೆ OCR ಪರಿಶೀಲನೆ",
        navEmi: "EMI ಕ್ಯಾಲ್ಕುಲೇಟರ್",
        navPartners: "ಚಾನೆಲ್ ಪಾಲುದಾರರು",
        navHelp: "ಸಹಾಯ",
        govTitle: "ಭಾರತ ಸರ್ಕಾರ",
        govSub: "ಬೆಂಬಲಿತ",
        heroTitle: 'ನಮಸ್ಕಾರ! ನಾನು <span>ಯೋಜನೆಸೇತು (YojnaSetu)</span>',
        heroIntro: "NSFDC ಸರ್ಕಾರಿ ರಿಯಾಯಿತಿ ಸಾಲ ಯೋಜನೆಗಳು, ಅರ್ಹತೆ ಮತ್ತು AI ಸಾಲ ಸಿದ್ಧತೆ ಸ್ಕೋರ್ ಮೌಲ್ಯಮಾಪನದಲ್ಲಿ ನಿಮಗೆ ಸಹಾಯ ಮಾಡಲು ನಾನು ಇಲ್ಲಿದ್ದೇನೆ.",
        speechTitle: "ನಮಸ್ಕಾರ!",
        speechP1: "ನಾನು ಯೋಜನೆಸೇತು. ನೀವು ನನ್ನೊಂದಿಗೆ ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಬಹುದು.",
        speechP2: "ಹೇಳಿ, ಇಂದು ನಿಮ್ಮ ಸಾಲದ ಅರ್ಜಿಯಲ್ಲಿ ನಾನು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?",
        micTitle: "ಮಾತನಾಡಲು ಬಟನ್ ಒತ್ತಿರಿ",
        micSub: "ನಾನು ನಿಮ್ಮ ಮಾತನ್ನು ಕೇಳುತ್ತಿದ್ದೇನೆ...",
        micBtnTitle: "ಮಾತನಾಡಲು ಒತ್ತಿರಿ",
        resetBtn: "ಹೊಸ ಸಂಭಾಷಣೆ (New Chat)",
        chatPlaceholder: "ಇಲ್ಲಿ ಸಂದೇಶ ಬರೆಯಿರಿ ಅಥವಾ ಮಾತನಾಡಿ...",
        sendBtn: "ಕಳುಹಿಸಿ",
        chipEdu: "ಶಿಕ್ಷಣ ಸಾಲ (Education Loan)",
        chipBiz: "ವ್ಯವಹಾರ ಸಾಲ (Business Loan)",
        chipScore: "ಸಿದ್ಧತೆ ಸ್ಕೋರ್",
        chipOcr: "ದಾಖಲೆ OCR",
        chipEmi: "EMI ಕ್ಯಾಲ್ಕುಲೇಟರ್",
        chipPartner: "ಹತ್ತಿರದ ಪಾಲುದಾರರು",
        moreLang: "+ ಇನ್ನಷ್ಟು ಭಾಷೆಗಳು",
        initChatMsg: "<strong>ನಮಸ್ಕಾರ!</strong> ನಾನು ನಿಮ್ಮ AI ಸಾಲ ಸಹಾಯಕ ಏಜೆಂಟ್. ನಿಮಗೆ ಯಾವ ರೀತಿಯ ಸಾಲ ಬೇಕು? (ಶಿಕ್ಷಣ ಸಾಲ / ವ್ಯವಹಾರ ಸಾಲ)",
        step1B: "೧. ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ",
        step1Span: "ನಿಮ್ಮ ವಿವರಗಳನ್ನು ಹಂಚಿಕೊಳ್ಳಿ",
        step2B: "೨. ಸಿದ್ಧತೆ ಸ್ಕೋರ್ ಮತ್ತು ಯೋಜನೆ ಪಡೆಯಿರಿ",
        step2Span: "ಸೂಕ್ತ ಸಾಲ ಯೋಜನೆ",
        step3B: "೩. ನಿಮ್ಮ ಗುರಿ, ನಮ್ಮ ಬೆಂಬಲ",
        step3Span: "ಸಾಲ ವಿತರಣೆಯವರೆಗೆ ಸಂಪೂರ್ಣ ನೆರವು",
        maxLoanPrefix: "ಗರಿಷ್ಠ ಸಾಲ",
        interestPrefix: "ಬಡ್ಡಿ ದರ",
        moratoriumSuffix: "ತಿಂಗಳುಗಳು",
        partnerHeaderTitle: "ಹತ್ತಿರದ NSFDC ಚಾನೆಲ್ ಪಾಲುದಾರರು",
        findLocationBtnText: "ನನ್ನ ಪ್ರಸ್ತುತ ಸ್ಥಳ ಬಳಸಿ",
        partnerQueryPlaceholder: "ಹುಡುಕಿ (ಉದಾ: 'ಬೆಂಗಳೂರು ವ್ಯವಹಾರ ಸಾಲ', 'ಅಂಬೇಡ್ಕರ್ ನಿಗಮ', 'ಬ್ಯಾಂಕ್')...",
        partnerRagBtnText: "ಹುಡುಕಿ",
        simHeaderTitle: "ಸಾಲ ಸಿದ್ಧತೆ ಸ್ಕೋರ್ ಸಿಮ್ಯುಲೇಟರ್",
        simSubmitBtnText: "ಸ್ಕೋರ್ ಲೆಕ್ಕಾಚಾರ ಮಾಡಿ",
        ocrHeaderTitle: "ದಾಖಲೆ OCR ಮತ್ತು ಪರಿಶೀಲನೆ",
        startOcrBtnText: "AI OCR ಮೂಲಕ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ",
        emiHeaderTitle: "NSFDC EMI ಕ್ಯಾಲ್ಕುಲೇಟರ್",
        emiSubmitBtnText: "EMI ಲೆಕ್ಕ ಹಾಕಿ",
        emiResMonthlyLabel: "ಮಾಸಿಕ EMI",
        emiResInterestLabel: "ಒಟ್ಟು ಬಡ್ಡಿ",
        emiResPayableLabel: "ಒಟ್ಟು ಪಾವತಿ"
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
    const supportedLangCodes = ["hi-IN", "en-IN", "bn-IN", "ta-IN", "te-IN", "mr-IN", "gu-IN", "pa-IN", "kn-IN"];
    let effectiveLang = "hi-IN";
    if (langCode) {
        if (supportedLangCodes.includes(langCode)) {
            effectiveLang = langCode;
        } else {
            const prefix = langCode.split("-")[0].toLowerCase();
            const matched = supportedLangCodes.find(c => c.startsWith(prefix));
            if (matched) effectiveLang = matched;
            else if (prefix === "en") effectiveLang = "en-IN";
            else effectiveLang = "hi-IN";
        }
    }

    currentLanguage = effectiveLang;
    localStorage.setItem("yojnaSetuLang", effectiveLang);

    const t = Object.assign({}, TRANSLATIONS["hi-IN"], TRANSLATIONS[effectiveLang] || {});
    const isEn = effectiveLang.startsWith("en");

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
        if (dataLang && dataLang === effectiveLang) {
            btn.classList.add("active");
        } else if (dataLang) {
            btn.classList.remove("active");
        }
    });

    // Helper update utilities
    const updateSpan = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            const span = el.querySelector("span") || el;
            if (span) span.textContent = text;
        }
    };

    const updateText = (id, text) => {
        const el = document.getElementById(id);
        if (el && text !== undefined) el.textContent = text;
    };

    const updateHTML = (id, html) => {
        const el = document.getElementById(id);
        if (el && html !== undefined) el.innerHTML = html;
    };

    const updatePlaceholder = (id, placeholder) => {
        const el = document.getElementById(id);
        if (el && placeholder !== undefined) el.placeholder = placeholder;
    };

    // 4. Update Header & Navigation Text
    updateText("header-tagline", t.tagline);
    updateText("nav-login-text", currentUser ? (currentUser.name || "User").split(" ")[0] : t.loginBtn);
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
    updatePlaceholder("chat-input", t.chatPlaceholder);
    updateText("send-btn-text", t.sendBtn);

    // Chips
    updateSpan("chip-edu", t.chipEdu);
    updateSpan("chip-biz", t.chipBiz);
    updateSpan("chip-score", t.chipScore);
    updateSpan("chip-ocr", t.chipOcr);
    updateSpan("chip-emi", t.chipEmi);
    updateSpan("chip-partner", t.chipPartner);

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

    // 9. Update Readiness Simulator
    updateText("sim-header-title", t.simHeaderTitle);
    updateText("sim-header-desc", t.simHeaderDesc);
    updateText("sim-label-loan-type", t.simLabelLoanType);
    updateText("sim-opt-loan-type-default", t.simOptLoanTypeDefault);
    updateText("sim-opt-loan-type-biz", t.simOptLoanTypeBiz);
    updateText("sim-opt-loan-type-edu", t.simOptLoanTypeEdu);
    updateText("sim-label-loan-amount", t.simLabelLoanAmount);
    updatePlaceholder("sim-loan-amount", t.simPlaceholderLoanAmount);
    updateText("sim-label-income", t.simLabelIncome);
    updatePlaceholder("sim-income", t.simPlaceholderIncome);
    updateText("sim-label-tenure", t.simLabelTenure);
    updatePlaceholder("sim-tenure", t.simPlaceholderTenure);
    updateText("sim-label-purpose", t.simLabelPurpose);
    updatePlaceholder("sim-purpose", t.simPlaceholderPurpose);
    updateText("sim-label-location", t.simLabelLocation);
    updatePlaceholder("sim-location", t.simPlaceholderLocation);
    updateHTML("sim-label-caste", t.simLabelCaste);
    updateText("sim-opt-caste-sc", t.simOptCasteSc);
    updateText("sim-opt-caste-pending", t.simOptCastePending);
    updateText("sim-opt-caste-other", t.simOptCasteOther);
    updateHTML("sim-label-docs", t.simLabelDocs);
    updateText("sim-opt-docs-all", t.simOptDocsAll);
    updateText("sim-opt-docs-partial", t.simOptDocsPartial);
    updateText("sim-opt-docs-basic", t.simOptDocsBasic);
    updateHTML("sim-label-exp", t.simLabelExp);
    updateText("sim-opt-exp-high", t.simOptExpHigh);
    updateText("sim-opt-exp-mid", t.simOptExpMid);
    updateText("sim-opt-exp-fresher", t.simOptExpFresher);
    updateHTML("sim-label-credit", t.simLabelCredit);
    updateText("sim-opt-credit-clean", t.simOptCreditClean);
    updateText("sim-opt-credit-active", t.simOptCreditActive);
    updateText("sim-opt-credit-default", t.simOptCreditDefault);
    updateText("sim-label-existing-emi", t.simLabelExistingEmi);
    updatePlaceholder("sim-existing-emi", t.simPlaceholderExistingEmi);
    updateText("sim-submit-btn-text", t.simSubmitBtnText);
    updateHTML("sim-result-title", t.simResultTitle);
    updateHTML("sim-tips-title", t.simTipsTitle);
    updateHTML("sim-checklist-title", t.simChecklistTitle);

    // 10. Update Document OCR Section
    updateText("ocr-header-title", t.ocrHeaderTitle);
    updateText("ocr-header-desc", t.ocrHeaderDesc);
    updateText("ocr-dropzone-title", t.ocrDropzoneTitle);
    updateText("ocr-dropzone-sub", t.ocrDropzoneSub);
    updateText("ocr-browse-btn-text", t.ocrBrowseBtnText);
    updateText("ocr-camera-btn-text", t.ocrCameraBtnText);
    updateText("ocr-sample-btn-text", t.ocrSampleBtnText);
    updateText("ocr-staged-header-text", t.ocrStagedHeaderText);
    updateText("clear-staged-btn-text", t.clearStagedBtnText);
    updateText("ocr-scheme-label-text", t.ocrSchemeLabelText);
    updateText("ocr-opt-biz", t.ocrOptBiz);
    updateText("ocr-opt-edu", t.ocrOptEdu);
    updateText("start-ocr-btn-text", t.startOcrBtnText);
    updateHTML("ocr-loader-text", t.ocrLoaderText);
    updateHTML("ocr-result-title", t.ocrResultTitle);
    updateText("ocr-report-summary", t.ocrReportSummary);
    updateText("ocr-progress-title-text", t.ocrProgressTitleText);
    updateHTML("ocr-entities-title-text", t.ocrEntitiesTitleText);
    updateHTML("ocr-checklist-title-text", t.ocrChecklistTitleText);
    updateText("ocr-next-step-title", t.ocrNextStepTitle);
    updateText("ocr-next-step-sub", t.ocrNextStepSub);
    updateText("ocr-next-step-btn-text", t.ocrNextStepBtnText);

    // 11. Update EMI Calculator Section
    updateText("emi-header-title", t.emiHeaderTitle);
    updateText("emi-header-desc", t.emiHeaderDesc);
    updateText("emi-label-principal", t.emiLabelPrincipal);
    updatePlaceholder("emi-principal", t.emiPlaceholderPrincipal);
    updateText("emi-label-rate", t.emiLabelRate);
    updatePlaceholder("emi-rate", t.emiPlaceholderRate);
    updateText("emi-label-tenure", t.emiLabelTenure);
    updatePlaceholder("emi-tenure", t.emiPlaceholderTenure);
    updateText("emi-label-moratorium", t.emiLabelMoratorium);
    updatePlaceholder("emi-moratorium", t.emiPlaceholderMoratorium);
    updateText("emi-submit-btn-text", t.emiSubmitBtnText);
    updateText("emi-res-monthly-label", t.emiResMonthlyLabel);
    updateText("emi-res-interest-label", t.emiResInterestLabel);
    updateText("emi-res-payable-label", t.emiResPayableLabel);

    // 12. Update Channel Partner Locator
    updateText("partner-header-title", t.partnerHeaderTitle);
    updateText("partner-header-desc", t.partnerHeaderDesc);
    updateText("loc-perm-title", t.locPermTitle);
    updateText("loc-perm-desc", t.locPermDesc);
    updateText("find-location-btn-text", t.findLocationBtnText);
    updatePlaceholder("partner-query-input", t.partnerQueryPlaceholder);
    updateText("partner-rag-btn-text", t.partnerRagBtnText);
    updateHTML("partner-state-label", t.partnerStateLabel);
    updateHTML("partner-scheme-label", t.partnerSchemeLabel);
    updateHTML("city-select-label", t.citySelectLabel);
    updateText("partner-type-pills-label", t.partnerTypePillsLabel);
    updateText("pill-all", t.pillAll);
    updateText("pill-sca", t.pillSca);
    updateText("pill-psb", t.pillPsb);
    updateText("pill-rrb", t.pillRrb);
    updateHTML("partner-sort-indicator", t.partnerSort);
    updateHTML("partner-map-title", t.partnerMapTitle);
    updateText("partner-map-note", t.partnerMapNote);

    // 13. Update Help & Support Modal
    updateText("help-modal-title", t.helpModalTitle);
    updateText("help-modal-sub", t.helpModalSub);
    updateHTML("help-helpline-title", t.helpHelplineTitle);
    updateText("helpline-badge-1", t.helplineBadge1);
    updateText("helpline-card-1-title", t.helplineCard1Title);
    updateText("helpline-card-1-time", t.helplineCard1Time);
    updateHTML("helpline-card-1-call", t.helplineCard1Call);
    updateText("helpline-badge-2", t.helplineBadge2);
    updateText("helpline-card-2-title", t.helplineCard2Title);
    updateText("helpline-card-2-time", t.helplineCard2Time);
    updateText("helpline-badge-3", t.helplineBadge3);
    updateText("helpline-card-3-title", t.helplineCard3Title);
    updateText("helpline-card-3-time", t.helplineCard3Time);
    updateText("helpline-badge-4", t.helplineBadge4);
    updateText("helpline-card-4-title", t.helplineCard4Title);
    updateText("helpline-card-4-time", t.helplineCard4Time);
    updateHTML("help-ai-title", t.helpAiTitle);
    updateText("help-ai-sub", t.helpAiSub);
    updateText("help-pill-1", t.helpPill1);
    updateText("help-pill-2", t.helpPill2);
    updateText("help-pill-3", t.helpPill3);
    updateText("help-pill-4", t.helpPill4);
    updateText("help-pill-5", t.helpPill5);
    updateHTML("help-faq-title", t.helpFaqTitle);
    updateText("faq-q-1", t.faqQ1);
    updateText("faq-a-1", t.faqA1);
    updateText("faq-q-2", t.faqQ2);
    updateText("faq-a-2", t.faqA2);
    updateText("faq-q-3", t.faqQ3);
    updateText("faq-a-3", t.faqA3);
    updateText("faq-q-4", t.faqQ4);
    updateText("faq-a-4", t.faqA4);
    updateHTML("help-email-label", t.helpEmailLabel);
    updateHTML("help-hq-label", t.helpHqLabel);
    updateText("help-hq-val", t.helpHqVal);
    updateText("help-close-btn", t.helpCloseBtn);
    updateText("help-partners-btn-text", t.helpPartnersBtnText);

    // 14. Update Auth Modal & Profile Dropdown
    updateText("auth-modal-title", t.authModalTitle);
    updateText("auth-modal-sub", t.authModalSub);
    updateText("auth-step-1-intro", t.authStep1Intro);
    updateHTML("auth-label-name", t.authLabelName);
    updatePlaceholder("auth-name-input", t.authPlaceholderName);
    updateHTML("auth-label-phone", t.authLabelPhone);
    updateHTML("auth-label-email", t.authLabelEmail);
    updateText("auth-send-btn-text", t.authSendBtnText);
    updateText("auth-step-2-intro", t.authStep2Intro);
    updateText("auth-edit-phone-btn", t.authEditPhoneBtn);
    updateText("otp-demo-label", t.otpDemoLabel);
    updateText("otp-autofill-btn", t.otpAutofillBtn);
    updateText("otp-time-left-label", t.otpTimeLeftLabel);
    updateText("auth-resend-btn", t.authResendBtn);
    updateText("auth-verify-btn-text", t.authVerifyBtnText);
    updateText("auth-modal-security-note", t.authSecurityNote);
    updateText("user-logout-text", t.userLogoutText);

    // 15. Update Recommendation Card labels if present
    updateText("rec-card-badge-text", t.recCardBadgeText);
    updateText("rec-match-badge-sub", t.recMatchBadgeSub);
    updateText("rec-label-max-loan", t.recLabelMaxLoan);
    updateText("rec-label-interest", t.recLabelInterest);
    updateText("rec-label-moratorium", t.recLabelMoratorium);
    updateText("rec-label-monthly-emi", t.recLabelMonthlyEmi);
    updateText("rec-label-total-payable", t.recLabelTotalPayable);
    updateText("rec-subsidy-text", t.recSubsidyText);
    updateHTML("rec-reasons-title", t.recReasonsTitle);
    updateHTML("rec-docs-title", t.recDocsTitle);
    updateHTML("rec-readiness-title", t.recReadinessTitle);
    updateHTML("rec-tips-title", t.recTipsTitle);
    updateHTML("rec-checklist-title", t.recChecklistTitle);

    // 16. Dynamic Re-renders for Active Components
    renderSidebarSchemes();

    if (lastFetchedPartners && lastFetchedPartners.length > 0) {
        renderPartnersList(lastFetchedPartners);
    }

    if (lastOcrDocuments && lastOcrReport) {
        renderOcrResults(lastOcrDocuments, lastOcrReport);
    }

    if (lastReadinessData) {
        populateReadinessUI(lastReadinessPrefix, lastReadinessData);
    }

    // 17. Update User Auth UI state
    updateUserAuthUI();

    // 18. Update Speech Recognition Language
    if (recognition) {
        recognition.lang = effectiveLang;
    }

    // 19. Speak greeting if user manually switched language
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
        btn.addEventListener("click", (e) => {
            const dataLang = btn.getAttribute("data-lang");
            if (btn.id === "hero-lang-more" || (!dataLang && btn.textContent.includes("भाषा"))) {
                e.stopPropagation();
                const headerLangBtn = document.getElementById("header-lang-btn");
                const headerLangMenu = document.getElementById("header-lang-menu");
                if (headerLangMenu) {
                    const isOpen = headerLangMenu.style.display === "flex";
                    toggleHeaderLangDropdown(!isOpen);
                    if (!isOpen && headerLangBtn) {
                        headerLangBtn.scrollIntoView({ behavior: "smooth", block: "center" });
                    }
                }
                return;
            }

            const text = btn.textContent.trim().toLowerCase();
            let chosenLang = dataLang;
            if (!chosenLang) {
                if (text.includes("english")) chosenLang = "en-IN";
                else if (text.includes("বাংলা") || text.includes("bangla")) chosenLang = "bn-IN";
                else if (text.includes("தமிழ்") || text.includes("tamil")) chosenLang = "ta-IN";
                else if (text.includes("తెలుగు") || text.includes("telugu")) chosenLang = "te-IN";
                else if (text.includes("मराठी") || text.includes("marathi")) chosenLang = "mr-IN";
                else if (text.includes("ગુજરાતી") || text.includes("gujarati")) chosenLang = "gu-IN";
                else if (text.includes("ਪੰਜਾਬੀ") || text.includes("punjabi")) chosenLang = "pa-IN";
                else if (text.includes("ಕನ್ನಡ") || text.includes("kannada")) chosenLang = "kn-IN";
                else chosenLang = "hi-IN";
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
    const globalLocAllowBtn = document.getElementById("global-loc-allow-btn");
    if (globalLocAllowBtn) {
        globalLocAllowBtn.addEventListener("click", () => handleLocationPermissionRequest(true));
    }

    const globalLocDismissBtn = document.getElementById("global-loc-dismiss-btn");
    if (globalLocDismissBtn) {
        globalLocDismissBtn.addEventListener("click", () => hideGlobalLocationBanner(0));
    }

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
    lastOcrDocuments = documents;
    lastOcrReport = report;

    const isEn = currentLanguage && currentLanguage.startsWith("en");
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS["hi-IN"];

    // 1. Overall badge & summary
    const overallBadge = document.getElementById("ocr-overall-badge");
    const summaryElem = document.getElementById("ocr-report-summary");
    const progressLabel = document.getElementById("ocr-progress-label");
    const progressBar = document.getElementById("ocr-progress-bar");

    if (overallBadge) {
        let badgeText = report.badge;
        if (isEn) {
            if (report.has_mismatch) {
                badgeText = "Action Required: Replace Mismatched Documents";
            } else if (report.readiness_percentage >= 80) {
                badgeText = "Fully Ready for Application";
            } else if (report.readiness_percentage >= 50) {
                badgeText = "Partially Ready";
            } else {
                badgeText = "Documents Incomplete";
            }
        }
        overallBadge.textContent = badgeText;
        overallBadge.style.background = report.color || (report.has_mismatch ? "#ef4444" : "#10b981");
    }

    if (summaryElem) {
        if (isEn) {
            summaryElem.textContent = report.has_mismatch
                ? "Mismatched or invalid document detected. Please review the checklist below and upload the correct mandatory certificates."
                : `Document verification status according to NSFDC SC loan eligibility: ${report.satisfied_count} of ${report.total_required} required criteria satisfied.`;
        } else {
            summaryElem.textContent = report.summary;
        }
    }

    if (progressLabel) {
        progressLabel.textContent = isEn
            ? `${report.satisfied_count} / ${report.total_required} documents verified (${report.readiness_percentage}%)`
            : `${report.satisfied_count} / ${report.total_required} दस्तावेज सत्यापित (${report.readiness_percentage}%)`;
    }

    if (progressBar) {
        progressBar.style.width = `${report.readiness_percentage}%`;
        if (report.readiness_percentage < 60) {
            progressBar.style.background = "linear-gradient(90deg, #f59e0b, #ef4444)";
        } else {
            progressBar.style.background = "linear-gradient(90deg, #6366f1, #10b981)";
        }
    }

    // 2. Document Cards Grid (with Mismatched / Verified status)
    const docsGrid = document.getElementById("verified-docs-grid");
    if (docsGrid && documents) {
        let warningBannerHtml = "";
        if (report.has_mismatch) {
            warningBannerHtml = isEn ? `
                <div class="mismatched-alert-banner" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <strong>Mismatched or Invalid Document Identified (Action Required):</strong>
                        <div>You have uploaded a document that does not match NSFDC SC loan eligibility criteria. Please replace it with the required mandatory document (e.g. Scheduled Caste Certificate) listed in the checklist below.</div>
                    </div>
                </div>
            ` : `
                <div class="mismatched-alert-banner" style="grid-column: 1 / -1;">
                    <i class="fa-solid fa-triangle-exclamation"></i>
                    <div>
                        <strong>असंगत या अमान्य दस्तावेज पहचाना गया (Action Required):</strong>
                        <div>आपने ऐसा दस्तावेज अपलोड किया है जो NSFDC ऋण पात्रता से मेल नहीं खाता। कृपया इसे बदलकर नीचे दी गई चेकलिस्ट के अनुसार सही अनिवार्य दस्तावेज (जैसे: अनुसूचित जाति प्रमाण पत्र) अपलोड करें।</div>
                    </div>
                </div>
            `;
        }

        docsGrid.innerHTML = warningBannerHtml + documents.map(doc => {
            const isMismatched = doc.is_mismatched || !doc.verified;
            const docTitle = formatDocTitle(doc, isEn);
            const rawFields = isEn ? (doc.extracted_fields_en || doc.extracted_fields || {}) : (doc.extracted_fields_hi || doc.extracted_fields || {});
            const rawNotes = isEn ? (doc.notes_en || doc.notes || []) : (doc.notes_hi || doc.notes || []);
            const formattedNotes = formatDocNotes(rawNotes, isEn);

            const fieldsHtml = Object.keys(rawFields).map(k => `
                <div class="extracted-field-row">
                    <span class="field-key">${formatFieldKey(k)}:</span>
                    <span class="field-val" style="${isMismatched ? 'color: #b91c1c;' : ''}">${escapeHtml(formatFieldValue(rawFields[k], isEn))}</span>
                </div>
            `).join("");

            const notesHtml = formattedNotes.map(n => `
                <li style="${isMismatched ? 'color: #b91c1c; font-weight: 500;' : ''}">${escapeHtml(n)}</li>
            `).join("");

            const badgeHtml = isMismatched
                ? `<span class="doc-badge-mismatched"><i class="fa-solid fa-triangle-exclamation"></i> ${isEn ? 'Mismatched / Invalid' : 'बेमेल / अमान्य'}</span>`
                : `<span class="doc-badge-verified"><i class="fa-solid fa-circle-check"></i> ${isEn ? 'Verified' : 'सत्यापित'}</span>`;

            return `
                <div class="verified-doc-card ${isMismatched ? 'mismatched' : ''}">
                    <div class="doc-card-header">
                        <div class="doc-card-icon"><i class="fa-solid ${doc.icon || (isMismatched ? 'fa-triangle-exclamation' : 'fa-file-lines')}"></i></div>
                        <div class="doc-card-title">
                            <h4 style="${isMismatched ? 'color: #b91c1c;' : ''}">${escapeHtml(docTitle)}</h4>
                            <span>${isEn ? 'File: ' : 'फ़ाइल: '}${escapeHtml(doc.filename)}</span>
                        </div>
                        ${badgeHtml}
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
            const itemName = isEn ? (item.name_en || item.name) : (item.name_hi || item.name);
            const itemDesc = isEn ? (item.description_en || item.description) : (item.description_hi || item.description);
            const statusText = isEn
                ? (item.status_text_en || (isVerified ? "Verified & Satisfied" : "Pending Upload"))
                : (item.status_text_hi || item.status_text || (isVerified ? "सत्यापित एवं संतुष्ट" : "अपलोड शेष"));

            return `
                <div class="checklist-card ${isVerified ? 'verified' : 'missing'}">
                    <div class="checklist-card-info">
                        <i class="fa-solid ${isVerified ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
                        <div>
                            <strong>${escapeHtml(itemName)}</strong>
                            <div style="font-size: 11px; color: #64748b;">${escapeHtml(itemDesc)}</div>
                        </div>
                    </div>
                    <span class="checklist-status-tag">${escapeHtml(statusText)}</span>
                </div>
            `;
        }).join("");
    }
}

function formatDocTitle(doc, isEn) {
    if (isEn) {
        if (doc.title_en) return doc.title_en;
        const title = doc.title || "";
        if (title.includes("EWS") || title.includes("ईडब्ल्यूएस")) return "⚠️ EWS Certificate (Non-SC Category)";
        if (title.includes("OBC") || title.includes("पिछड़ा")) return "⚠️ OBC Certificate (Non-SC Category)";
        if (title.includes("जाति") || title.includes("Caste")) return "SC Caste Certificate";
        if (title.includes("आय") || title.includes("Income")) return "Income Certificate";
        if (title.includes("पहचान") || title.includes("Aadhaar")) return "Identity Proof (Aadhaar / ID Card)";
        if (title.includes("बैंक") || title.includes("Bank")) return "Bank Account Passbook / Cheque";
        if (title.includes("परियोजना") || title.includes("Project")) return "Project Report / Cost Quotation";
        if (title.includes("कॉलेज") || title.includes("Admission")) return "College Admission Letter & Fee Structure";
        if (doc.is_mismatched) return `⚠️ Unrecognized Document (${doc.filename})`;
        return doc.title;
    }
    return doc.title_hi || doc.title;
}

function formatFieldKey(key) {
    const isEn = currentLanguage && currentLanguage.startsWith("en");
    if (isEn) {
        const mapEn = {
            "पहचाना_गया_दस्तावेज": "Identified Document",
            "योजना_पात्रता_स्थिति": "Scheme Eligibility Status",
            "आवश्यक_दस्तावेज": "Required Document",
            "कार्रवाई": "Action Required",
            "स्थिति": "Status",
            "सुझाव": "Recommendation",
            "category": "Category",
            "certificate_no": "Certificate No",
            "issuing_authority": "Issuing Authority",
            "validity": "Validity",
            "annual_income": "Annual Family Income",
            "id_type": "ID Type",
            "account_status": "Account Status",
            "ifsc_code": "IFSC Code",
            "proposal_type": "Proposal Type",
            "feasibility": "Feasibility",
            "admission_status": "Admission Status",
            "fee_structure": "Fee Structure",
            "status": "Status",
            "address_verified": "Address Verified",
            "direct_benefit_transfer": "DBT Transfer Status"
        };
        return mapEn[key] || key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }
    const mapHi = {
        "पहचाना_गया_दस्तावेज": "पहचाना गया दस्तावेज",
        "योजना_पात्रता_स्थिति": "योजना पात्रता स्थिति",
        "आवश्यक_दस्तावेज": "आवश्यक दस्तावेज",
        "कार्रवाई": "कार्रवाई",
        "स्थिति": "स्थिति",
        "सुझाव": "सुझाव",
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
    return mapHi[key] || key.replace(/_/g, " ");
}

function formatFieldValue(val, isEn) {
    if (!val) return "";
    const str = String(val);
    if (!isEn) return str;

    const translationMap = {
        "ईडब्ल्यूएस प्रमाण पत्र (General EWS Certificate)": "General EWS Certificate",
        "❌ अमान्य वर्ग (EWS सामान्य वर्ग हेतु है, SC हेतु नहीं)": "❌ Invalid Category (EWS is for General category, not SC)",
        "👉 अनुसूचित जाति प्रमाण पत्र (SC Caste Certificate)": "👉 Scheduled Caste (SC) Certificate",
        "कृपया सक्षम प्राधिकारी द्वारा जारी 'SC जाति प्रमाण पत्र' अपलोड करें": "Please upload an official SC Caste Certificate issued by competent authority",
        "OBC पिछड़ा वर्ग प्रमाण पत्र": "OBC Category Certificate",
        "❌ अमान्य वर्ग (NSFDC केवल SC वर्ग के लिए है)": "❌ Invalid Category (NSFDC is exclusively for SC category)",
        "Scheduled Caste (SC / अनुसूचित जाति)": "Scheduled Caste (SC)",
        "स्थायी / Permanent Valid": "Permanent Valid",
        "Revenue Department (राजस्व विभाग)": "Revenue Department",
        "सत्यापित पहचान (KYC Verified)": "KYC Verified",
        "हाँ (Yes)": "Yes",
        "सक्रिय बचत खाता (Active Savings A/C)": "Active Savings Account",
        "DBT / Direct Disbursement Ready": "DBT Ready",
        "Micro Enterprise / Project Setup": "Micro Enterprise / Project Setup",
        "आर्थिक रूप से व्यवहार्य (Techno-Economically Viable)": "Techno-Economically Viable",
        "मान्यता प्राप्त संस्थान में प्रवेश पुष्ट": "Confirmed Admission in Recognized Institution",
        "शुल्क विवरण संलग्न": "Fee Breakdown Attached",
        "❌ असंगत दस्तावेज (Not Matching Loan Requirements)": "❌ Mismatched document (Not matching loan requirements)",
        "कृपया चेकलिस्ट में दिए गए 5 अनिवार्य दस्तावेजों में से अपलोड करें": "Please upload one of the 5 mandatory documents from the checklist"
    };

    if (translationMap[str]) return translationMap[str];
    return str;
}

function formatDocNotes(notes, isEn) {
    if (!notes || !Array.isArray(notes)) return [];
    if (!isEn) return notes;

    const noteTranslations = {
        "❌ ईडब्ल्यूएस (EWS) प्रमाण पत्र NSFDC अनुसूचित जाति योजनाओं के लिए मान्य नहीं है।": "❌ EWS Certificate is not valid for NSFDC Scheduled Caste loan schemes.",
        "👉 NSFDC ऋण केवल अनुसूचित जाति (SC) वर्ग के लिए है। कृपया अपना 'अनुसूचित जाति प्रमाण पत्र (SC Caste Certificate)' अपलोड करें।": "👉 NSFDC concessional loans are strictly for Scheduled Caste (SC) category. Please upload your SC Caste Certificate.",
        "❌ यह प्रमाण पत्र अन्य पिछड़ा वर्ग (OBC) का है, जो NSFDC योजना में मान्य नहीं है।": "❌ This certificate belongs to Other Backward Classes (OBC), which is not eligible under NSFDC schemes.",
        "👉 कृपया अपना आधिकारिक 'अनुसूचित जाति (SC) प्रमाण पत्र' अपलोड करें।": "👉 Please upload your official Scheduled Caste (SC) Certificate.",
        "✅ अनुसूचित जाति (SC) श्रेणी की पुष्टि हुई। NSFDC पात्रता पूरी है।": "✅ Scheduled Caste (SC) category verified. NSFDC eligibility criteria satisfied.",
        "⚠️ प्रमाण पत्र में SC श्रेणी स्पष्ट रूप से दर्ज नहीं है।": "⚠️ Scheduled Caste (SC) category is not clearly marked on this document.",
        "उत्कृष्ट: आय NSFDC BPL/कम आय सीमा के पूरी तरह अनुकूल है।": "Excellent: Income fully complies with NSFDC concessional loan criteria.",
        "स्वीकार्य: आय सीमा NSFDC सामान्य पात्रता वर्ग में आती है।": "Acceptable: Income falls within NSFDC standard eligibility ceiling.",
        "✅ भारत सरकार द्वारा मान्यता प्राप्त पहचान पत्र सत्यापित हुआ।": "✅ Government of India recognized identity proof verified.",
        "नाम व पता सत्यापन पूर्ण।": "Full name and address authentication completed.",
        "✅ बैंक खाता विवरण एवं IFSC कोड प्रमाणित।": "✅ Active bank account details and IFSC code validated.",
        "ऋण राशि प्रत्यक्ष अंतरण (DBT) के लिए तैयार।": "Account is ready for Direct Benefit Transfer (DBT) disbursement.",
        "✅ व्यवसाय प्रस्ताव एवं कोटेशन विवरण स्वीकृत।": "✅ Business project proposal and cost quotation approved.",
        "✅ उच्च शिक्षा प्रवेश पत्र एवं शुल्क विवरण सत्यापित।": "✅ Higher education admission letter and fee schedule verified.",
        "❌ यह फ़ाइल ऋण आवेदन के अनिवार्य दस्तावेजों से मेल नहीं खाती।": "❌ This file does not match the mandatory NSFDC loan eligibility documents.",
        "👉 कृपया इस फ़ाइल को हटाकर संबंधित अनिवार्य दस्तावेज अपलोड करें।": "👉 Please replace this file with the required mandatory document from the checklist."
    };

    return notes.map(n => {
        if (noteTranslations[n]) return noteTranslations[n];
        if (n.startsWith("प्रमाण पत्र सं:") && isEn) {
            return n.replace("प्रमाण पत्र सं:", "Certificate No:").replace("जारीकर्ता:", "Issuing Authority:");
        }
        if (n.includes("पारिवारिक आय") && n.includes("प्रमाणित पाई गई") && isEn) {
            return n.replace("पारिवारिक आय", "Annual Family Income").replace("प्रमाणित पाई गई।", "verified.");
        }
        return n;
    });
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
                message: userText,
                language: currentLanguage
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

    lastReadinessData = readiness;
    lastReadinessPrefix = prefix;

    const isEn = currentLanguage && currentLanguage.startsWith("en");

    const scoreNum = document.getElementById(`${prefix}-readiness-score-num`);
    if (scoreNum) scoreNum.textContent = readiness.score;

    // English badge mapping
    let displayBadge = readiness.badge;
    if (isEn) {
        if (readiness.score >= 85) displayBadge = "Excellent Approval Probability";
        else if (readiness.score >= 70) displayBadge = "High Approval Probability";
        else if (readiness.score >= 50) displayBadge = "Moderate Approval Probability";
        else displayBadge = "Actionable Improvement Needed";
    }

    const summaryElem = document.getElementById(`${prefix}-readiness-summary`);
    if (summaryElem) {
        if (isEn) {
            summaryElem.textContent = readiness.score >= 70
                ? `Your evaluated loan profile achieves an impressive score of ${readiness.score}/100. Most eligibility and documentation criteria are well fulfilled.`
                : `Your evaluated loan profile has a score of ${readiness.score}/100. Please check the recommendations below to improve your approval readiness.`;
        } else {
            summaryElem.textContent = readiness.summary;
        }
    }

    const badgeElem = document.getElementById(`${prefix}-readiness-badge`);
    if (badgeElem) {
        badgeElem.textContent = `${readiness.score} / 100 — ${displayBadge}`;
        badgeElem.style.background = readiness.color || "#10b981";
    }

    const bandLabel = document.getElementById(`${prefix}-readiness-band-label`);
    if (bandLabel) {
        bandLabel.textContent = displayBadge;
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

    // Pillar name & details mapping for English
    const pillarTranslationMap = {
        "पात्रता व जाति प्रमाण": { name: "Category & Caste Eligibility", details: "SC category verification & certificate readiness" },
        "आर्थिक क्षमता व आय": { name: "Financial Capacity & Income", details: "Annual family income & repayment capacity" },
        "परियोजना / शिक्षा व्यवहार्यता": { name: "Project / Education Feasibility", details: "Business viability or course admission confirmation" },
        "दस्तावेज तत्परता": { name: "Document Readiness", details: "Mandatory KYC, income & project documents" },
        "क्रेडिट व पुनर्भुगतान ट्रैक": { name: "Credit & Repayment Track", details: "Clean past track record & EMI-to-income ratio" }
    };

    // Populate Pillars Breakdown
    const pillarsContainer = document.getElementById(`${prefix}-readiness-pillars`);
    if (pillarsContainer && readiness.pillars) {
        pillarsContainer.innerHTML = Object.keys(readiness.pillars).map(key => {
            const pillar = readiness.pillars[key];
            const pct = Math.min(100, Math.round((pillar.score / pillar.max) * 100));
            const translatedPillar = isEn && pillarTranslationMap[pillar.name]
                ? pillarTranslationMap[pillar.name]
                : { name: pillar.name, details: pillar.details };

            return `
                <div class="pillar-item">
                    <div class="pillar-top-row">
                        <span>${escapeHtml(translatedPillar.name)}</span>
                        <span><strong>${pillar.score}</strong> / ${pillar.max} pts</span>
                    </div>
                    <div class="pillar-bar-bg">
                        <div class="pillar-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <div class="pillar-details-text">${escapeHtml(translatedPillar.details)}</div>
                </div>
            `;
        }).join("");
    }

    // Populate Actionable Tips
    const tipsContainer = document.getElementById(`${prefix}-readiness-tips`);
    if (tipsContainer && readiness.tips) {
        tipsContainer.innerHTML = readiness.tips.map(tip => `
            <li><i class="fa-solid fa-circle-check" style="color: #facc15; margin-right: 6px;"></i>${escapeHtml(tip)}</li>
        `).join("");
    }

    // Populate Document Checklist
    const docsContainer = document.getElementById(`${prefix}-readiness-docs`);
    if (docsContainer && readiness.documents) {
        docsContainer.innerHTML = readiness.documents.map(doc => `
            <div class="doc-item ${doc.required ? 'mandatory' : ''}">
                <i class="fa-solid ${doc.icon || 'fa-file-lines'}"></i>
                <span>${escapeHtml(doc.name)}</span>
                <span class="doc-tag">${doc.required ? (isEn ? 'Mandatory (Required)' : 'अनिवार्य (Required)') : (isEn ? 'Optional' : 'वैकल्पिक (Optional)')}</span>
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
 * Shows the prominent floating global location banner across the app
 */
function showGlobalLocationBanner() {
    const banner = document.getElementById("global-location-banner");
    if (banner && !isLocationPermissionGranted) {
        banner.classList.add("visible");
    }
}

/**
 * Smoothly hides the floating global location banner
 */
function hideGlobalLocationBanner(delayMs = 400) {
    const banner = document.getElementById("global-location-banner");
    if (!banner) return;

    setTimeout(() => {
        banner.classList.remove("visible");
    }, delayMs);
}

/**
 * Smoothly hides the location permission banner once location is received and saved
 */
function hideLocationPermissionBox(delayMs = 1200) {
    const box = document.getElementById("location-permission-box");
    if (!box) return;

    setTimeout(() => {
        box.classList.add("hiding");
        setTimeout(() => {
            box.style.display = "none";
        }, 500);
    }, delayMs);
}

/**
 * Initializes location from localStorage if already saved previously
 */
function initSavedUserLocation() {
    try {
        const saved = localStorage.getItem("yojnasetu_user_location");
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed.lat === "number" && typeof parsed.lng === "number") {
                userCoordinates = { lat: parsed.lat, lng: parsed.lng };
                console.log("Restored fallback user location:", userCoordinates);
            }
        }
    } catch (e) {
        console.warn("Could not parse saved location:", e);
    }
}

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

                // Save location state & persist in localStorage
                userCoordinates = { lat, lng };
                isLocationPermissionGranted = true;
                try {
                    localStorage.setItem("yojnasetu_user_location", JSON.stringify({ lat, lng, timestamp: Date.now() }));
                } catch (e) {
                    console.warn("Storage error:", e);
                }

                console.log(`Geolocation granted & saved: ${lat}, ${lng} (accuracy: ${accuracy}m)`);

                if (statusBadge) {
                    statusBadge.className = "geo-status-badge granted";
                    statusBadge.innerHTML = `<i class="fa-solid fa-circle-check"></i> स्थान प्राप्त (${lat.toFixed(3)}°, ${lng.toFixed(3)}°) - सहेजा गया`;
                }

                // Hide both permission prompts
                hideGlobalLocationBanner(500);
                hideLocationPermissionBox(1000);

                // Notify user via green toast
                showToast(`📍 आपका लाइव स्थान प्राप्त हुआ (${lat.toFixed(3)}°, ${lng.toFixed(3)}°) — निकटतम चैनल पार्टनर लोड हो रहे हैं`, "success");

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

                if (isExplicitClick) {
                    showToast("⚠️ ब्राउज़र स्थान अनुमति उपलब्ध नहीं है। डिफ़ॉल्ट कुरुक्षेत्र शहर लोड किया गया।", "info");
                }

                // Use current dropdown value
                handleCitySelectChange();
            },
            {
                enableHighAccuracy: true,
                timeout: 8000,
                maximumAge: 0
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
function renderSidebarSchemes() {
    const container = document.getElementById("quick-schemes-list");
    if (!container) return;

    if (!lastFetchedSchemes || lastFetchedSchemes.length === 0) {
        return;
    }

    const isEn = currentLanguage && currentLanguage.startsWith("en");
    const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS["hi-IN"];

    container.innerHTML = lastFetchedSchemes.map(s => {
        const displayName = (isEn && s.name) ? s.name : (s.name_hi ? `${s.name} (${s.name_hi})` : s.name);
        return `
            <div style="padding: 8px 0; border-bottom: 1px dashed #e2e8f0; text-align: center;">
                <strong style="color: #003366; display: block; text-align: center;">${displayName}</strong>
                <span style="color: #64748b; font-size: 12px; display: block; text-align: center;">${t.maxLoanPrefix || (isEn ? 'Max Loan' : 'अधिकतम ऋण')}: ₹${Number(s.max_loan).toLocaleString("en-IN")} | ${t.interestPrefix || (isEn ? 'Interest' : 'ब्याज')}: ${s.interest_rate}%</span>
            </div>
        `;
    }).join("");
}

async function fetchAvailableSchemes() {
    const container = document.getElementById("quick-schemes-list");
    if (!container) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/schemes`);
        if (!response.ok) throw new Error("Failed to fetch schemes");

        const data = await response.json();
        if (data.success && data.schemes) {
            lastFetchedSchemes = data.schemes;
            renderSidebarSchemes();
        }
    } catch (error) {
        console.error("Schemes load error:", error);
        const isEn = currentLanguage && currentLanguage.startsWith("en");
        container.innerHTML = `<div style="color: #ef4444; text-align: center;">${isEn ? 'Error loading schemes.' : 'योजनाएं लोडिंग में समस्या आई।'}</div>`;
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
        availableVoices = window.speechSynthesis ? (window.speechSynthesis.getVoices() || []) : [];
    }

    const effectiveLang = targetLang || currentLanguage || "hi-IN";
    const prefix = effectiveLang.split("-")[0].toLowerCase();

    // 1. Look for exact language match
    let matchedVoice = availableVoices.find(v => v.lang && v.lang.toLowerCase() === effectiveLang.toLowerCase());

    // 2. Match by language prefix (e.g. "hi", "bn", "ta", "te", "mr", "gu", "pa", "kn", "en")
    if (!matchedVoice) {
        matchedVoice = availableVoices.find(v => v.lang && v.lang.toLowerCase().startsWith(prefix));
    }

    // 3. Match by language name in voice label
    if (!matchedVoice) {
        const langNames = {
            "hi": ["hindi", "हिन्दी", "kalpana", "hemant", "swara", "madhur"],
            "bn": ["bengali", "bangla", "বাংলা", "tanishaa", "bashkar"],
            "ta": ["tamil", "தமிழ்", "valluvar", "iniya"],
            "te": ["telugu", "తెలుగు", "mohan", "shruti"],
            "mr": ["marathi", "मराठी", "aarohi"],
            "gu": ["gujarati", "ગુજરાતી", "dhwani"],
            "pa": ["punjabi", "ਪੰਜਾਬੀ", "gurmukhi"],
            "kn": ["kannada", "ಕನ್ನಡ", "gagan", "sapna"],
            "en": ["india", "indian", "en-in", "ravi", "heera"]
        };
        const keywords = langNames[prefix] || [];
        matchedVoice = availableVoices.find(v => {
            const vName = (v.name || "").toLowerCase();
            return keywords.some(k => vName.includes(k));
        });
    }

    return {
        voice: matchedVoice || null,
        lang: effectiveLang
    };
}

function speakText(text) {
    if (!text || !String(text).trim()) return;

    // Clean emojis, markdown, symbols, and technical formatting for clean spoken audio
    let speechText = String(text)
        .replace(/[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "") // strip emojis
        .replace(/[*#_`~>\[\]]/g, "") // remove markdown syntax
        .replace(/\n+/g, ". ")
        .replace(/\//g, " / ")
        .replace(/\([^)]*\)/g, "")
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
    } catch (e) { }

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }

    const langParam = (currentLanguage || "hi-IN").split("-")[0] || "hi";
    const audioUrl = `${API_BASE_URL}/api/ai/tts?text=${encodeURIComponent(speechText)}&lang=${langParam}&_t=${Date.now()}`;

    console.log(`Streaming authentic ${currentLanguage} TTS audio for message...`);
    setSoundWave(true);
    updateSpeakerBubble("🔊 " + speechText.substring(0, 85) + "...");

    audio.src = audioUrl;
    audio.onplay = () => setSoundWave(true);
    audio.onended = () => {
        setSoundWave(false);
    };
    audio.onerror = (e) => {
        console.warn(`TTS streaming error for ${currentLanguage}, falling back to Web Speech Synthesis:`, e);
        setSoundWave(false);
        // Fallback to browser Web Speech API synthesis
        if ("speechSynthesis" in window) {
            const utterance = new SpeechSynthesisUtterance(speechText);
            const voiceObj = getBestVoice(currentLanguage, speechText);
            if (voiceObj.voice) utterance.voice = voiceObj.voice;
            utterance.lang = voiceObj.lang;
            utterance.onstart = () => setSoundWave(true);
            utterance.onend = () => setSoundWave(false);
            utterance.onerror = () => setSoundWave(false);
            window.speechSynthesis.speak(utterance);
        }
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

    setAppLanguage(currentLanguage, false);
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

    setAppLanguage(currentLanguage, false);
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
            goToAuthStep2(phone, email, data.demo_otp || data.otp_preview || "123456");
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
