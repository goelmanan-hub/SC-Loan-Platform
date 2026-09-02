/* =====================================================
   YOJNASETU - SC LOAN PLATFORM FRONTEND SCRIPT
   Connected to FastAPI Backend with Full Interactivity
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

/* =====================================================
   INITIALIZATION ON DOM CONTENT LOADED
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Connecting YojnaSetu Frontend to FastAPI at:", API_BASE_URL);
    
    initSpeechRecognition();
    setupEventListeners();
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
    if (micMain) micMain.addEventListener("click", toggleVoiceInput);

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
                alert("वर्तमान में आपका कोई सक्रिय आवेदन नहीं है। ऋण आवेदन के लिए AI सहायक से बात करें।");
            } else if (index === 2) {
                scrollToSection("partner-section");
            }
        });
    });

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

        // If conversation is complete, render recommendation
        if (data.complete && data.recommendation) {
            renderRecommendationCard(data.recommendation, data.emi);
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
    msgDiv.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid ${avatarIcon}"></i></div>
        <div class="msg-content">${text}</div>
    `;

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
    return msgId;
}

function updateSpeakerBubble(text) {
    const speechDiv = document.querySelector(".speech div p");
    if (speechDiv) {
        speechDiv.textContent = text;
    }
}

function renderRecommendationCard(rec, emi) {
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
        card.style.display = "block";
        card.scrollIntoView({ behavior: "smooth" });
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
            document.getElementById("res-monthly-emi").textContent = "₹" + res.monthly_emi.toLocaleString("en-IN");
            document.getElementById("res-total-interest").textContent = "₹" + res.total_interest.toLocaleString("en-IN");
            document.getElementById("res-total-payable").textContent = "₹" + res.total_payment.toLocaleString("en-IN");
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
        if (input) input.value = transcript;
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

function speakText(text) {
    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel(); // Stop any previous audio
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = currentLanguage;
        utterance.rate = 0.95;

        utterance.onstart = () => setSoundWave(true);
        utterance.onend = () => setSoundWave(false);
        utterance.onerror = () => setSoundWave(false);

        window.speechSynthesis.speak(utterance);
    }
}

function scrollToSection(id) {
    const elem = document.getElementById(id);
    if (elem) elem.scrollIntoView({ behavior: "smooth" });
}

