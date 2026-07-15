import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { analyzeIntent } from '../services/nlp';
import { Send, Clock, Zap, CheckCircle, ChevronDown, ChevronUp, ChevronRight, DollarSign, Bot, AlertCircle, Compass, HelpCircle, Ship, Truck } from 'lucide-react';
import { extractIntentWithLLM } from '../services/llmIntent';

// Premium Typing Indicator Component
const TypingBubble = () => (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none shadow-sm p-4 flex items-center gap-1.5 w-fit">
            <div className="w-2.5 h-2.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
        </div>
    </div>
);

// ==========================================
// FX LOGIC (Refactored)
// ==========================================

const CURRENCY_MAP = {
    // MAJOR
    'usd': 'USD', 'dollar': 'USD',
    'idr': 'IDR', 'rupiah': 'IDR', 'rp': 'IDR',
    'jpy': 'JPY', 'yen': 'JPY',
    // ASEAN
    'sgd': 'SGD', 'sing dollar': 'SGD',
    'myr': 'MYR', 'ringgit': 'MYR', 'rm': 'MYR',
    'thb': 'THB', 'baht': 'THB',
    'vnd': 'VND', 'dong': 'VND',
    'php': 'PHP', 'peso': 'PHP',
    'bnd': 'BND', 'brunei dollar': 'BND',
    'khr': 'KHR', 'riel': 'KHR',
    'lak': 'LAK', 'kip': 'LAK',
    'mmk': 'MMK', 'kyat': 'MMK'
};

const detectFxQuery = (text) => {
    if (!text) return null;
    const lower = text.toLowerCase().trim();

    // Generate dynamic patterns from map keys
    const keys = Object.keys(CURRENCY_MAP).sort((a, b) => b.length - a.length); // Longest first
    const currencyPattern = keys.join('|');

    // Regex Explanation:
    // 1. Amount: ([\d,.]+)
    // 2. Multiplier (optional): (juta|jt|ribu|rb|k|m|b|t)?
    // 3. From Currency: ({currencyPattern})
    // 4. Separator (optional): \s*(?:ke|to|in|=|->)?\s*
    // 5. To Currency: ({currencyPattern})
    const regex = new RegExp(
        `([\\d,.]+)\\s*(juta|jt|ribu|rb|k|m|b|t)?\\s*(${currencyPattern})\\s*(?:ke|to|in|=|->)?\\s*(${currencyPattern})`,
        'i'
    );

    // Rate Check Regex (Simple "kurs yen", "rate ringgit")
    const rateRegex = new RegExp(`(kurs|rate|harga)\\s+(${currencyPattern})`, 'i');

    // 1. Check for Conversion Pattern
    const match = lower.match(regex);
    if (match) {
        let rawAmount = parseFloat(match[1].replace(/,/g, '.'));
        const multiplier = match[2];
        const fromKey = match[3];
        const toKey = match[4];

        // Handle multipliers
        if (multiplier) {
            if (['juta', 'jt', 'm'].includes(multiplier)) rawAmount *= 1000000;
            else if (['ribu', 'rb', 'k'].includes(multiplier)) rawAmount *= 1000;
            else if (['b'].includes(multiplier)) rawAmount *= 1000000000;
        }

        return {
            amount: rawAmount,
            from: CURRENCY_MAP[fromKey],
            to: CURRENCY_MAP[toKey]
        };
    }

    // 2. Check for Basic Rate Pattern (Default to IDR if native, or USD if IDR)
    const rateMatch = lower.match(rateRegex);
    if (rateMatch) {
        const fromKey = rateMatch[2];
        const fromCode = CURRENCY_MAP[fromKey];
        const toCode = fromCode === 'IDR' ? 'USD' : 'IDR';
        return { from: fromCode, to: toCode, amount: 1 };
    }

    return null;
};

const fetchFxRate = async (from, to, amount) => {
    // CurrencyAPI.com Configuration
    const API_KEY = 'cur_live_Dc5M2mTFu2hj5R3Eun7nTo2EXmAvAEFwmiAXKVHp';
    const url = `https://api.currencyapi.com/v3/latest?apikey=${API_KEY}&base_currency=${from}&currencies=${to}`;

    try {
        const res = await fetch(url);
        const response = await res.json();

        // Response structure: { data: { [TO]: { value: 1.23, code: "TO" } } }
        if (response.data && response.data[to]) {
            const rate = response.data[to].value;
            return {
                rate: rate,
                converted: amount * rate, // Calculate total value
                timestamp: response.meta?.last_updated_at || new Date().toISOString()
            };
        } else {
            console.error("CurrencyAPI Error:", response);
            return null;
        }
    } catch (err) {
        console.error("FX Fetch Error:", err);
        return null;
    }
};

