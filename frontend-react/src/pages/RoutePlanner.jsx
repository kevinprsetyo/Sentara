import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Truck, Ship, ArrowRight, Clock, DollarSign, MapPin, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Zap, ArrowUpDown, BrainCircuit } from 'lucide-react';

const RoutePlanner = () => {
    // State Master Data
    const [ports, setPorts] = useState([]);
    const [skus, setSkus] = useState([]);
    const [modes, setModes] = useState([]);
    const [packings, setPackings] = useState([]); // NEW: Packing master data

    // State Form
    const [selectedCountry, setSelectedCountry] = useState('');
    const [destinationPortId, setDestinationPortId] = useState('');
    const [skuId, setSkuId] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [transportMode, setTransportMode] = useState(null);
    const [packingType, setPackingType] = useState(''); // Packing Type (Optional)

    // UI State
    const [expandedCard, setExpandedCard] = useState(null);
    const [sortBy, setSortBy] = useState('RECOMMENDED');
    const [isSafari, setIsSafari] = useState(false);

    // State Hasil
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // Safari detection
    useEffect(() => {
        const ua = navigator.userAgent;
        const safari = /^((?!chrome|android).)*safari/i.test(ua);
        setIsSafari(safari);
    }, []);

    // Helper: Get Port Name
    const getPortName = (id) => {
        if (!ports || ports.length === 0) return id;
        const port = ports.find(p => p.id === parseInt(id));
        return port ? `${port.name} (${port.country})` : id;
    };

    const toggleExpand = (index) => {
        setExpandedCard(expandedCard === index ? null : index);
    };

    // Derived State: Sorted Results
    const getSortedResults = () => {
        const resultsCopy = [...results];
        switch (sortBy) {
            case 'COST':
                return resultsCopy.sort((a, b) => a.total_landed_cost_usd - b.total_landed_cost_usd);
            case 'TIME':
                return resultsCopy.sort((a, b) => a.lead_time_days - b.lead_time_days);
            case 'RECOMMENDED':
            default:
                return resultsCopy.sort((a, b) => a.rank - b.rank);
        }
    };

    const sortedResults = getSortedResults();

    // Derived State: Available packings for selected SKU
    const availablePackings = skuId
        ? packings.filter(p => p.sku_id === parseInt(skuId))
        : [];

    useEffect(() => {
        const fetchMasterData = async () => {
            try {
                const [portsRes, skusRes, modesRes, packingsRes] = await Promise.all([
                    api.get('/api/v1/master/ports'),
                    api.get('/api/v1/master/skus'),
                    api.get('/api/v1/master/modes'),
                    api.get('/api/v1/admin/packings') // NEW: Fetch packings
                ]);
                setPorts(portsRes.data.data);
                setSkus(skusRes.data.data);
                setModes(modesRes.data.data);
                setPackings(packingsRes.data.data?.data || []); // Handle nested data structure
            } catch (err) {
                setError("Gagal memuat master data.");
            }
        };
        fetchMasterData();
    }, []);

    const handleCalculate = async (e) => {
        e.preventDefault();
        setHasSubmitted(true);
        setLoading(true);
        setError('');
        setResults([]);
        setExpandedCard(null);

        if (!destinationPortId || !skuId) {
            setError("Please select Destination and SKU.");
            setLoading(false);
            return;
        }

        if (parseInt(quantity) <= 0) {
            setError("Quantity must be greater than 0.");
            setLoading(false);
            return;
        }

        try {
            // V13 Payload: Clean and minimal
            const payload = {
                destination_port_id: parseInt(destinationPortId),
                transport_mode: transportMode,
                items: [
                    {
                        sku_id: parseInt(skuId),
                        quantity: parseInt(quantity),
                        ...(packingType && { packing_type: packingType }) // Include only if packingType is set
                    }
                ]
            };

            const response = await api.post('/api/v1/route/plan', payload);

            if (response.data && response.data.data && response.data.data.results) {
                setResults(response.data.data.results);
                setSortBy('RECOMMENDED');
            } else {
                setResults([]);
            }
            setHasSubmitted(true);

        } catch (err) {
            console.error(err);
            setError(err.message || "Simulation failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
            <h1 className="text-lg md:text-2xl font-bold text-gray-800 mb-1">Smart Sourcing & Logistics Engine</h1>
            <p className="text-gray-500 text-sm mb-8">AI-powered global sourcing simulation and cost comparison</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* PARAMS FORM */}
                <div className="lg:col-span-1 bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 min-h-0 self-start">
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-blue-600" /> Sourcing Parameters
                    </h2>

                    <form onSubmit={handleCalculate} className="space-y-4">

                        {/* 1. SKU */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">SKU Item</label>
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                                value={skuId}
                                onChange={(e) => {
                                    setSkuId(e.target.value);
                                    setPackingType(''); // Reset packing when SKU changes
                                }}
                            >
                                <option value="">Select Product...</option>
                                {skus.map(sku => {
                                    const duplicateCount = skus.filter(s => s.name === sku.name).length;
                                    const displayName = duplicateCount > 1
                                        ? `${sku.name} (${sku.sku_code})`
                                        : sku.name;

                                    return (
                                        <option key={sku.id} value={sku.id}>{displayName}</option>
                                    );
                                })}
                            </select>
                        </div>

                        {/* 2. PACKING TYPE (Dynamic from DB) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Packing Type <span className="text-gray-400 text-xs">(Optional)</span>
                            </label>
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                value={packingType}
                                onChange={(e) => setPackingType(e.target.value)}
                                disabled={!skuId}
                            >
                                <option value="">Unit (Pcs)</option>
                                {availablePackings.map(packing => (
                                    <option key={packing.id} value={packing.packing_type}>
                                        {packing.packing_type} (1 {packing.packing_type} = {packing.quantity_per_packing} Pcs)
                                    </option>
                                ))}
                            </select>
                            {!skuId && (
                                <p className="text-xs text-gray-400 mt-1">Select SKU first to see packing options</p>
                            )}
                            {skuId && availablePackings.length === 0 && (
                                <p className="text-xs text-gray-500 mt-1">No packing options available for this product</p>
                            )}
                        </div>

                        {/* 3. QUANTITY */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                            <input
                                type="number" min="1"
                                className="w-full p-2.5 border border-gray-300 rounded-lg"
                                value={quantity} onChange={(e) => setQuantity(e.target.value)}
                            />
                        </div>

                        {/* 4. DESTINATION COUNTRY - Step 1: Select Country */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Destination Country <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedCountry}
                                    onChange={(e) => {
                                        setSelectedCountry(e.target.value);
                                        setDestinationPortId('');
                                    }}
                                    className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-left"
                                    required
                                >
                                    <option value="">Select Country...</option>
                                    {[...new Set(ports.map(port =>
                                        port.country_name || port.country || port.country_code
                                    ).filter(Boolean))].sort().map(country => (
                                        <option key={country} value={country}>{country}</option>
                                    ))}
                                </select>

                                {/* Custom dropdown arrow untuk semua browser */}
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* 5. DESTINATION PORT - Step 2: Select Port */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Destination Port</label>
                            <select
                                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                                value={destinationPortId}
                                onChange={(e) => setDestinationPortId(e.target.value)}
                                disabled={!selectedCountry}
                            >
                                <option value="">{selectedCountry ? 'Select Port...' : 'Select country first...'}</option>
                                {ports
                                    .filter(port => (port.country_name || port.country || port.country_code) === selectedCountry)
                                    .map(port => (
                                        <option key={port.id} value={port.id}>
                                            {port.name}
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {/* 6. TRANSPORT MODE */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Transport Mode</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => setTransportMode(null)}
                                    className={`p-2 rounded-lg border flex items-center justify-center gap-2 col-span-2 ${transportMode === null ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-200'
                                        }`}
                                >
                                    <BrainCircuit className="w-4 h-4" /> Smart Auto (AI Best)
                                </button>
                                {modes.map(mode => (
                                    <button
                                        key={mode.id} type="button"
                                        onClick={() => setTransportMode(mode.id)}
                                        className={`p-2 rounded-lg border flex items-center justify-center gap-2 ${transportMode === mode.id ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-200'
                                            }`}
                                    >
                                        {mode.id === 'SEA' ? <Ship className="w-4 h-4" /> : <Truck className="w-4 h-4" />} {mode.id}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading || !skuId || !destinationPortId}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-md disabled:opacity-70 mt-4"
                        >
                            {loading ? 'Simulating global sourcing options...' : 'Run Simulation'}
                        </button>
                    </form>
                </div>

                {/* RESULTS AREA */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Sort Control */}
                    {sortedResults.length > 0 && (
                        <div className="flex justify-end mb-2">
                            <div className="flex items-center gap-2 w-full md:w-auto">
                                <span className="text-gray-500 text-sm hidden md:block">Sort by:</span>
                                <div className="relative w-full md:w-48">
                                    <select
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="appearance-none w-full bg-white border border-gray-300 text-gray-700 py-2 px-4 pr-8 rounded-lg leading-tight focus:outline-none focus:bg-white focus:border-blue-500 text-sm font-medium"
                                    >
                                        <option value="RECOMMENDED">✨ Recommended</option>
                                        <option value="COST">💰 Lowest Cost</option>
                                        <option value="TIME">⏱️ Fastest Delivery</option>
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                        <ArrowUpDown className="h-4 w-4" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex gap-3">
                            <AlertCircle /> <div><p className="font-bold">Error</p><p>{error}</p></div>
                        </div>
                    )}

                    {!loading && hasSubmitted && results.length === 0 && !error && (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl h-64 flex flex-col items-center justify-center text-gray-400">
                            <Zap className="w-12 h-12 mb-2 opacity-20" />
                            <p>No valid sourcing options found due to trade restrictions.</p>
                        </div>
                    )}

                    {/* LIST OF RESULTS */}
                    {sortedResults.map((res, index) => {
                        const isBest = res.rank === 1;

                        // Helpers for formatting
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

                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                        {/* Left: Origin & Mode */}
                                        <div className="w-full md:w-auto">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">Origin</span>
                                            </div>
                                            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                                                <h3 className="text-xl font-bold text-gray-900 break-words line-clamp-2 md:whitespace-nowrap">{res.sourcing_origin}</h3>
                                                <div className="flex space-x-1">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border flex items-center gap-1 w-fit ${res.transport_mode === 'SEA' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-orange-50 border-orange-200 text-orange-700'
                                                        }`}>
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
                                        <div className="w-full md:w-auto text-left md:text-right mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-dashed border-gray-100">
                                            <div className="text-3xl font-black text-blue-700 leading-none tracking-tight">
                                                {fmtUSD(res.total_landed_cost_usd)}
                                            </div>
                                            {res.total_landed_cost_local && (
                                                <div className="text-sm font-medium text-gray-400 mt-1">
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

                                {/* 3. DUAL ANALYSIS PANELS */}
                                <div className="p-4 bg-gray-50/30">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Unit Price Box */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-2">
                                                Unit Price Analysis
                                            </div>
                                            <div className="flex-1 flex flex-col justify-end">
                                                <span className="text-2xl font-bold text-gray-900">{fmtUnitUSD(res.unit_final_price_usd)}</span>
                                                {res.unit_final_price_local && (
                                                    <span className="text-xs font-semibold text-gray-400 mt-0.5">
                                                        ≈ {fmtUnitLocal(res.unit_final_price_local)} / pcs
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* Total Cost Box */}
                                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-2">
                                                Total Cost Analysis
                                            </div>
                                            <div className="flex-1 flex flex-col justify-end">
                                                <span className="text-2xl font-bold text-blue-700">{fmtUSD(res.total_landed_cost_usd)}</span>
                                                {res.total_landed_cost_local && (
                                                    <span className="text-xs font-semibold text-gray-400 mt-0.5">
                                                        ≈ {fmtLocal(res.total_landed_cost_local)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 4. BREAKDOWN ACCORDION */}
                                <div>
                                    <button
                                        onClick={() => toggleExpand(index)}
                                        className="w-full flex items-center justify-between px-5 py-3 bg-white border-t border-gray-200 hover:bg-gray-50 transition-colors group"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="p-1 rounded bg-blue-50 text-blue-600">
                                                <DollarSign className="w-3.5 h-3.5" />
                                            </div>
                                            <span className="text-xs font-bold text-gray-600 group-hover:text-blue-700 uppercase tracking-wide">View Cost Breakdown (USD)</span>
                                        </div>
                                        {expandedCard === index
                                            ? <ChevronUp className="w-4 h-4 text-gray-400" />
                                            : <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                                        }
                                    </button>

                                    {expandedCard === index && (
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
            </div>
        </div>
    );
};

export default RoutePlanner;