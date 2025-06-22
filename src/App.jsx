import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- LIVE DATA FETCHING ---
// The app now fetches the NDIS rates from your specified URL.
const NDIS_RATES_URL = 'https://hoursappcf.pages.dev/ndisrates2025.json';

// --- EMBEDDED NDIS DATA (FOR OFFLINE DEVELOPMENT) ---
// This is a small sample of the data. You can comment out the fetch logic 
// and use this for offline testing if needed.
const ndisRates2025_offline = [
  {
    "Support Item Number": "01_004_0107_1_1",
    "Support Item Name": "Assistance with Personal Domestic Activities",
    "QLD": 59.06
  },
  {
    "Support Item Number": "01_002_0107_1_1",
    "Support Item Name": "Assistance With Self-Care Activities - Standard - Weekday Night",
    "QLD": 78.81
  },
  {
    "Support Item Number": "01_011_0107_1_1",
    "Support Item Name": "Assistance With Self-Care Activities - Standard - Weekday Daytime",
    "QLD": 70.23
  },
  // ... more items would be here
];


// Helper to get today's date in<x_bin_411>-MM-DD format
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to get date one year from today in<x_bin_411>-MM-DD format
const getOneYearFromToday = () => {
    const today = new Date();
    const nextYear = new Date(today);
    nextYear.setFullYear(today.getFullYear() + 1);
    const year = nextYear.getFullYear();
    const month = String(nextYear.getMonth() + 1).padStart(2, '0');
    const day = String(nextYear.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function to round up to 2 decimal places
const roundUpToTwoDecimals = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return 0;
    return Math.ceil(num * 100) / 100;
};

// Searchable Dropdown Component
const SearchableDropdown = ({ label, items, onSelectItem, includeKeywords = [], excludeKeywords = [], isLoading }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    const filteredItems = useMemo(() => {
        if (isLoading || !items) return [];

        const preFiltered = items.filter(item => {
            const itemNameLower = (item["Support Item Name"] || '').toLowerCase();
            const hasIncluded = includeKeywords.every(keyword => itemNameLower.includes(keyword));
            const hasExcluded = excludeKeywords.some(keyword => itemNameLower.includes(keyword));
            return hasIncluded && !hasExcluded;
        });

        if (!searchTerm.trim()) return [];

        const searchWords = searchTerm.toLowerCase().replace(/[-/]/g, ' ').split(' ').filter(word => word);

        return preFiltered.filter(item => {
            const itemName = item["Support Item Name"] || '';
            const itemNumber = item["Support Item Number"] || '';
            const searchableItemName = itemName.toLowerCase().replace(/[-/]/g, ' ');
            const searchableItemNumber = itemNumber.toLowerCase();

            if (searchableItemNumber.includes(searchTerm.toLowerCase())) {
                return true;
            }

            return searchWords.every(word => searchableItemName.includes(word));
        }).slice(0, 100);

    }, [searchTerm, items, includeKeywords, excludeKeywords, isLoading]);

    const handleSelect = (item) => {
        onSelectItem(item);
        setSearchTerm(item["Support Item Name"]);
        setIsFocused(false);
    };

    return (
        <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}:</label>
            <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                placeholder={isLoading ? "Loading rates..." : "Search by name or item number..."}
                className="w-full p-3 border border-gray-300 rounded-md shadow-sm"
                disabled={isLoading}
            />
            {isFocused && searchTerm && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <li key={item["Support Item Number"]} onMouseDown={() => handleSelect(item)} className="p-3 hover:bg-gray-100 cursor-pointer">
                                <p className="font-semibold text-sm">{item["Support Item Name"]}</p>
                                <p className="text-xs text-gray-500">{item["Support Item Number"]}</p>
                            </li>
                        ))
                    ) : (
                        <li className="p-3 text-sm text-gray-500">No results found</li>
                    )}
                </ul>
            )}
        </div>
    );
};

// Floating Navigation Component
const FloatingNav = ({ totalPay, totalHours, formatNumber }) => {
    const navItems = [
        { href: '#date-range-section', label: 'From & To Dates' },
        { href: '#applicable-days', label: 'Applicable Days' },
        { href: '#ndis-rates', label: 'NDIS Rates' },
        { href: '#hourly-rates', label: 'Manual Rates' },
        { href: '#budget', label: 'Budget' },
        { href: '#public-holidays', label: 'Public Holidays' },
        { href: '#results', label: 'Results' },
        { href: '#saved-quotes', label: 'Saved Quotes' },
    ];
    
    useEffect(() => {
        document.documentElement.style.scrollBehavior = 'smooth';
        return () => {
            document.documentElement.style.scrollBehavior = 'auto';
        };
    }, []);

    return (
        <div className="fixed top-1/2 right-4 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm shadow-2xl rounded-xl p-4 border border-gray-200 w-64 hidden lg:block">
            <div className="text-center mb-4 pb-4 border-b">
                <p className="text-sm font-semibold text-gray-600">Total Projected Pay</p>
                <p className="text-2xl font-bold text-purple-700">${formatNumber(totalPay)}</p>
                <p className="text-sm font-semibold text-gray-600 mt-2">Total Projected Hours</p>
                <p className="text-2xl font-bold text-indigo-700">{formatNumber(totalHours)}</p>
            </div>
            <nav>
                <ul className="space-y-2">
                    {navItems.map(item => (
                        <li key={item.href}>
                            <a href={item.href} className="block text-center text-sm font-semibold text-gray-700 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-md transition-colors">
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};


// Main App component
const App = () => {
    // State variables
    const [fromDate, setFromDate] = useState(getTodayDate());
    const [toDate, setToDate] = useState(getOneYearFromToday());
    const [recurringType, setRecurringType] = useState('Weekly');
    const [weeklyDays, setWeeklyDays] = useState({
        Monday: { selected: false, hours: '', shift: 'day' },
        Tuesday: { selected: false, hours: '', shift: 'day' },
        Wednesday: { selected: false, hours: '', shift: 'day' },
        Thursday: { selected: false, hours: '', shift: 'day' },
        Friday: { selected: false, hours: '', shift: 'day' },
        Saturday: { selected: false, hours: '', shift: 'day' },
        Sunday: { selected: false, hours: '', shift: 'day' },
    });
    const defaultQueenslandPublicHolidays = ['2025-01-01', '2025-01-27', '2025-04-18', '2025-04-19', '2025-04-20', '2025-04-21', '2025-04-25', '2025-05-05', '2025-08-13', '2025-10-06', '2025-12-24', '2025-12-25', '2025-12-26'].join(', ');
    const [includePublicHolidays, setIncludePublicHolidays] = useState(true);
    const [publicHolidaysInput, setPublicHolidaysInput] = useState(defaultQueenslandPublicHolidays);
    const [weekdayRate, setWeekdayRate] = useState('');
    const [weekdayEveningRate, setWeekdayEveningRate] = useState('');
    const [saturdayRate, setSaturdayRate] = useState('');
    const [sundayRate, setSundayRate] = useState('');
    const [publicHolidayRate, setPublicHolidayRate] = useState('');
    const [budgetMode, setBudgetMode] = useState('noBudget');
    const [budget, setBudget] = useState('');
    const [totalHours, setTotalHours] = useState(0);
    const [weekdayHours, setWeekdayHours] = useState(0);
    const [weekdayEveningHours, setWeekdayEveningHours] = useState(0);
    const [saturdayHours, setSaturdayHours] = useState(0);
    const [sundayHours, setSundayHours] = useState(0);
    const [publicHolidayHours, setPublicHolidayHours] = useState(0);
    const [totalPay, setTotalPay] = useState(0);
    const [weekdayPay, setWeekdayPay] = useState(0);
    const [weekdayEveningPay, setWeekdayEveningPay] = useState(0);
    const [saturdayPay, setSaturdayPay] = useState(0);
    const [sundayPay, setSundayPay] = useState(0);
    const [publicHolidayPay, setPublicHolidayPay] = useState(0);
    const [error, setError] = useState('');
    const [suggestedDailyHours, setSuggestedDailyHours] = useState({});
    const [calculatedTotalDays, setCalculatedTotalDays] = useState(0);
    const [calculatedTotalWeekdays, setCalculatedTotalWeekdays] = useState(0);
    const [calculatedTotalSaturdays, setCalculatedTotalSaturdays] = useState(0);
    const [calculatedTotalSundays, setCalculatedTotalSundays] = useState(0);
    const [calculatedTotalPublicHolidays, setCalculatedTotalPublicHolidays] = useState(0);
    const [calculatedFullWeeks, setCalculatedFullWeeks] = useState(0);
    const [calculatedFullFortnights, setCalculatedFullFortnights] = useState(0);
    const [calculatedFullMonths, setCalculatedFullMonths] = useState(0);
    const [quoteDescription, setQuoteDescription] = useState('');
    const [savedQuotes, setSavedQuotes] = useState(() => { try { const d = localStorage.getItem('savedQuotes'); return d ? JSON.parse(d) : [] } catch (e) { return [] } });
    const [ndisRates, setNdisRates] = useState([]);
    const [isLoadingRates, setIsLoadingRates] = useState(true);
    const [rateError, setRateError] = useState(null);

    useEffect(() => { try { localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes)) } catch (e) {} }, [savedQuotes]);
    useEffect(() => {
        const fetchRates = async () => {
            setIsLoadingRates(true); setRateError(null);
            try {
                const response = await fetch(NDIS_RATES_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setNdisRates(data);
            } catch (e) {
                console.error("Failed to fetch NDIS rates:", e);
                setRateError("Could not load NDIS rates. Check connection and refresh.");
            } finally {
                setIsLoadingRates(false);
            }
        };
        fetchRates();
    }, []);

    // Handlers
    const handleFocus = (event) => event.target.select();
    const handleWeeklyDayChange = (day) => setWeeklyDays(p => ({ ...p, [day]: { ...p[day], selected: !p[day].selected } }));
    const handleShiftChange = (day) => setWeeklyDays(p => ({ ...p, [day]: { ...p[day], shift: p[day].shift === 'day' ? 'evening' : 'day' } }));
    const handleWeeklyHoursChange = (day, value) => { if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 24)) { setWeeklyDays(p => ({ ...p, [day]: { ...p[day], hours: value } })); setError(''); } else { setError('Hours must be between 0 and 24.'); } };
    const handleValueChange = (setter, value) => { if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0)) { setter(value); setError(''); } else { setError('Value must be a non-negative number.'); } };
    const applySuggestedHours = () => { if (Object.keys(suggestedDailyHours).length > 0) { setWeeklyDays(p => { const u = {}; for (const d in p) { u[d] = { ...p[d], hours: suggestedDailyHours[d]?.hours !== undefined ? roundUpToTwoDecimals(suggestedDailyHours[d].hours) : p[d].hours }; } return u; }); } };
    const setAllRatesSame = () => { const r = weekdayRate; setSaturdayRate(r); setSundayRate(r); setPublicHolidayRate(r); setWeekdayEveningRate(r); };
    
    const handleNdisRateSelect = useCallback((rateType, item) => {
        const rate = item.QLD || 0;
        switch(rateType) {
            case 'weekdayDay': setWeekdayRate(rate.toString()); break;
            case 'weekdayEvening': setWeekdayEveningRate(rate.toString()); break;
            case 'saturday': setSaturdayRate(rate.toString()); break;
            case 'sunday': setSundayRate(rate.toString()); break;
            case 'publicHoliday': setPublicHolidayRate(rate.toString()); break;
            default: break;
        }
    }, []);

    // Main Calculation Effect
    useEffect(() => {
        const calculateAllTotals = () => {
            const start = new Date(fromDate + 'T00:00:00');
            const end = new Date(toDate + 'T00:00:00');

            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                setError('Please enter valid "From" and "To" dates.');
                return;
            } else {
                setError('');
            }
            
            const numWeekdayRate = parseFloat(weekdayRate) || 0;
            const numWeekdayEveningRate = parseFloat(weekdayEveningRate) || 0;
            const numSaturdayRate = parseFloat(saturdayRate) || 0;
            const numSundayRate = parseFloat(sundayRate) || 0;
            const numPublicHolidayRate = parseFloat(publicHolidayRate) || 0;
            const numBudget = parseFloat(budget) || 0;

            let periodBreakdownDays = 0, periodBreakdownWeekdays = 0, periodBreakdownSaturdays = 0, periodBreakdownSundays = 0, periodBreakdownPublicHolidays = 0;
            let currentWeekdayHours = 0, currentWeekdayEveningHours = 0, currentSaturdayHours = 0, currentSundayHours = 0, currentPublicHolidayHours = 0;
            let finalTotalHours = 0, finalTotalPay = 0;

            const holidaySet = new Set(includePublicHolidays ? publicHolidaysInput.split(',').map(d => d.trim()).filter(d => d) : []);
            const weekDaysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                const dayName = weekDaysOrder[dayOfWeek];
                const currentDateString = d.toISOString().split('T')[0];
                const isHoliday = holidaySet.has(currentDateString);
                
                const dayInfo = weeklyDays[dayName];
                const hoursToday = parseFloat(dayInfo.hours) || 0;
                const isDaySelectedInPattern = dayInfo.selected;
                let shouldCountThisDayInForecast = false;

                switch (recurringType) {
                    case 'Daily': shouldCountThisDayInForecast = true; break;
                    case 'Weekly': shouldCountThisDayInForecast = true; break;
                    case 'Fortnightly':
                        const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / (1000 * 3600 * 24));
                        if (Math.floor(daysSinceStart / 7) % 2 === 0) shouldCountThisDayInForecast = true;
                        break;
                    case 'Monthly':
                        if (d.getDate() <= 7) shouldCountThisDayInForecast = true;
                        break;
                    case 'Quarterly':
                        const month = d.getMonth();
                        if ([0, 3, 6, 9].includes(month) && d.getDate() <= 7) shouldCountThisDayInForecast = true;
                        break;
                    default: break;
                }

                if (isDaySelectedInPattern && shouldCountThisDayInForecast) {
                    periodBreakdownDays++;
                    finalTotalHours += hoursToday;

                    if (isHoliday) {
                        currentPublicHolidayHours += hoursToday;
                        finalTotalPay += hoursToday * numPublicHolidayRate;
                        periodBreakdownPublicHolidays++;
                    } else if (dayName === 'Saturday') {
                        currentSaturdayHours += hoursToday;
                        finalTotalPay += hoursToday * numSaturdayRate;
                        periodBreakdownSaturdays++;
                    } else if (dayName === 'Sunday') {
                        currentSundayHours += hoursToday;
                        finalTotalPay += hoursToday * numSundayRate;
                        periodBreakdownSundays++;
                    } else {
                        periodBreakdownWeekdays++;
                        if (dayInfo.shift === 'evening') {
                            currentWeekdayEveningHours += hoursToday;
                            finalTotalPay += hoursToday * numWeekdayEveningRate;
                        } else {
                            currentWeekdayHours += hoursToday;
                            finalTotalPay += hoursToday * numWeekdayRate;
                        }
                    }
                }
            }
            
            setCalculatedTotalDays(periodBreakdownDays);
            setCalculatedTotalWeekdays(periodBreakdownWeekdays);
            setCalculatedTotalSaturdays(periodBreakdownSaturdays);
            setCalculatedTotalSundays(periodBreakdownSundays);
            setCalculatedTotalPublicHolidays(periodBreakdownPublicHolidays);
            let monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 - start.getMonth() + end.getMonth();
            if (end.getDate() < start.getDate() && monthsDiff > 0) monthsDiff--;
            setCalculatedFullMonths(Math.max(0, monthsDiff));
            setCalculatedFullWeeks(Math.floor(periodBreakdownDays / 7));
            setCalculatedFullFortnights(Math.floor(periodBreakdownDays / 14));
            
            setWeekdayHours(roundUpToTwoDecimals(currentWeekdayHours));
            setWeekdayEveningHours(roundUpToTwoDecimals(currentWeekdayEveningHours));
            setSaturdayHours(roundUpToTwoDecimals(currentSaturdayHours));
            setSundayHours(roundUpToTwoDecimals(currentSundayHours));
            setPublicHolidayHours(roundUpToTwoDecimals(currentPublicHolidayHours));
            setTotalHours(roundUpToTwoDecimals(finalTotalHours));
            
            setWeekdayPay(roundUpToTwoDecimals(currentWeekdayHours * numWeekdayRate));
            setWeekdayEveningPay(roundUpToTwoDecimals(currentWeekdayEveningHours * numWeekdayEveningRate));
            setSaturdayPay(roundUpToTwoDecimals(currentSaturdayHours * numSaturdayRate));
            setSundayPay(roundUpToTwoDecimals(currentSundayHours * numSundayRate));
            setPublicHolidayPay(roundUpToTwoDecimals(currentPublicHolidayHours * numPublicHolidayRate));
            setTotalPay(roundUpToTwoDecimals(finalTotalPay));

            let newSuggestedDailyHours = {};
            if (budgetMode === 'lock' && numBudget > 0 && finalTotalPay > 0 && finalTotalHours > 0) {
                const hourScalingFactor = numBudget / finalTotalPay;
                Object.entries(weeklyDays).forEach(([dayName, { selected, hours }]) => {
                    const currentHours = parseFloat(hours) || 0;
                    newSuggestedDailyHours[dayName] = {
                        selected: selected,
                        hours: selected ? currentHours * hourScalingFactor : 0
                    };
                });
            }
            setSuggestedDailyHours(newSuggestedDailyHours);
        };
        calculateAllTotals();
    }, [fromDate, toDate, recurringType, weeklyDays, includePublicHolidays, publicHolidaysInput, weekdayRate, weekdayEveningRate, saturdayRate, sundayRate, publicHolidayRate, budget, budgetMode]);

    const handleAddQuote = () => { if (!quoteDescription.trim()) {setError('Please enter a description for the quote.'); return;} const newQuote = {id: crypto.randomUUID(), description: quoteDescription.trim(), totalPay, totalHours, details: { fromDate, toDate, recurringType, weekdayRate, weekdayEveningRate, saturdayRate, sundayRate, publicHolidayRate, weekdayHours, weekdayEveningHours, saturdayHours, sundayHours, publicHolidayHours, weekdayPay, weekdayEveningPay, saturdayPay, sundayPay, publicHolidayPay } }; setSavedQuotes(p => [...p, newQuote]); setQuoteDescription(''); setError(''); };
    const handleDeleteQuote = (id) => setSavedQuotes(p => p.filter(q => q.id !== id));
    const formatNumber = (num) => { if (typeof num !== 'number' || isNaN(num)) return '0.00'; return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); };
    const Tooltip = ({ children, text }) => (<span className="relative group cursor-help">{children}<span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">{text}</span></span>);
    const numericBudget = parseFloat(budget) || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 font-sans antialiased text-gray-800 flex items-center justify-center">
            <FloatingNav totalPay={totalPay} totalHours={totalHours} formatNumber={formatNumber} />
            <div className="max-w-4xl w-full bg-white shadow-xl rounded-xl p-6 sm:p-8 space-y-6">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-indigo-700 mb-8">
                    Hours & Pay Forecasting App
                </h1>

                {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md"><strong className="font-bold">Error:</strong><span className="ml-2">{error}</span></div>)}
                {rateError && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md"><strong className="font-bold">Rate Loading Error:</strong><span className="ml-2">{rateError}</span></div>)}
                
                <div id="date-range-section" className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div><label htmlFor="fromDate" className="block text-sm font-semibold text-gray-700 mb-1">From Date:</label><input type="date" id="fromDate" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/></div>
                    <div><label htmlFor="toDate" className="block text-sm font-semibold text-gray-700 mb-1">To Date:</label><input type="date" id="toDate" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/></div>
                </div>
                <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                    <label htmlFor="recurringType" className="block text-lg font-semibold text-gray-700 mb-2">Recurring Type:</label>
                    <select id="recurringType" value={recurringType} onChange={(e) => setRecurringType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm bg-white">
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Fortnightly">Fortnightly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                    </select>
                </div>
                
                <div id="applicable-days" className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Applicable Days & Hours per Day:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(weeklyDays).map(([day, { selected, hours, shift }]) => {
                             const isWeekday = !['Saturday', 'Sunday'].includes(day);
                             return (
                                <div key={day} className="bg-white p-3 rounded-md shadow-sm border border-gray-200 space-y-2">
                                    <div className="flex items-center space-x-2">
                                        <input type="checkbox" id={`day-${day}`} checked={selected} onChange={() => handleWeeklyDayChange(day)} className="form-checkbox h-5 w-5 text-indigo-600 rounded"/>
                                        <label htmlFor={`day-${day}`} className="text-sm font-medium text-gray-700 flex-grow">{day}:</label>
                                        <input type="number" value={hours} onChange={(e) => handleWeeklyHoursChange(day, e.target.value)} onFocus={handleFocus} className="w-20 p-2 border border-gray-300 rounded-md text-sm text-center" min="0" max="24" placeholder="0"/>
                                    </div>
                                    {isWeekday && (
                                        <div className={`flex items-center justify-center space-x-2 text-xs transition-opacity ${!selected ? 'opacity-40' : 'opacity-100'}`}>
                                             <span className={`font-semibold ${shift === 'day' ? 'text-blue-600' : 'text-gray-400'}`}>Day</span>
                                             <button onClick={() => handleShiftChange(day)} disabled={!selected} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${shift === 'evening' ? 'bg-indigo-600' : 'bg-gray-300'} disabled:cursor-not-allowed`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${shift === 'evening' ? 'translate-x-6' : 'translate-x-1'}`}/></button>
                                             <span className={`font-semibold ${shift === 'evening' ? 'text-indigo-600' : 'text-gray-400'}`}>Evening</span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200 flex flex-col justify-center" role="alert"><p className="font-bold text-blue-800">Budget Tip</p><p className="text-sm text-gray-600 mt-1">Use 'Lock Budget' to set a target, and the app will suggest hours to meet it.</p></div>
                        <div className="bg-white p-3 rounded-md shadow-sm border border-gray-200 flex flex-col justify-center" role="alert"><p className="font-bold text-orange-800">Split Shifts</p><p className="text-sm text-gray-600 mt-1">For shifts with both Day and Evening rates, save a separate quote for each time block.</p></div>
                    </div>
                </div>
                
                <div id="ndis-rates" className="p-4 border border-sky-200 rounded-lg bg-sky-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">NDIS Rate Finder</h3>
                     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        <SearchableDropdown label="Weekday Day" items={ndisRates} onSelectItem={(item) => handleNdisRateSelect('weekdayDay', item)} excludeKeywords={['evening', 'saturday', 'sunday', 'public holiday']} isLoading={isLoadingRates} />
                        <SearchableDropdown label="Weekday Evening" items={ndisRates} onSelectItem={(item) => handleNdisRateSelect('weekdayEvening', item)} includeKeywords={['weekday', 'evening']} isLoading={isLoadingRates} />
                        <SearchableDropdown label="Saturday" items={ndisRates} onSelectItem={(item) => handleNdisRateSelect('saturday', item)} includeKeywords={['saturday']} isLoading={isLoadingRates} />
                        <SearchableDropdown label="Sunday" items={ndisRates} onSelectItem={(item) => handleNdisRateSelect('sunday', item)} includeKeywords={['sunday']} isLoading={isLoadingRates} />
                        <SearchableDropdown label="Public Holiday" items={ndisRates} onSelectItem={(item) => handleNdisRateSelect('publicHoliday', item)} includeKeywords={['public holiday']} isLoading={isLoadingRates} />
                    </div>
                </div>

                <div id="hourly-rates" className="p-4 border border-green-200 rounded-lg bg-green-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Hourly Rates:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div><label htmlFor="weekdayRate" className="block text-sm font-semibold text-gray-700 mb-1">Weekday Day:</label><input type="number" id="weekdayRate" value={weekdayRate} onChange={(e) => handleValueChange(setWeekdayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md" min="0" placeholder="0.00" /></div>
                        <div><label htmlFor="weekdayEveningRate" className="block text-sm font-semibold text-gray-700 mb-1">Weekday Evening:</label><input type="number" id="weekdayEveningRate" value={weekdayEveningRate} onChange={(e) => handleValueChange(setWeekdayEveningRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md" min="0" placeholder="0.00" /></div>
                        <div><label htmlFor="saturdayRate" className="block text-sm font-semibold text-gray-700 mb-1">Saturday:</label><input type="number" id="saturdayRate" value={saturdayRate} onChange={(e) => handleValueChange(setSaturdayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md" min="0" placeholder="0.00" /></div>
                        <div><label htmlFor="sundayRate" className="block text-sm font-semibold text-gray-700 mb-1">Sunday:</label><input type="number" id="sundayRate" value={sundayRate} onChange={(e) => handleValueChange(setSundayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md" min="0" placeholder="0.00" /></div>
                        {includePublicHolidays && (
                            <div className="animate-fade-in"><label htmlFor="publicHolidayRate" className="block text-sm font-semibold text-gray-700 mb-1">Public Holiday:</label><input type="number" id="publicHolidayRate" value={publicHolidayRate} onChange={(e) => handleValueChange(setPublicHolidayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md" min="0" placeholder="0.00" /></div>
                        )}
                    </div>
                    <div className="mt-4 text-center"><button onClick={setAllRatesSame} className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-md shadow-md hover:bg-indigo-600">Set All Rates Same</button></div>
                </div>
                
                <div id="budget" className="p-4 border border-teal-200 rounded-lg bg-teal-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Budget Information:</h3>
                    <div className="flex space-x-4 mb-4"><label className="inline-flex items-center"><input type="radio" className="form-radio" name="budgetOption" value="lock" checked={budgetMode === 'lock'} onChange={() => setBudgetMode('lock')}/><span className="ml-2">Lock Budget</span></label><label className="inline-flex items-center"><input type="radio" className="form-radio" name="budgetOption" value="noBudget" checked={budgetMode === 'noBudget'} onChange={() => setBudgetMode('noBudget')}/><span className="ml-2">No Budget</span></label></div>
                    {budgetMode === 'lock' && (
                        <div className="animate-fade-in">
                            <label htmlFor="budget" className="block text-sm font-semibold text-gray-700 mb-1">Your Total Budget ($):</label>
                            <input type="number" id="budget" value={budget} onChange={(e) => handleValueChange(setBudget, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md" min="0" placeholder="0.00"/>
                             <div className="mt-4 text-gray-800">
                                {totalPay === 0 && numericBudget > 0 ? (
                                    <p className="text-red-600 font-bold">Please set rates and hours to calculate.</p>
                                ) : numericBudget > 0 && totalPay > 0 ? (
                                    <>
                                    <p className="text-lg font-semibold">Budget vs. Projected: {' '}
                                        {totalPay > numericBudget ? (<span className="text-red-600 font-bold">OVER by ${formatNumber(totalPay - numericBudget)}</span>) : totalPay < numericBudget ? (<span className="text-green-600 font-bold">UNDER by ${formatNumber(numericBudget - totalPay)}</span>) : (<span className="text-blue-600 font-bold">ON BUDGET</span>)}
                                    </p>
                                    {totalPay !== numericBudget && (
                                        <div className="mt-4 text-center">
                                            <button onClick={applySuggestedHours} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-md shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition duration-150 ease-in-out">
                                                Apply Suggested Hours
                                            </button>
                                        </div>
                                    )}
                                    </>
                                ) : (<p className="text-lg font-semibold">Enter a budget to see comparison.</p>)}
                            </div>
                        </div>
                    )}
                </div>

                <div id="public-holidays" className="p-4 border border-red-200 rounded-lg bg-red-50"><h3 className="text-lg font-semibold text-gray-700 mb-3">Public Holidays:</h3><div className="flex space-x-4 mb-4"><label className="inline-flex items-center"><input type="radio" className="form-radio" name="publicHolidayOption" value="include" checked={includePublicHolidays} onChange={() => setIncludePublicHolidays(true)}/><span className="ml-2">Include</span></label><label className="inline-flex items-center"><input type="radio" className="form-radio" name="publicHolidayOption" value="skip" checked={!includePublicHolidays} onChange={() => setIncludePublicHolidays(false)}/><span className="ml-2">Skip</span></label></div>{includePublicHolidays && (<div><label htmlFor="publicHolidays">Custom Public Holidays:</label><textarea id="publicHolidays" rows="3" value={publicHolidaysInput} onChange={(e) => setPublicHolidaysInput(e.target.value)} className="w-full p-3"></textarea></div>)}</div>

                <div id="results">
                    <div className="mt-8 p-6 bg-indigo-600 rounded-xl shadow-lg text-white text-center"><h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Hours:</h2><p className="text-4xl sm:text-5xl font-extrabold mb-4">{formatNumber(totalHours)}</p><div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-left"><div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">W/day Day:</h3> <p className="text-2xl font-bold">{formatNumber(weekdayHours)}</p> </div><div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">W/day Eve:</h3> <p className="text-2xl font-bold">{formatNumber(weekdayEveningHours)}</p> </div><div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Saturday:</h3> <p className="text-2xl font-bold">{formatNumber(saturdayHours)}</p> </div><div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Sunday:</h3> <p className="text-2xl font-bold">{formatNumber(sundayHours)}</p> </div>{includePublicHolidays && (<div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Public Hol:</h3> <p className="text-2xl font-bold">{formatNumber(publicHolidayHours)}</p> </div>)}</div></div>
                    <div className="mt-6 p-6 bg-purple-700 rounded-xl shadow-lg text-white text-center"><h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Pay:</h2><p className="text-4xl sm:text-5xl font-extrabold mb-4">${formatNumber(totalPay)}</p><div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-left"><div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">W/day Day:</h3> <p className="text-2xl font-bold">${formatNumber(weekdayPay)}</p> </div><div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">W/day Eve:</h3> <p className="text-2xl font-bold">${formatNumber(weekdayEveningPay)}</p> </div><div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Saturday:</h3> <p className="text-2xl font-bold">${formatNumber(saturdayPay)}</p> </div><div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Sunday:</h3> <p className="text-2xl font-bold">${formatNumber(sundayPay)}</p> </div>{includePublicHolidays && (<div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Public Hol:</h3> <p className="text-2xl font-bold">${formatNumber(publicHolidayPay)}</p> </div>)}</div></div>
                </div>
                
                <div id="saved-quotes" className="p-4 border border-cyan-200 rounded-lg bg-cyan-50"><h3 className="text-lg font-semibold text-gray-700 mb-3">Save Calculation as Quote</h3><div className="flex flex-col sm:flex-row gap-4 items-center"><input type="text" value={quoteDescription} onChange={(e) => setQuoteDescription(e.target.value)} placeholder="e.g., Standard weekly service" className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/><button onClick={handleAddQuote} disabled={!totalPay && !totalHours} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-md shadow-md hover:bg-cyan-700 w-full sm:w-auto flex-shrink-0 disabled:bg-gray-400">Save Quote</button></div>{savedQuotes.length > 0 && (<div className="mt-6 space-y-4"><h4 className="text-md font-semibold text-gray-700">Saved Quotes:</h4>{savedQuotes.map(quote => (<div key={quote.id} className="bg-white p-4 rounded-lg shadow-md border flex justify-between items-start gap-4"><div className="flex-grow"><p className="font-bold text-gray-800">{quote.description}</p><p className="text-sm text-gray-600 mt-1"><strong>Total Pay:</strong> <span className="font-semibold">${formatNumber(quote.totalPay)}</span> | <strong>Total Hours:</strong> <span className="font-semibold">{formatNumber(quote.totalHours)}</span></p><div className="mt-2 pt-2 border-t text-xs text-gray-500 grid grid-cols-2 sm:grid-cols-3 gap-x-4"><p><strong>W/day Day:</strong> {formatNumber(quote.details.weekdayHours)} hrs / ${formatNumber(quote.details.weekdayPay)}</p><p><strong>W/day Eve:</strong> {formatNumber(quote.details.weekdayEveningHours)} hrs / ${formatNumber(quote.details.weekdayEveningPay)}</p><p><strong>Saturday:</strong> {formatNumber(quote.details.saturdayHours)} hrs / ${formatNumber(quote.details.saturdayPay)}</p><p><strong>Sunday:</strong> {formatNumber(quote.details.sundayHours)} hrs / ${formatNumber(quote.details.sundayPay)}</p>{quote.details.publicHolidayHours > 0 && (<p><strong>Public Hol:</strong> {formatNumber(quote.details.publicHolidayHours)} hrs / ${formatNumber(quote.details.publicHolidayPay)}</p>)}</div></div><button onClick={() => handleDeleteQuote(quote.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm p-1">Delete</button></div>))}</div>)}</div>
                <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded-xl text-center"><h2 className="text-xl sm:text-2xl font-bold mb-3 text-indigo-700">Period Breakdown:</h2><div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"><div className="p-3 bg-white rounded-lg shadow-sm"> <h3 className="text-lg font-semibold">Total Counted Days:</h3> <p className="text-xl font-bold">{calculatedTotalDays}</p> </div><div className="p-3 bg-white rounded-lg shadow-sm"> <h3 className="text-lg font-semibold">Counted Weekdays:</h3> <p className="text-xl font-bold">{calculatedTotalWeekdays}</p> </div><div className="p-3 bg-white rounded-lg shadow-sm"> <h3 className="text-lg font-semibold">Counted Saturdays:</h3> <p className="text-xl font-bold">{calculatedTotalSaturdays}</p> </div><div className="p-3 bg-white rounded-lg shadow-sm"> <h3 className="text-lg font-semibold">Counted Sundays:</h3> <p className="text-xl font-bold">{calculatedTotalSundays}</p> </div>{includePublicHolidays && (<div className="p-3 bg-white rounded-lg shadow-sm"><h3 className="text-lg font-semibold">Counted Public Hols:</h3><p className="text-xl font-bold">{calculatedTotalPublicHolidays}</p></div>)}<div className="p-3 bg-white rounded-lg shadow-sm"><h3 className="text-lg font-semibold">Full Weeks:</h3><p className="text-xl font-bold">{calculatedFullWeeks}</p></div><div className="p-3 bg-white rounded-lg shadow-sm"><h3 className="text-lg font-semibold">Full Fortnights:</h3><p className="text-xl font-bold">{calculatedFullFortnights}</p></div><div className="p-3 bg-white rounded-lg shadow-sm"><h3 className="text-lg font-semibold">Full Months:</h3><p className="text-xl font-bold">{calculatedFullMonths}</p></div></div></div>
            </div>
        </div>
    );
};

export default App;