const ChatAgent = () => {
    // =========================
    // STATE
    // =========================
    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: 'bot',
            text: "Halo! Saya Sentara AI 🤖\n\nSaya bisa membantu hitung rute pengiriman atau cek stok barang.\n\n💡 Tips Cepat:\n• Ketik 'Lihat Produk' untuk cek katalog\n• Ketik 'Reset' jika ingin ganti topik\n• Ketik 'Bantuan' jika bingung"
        },
        {
            id: 2,
            sender: 'bot',
            type: 'suggestions',
            // UPDATE: Wrap data in a horizontally scrollable container in render
            text: 'Mulai dengan salah satu opsi berikut:',
            data: ['Lihat Daftar Produk', 'Cek Tarif ke Jakarta', 'Reset Chat']
        }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);

    // Clarification State
    const [clarificationData, setClarificationData] = useState(null);

    // Context Accumulation State
    const [accumulatedIntent, setAccumulatedIntent] = useState({
        product_name_raw: null,
        quantity_raw: null,
        destination_city: null,
        destination_country: null,
        packing_type: null // NEW: Packing type for V13
    });

    // Product Lock State (prevents re-selection loop)
    const [confirmedSku, setConfirmedSku] = useState(null);

    // Port Lock State (prevents re-selection loop)
    const [confirmedPort, setConfirmedPort] = useState(null);

    // Packing Lock State (prevents re-selection loop)
    const [confirmedPacking, setConfirmedPacking] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null); // For input field focus management

    // Master Data
    const [ports, setPorts] = useState([]);
    const [skus, setSkus] = useState([]);
    const [packings, setPackings] = useState([]); // NEW: Packing master data

    // UI Helpers
    const [expandedCard, setExpandedCard] = useState(null);

    // Safari compatibility
    const [isSafari, setIsSafari] = useState(false);

    useEffect(() => {
        // Detect Safari
        const ua = navigator.userAgent;
        const safari = /^((?!chrome|android).)*safari/i.test(ua);
        setIsSafari(safari);

        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading, expandedCard, clarificationData]);

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [portsRes, skusRes, packingsRes] = await Promise.all([
                    api.get('/api/v1/master/ports'),
                    api.get('/api/v1/master/skus'),
                    api.get('/api/v1/admin/packings') // NEW: Fetch packings
                ]);
                setPorts(portsRes.data.data || []);
                setSkus(skusRes.data.data || []);
                setPackings(packingsRes.data.data?.data || []); // Handle nested data structure
            } catch (err) {
                addBotMessage("⚠️ Gagal memuat data master. Refresh halaman.");
            }
        };
        fetchMasterData();
    }, []);

    const addBotMessage = (text, type = 'text', data = null) => {
        setMessages(prev => [
            ...prev,
            { id: Date.now() + Math.random(), sender: 'bot', text, type, data }
        ]);
    };

    const addUserMessage = (text) => {
        setMessages(prev => [
            ...prev,
            { id: Date.now() + Math.random(), sender: 'user', text }
        ]);
    };

    // =========================
    // LOGIC: RESOLUTION V1.2
    // =========================

    const findSkuCandidates = (rawName) => {
        if (!rawName) return [];
        const lowerRaw = rawName.toLowerCase().trim();

        const keywords = lowerRaw.split(/\s+/).filter(word => word.length > 0);

        const broadTerms = [
            'pupuk', 'organik', 'cair', 'super', 'produk', 'barang',
            'fertilizer', 'organic', 'liquid', 'product', 'item', 'goods',
            'meal', 'insect', 'powder', 'sentro', 'diptia', 'wira'
        ];

        const hasBroadTerm = keywords.some(keyword =>
            broadTerms.some(term => keyword.includes(term) || term.includes(keyword))
        );

        const candidates = skus.filter(s => {
            const skuName = s.name.toLowerCase();
            const skuCode = s.sku_code.toLowerCase();

            if (hasBroadTerm) {
                return keywords.some(keyword =>
                    skuName.includes(keyword) || skuCode.includes(keyword)
                );
            }

            return keywords.every(keyword =>
                skuName.includes(keyword) || skuCode.includes(keyword)
            );
        });

        return candidates;
    };

    const resolvePortByDestination = (destinationText) => {
        if (!destinationText) return null;

        const input = destinationText.toLowerCase().trim();

        // Layer 1: Exact City Match
        let match = ports.find(
            p => p.city && p.city.toLowerCase() === input
        );

        if (match) return match;

        // Layer 2: Country Match → Default Port
        match = ports.find(
            p => p.country_name && p.country_name.toLowerCase() === input
        );

        if (match) return match;

        // Layer 3: Fuzzy Match
        return ports.find(
            p =>
                (p.city && p.city.toLowerCase().includes(input)) ||
                (p.country_name && p.country_name.toLowerCase().includes(input))
        );
    };

    // Helper: Find all ports in a specific country
    const findPortsByCountry = (countryName) => {
        if (!countryName) return [];
        return ports.filter(p =>
            p.country_name && p.country_name.toLowerCase() === countryName.toLowerCase()
        );
    };

    // =========================
    // HANDLERS
    // =========================

    // Reusable message processing logic
    const processUserMessage = async (userText) => {
        console.log('[DEBUG] userText:', userText);
        addUserMessage(userText);
        setLoading(true);
        setClarificationData(null);

        try {
            const lower = userText.toLowerCase();

            // ===========================================
            // LOCAL COMMAND INTERCEPTOR (No LLM needed)
            // ===========================================

            // --- 1. INTERCEPTOR: PRODUK ---
            if (
                (lower.includes('lihat') || lower.includes('daftar') || lower.includes('cek') || lower.includes('apa saja')) &&
                (lower.includes('produk') || lower.includes('barang') || lower.includes('item') || lower.includes('sku'))
            ) {
                setTimeout(() => {
                    if (skus.length > 0) {
                        addBotMessage(`Berikut ${skus.length} produk yang tersedia:`, 'product_list', skus);
                    } else {
                        addBotMessage("⚠️ Data produk sedang tidak tersedia.");
                    }
                    setLoading(false);
                }, 500);
                return;
            }

            // --- 2. INTERCEPTOR: TUJUAN / DESTINASI ---
            if (
                (lower.includes('lihat') || lower.includes('daftar') || lower.includes('cek')) &&
                (lower.includes('tujuan') || lower.includes('kota') || lower.includes('negara') || lower.includes('port') || lower.includes('destinasi'))
            ) {
                setTimeout(() => {
                    const topPorts = ports.slice(0, 10).map(p => `${p.city} (${p.country_name})`).join(', ');
                    addBotMessage(
                        `Kami melayani pengiriman ke banyak tujuan internasional, diantaranya:\n\n${topPorts}\n\n...dan banyak lagi. Langsung ketik nama kota tujuan Anda!`
                    );
                    setLoading(false);
                }, 500);
                return;
            }

            // --- 3. INTERCEPTOR: RESET / BATAL ---
            if (['reset', 'batal', 'ulang', 'ganti', 'clear', 'hapus'].some(word => lower.includes(word))) {
                setTimeout(() => {
                    setAccumulatedIntent({
                        product_name_raw: null,
                        quantity_raw: null,
                        destination_city: null,
                        destination_country: null,
                        packing_type: null
                    });
                    setConfirmedSku(null);
                    setConfirmedPort(null);
                    setConfirmedPacking(null); // Reset packing
                    setClarificationData(null);
                    addBotMessage("🔄 Konteks telah di-reset. Silakan mulai simulasi baru.");
                    setLoading(false);
                }, 400);
                return;
            }

            // --- 4. INTERCEPTOR: BANTUAN ---
            if (['help', 'bantuan', 'menu', 'tolong'].some(word => lower.includes(word))) {
                setTimeout(() => {
                    addBotMessage(
                        "Saya bisa membantu Anda:\n1. Cek harga & rute pengiriman\n2. Lihat daftar produk\n3. Cek ketersediaan tujuan",
                        'suggestions',
                        ['Lihat Daftar Produk', 'Lihat Daftar Tujuan', 'Reset Chat']
                    );
                    setLoading(false);
                }, 400);
                return;
            }

            // ===========================================
            // REALTIME FX INTERCEPTOR (High Priority)
            // ===========================================
            const fxQuery = detectFxQuery(userText);
            if (fxQuery) {
                try {
                    const data = await fetchFxRate(fxQuery.from, fxQuery.to, fxQuery.amount);
                    if (data) {
                        const fxPayload = {
                            base_currency: fxQuery.from,
                            target_currency: fxQuery.to,
                            rate: data.rate,
                            amount: fxQuery.amount,
                            converted: data.converted,
                            isRealtime: true // Flag for UI badge
                        };
                        addBotMessage("", "fx_card", fxPayload);
                        setLoading(false);
                        return; // STOP Here
                    } else {
                        // Fallback to LLM if API fails
                        console.warn("FX API failed, falling back to LLM...");
                    }
                } catch (err) {
                    console.error("FX Interceptor Error", err);
                    // Fallback to LLM
                }
            }

            // ===========================================
            // END INTERCEPTOR - Continue to LLM
            // ===========================================

            let newIntent;

            try {
                newIntent = await extractIntentWithLLM(userText, ports);
                console.log('[LLM Intent Extracted]', newIntent);

                // Check for conversational response first (Chitchat/Greeting)
                const hasLogisticsData = newIntent.product_name_raw || newIntent.quantity_raw || newIntent.destination_city || newIntent.destination_country;

                if (newIntent.conversational_response && !hasLogisticsData) {
                    addBotMessage(
                        newIntent.conversational_response,
                        'suggestions',
                        newIntent.suggested_prompts || []
                    );
                    setLoading(false);
                    return;
                }

            } catch (llmErr) {
                console.error('[LLM Intent Error]', llmErr);
                console.log('[Fallback] Trying rule-based parser...');
                newIntent = analyzeIntent(userText);
            }

            // ===========================================
            // FX INTENT HANDLER (High Priority)
            // ===========================================
            // ===========================================
            // FX INTENT HANDLER (High Priority - Post LLM)
            // ===========================================
            if (newIntent.fx_intent) {
                const { fx_base_currency, fx_target_currency, fx_amount, fx_estimated_rate } = newIntent;
                let rate = fx_estimated_rate || 15500; // Default fallback
                let isRealtime = false;

                // 1. Try to upgrade to Realtime Rate
                try {
                    const base = fx_base_currency || 'USD';
                    const target = fx_target_currency || 'IDR';
                    const realtimeData = await fetchFxRate(base, target, fx_amount);

                    if (realtimeData) {
                        rate = realtimeData.rate;
                        isRealtime = true;
                    }
                } catch (err) {
                    console.error("Failed to upgrade FX to realtime:", err);
                }

                // 2. Construct Payload
                const fxPayload = {
                    base_currency: fx_base_currency || 'USD',
                    target_currency: fx_target_currency || 'IDR',
                    rate: rate,
                    amount: fx_amount,
                    converted: fx_amount ? (fx_amount * rate) : null,
                    isRealtime: isRealtime
                };

                addBotMessage("", "fx_card", fxPayload);
                setLoading(false);
                return; // STOP Here
            }


            const mergedIntent = {
                product_name_raw: newIntent.product_name_raw || accumulatedIntent.product_name_raw,
                quantity_raw: newIntent.quantity_raw || accumulatedIntent.quantity_raw,
                destination_city: newIntent.destination_city || accumulatedIntent.destination_city,
                destination_country: newIntent.destination_country || accumulatedIntent.destination_country,
                packing_type: newIntent.packing_type || accumulatedIntent.packing_type
            };

            console.log('[Merged Intent]', mergedIntent);
            setAccumulatedIntent(mergedIntent);

            const intent = mergedIntent;

            // ============================================================
            // PHASE 1: PRODUCT VALIDATION (HIGHEST PRIORITY)
            // ============================================================
            let targetSku = confirmedSku;

            if (!targetSku) {
                // 1.A: User hasn't mentioned a product yet
                if (!intent.product_name_raw) {
                    addBotMessage("Produk apa yang ingin Anda kirim? Silakan pilih dari daftar:", 'product_list', skus);
                    setLoading(false);
                    return; // STOP
                }

                // 1.B: User mentioned something, let's search
                const candidates = findSkuCandidates(intent.product_name_raw);

                if (candidates.length === 0) {
                    // No match found
                    addBotMessage(`⚠️ Produk "${intent.product_name_raw}" tidak ditemukan. Silakan pilih yang tersedia:`, 'product_list', skus);
                    setLoading(false);
                    return; // STOP
                }

                if (candidates.length > 1) {
                    // Ambiguous match (e.g. "Pupuk" matches 3 items)
                    addBotMessage(
                        `Saya menemukan ${candidates.length} produk untuk kata kunci "${intent.product_name_raw}". Mohon pilih yang spesifik:`,
                        'product_list', // Show as clickable cards
                        candidates // Pass the filtered candidates
                    );
                    setLoading(false);
                    return; // STOP
                }

                // 1.C: Exact Match Found (1 candidate)
                targetSku = candidates[0];
            }

            // ============================================================
            // PHASE 1.5: PACKING TYPE SELECTION (NEW - Dynamic from DB)
            // ============================================================
            if (targetSku && !confirmedPacking) {
                setConfirmedSku(targetSku); // Lock the SKU now

                // Check if packing options available for this SKU
                const availablePackings = packings.filter(p => p.sku_id === targetSku.id);

                if (availablePackings.length > 0) {
                    // Show packing options with quantity hints
                    const packingOptions = [
                        'Satuan (Unit)',
                        ...availablePackings.map(p =>
                            `${p.packing_type} (${p.quantity_per_packing} Pcs)`
                        )
                    ];

                    addBotMessage(
                        `✅ Produk: ${targetSku.name}\n\nProduk ini memiliki opsi kemasan. Pilih jenis kemasan:`,
                        'packing_selection',
                        packingOptions
                    );
                } else {
                    // No packing options, auto-set to NONE and proceed to destination
                    setConfirmedPacking('NONE');
                    setAccumulatedIntent(prev => ({ ...prev, packing_type: null }));
                    addBotMessage(`✅ Produk: ${targetSku.name}\n\nMau dikirim ke mana? (Sebutkan Kota atau Negara)`);
                }

                setLoading(false);
                return; // STOP - Wait for packing selection or proceed to destination
            }

            // ============================================================
            // PHASE 2: DESTINATION / PORT VALIDATION
            // ============================================================
            let targetPort = confirmedPort;

            if (!targetPort) {
                // Logic: Use LLM's inferred Country or City
                const locationQuery = intent.destination_country || intent.destination_city;

                if (!locationQuery) {
                    // Case 2.1: No destination mentioned yet
                    addBotMessage(`✅ Produk "${targetSku.name}" terpilih.\n\nMau dikirim ke mana? (Sebutkan Kota atau Negara)`);
                    setLoading(false);
                    return; // STOP
                }

                // Case 2.2: We have a location string, let's find ports
                const countryPorts = findPortsByCountry(locationQuery);

                // Fallback: If findByCountry empty, check if input is a City name in our ports list
                const finalPorts = countryPorts.length > 0
                    ? countryPorts
                    : ports.filter(p => p.city?.toLowerCase().includes(locationQuery.toLowerCase()));

                if (finalPorts.length > 0) {
                    // Found ports! Ask user to select ONE.
                    addBotMessage(
                        `Tujuan terdeteksi: ${locationQuery}. Silakan pilih pelabuhan tujuan:`,
                        'port_selection',
                        finalPorts
                    );
                    setLoading(false);
                    return; // STOP
                } else {
                    // No ports found in that location
                    addBotMessage(`⚠️ Maaf, kami belum memiliki jalur pengiriman ke "${locationQuery}". Silakan coba negara/kota lain.`);
                    setLoading(false);
                    return; // STOP
                }
            }

            // ============================================================
            // PHASE 3: QUANTITY VALIDATION
            // ============================================================
            if (!intent.quantity_raw || intent.quantity_raw <= 0) {
                addBotMessage(
                    `✅ Produk: ${targetSku.name}\n` +
                    `✅ Tujuan: ${targetPort.name} (${targetPort.city})\n\n` +
                    `Berapa jumlah (quantity) yang ingin dikirim?`
                );
                setLoading(false);
                return; // STOP
            }

            // ============================================================
            // PHASE 4: EXECUTION (ALL SYSTEMS GO)
            // ============================================================
            // Auto-lock the resolved items if not already locked
            if (!confirmedSku) setConfirmedSku(targetSku);
            if (!confirmedPort) setConfirmedPort(targetPort);

            executeSimulation(targetSku, targetPort, intent);

        } catch (err) {
            console.error(err);
            addBotMessage("Terjadi kesalahan sistem.");
            setLoading(false);
        }
    };

    const handleSend = async (e) => {
        e.preventDefault();
        if (typeof input !== 'string' || !input.trim()) {
            return;
        }
        const userText = input;
        setInput('');
        await processUserMessage(userText);
    };

    // Handle port selection from port list
    const handleManualPortSelect = (port) => {
        setConfirmedPort(port);
        addUserMessage(`Saya pilih port: ${port.name}`);
        setLoading(true);

        // Update intent with port info
        const updatedIntent = {
            ...accumulatedIntent,
            destination_city: port.city,
            destination_country: port.country_name
        };
        setAccumulatedIntent(updatedIntent);

        setTimeout(() => {
            // Check Quantity
            if (!updatedIntent.quantity_raw || updatedIntent.quantity_raw <= 0) {
                addBotMessage(`✅ Tujuan: ${port.name}.\nBerapa jumlah yang ingin dikirim?`);
                setLoading(false);
            } else {
                // Check Product (Should be set by now, but just in case)
                if (confirmedSku) {
                    executeSimulation(confirmedSku, port, updatedIntent);
                } else {
                    // Rare edge case: Port selected before Product
                    addBotMessage(`✅ Tujuan terpilih. Produk apa yang akan dikirim?`, 'product_list', skus);
                    setLoading(false);
                }
            }
        }, 600);
    };

    // Helper: Parse packing value from label (NEW)
    const parsePackingValue = (packingLabel) => {
        console.log('[parsePackingValue] Input label:', packingLabel);
        if (packingLabel === 'Satuan (Unit)') {
            console.log('[parsePackingValue] Detected Unit, returning NONE');
            return 'NONE'; // Sentinel value for "No Packing"
        }

        // Extract packing type from label "BIG_BOX (50 Pcs)" => "BIG_BOX"
        // Pattern matches uppercase letters, underscores, and numbers at the start
        const match = packingLabel.match(/^([A-Z_0-9]+)/);
        const result = match ? match[1] : 'NONE';
        console.log('[parsePackingValue] Parsed result:', result);
        return result;
    };

    // Handle packing type selection (Updated for dynamic data)
    const handlePackingSelect = (packingLabel) => {
        console.log('[handlePackingSelect] User selected packing label:', packingLabel);

        // Parse label to get packing value
        const packingValue = parsePackingValue(packingLabel);
        console.log('[handlePackingSelect] Parsed packing value:', packingValue);

        setConfirmedPacking(packingValue); // value is 'NONE' or actual type e.g., 'PALLET'

        // Update intent: if 'NONE', we store null for API. If 'PALLET', we store 'PALLET'.
        const apiPackingType = packingValue === 'NONE' ? null : packingValue;
        console.log('[handlePackingSelect] API packing type (for payload):', apiPackingType);

        addUserMessage(`Packing: ${packingLabel}`);
        setLoading(true);

        setTimeout(() => {
            // Update intent with packing type
            setAccumulatedIntent(prev => ({ ...prev, packing_type: apiPackingType }));

            // Check if destination already set
            if (confirmedPort) {
                // Check quantity
                if (!accumulatedIntent.quantity_raw) {
                    addBotMessage(`Berapa jumlah yang ingin dikirim?`);
                    setLoading(false);
                } else {
                    executeSimulation(confirmedSku, confirmedPort, { ...accumulatedIntent, packing_type: apiPackingType });
                }
            } else {
                // Ask for destination
                addBotMessage(`Mau dikirim ke mana? (Sebutkan Kota atau Negara)`);
                setLoading(false);
            }
        }, 600);
    };

    // Handle one-click product selection from product list
    const handleManualProductSelect = (sku) => {
        // 1. Update State
        setConfirmedSku(sku);
        setAccumulatedIntent(prev => ({ ...prev, product_name_raw: sku.name }));

        // 2. Feedback
        addUserMessage(`Saya pilih: ${sku.name}`);
        setLoading(true);

        // 3. Check packing options for this SKU (Dynamic)
        setTimeout(() => {
            const availablePackings = packings.filter(p => p.sku_id === sku.id);

            if (availablePackings.length > 0) {
                // Show packing options
                const packingOptions = [
                    'Satuan (Unit)',
                    ...availablePackings.map(p =>
                        `${p.packing_type} (${p.quantity_per_packing} Pcs)`
                    )
                ];

                addBotMessage(
                    `✅ Produk: ${sku.name}\n\nProduk ini memiliki opsi kemasan. Pilih jenis kemasan:`,
                    'packing_selection',
                    packingOptions
                );
            } else {
                // No packing options, auto-select NONE and proceed
                setConfirmedPacking('NONE');
                setAccumulatedIntent(prev => ({ ...prev, packing_type: null }));
                addBotMessage(`✅ Produk: ${sku.name}\n\nMau dikirim ke mana?`);
            }
            setLoading(false);
        }, 600);
    };

    const handleClarificationSelect = (sku) => {
        if (!clarificationData || !clarificationData.context) {
            console.error('[ChatAgent] Clarification data or context is null');
            setLoading(false);
            return;
        }

        setLoading(true);
        addUserMessage(`Pilih: ${sku.name}`);

        const productList = clarificationData.candidates
            .map(s => `• ${s.name} (SKU: ${s.sku_code})`)
            .join('\n');

        addBotMessage(
            `Produk yang tersedia:\n${productList}\n\n` +
            `✅ Anda memilih: ${sku.name}`
        );

        setClarificationData(null);

        // Check if port is confirmed
        if (!confirmedPort) {
            addBotMessage(`Port belum dipilih. Silakan pilih port tujuan terlebih dahulu.`);
            setLoading(false);
            return;
        }

        executeSimulation(
            sku,
            confirmedPort,
            clarificationData.context
        );
    };

    const executeSimulation = async (sku, port, intent) => {
        try {
            // Determine display text: "Sukabumi (via Port Tanjung Priok)"
            const destDisplay = intent.destination_city || port.city;
            const portDisplay = port.name;

            // Determine quantity display unit
            const qtyUnit = intent.packing_type || 'unit';

            addBotMessage(
                `Konfirmasi:\n` +
                `Produk: ${sku.name}\n` +
                `Kuantitas: ${intent.quantity_raw} ${qtyUnit}\n` +
                `Tujuan: ${destDisplay} (via Port ${portDisplay})\n` +
                `Mode: Smart Auto\n\n` +
                `Permintaan anda sedang di proses...`
            );

            // V13 Payload: Clean and minimal (backend calculates volume)
            const payload = {
                destination_port_id: parseInt(port.id, 10),
                transport_mode: null,
                items: [
                    {
                        sku_id: parseInt(sku.id, 10),
                        quantity: parseInt(intent.quantity_raw, 10),
                        ...(intent.packing_type && { packing_type: intent.packing_type })
                    }
                ]
            };

            console.log('[executeSimulation] 🚀 Sending payload to backend:', JSON.stringify(payload, null, 2));
            console.log('[executeSimulation] Intent packing_type:', intent.packing_type);

            const response = await api.post('/api/v1/route/plan', payload);

            if (response.data?.data?.results?.length) {
                console.log('[ChatAgent] Backend Results:', response.data.data.results);

                // Send results directly to UI
                addBotMessage(
                    'Hasil dari Route Engine:',
                    'results',
                    response.data.data.results
                );
            } else {
                addBotMessage("Tidak ada rute tersedia untuk parameter ini.");
            }

            setAccumulatedIntent({
                product_name_raw: null,
                quantity_raw: null,
                destination_city: null,
                destination_country: null,
                packing_type: null
            });

            // Clear all locks to allow fresh selection next time
            setConfirmedSku(null);
            setConfirmedPort(null);
            setConfirmedPacking(null);

        } catch (err) {
            console.error('[ChatAgent Pure Interpreter] Error:', err);
            const errorMsg = err.response?.data?.message || err.message || "Terjadi kesalahan sistem.";
            addBotMessage(`❌ ${errorMsg}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedCard(expandedCard === id ? null : id);
    };

    // =========================
    // RENDER
    // =========================
    return (
        <div className="flex flex-col h-full max-w-5xl mx-auto bg-gray-50 rounded-xl shadow-lg border overflow-hidden safari-container"
            style={{
                height: isSafari ? '-webkit-fill-available' : '100%',
                WebkitOverflowScrolling: 'touch',
                minHeight: isSafari ? '-webkit-fill-available' : 'auto'
            }}>

            {/* Header dengan gradient fallback - RESPONSIVE */}
            <div className="bg-gradient-to-r from-indigo-600 to-indigo-500 p-3 sm:p-4 border-b shadow-sm safari-gradient"
                style={{
                    background: isSafari
                        ? '-webkit-linear-gradient(left, #4f46e5, #4338ca)'
                        : 'linear-gradient(to right, #4f46e5, #4338ca)'
                }}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3">
                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        <div className="bg-white/20 backdrop-blur-sm p-2 sm:p-2.5 rounded-xl text-white flex-shrink-0"
                            style={isSafari ? { backdropFilter: 'none', backgroundColor: 'rgba(255,255,255,0.2)' } : {}}>
                            <Compass className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h1 className="font-bold text-white text-base sm:text-lg truncate">AI Logistics Assistant</h1>
                            <div className="hidden sm:flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-indigo-100 bg-white/20 px-2 py-0.5 rounded-full">Smart Routing</span>
                                <span className="text-xs text-indigo-100">•</span>
                                <span className="text-xs text-indigo-100">Context Memory</span>
                            </div>
                        </div>
                    </div>

                    {/* Context Indicator - RESPONSIVE */}
                    {(accumulatedIntent.product_name_raw || accumulatedIntent.quantity_raw || accumulatedIntent.destination_city || accumulatedIntent.destination_country || accumulatedIntent.packing_type) && (
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs text-white flex items-center gap-1.5 sm:gap-2 flex-1 sm:flex-initial"
                                style={isSafari ? { backdropFilter: 'none', backgroundColor: 'rgba(255,255,255,0.2)' } : {}}>
                                <div className="flex items-center gap-1">
                                    {accumulatedIntent.product_name_raw && <span>📦</span>}
                                    {accumulatedIntent.packing_type && <span>📊</span>}
                                    {accumulatedIntent.quantity_raw && <span>🔢</span>}
                                    {(accumulatedIntent.destination_city || accumulatedIntent.destination_country) && <span>📍</span>}
                                </div>
                                <span className="font-medium hidden sm:inline">Context Active</span>
                                <span className="font-medium sm:hidden">Active</span>
                            </div>
                            <button
                                onClick={() => {
                                    setAccumulatedIntent({
                                        product_name_raw: null,
                                        quantity_raw: null,
                                        destination_city: null,
                                        destination_country: null,
                                        packing_type: null
                                    });
                                    setConfirmedSku(null);
                                    setConfirmedPort(null);
                                    setConfirmedPacking(null);
                                }}
                                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm p-1.5 sm:p-2 rounded-lg text-white transition-all flex-shrink-0"
                                style={isSafari ? { backdropFilter: 'none', backgroundColor: 'rgba(255,255,255,0.2)' } : {}}
                                title="Reset Context"
                            >
                                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area - RESPONSIVE */}
            <div className="flex-1 overflow-y-auto p-2 sm:p-3 md:p-4 space-y-3 md:space-y-4 bg-gray-50 safari-scroll-area"
                style={{ WebkitOverflowScrolling: 'touch' }}>
                {messages.map(msg => (
                    <div
                        key={msg.id}
                        className={`flex animate-in fade-in slide-in-from-bottom-2 duration-300 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`max-w-[95%] sm:max-w-[90%] md:max-w-[75%] p-3 md:p-4 transition-all shadow-md hover:shadow-lg ${msg.sender === 'user'
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-tl-2xl rounded-tr-2xl rounded-bl-2xl rounded-br-none'
                                : 'bg-white border border-gray-200 rounded-tl-2xl rounded-tr-2xl rounded-br-2xl rounded-bl-none text-gray-800'
                                }`}
                            style={{
                                WebkitMaskImage: isSafari ? '-webkit-radial-gradient(white, black)' : 'none'
                            }}
                        >
                            {msg.sender === 'bot' && (
                                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
                                    <Bot className="w-4 h-4 text-indigo-500" />
                                    <span className="text-xs font-medium text-gray-500">Sentara AI</span>
                                </div>
                            )}
                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>

                            {/* RESULTS - FX FINANCIAL CARD - RESPONSIVE */}
                            {msg.type === 'fx_card' && (
                                <div className="mt-3 bg-white border border-blue-100 rounded-xl shadow-sm overflow-hidden w-full max-w-md font-sans">
                                    {/* Header */}
                                    <div className="bg-blue-50/50 p-2.5 sm:p-3 border-b border-blue-100 flex justify-between items-center">
                                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                            <div className="bg-blue-600 p-1.5 rounded-full text-white flex-shrink-0">
                                                <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                            </div>
                                            <h4 className="text-xs sm:text-sm font-bold text-blue-900 leading-none truncate">Currency Insight</h4>
                                        </div>
                                        <span className={`text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1 flex-shrink-0 ${msg.data.isRealtime ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {msg.data.isRealtime ? <Zap className="w-3 h-3 fill-current" /> : null}
                                            {msg.data.isRealtime ? 'LIVE' : 'ESTIMATED'}
                                        </span>
                                    </div>

                                    {/* Body */}
                                    <div className="p-3 sm:p-4">
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Exchange Rate</p>
                                        <div className="flex items-baseline gap-2 mb-4">
                                            <span className="text-lg sm:text-2xl font-black text-blue-700 tracking-tight break-words">
                                                1 {msg.data.base_currency} ≈ {msg.data.rate?.toLocaleString('id-ID')} {msg.data.target_currency}
                                            </span>
                                        </div>

                                        {/* Conversion Box */}
                                        {msg.data.amount && (
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 sm:p-3 mt-3">
                                                <p className="text-[10px] font-bold text-emerald-700 mb-1 uppercase">Conversion Result</p>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-medium text-gray-500">
                                                        {msg.data.amount.toLocaleString('id-ID')} {msg.data.base_currency}
                                                    </span>
                                                    <span className="text-base sm:text-xl font-bold text-emerald-800 tracking-tight break-words">
                                                        ≈ {(msg.data.amount * msg.data.rate).toLocaleString('id-ID')} {msg.data.target_currency}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* RESULTS - ROUTE ENGINE CARDS (Pixel-Perfect Match with RoutePlanner) */}
                            {msg.type === 'results' && (
                                <div className="mt-4 space-y-4 grid grid-cols-1 gap-4 font-sans">
                                    {msg.data.map((res, index) => {
                                        const isBest = res.rank === 1;
                                        const cardId = `${msg.id}-${index}`;

                                        // Helpers for formatting (matching RoutePlanner)
                                        const fmtUSD = (val) => val?.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-';
                                        const fmtLocal = (val) => val?.toLocaleString('en-US', { style: 'currency', currency: res.display_currency || 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }) || '-';
                                        const fmtUnitUSD = (val) => val?.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) || '-';
                                        const fmtUnitLocal = (val) => val?.toLocaleString('en-US', { style: 'currency', currency: res.display_currency || 'IDR', minimumFractionDigits: 2 }) || '-';
                                        const fmtLabel = (key) => key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

                                        return (
                                            <div key={index} className={`bg-white rounded-xl shadow-sm border transition-all duration-300 hover:shadow-md ${isBest ? 'border-emerald-500 ring-1 ring-emerald-50' : 'border-gray-200'}`}>

                                                {/* 1. HEADER SECTION */}
                                                <div className={`p-4 ${isBest ? 'bg-gray-50/50' : 'bg-white'} border-b border-gray-100`}>

                                                    {/* Badge Rank 1 */}
                                                    {isBest && (
                                                        <div className="mb-3">
                                                            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1 rounded shadow-sm inline-flex items-center gap-1.5 uppercase tracking-wide">
                                                                <CheckCircle className="w-3 h-3 text-white" /> BEST OPTION (LOWEST COST)
                                                            </span>
                                                        </div>
                                                    )}

                                                    <div className="flex flex-col gap-3">
                                                        {/* Left: Origin & Mode */}
                                                        <div className="w-full">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Origin</span>
                                                            </div>
                                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                                                <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 break-words line-clamp-2">{res.sourcing_origin}</h3>
                                                                <div className="flex flex-wrap gap-1">
                                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${res.transport_mode === 'SEA' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-orange-50 border-orange-200 text-orange-700'}`}>
                                                                        {res.transport_mode === 'SEA' ? <Ship className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                                                                        {res.transport_mode}
                                                                    </span>
                                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-gray-200 bg-white text-gray-600 w-fit">
                                                                        {res.method}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Right: Primary Price */}
                                                        <div className="w-full pt-3 border-t border-dashed border-gray-100">
                                                            <div className="text-2xl sm:text-3xl font-black text-blue-700 leading-none tracking-tight">
                                                                {fmtUSD(res.total_landed_cost_usd)}
                                                            </div>
                                                            {res.total_landed_cost_local && (
                                                                <div className="text-xs sm:text-sm font-medium text-gray-400 mt-1">
                                                                    ≈ {fmtLocal(res.total_landed_cost_local)}
                                                                </div>
                                                            )}
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1">
                                                                Estimated Total Cost
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 2. METRICS GRID (Responsive: 2 cols on mobile, 3 on desktop) */}
                                                <div className="grid grid-cols-2 md:grid-cols-3 border-b border-gray-100 divide-x divide-y md:divide-y-0 divide-gray-100 bg-white">
                                                    <div className="p-3 flex flex-col items-center justify-center text-center">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Est. Lead Time</span>
                                                        <div className={`font-bold text-sm flex items-center gap-1.5 ${isBest ? 'text-emerald-600' : 'text-gray-800'}`}>
                                                            <Clock className="w-4 h-4" /> {res.lead_time_days} Days
                                                        </div>
                                                    </div>
                                                    <div className="p-3 flex flex-col items-center justify-center text-center">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Qty</span>
                                                        <div className="font-bold text-sm text-gray-800">
                                                            {res.total_qty_label || `${res.total_qty?.toLocaleString()} Units`}
                                                        </div>
                                                        {res.original_unit && res.original_unit !== 'Unit' && (
                                                            <div className="text-[10px] text-gray-500 font-medium mt-0.5 bg-gray-100 px-1.5 py-0.5 rounded-md inline-block">
                                                                ({res.original_qty} {res.original_unit})
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="p-3 flex flex-col items-center justify-center text-center">
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Volume</span>
                                                        <div className="font-bold text-sm text-gray-800">
                                                            {res.total_volume_cbm} CBM
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 3. DUAL ANALYSIS PANELS - RESPONSIVE */}
                                                <div className="p-3 sm:p-4 bg-gray-50/30">
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                        {/* Unit Price Box */}
                                                        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-2">
                                                                Unit Price Analysis
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-end">
                                                                <span className="text-xl sm:text-2xl font-bold text-gray-900">{fmtUnitUSD(res.unit_final_price_usd)}</span>
                                                                {res.unit_final_price_local && (
                                                                    <span className="text-xs font-semibold text-gray-400 mt-0.5">
                                                                        ≈ {fmtUnitLocal(res.unit_final_price_local)} / pcs
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Total Cost Box */}
                                                        <div className="bg-white p-3 sm:p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-2">
                                                                Total Cost Analysis
                                                            </div>
                                                            <div className="flex-1 flex flex-col justify-end">
                                                                <span className="text-xl sm:text-2xl font-bold text-blue-700">{fmtUSD(res.total_landed_cost_usd)}</span>
                                                                {res.total_landed_cost_local && (
                                                                    <span className="text-xs font-semibold text-gray-400 mt-0.5">
                                                                        ≈ {fmtLocal(res.total_landed_cost_local)}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* 4. BREAKDOWN ACCORDION - RESPONSIVE */}
                                                <div>
                                                    <button
                                                        onClick={() => toggleExpand(cardId)}
                                                        className="w-full flex items-center justify-between px-3 sm:px-4 md:px-5 py-2.5 sm:py-3 bg-white border-t border-gray-200 hover:bg-gray-50 transition-colors group"
                                                    >
                                                        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                                            <div className="p-1 rounded bg-blue-50 text-blue-600 flex-shrink-0">
                                                                <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                            </div>
                                                            <span className="text-[10px] sm:text-xs font-bold text-gray-600 group-hover:text-blue-700 uppercase tracking-wide truncate">View Cost Breakdown</span>
                                                        </div>
                                                        {expandedCard === cardId
                                                            ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                                            : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0" />
                                                        }
                                                    </button>

                                                    {expandedCard === cardId && (
                                                        <div className="px-5 pb-5 pt-1 bg-white border-t border-dashed border-gray-100">
                                                            <div className="space-y-2">
                                                                {res.breakdown && Object.entries(res.breakdown).map(([key, value]) => {
                                                                    if (value === 0) return null;
                                                                    return (
                                                                        <div key={key} className="flex justify-between items-center text-sm">
                                                                            <span className="text-gray-500 capitalize">{fmtLabel(key)}</span>
                                                                            <span className="font-semibold text-gray-900">{fmtUSD(value)}</span>
                                                                        </div>
                                                                    );
                                                                })}
                                                                {!res.breakdown && <p className="text-sm text-gray-400 italic text-center py-2">Breakdown data not available.</p>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* SUGGESTION CHIPS */}
                            {msg.type === 'suggestions' && Array.isArray(msg.data) && msg.data.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Suggestions</p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.data.map((suggestion, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => processUserMessage(suggestion)}
                                                className="text-xs font-medium bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                                            >
                                                {suggestion}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PACKING SELECTION CHIPS (NEW) */}
                            {msg.type === 'packing_selection' && Array.isArray(msg.data) && msg.data.length > 0 && (
                                <div className="mt-4 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-2">Pilih Jenis Kemasan</p>
                                    <div className="flex flex-wrap gap-2">
                                        {msg.data.map((option, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handlePackingSelect(option)}
                                                className="text-xs font-medium bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                                            >
                                                {option === 'No Packing (Unit)' && '📦'}
                                                {option === 'Pallet' && '🏗️'}
                                                {option === 'Box' && '📦'}
                                                {option === 'Crate' && '🧰'}
                                                {option === 'Drum' && '🛢️'}
                                                {option}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PRODUCT LIST - GRID LAYOUT - RESPONSIVE */}
                            {msg.type === 'product_list' && Array.isArray(msg.data) && msg.data.length > 0 && (
                                <div className="mt-3 md:mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                                    {msg.data.map((sku) => (
                                        <div
                                            key={sku.id}
                                            className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-3 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group flex justify-between items-start gap-2 sm:gap-3"
                                            onClick={() => handleManualProductSelect(sku)}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-gray-800 text-xs sm:text-sm line-clamp-2 group-hover:text-indigo-600 transition-colors">{sku.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[9px] sm:text-[10px] text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded truncate">SKU: {sku.sku_code}</span>
                                                </div>
                                            </div>
                                            <button
                                                className="bg-indigo-600 group-hover:bg-indigo-700 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 rounded-lg font-medium shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
                                            >
                                                Pilih
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* PORT SELECTION - GRID LAYOUT - RESPONSIVE */}
                            {msg.type === 'port_selection' && Array.isArray(msg.data) && msg.data.length > 0 && (
                                <div className="mt-3 md:mt-4 pt-3 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
                                    {msg.data.map((port) => (
                                        <div
                                            key={port.id}
                                            className="bg-white border border-gray-200 rounded-xl p-2.5 sm:p-3 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group flex justify-between items-start gap-2 sm:gap-3"
                                            onClick={() => handleManualPortSelect(port)}
                                        >
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-gray-800 text-xs sm:text-sm line-clamp-2 group-hover:text-blue-600 transition-colors">{port.name}</h4>
                                                <p className="text-[9px] sm:text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 truncate">
                                                    📍 {port.city}, {port.country_name}
                                                </p>
                                            </div>
                                            <button
                                                className="bg-indigo-600 group-hover:bg-indigo-700 text-white text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 rounded-lg font-medium shadow-sm transition-colors whitespace-nowrap flex-shrink-0"
                                            >
                                                Pilih
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* CLARIFICATION CHIPS */}
                {clarificationData && (
                    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-3 duration-300">
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm shadow-lg p-4 max-w-[85%] md:max-w-[75%]">
                            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                                <Bot className="w-4 h-4 text-indigo-500" />
                                <span className="text-xs font-medium text-gray-500">Sentara AI</span>
                            </div>

                            <p className="text-sm text-gray-700 mb-4">
                                Saya menemukan <span className="font-semibold">{clarificationData.candidates.length} produk</span> yang serupa. Pilih yang sesuai:
                            </p>

                            <div className="flex flex-col gap-2">
                                {clarificationData.candidates.map(sku => (
                                    <button
                                        key={sku.id}
                                        onClick={() => handleClarificationSelect(sku)}
                                        className="group bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 hover:border-indigo-400 hover:from-indigo-100 hover:to-blue-100 text-left px-4 py-3 rounded-xl transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]"
                                        style={isSafari ? {
                                            background: 'linear-gradient(to right, #eef2ff, #eff6ff)',
                                            WebkitTransform: 'translateZ(0)'
                                        } : {}}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-gray-800 text-sm">{sku.name}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">SKU: {sku.sku_code}</p>
                                            </div>
                                            <ChevronRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Premium Typing Indicator */}
                {loading && <TypingBubble />}
                <div ref={messagesEndRef} />
            </div>

            {/* Input - RESPONSIVE */}
            <div className="p-2.5 sm:p-3 md:p-4 bg-gradient-to-t from-gray-50 to-white border-t border-gray-200"
                style={isSafari ? { background: 'linear-gradient(to top, #f9fafb, #ffffff)' } : {}}>

                {/* Quick Actions Bar - RESPONSIVE */}
                <div className="max-w-4xl mx-auto pb-2 sm:pb-3 flex flex-wrap gap-1.5 sm:gap-2 justify-center">
                    <button
                        onClick={() => processUserMessage("Lihat Daftar Produk")}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-indigo-100 rounded-full text-[10px] sm:text-xs font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                        <span></span> Lihat Produk
                    </button>
                    <button
                        onClick={() => processUserMessage("Lihat Daftar Tujuan")}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-indigo-100 rounded-full text-[10px] sm:text-xs font-medium text-indigo-600 shadow-sm hover:bg-indigo-50 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                        <span></span> Lihat Tujuan
                    </button>
                    <button
                        onClick={() => processUserMessage("Reset")}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-red-100 rounded-full text-[10px] sm:text-xs font-medium text-red-500 shadow-sm hover:bg-red-50 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                        <span></span> Reset
                    </button>
                    <button
                        onClick={() => processUserMessage("USD 100 to IDR")}
                        className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 bg-white border border-green-100 rounded-full text-[10px] sm:text-xs font-medium text-green-600 shadow-sm hover:bg-green-50 transition-colors whitespace-nowrap flex-shrink-0"
                    >
                        <span>💱</span> Currency Converter
                    </button>
                </div>

                {/* Text Input Area - RESPONSIVE */}
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex gap-1.5 sm:gap-2 items-center">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ketik pesan..."
                        disabled={loading}
                        className="flex-1 bg-white border border-gray-200 rounded-2xl px-3 sm:px-4 md:px-5 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm text-gray-800 placeholder-gray-400 shadow-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        style={isSafari ? { WebkitAppearance: 'none' } : {}}
                    />
                    <button
                        type="submit"
                        disabled={!input.trim() || loading}
                        className="bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white p-2.5 sm:p-3 md:p-3.5 rounded-2xl shadow-md transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center flex-shrink-0"
                        style={isSafari ? { background: 'linear-gradient(to bottom right, #6366f1, #4f46e5)' } : {}}
                    >
                        <Send className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                </form>

                {/* Quick Examples */}
                {!loading && !clarificationData && messages.length === 1 && (
                    <div className="mt-3 max-w-4xl mx-auto">
                        <p className="text-xs text-gray-500 mb-2">💡 Coba tanya:</p>
                        <div className="flex flex-wrap gap-2">
                            {[
                                "Kirim 100 pupuk organik ke Jakarta",
                                "500 insect meal to Singapore",
                                "1000 sentro ke Surabaya"
                            ].map((example, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setInput(example)}
                                    className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                                    style={{ WebkitTapHighlightColor: 'transparent' }}
                                >
                                    {example}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatAgent;