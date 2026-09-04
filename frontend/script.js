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
let availableVoices = [];
let stagedOcrFiles = [];

/* =====================================================
   INITIALIZATION ON DOM CONTENT LOADED
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Connecting YojnaSetu Frontend to FastAPI at:", API_BASE_URL);
    
    initSpeechRecognition();
    initSpeechSynthesis();
    setupEventListeners();
    setupOcrDropzoneEvents();
    fetchAvailableSchemes();
    loadDefaultPartners();
    checkBackendHealth();
});

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

    // Language Selector Buttons
    const langButtons = document.querySelectorAll(".languages .lang, .top-actions .language");
    langButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".languages .lang").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");

            const text = btn.textContent.trim().toLowerCase();
            if (text.includes("english")) {
                currentLanguage = "en-IN";
                updateSpeakerBubble("Hello! I am YojnaSetu. How can I assist you with SC loan schemes today?");
            } else if (text.includes("বাংলা") || text.includes("bangla")) {
                currentLanguage = "bn-IN";
                updateSpeakerBubble("নমস্কার! আমি যোজনা সেতু। আমি কীভাবে আপনাকে সাহায্য করতে পারি?");
            } else if (text.includes("தமிழ்") || text.includes("tamil")) {
                currentLanguage = "ta-IN";
                updateSpeakerBubble("வணக்கம்! நான் யோஜனா சேது. நான் உங்களுக்கு எவ்வாறு உதவ முடியும்?");
            } else if (text.includes("తెలుగు") || text.includes("telugu")) {
                currentLanguage = "te-IN";
                updateSpeakerBubble("నమస్కారం! నేను యోజన సేతు. నేను మీకు ఎలా సహాయం చేయగలను?");
            } else {
                currentLanguage = "hi-IN";
                updateSpeakerBubble("नमस्ते! मैं योजनासेतु हूँ। आप मुझसे अपनी भाषा में बात कर सकते हैं। बताइए, मैं आपकी किस प्रकार मदद कर सकता हूँ?");
            }

            if (recognition) {
                recognition.lang = currentLanguage;
            }
        });
    });

    // Login / Registration Button
    const loginButtons = document.querySelectorAll(".login");
    loginButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            const mobile = prompt("कृपया अपना 10 अंकों का मोबाइल नंबर दर्ज करें (Enter your Mobile Number):");
            if (mobile && mobile.trim().length >= 10) {
                alert(`धन्यवाद! OTP सत्यापन कोड ${mobile} पर भेज दिया गया है।`);
            }
        });
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

    // Partner Search Buttons
    const searchPartnersBtn = document.getElementById("search-partners-btn");
    if (searchPartnersBtn) {
        searchPartnersBtn.addEventListener("click", searchPartnersFromSelect);
    }

    const findLocationBtn = document.getElementById("find-location-btn");
    if (findLocationBtn) {
        findLocationBtn.addEventListener("click", findPartnersByGeolocation);
    }
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
        }

        // If conversation is complete, render recommendation and readiness score
        if (data.complete && data.recommendation) {
            let recommendationEmi = data.emi;
            if (!recommendationEmi && data.user_data && data.recommendation.recommended_scheme) {
                recommendationEmi = await calculateRecommendationEmi(
                    data.user_data,
                    data.recommendation.recommended_scheme
                );
            }
            renderRecommendationCard(data.recommendation, recommendationEmi, data.readiness);
            // Continue the user journey to nearby channel partners after presentation
            setTimeout(() => scrollToSection("partner-section"), 1200);
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

    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid ${avatarIcon}"></i></div>
        <div class="msg-content-wrapper">
            <div class="msg-content">${text}</div>
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
        document.getElementById("rec-scheme-name").textContent = scheme.name;
        document.getElementById("rec-scheme-desc").textContent = scheme.description;
        document.getElementById("rec-max-loan").textContent = "₹" + Number(scheme.max_loan).toLocaleString("en-IN");
        document.getElementById("rec-interest").textContent = scheme.interest_rate + "% p.a.";
        document.getElementById("rec-moratorium").textContent = scheme.moratorium_months + " महीने";
        document.getElementById("rec-monthly-emi").textContent = emi
            ? "₹" + Number(emi.monthly_emi).toLocaleString("en-IN", { minimumFractionDigits: 2 })
            : "—";
        document.getElementById("rec-total-payable").textContent = emi
            ? "₹" + Number(emi.total_payment).toLocaleString("en-IN", { minimumFractionDigits: 2 })
            : "—";

        // Render Loan Readiness Score Section
        if (readiness) {
            populateReadinessUI("rec", readiness);
            const readinessBox = document.getElementById("rec-readiness-box");
            if (readinessBox) readinessBox.style.display = "block";
        }

        card.style.display = "block";
        card.scrollIntoView({ behavior: "smooth" });
    }
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
    const loanType = document.getElementById("sim-loan-type")?.value || "business";
    const loanAmount = parseFloat(document.getElementById("sim-loan-amount")?.value) || 100000;
    const income = parseFloat(document.getElementById("sim-income")?.value) || 200000;
    const tenure = parseInt(document.getElementById("sim-tenure")?.value) || 36;
    const purpose = document.getElementById("sim-purpose")?.value || "";
    const location = document.getElementById("sim-location")?.value || "";

    const simResultBox = document.getElementById("sim-result-box");

    try {
        const payload = {
            loan_type: loanType,
            loan_required: loanAmount,
            income: income,
            tenure_months: tenure,
            location: location
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
   CHANNEL PARTNER FINDER API INTEGRATION
===================================================== */
async function searchPartnersFromSelect() {
    const select = document.getElementById("city-select");
    const [lat, lng] = select.value.split(",").map(Number);
    await fetchPartners(lat, lng);
}

function findPartnersByGeolocation() {
    const listContainer = document.getElementById("partners-list");
    listContainer.innerHTML = `<div class="loading-placeholder">📍 आपका स्थान प्राप्त किया जा रहा है...</div>`;

    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                await fetchPartners(lat, lng);
            },
            async (error) => {
                console.warn("Geolocation denied/failed. Falling back to default location (Kurukshetra):", error);
                await fetchPartners(29.9695, 76.8783);
            }
        );
    } else {
        fetchPartners(29.9695, 76.8783);
    }
}

async function loadDefaultPartners() {
    await fetchPartners(29.9695, 76.8783);
}

async function fetchPartners(lat, lng) {
    const listContainer = document.getElementById("partners-list");
    listContainer.innerHTML = `<div class="loading-placeholder">चैनल पार्टनर खोजे जा रहे हैं...</div>`;

    try {
        const response = await fetch(`${API_BASE_URL}/api/find-partners`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                latitude: lat,
                longitude: lng
            })
        });

        if (!response.ok) throw new Error("Partner API request failed");

        const data = await response.json();
        if (data.success && data.partners) {
            renderPartnersList(data.partners);
            renderPartnerMap(lat, lng, data.partners);
        }
    } catch (error) {
        console.error("Partner locator error:", error);
        listContainer.innerHTML = `<div class="loading-placeholder" style="color: #ef4444;">⚠️ चैनल पार्टनर प्राप्त करने में त्रुटि हुई।</div>`;
    }
}

function renderPartnersList(partners) {
    const listContainer = document.getElementById("partners-list");
    if (!partners || partners.length === 0) {
        listContainer.innerHTML = `<div class="loading-placeholder">कोई चैनल पार्टनर उपलब्ध नहीं है।</div>`;
        return;
    }

    listContainer.innerHTML = partners.map(p => `
        <div class="partner-card">
            <span class="partner-type">${p.type}</span>
            <h3>${p.name}</h3>
            <p style="font-size: 13px; color: #475569;"><i class="fa-solid fa-location-dot"></i> ${p.city}</p>
            <div class="partner-distance">📍 ${p.distance_km} km दूरी पर</div>
        </div>
    `).join("");
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
   PARTNER MAP (Leaflet + browser location permission)
===================================================== */
function renderPartnerMap(latitude, longitude, partners) {
    const mapElement = document.getElementById("partner-map");
    if (!mapElement || !window.L) return;

    if (!partnerMap) {
        partnerMap = L.map(mapElement).setView([latitude, longitude], 11);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(partnerMap);
        partnerMarkers = L.layerGroup().addTo(partnerMap);
    } else {
        partnerMap.setView([latitude, longitude], 11);
        partnerMarkers.clearLayers();
    }

    const userMarker = L.circleMarker([latitude, longitude], {
        radius: 9,
        color: "#ffffff",
        weight: 3,
        fillColor: "#0072bc",
        fillOpacity: 1
    }).bindPopup("<strong>आपका स्थान</strong>");
    partnerMarkers.addLayer(userMarker);

    const mapBounds = [[latitude, longitude]];
    partners.forEach((partner) => {
        if (typeof partner.latitude !== "number" || typeof partner.longitude !== "number") return;
        const marker = L.marker([partner.latitude, partner.longitude]).bindPopup(
            `<strong>${escapeHtml(partner.name)}</strong><br>${escapeHtml(partner.city)}<br>${partner.distance_km} km दूर`
        );
        partnerMarkers.addLayer(marker);
        mapBounds.push([partner.latitude, partner.longitude]);
    });

    if (mapBounds.length > 1) {
        partnerMap.fitBounds(mapBounds, { padding: [35, 35], maxZoom: 13 });
    }
    setTimeout(() => partnerMap.invalidateSize(), 0);
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
                <div style="padding: 8px 0; border-bottom: 1px dashed #e2e8f0;">
                    <strong style="color: #003366; display: block;">${s.name}</strong>
                    <span style="color: #64748b; font-size: 12px;">अधिकतम ऋण: ₹${Number(s.max_loan).toLocaleString("en-IN")} | ब्याज: ${s.interest_rate}%</span>
                </div>
            `).join("");
        }
    } catch (error) {
        console.error("Schemes load error:", error);
        container.innerHTML = `<div style="color: #ef4444;">योजनाएं लोडिंग में समस्या आई।</div>`;
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
