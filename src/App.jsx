import React, { useState, useEffect, useMemo, useCallback } from 'react';

// --- Constants ---
const NDIS_RATES_URL = 'https://hoursappcf.pages.dev/ndisrates2025.json';
const DEFAULT_QLD_PUBLIC_HOLIDAYS = '2025-01-01,2025-01-27,2025-04-18,2025-04-19,2025-04-20,2025-04-21,2025-04-25,2025-05-05,2025-08-13,2025-10-06,2025-12-24,2025-12-25,2025-12-26';
const WEEK_DAYS_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// --- Helper Functions ---
const getTodayDate = () => new Date().toISOString().split('T')[0];
const getOneYearFromToday = () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
};
const roundUpToTwoDecimals = (num) => typeof num === 'number' && !isNaN(num) ? Math.ceil(num * 100) / 100 : 0;
const formatNumber = (num) => typeof num === 'number' && !isNaN(num) ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';


// --- Custom Hooks ---

const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error(error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};

const useNdisRates = () => {
    const [ndisRates, setNdisRates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRates = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(NDIS_RATES_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setNdisRates(data);
            } catch (e) {
                console.error("Failed to fetch NDIS rates:", e);
                setError("Could not load NDIS rates. Check connection and refresh.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchRates();
    }, []);

    return { ndisRates, isLoading, error };
};


// --- Core Calculation Logic ---

const calculateAllTotals = (inputs) => {
    const { fromDate, toDate, recurringType, weeklyDays, includePublicHolidays, publicHolidaysInput, rates, budget, budgetMode } = inputs;
    
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return { error: 'Please enter valid "From" and "To" dates.' };
    }

    const numRates = {
        weekday: parseFloat(rates.weekday.rate) || 0,
        weekdayEvening: parseFloat(rates.weekdayEvening.rate) || 0,
        saturday: parseFloat(rates.saturday.rate) || 0,
        sunday: parseFloat(rates.sunday.rate) || 0,
        publicHoliday: parseFloat(rates.publicHoliday.rate) || 0,
    };
    
    let totals = {
        weekdayHours: 0, weekdayEveningHours: 0, saturdayHours: 0, sundayHours: 0, publicHolidayHours: 0,
        breakdown: { days: 0, weekdays: 0, saturdays: 0, sundays: 0, publicHolidays: 0 },
    };

    const holidaySet = new Set(includePublicHolidays ? publicHolidaysInput.split(',').map(d => d.trim()).filter(Boolean) : []);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayName = WEEK_DAYS_ORDER[d.getDay()];
        const dayInfo = weeklyDays[dayName];
        if (!dayInfo || !dayInfo.selected) continue;

        const hoursToday = parseFloat(dayInfo.hours) || 0;
        if (hoursToday === 0) continue;

        let shouldCount = false;
        switch (recurringType) {
            case 'Daily':
                shouldCount = true;
                break;
            case 'Weekly':
                shouldCount = true;
                break;
            case 'Fortnightly':
                const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / (1000 * 3600 * 24));
                if (Math.floor(daysSinceStart / 7) % 2 === 0) shouldCount = true;
                break;
            case 'Monthly':
                 if (d.getDate() <= 7) shouldCount = true;
                 break;
            case 'Quarterly':
                const month = d.getMonth();
                if ([0, 3, 6, 9].includes(month) && d.getDate() <= 7) {
                    shouldCount = true;
                }
                break;
            default:
                shouldCount = true;
                break;
        }

        if (shouldCount) {
            totals.breakdown.days++;
            const currentDateString = d.toISOString().split('T')[0];
            const isHoliday = holidaySet.has(currentDateString);

            if (isHoliday) {
                totals.publicHolidayHours += hoursToday;
                totals.breakdown.publicHolidays++;
            } else if (dayName === 'Saturday') {
                totals.saturdayHours += hoursToday;
                totals.breakdown.saturdays++;
            } else if (dayName === 'Sunday') {
                totals.sundayHours += hoursToday;
                totals.breakdown.sundays++;
            } else {
                totals.breakdown.weekdays++;
                if (dayInfo.shift === 'evening') {
                    totals.weekdayEveningHours += hoursToday;
                } else {
                    totals.weekdayHours += hoursToday;
                }
            }
        }
    }

    const totalHours = totals.weekdayHours + totals.weekdayEveningHours + totals.saturdayHours + totals.sundayHours + totals.publicHolidayHours;
    
    const pay = {
        weekdayPay: totals.weekdayHours * numRates.weekday,
        weekdayEveningPay: totals.weekdayEveningHours * numRates.weekdayEvening,
        saturdayPay: totals.saturdayHours * numRates.saturday,
        sundayPay: totals.sundayHours * numRates.sunday,
        publicHolidayPay: totals.publicHolidayHours * numRates.publicHoliday,
    };
    
    const totalPay = Object.values(pay).reduce((sum, p) => sum + p, 0);

    let monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 - start.getMonth() + end.getMonth();
    if (end.getDate() < start.getDate() && monthsDiff > 0) monthsDiff--;

    return {
        totalHours: roundUpToTwoDecimals(totalHours),
        totalPay: roundUpToTwoDecimals(totalPay),
        weekdayHours: roundUpToTwoDecimals(totals.weekdayHours),
        weekdayEveningHours: roundUpToTwoDecimals(totals.weekdayEveningHours),
        saturdayHours: roundUpToTwoDecimals(totals.saturdayHours),
        sundayHours: roundUpToTwoDecimals(totals.sundayHours),
        publicHolidayHours: roundUpToTwoDecimals(totals.publicHolidayHours),
        weekdayPay: roundUpToTwoDecimals(pay.weekdayPay),
        weekdayEveningPay: roundUpToTwoDecimals(pay.weekdayEveningPay),
        saturdayPay: roundUpToTwoDecimals(pay.saturdayPay),
        sundayPay: roundUpToTwoDecimals(pay.sundayPay),
        publicHolidayPay: roundUpToTwoDecimals(pay.publicHolidayPay),
        calculatedTotalDays: totals.breakdown.days,
        calculatedTotalWeekdays: totals.breakdown.weekdays,
        calculatedTotalSaturdays: totals.breakdown.saturdays,
        calculatedTotalSundays: totals.breakdown.sundays,
        calculatedTotalPublicHolidays: totals.breakdown.publicHolidays,
        calculatedFullWeeks: Math.floor(totals.breakdown.days / 7),
        calculatedFullFortnights: Math.floor(totals.breakdown.days / 14),
        calculatedFullMonths: Math.max(0, monthsDiff),
        error: null
    };
};


// --- Child Components ---

const SearchableDropdown = ({ label, items, onSelectItem, includeKeywords = [], excludeKeywords = [], isLoading, value }) => {
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        setSearchTerm(value || '');
    }, [value]);

    const filteredItems = useMemo(() => {
        if (isLoading || !items) return [];
        const preFiltered = items.filter(item => {
            const itemNameLower = (item["Support Item Name"] || '').toLowerCase();
            return includeKeywords.every(keyword => itemNameLower.includes(keyword)) &&
                   !excludeKeywords.some(keyword => itemNameLower.includes(keyword));
        });
        if (!searchTerm.trim()) return [];
        const searchWords = searchTerm.toLowerCase().replace(/[-/]/g, ' ').split(' ').filter(Boolean);
        return preFiltered.filter(item => {
            const itemName = (item["Support Item Name"] || '').toLowerCase().replace(/[-/]/g, ' ');
            const itemNumber = (item["Support Item Number"] || '').toLowerCase();
            return itemNumber.includes(searchTerm.toLowerCase()) || searchWords.every(word => itemName.includes(word));
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
                placeholder={isLoading ? "Loading rates..." : "Search..."}
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

const FloatingNav = ({ totalPay, totalHours }) => {
    const navItems = [
        { href: '#date-range-section', label: 'Date Range & Recurring Type', textColor: 'text-blue-700', hoverTextColor: 'hover:text-blue-800' },
        { href: '#applicable-days', label: 'Applicable Days & Hours', textColor: 'text-yellow-800', hoverTextColor: 'hover:text-yellow-900' },
        { href: '#ndis-rates', label: 'NDIS Rate Finder', textColor: 'text-sky-700', hoverTextColor: 'hover:text-sky-800' },
        { href: '#hourly-rates', label: 'Manual Hourly Rates', textColor: 'text-green-700', hoverTextColor: 'hover:text-green-800' },
        { href: '#public-holidays', label: 'Public Holidays', textColor: 'text-red-700', hoverTextColor: 'hover:text-red-800' },
        { href: '#results', label: 'Results', textColor: 'text-indigo-600', hoverTextColor: 'hover:text-indigo-700' },
        { href: '#saved-quotes', label: 'Saved Quotes', textColor: 'text-cyan-700', hoverTextColor: 'hover:text-cyan-800' },
    ];
    
    useEffect(() => {
        document.documentElement.style.scrollBehavior = 'smooth';
        return () => { document.documentElement.style.scrollBehavior = 'auto'; };
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
                            <a href={item.href} className={`block text-center text-sm font-semibold ${item.textColor} ${item.hoverTextColor} hover:bg-gray-100 p-2 rounded-md transition-colors`}>
                                {item.label}
                            </a>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
};

const Section = ({ id, title, children, color = 'blue' }) => (
    <div id={id} className={`p-4 border border-${color}-200 rounded-lg bg-${color}-50`}>
        {title && <h3 className="text-lg font-semibold text-gray-700 mb-3">{title}</h3>}
        {children}
    </div>
);

const DateRangeSection = ({ fromDate, toDate, setFromDate, setToDate, recurringType, setRecurringType }) => (
    <Section id="date-range-section" color="blue">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div><label htmlFor="fromDate" className="block text-sm font-semibold text-gray-700 mb-1">From Date:</label><input type="date" id="fromDate" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/></div>
            <div><label htmlFor="toDate" className="block text-sm font-semibold text-gray-700 mb-1">To Date:</label><input type="date" id="toDate" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/></div>
        </div>
         <div className="mt-4">
            <label htmlFor="recurringType" className="block text-lg font-semibold text-gray-700 mb-2">Recurring Type:</label>
            <select id="recurringType" value={recurringType} onChange={e => setRecurringType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm bg-white">
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Fortnightly">Fortnightly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
            </select>
        </div>
    </Section>
);

const ApplicableDaysSection = ({ weeklyDays, handlers }) => (
    <Section id="applicable-days" title="Applicable Days & Hours per Day" color="yellow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(weeklyDays).map(([day, { selected, hours, shift }]) => {
                const isWeekday = !['Saturday', 'Sunday'].includes(day);
                return (
                    <div key={day} className="bg-white p-3 rounded-md shadow-sm border border-gray-200 space-y-2">
                        <div className="flex items-center space-x-2">
                            <input type="checkbox" id={`day-${day}`} checked={selected} onChange={() => handlers.handleWeeklyDayChange(day)} className="form-checkbox h-5 w-5 text-indigo-600 rounded"/>
                            <label htmlFor={`day-${day}`} className="text-sm font-medium text-gray-700 flex-grow">{day}:</label>
                            <input type="number" value={hours} onChange={(e) => handlers.handleWeeklyHoursChange(day, e.target.value)} onFocus={handlers.handleFocus} className="w-20 p-2 border border-gray-300 rounded-md text-sm text-center" min="0" max="24" placeholder="0"/>
                        </div>
                        {isWeekday && (
                            <div className={`flex items-center justify-center space-x-2 text-xs transition-opacity ${!selected ? 'opacity-40' : 'opacity-100'}`}>
                                <span className={`font-semibold ${shift === 'day' ? 'text-blue-600' : 'text-gray-400'}`}>Day</span>
                                <button onClick={() => handlers.handleShiftChange(day)} disabled={!selected} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${shift === 'evening' ? 'bg-indigo-600' : 'bg-gray-300'} disabled:cursor-not-allowed`}><span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${shift === 'evening' ? 'translate-x-6' : 'translate-x-1'}`}/></button>
                                <span className={`font-semibold ${shift === 'evening' ? 'text-indigo-600' : 'text-gray-400'}`}>Evening</span>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    </Section>
);

const NdisRateFinderSection = ({ rates, ndisRates, isLoading, handleNdisRateSelect }) => {
    const rateFinderConfig = [
        { key: 'weekday', label: 'Weekday Day', include: [], exclude: ['evening', 'saturday', 'sunday', 'public holiday'] },
        { key: 'weekdayEvening', label: 'Weekday Evening', include: ['weekday', 'evening'], exclude: [] },
        { key: 'saturday', label: 'Saturday', include: ['saturday'], exclude: [] },
        { key: 'sunday', label: 'Sunday', include: ['sunday'], exclude: [] },
        { key: 'publicHoliday', label: 'Public Holiday', include: ['public holiday'], exclude: [] },
    ];

    return (
        <Section id="ndis-rates" title="NDIS Rate Finder" color="sky">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                {rateFinderConfig.map(config => (
                    <div key={config.key}>
                        <SearchableDropdown
                            label={config.label}
                            items={ndisRates}
                            value={rates[config.key].name}
                            onSelectItem={item => handleNdisRateSelect(config.key, item)}
                            includeKeywords={config.include}
                            excludeKeywords={config.exclude}
                            isLoading={isLoading}
                        />
                        {rates[config.key].number && (
                             <p className="text-xs font-mono text-gray-700 mt-1 px-1 select-all">
                                {rates[config.key].number}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </Section>
    );
};

const ManualRatesSection = ({ rates, handlers }) => (
    <Section id="hourly-rates" title="Manual Hourly Rates" color="green">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div><label className="block text-sm font-semibold mb-1">Weekday Day:</label><input type="number" value={rates.weekday.rate} onChange={e => handlers.handleRateChange('weekday', e.target.value)} onFocus={handlers.handleFocus} className="w-full p-3 border rounded-md" min="0" placeholder="0.00" /></div>
            <div><label className="block text-sm font-semibold mb-1">Weekday Eve:</label><input type="number" value={rates.weekdayEvening.rate} onChange={e => handlers.handleRateChange('weekdayEvening', e.target.value)} onFocus={handlers.handleFocus} className="w-full p-3 border rounded-md" min="0" placeholder="0.00" /></div>
            <div><label className="block text-sm font-semibold mb-1">Saturday:</label><input type="number" value={rates.saturday.rate} onChange={e => handlers.handleRateChange('saturday', e.target.value)} onFocus={handlers.handleFocus} className="w-full p-3 border rounded-md" min="0" placeholder="0.00" /></div>
            <div><label className="block text-sm font-semibold mb-1">Sunday:</label><input type="number" value={rates.sunday.rate} onChange={e => handlers.handleRateChange('sunday', e.target.value)} onFocus={handlers.handleFocus} className="w-full p-3 border rounded-md" min="0" placeholder="0.00" /></div>
            <div><label className="block text-sm font-semibold mb-1">Public Holiday:</label><input type="number" value={rates.publicHoliday.rate} onChange={e => handlers.handleRateChange('publicHoliday', e.target.value)} onFocus={handlers.handleFocus} className="w-full p-3 border rounded-md" min="0" placeholder="0.00" /></div>
        </div>
        <div className="mt-4 text-center"><button onClick={handlers.setAllRatesSame} className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-md shadow-md hover:bg-indigo-600">Set All Rates Same as Weekday Day</button></div>
    </Section>
);

const ResultsSection = ({ results }) => (
    <div id="results">
        <div className="mt-8 p-6 bg-indigo-600 rounded-xl shadow-lg text-white text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Hours:</h2>
            <p className="text-4xl sm:text-5xl font-extrabold mb-4">{formatNumber(results.totalHours)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-left">
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">W/day Day:</h3> <p className="text-2xl font-bold">{formatNumber(results.weekdayHours)}</p> </div>
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">W/day Eve:</h3> <p className="text-2xl font-bold">{formatNumber(results.weekdayEveningHours)}</p> </div>
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Saturday:</h3> <p className="text-2xl font-bold">{formatNumber(results.saturdayHours)}</p> </div>
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Sunday:</h3> <p className="text-2xl font-bold">{formatNumber(results.sundayHours)}</p> </div>
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Public Hol:</h3> <p className="text-2xl font-bold">{formatNumber(results.publicHolidayHours)}</p> </div>
            </div>
        </div>
        <div className="mt-6 p-6 bg-purple-700 rounded-xl shadow-lg text-white text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Pay:</h2>
            <p className="text-4xl sm:text-5xl font-extrabold mb-4">${formatNumber(results.totalPay)}</p>
             <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-left">
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">W/day Day:</h3> <p className="text-2xl font-bold">${formatNumber(results.weekdayPay)}</p> </div>
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">W/day Eve:</h3> <p className="text-2xl font-bold">${formatNumber(results.weekdayEveningPay)}</p> </div>
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Saturday:</h3> <p className="text-2xl font-bold">${formatNumber(results.saturdayPay)}</p> </div>
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Sunday:</h3> <p className="text-2xl font-bold">${formatNumber(results.sundayPay)}</p> </div>
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Public Hol:</h3> <p className="text-2xl font-bold">${formatNumber(results.publicHolidayPay)}</p> </div>
            </div>
        </div>
    </div>
);

const SavedQuoteItem = ({ quote, onDelete }) => {
    const quoteDetails = useMemo(() => {
        if (!quote.results || !quote.rates) return [];
        return [
            { label: 'Weekday Day', hours: quote.results.weekdayHours, pay: quote.results.weekdayPay, rateInfo: quote.rates.weekday },
            { label: 'Weekday Evening', hours: quote.results.weekdayEveningHours, pay: quote.results.weekdayEveningPay, rateInfo: quote.rates.weekdayEvening },
            { label: 'Saturday', hours: quote.results.saturdayHours, pay: quote.results.saturdayPay, rateInfo: quote.rates.saturday },
            { label: 'Sunday', hours: quote.results.sundayHours, pay: quote.results.sundayPay, rateInfo: quote.rates.sunday },
            { label: 'Public Holiday', hours: quote.results.publicHolidayHours, pay: quote.results.publicHolidayPay, rateInfo: quote.rates.publicHoliday },
        ].filter(detail => detail.hours > 0 && detail.rateInfo);
    }, [quote]);

    return (
        <div className="bg-white p-4 rounded-lg shadow-md border">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                    <p className="font-bold text-gray-800">{quote.description}</p>
                    <p className="text-sm text-gray-600 mt-1">
                        <strong>Total Pay:</strong> <span className="font-semibold">${formatNumber(quote.totalPay)}</span> | <strong>Total Hours:</strong> <span className="font-semibold">{formatNumber(quote.totalHours)}</span>
                    </p>
                </div>
                <button onClick={() => onDelete(quote.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm p-1 flex-shrink-0">Delete</button>
            </div>
            
            <div className="mt-4 pt-4 border-t overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="p-2 font-semibold">Service</th>
                            <th className="p-2 font-semibold">Item Name & Number</th>
                            <th className="p-2 font-semibold text-right">Rate</th>
                            <th className="p-2 font-semibold text-right">Hours</th>
                            <th className="p-2 font-semibold text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quoteDetails.map(detail => (
                            <tr key={detail.label} className="border-b">
                                <td className="p-2">{detail.label}</td>
                                <td className="p-2">
                                    <p>{detail.rateInfo.name || 'N/A'}</p>
                                    <p className="font-mono text-xs text-gray-600">{detail.rateInfo.number || 'Manual Rate'}</p>
                                </td>
                                <td className="p-2 text-right">${formatNumber(parseFloat(detail.rateInfo.rate))}</td>
                                <td className="p-2 text-right">{formatNumber(detail.hours)}</td>
                                <td className="p-2 text-right font-semibold">${formatNumber(detail.pay)}</td>
                            </tr>
                        ))}
                    </tbody>
                     <tfoot className="font-bold">
                        <tr>
                            <td colSpan="3" className="p-2 text-right">Grand Total:</td>
                            <td className="p-2 text-right">{formatNumber(quote.totalHours)}</td>
                            <td className="p-2 text-right">${formatNumber(quote.totalPay)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const SavedQuotesSection = ({ savedQuotes, handlers, quoteDescription, setQuoteDescription, rates, results }) => (
    <Section id="saved-quotes" title="Save Calculation as Quote" color="cyan">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
            <input type="text" value={quoteDescription} onChange={e => setQuoteDescription(e.target.value)} placeholder="e.g., Standard weekly service" className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/>
            <button onClick={() => handlers.handleAddQuote({ rates, results })} disabled={!results.totalPay && !results.totalHours} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-md shadow-md hover:bg-cyan-700 w-full sm:w-auto flex-shrink-0 disabled:bg-gray-400">Save Quote</button>
        </div>
        {savedQuotes.length > 0 && (
            <div className="mt-6 space-y-4">
                <h4 className="text-md font-semibold text-gray-700">Saved Quotes:</h4>
                {savedQuotes.map(quote => (
                    <SavedQuoteItem key={quote.id} quote={quote} onDelete={handlers.handleDeleteQuote} />
                ))}
            </div>
        )}
    </Section>
);

const PeriodBreakdownSection = ({ results }) => (
    <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded-xl text-center">
        <h2 className="text-xl sm:text-2xl font-bold mb-3 text-indigo-700">Period Breakdown:</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold">Counted Days:</h3>
                <p className="text-xl font-bold">{results.calculatedTotalDays}</p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold">Counted Weekdays:</h3>
                <p className="text-xl font-bold">{results.calculatedTotalWeekdays}</p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold">Counted Saturdays:</h3>
                <p className="text-xl font-bold">{results.calculatedTotalSaturdays}</p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold">Counted Sundays:</h3>
                <p className="text-xl font-bold">{results.calculatedTotalSundays}</p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold">Public Hols:</h3>
                <p className="text-xl font-bold">{results.calculatedTotalPublicHolidays}</p>
            </div>
            <div className="p-3 bg-white rounded-lg shadow-sm">
                <h3 className="text-lg font-semibold">Full Weeks:</h3>
                <p className="text-xl font-bold">{results.calculatedFullWeeks}</p>
            </div>
        </div>
    </div>
);


// --- Main App Component ---
const App = () => {
    // --- State ---
    const [fromDate, setFromDate] = useState(getTodayDate());
    const [toDate, setToDate] = useState(getOneYearFromToday());
    const [recurringType, setRecurringType] = useState('Weekly');
    const [weeklyDays, setWeeklyDays] = useState({
        Monday: { selected: false, hours: '', shift: 'day' }, Tuesday: { selected: false, hours: '', shift: 'day' },
        Wednesday: { selected: false, hours: '', shift: 'day' }, Thursday: { selected: false, hours: '', shift: 'day' },
        Friday: { selected: false, hours: '', shift: 'day' }, Saturday: { selected: false, hours: '', shift: 'day' },
        Sunday: { selected: false, hours: '', shift: 'day' },
    });
    const [rates, setRates] = useState({
        weekday: { name: '', rate: '', number: '' },
        weekdayEvening: { name: '', rate: '', number: '' },
        saturday: { name: '', rate: '', number: '' },
        sunday: { name: '', rate: '', number: '' },
        publicHoliday: { name: '', rate: '', number: '' }
    });
    const [includePublicHolidays, setIncludePublicHolidays] = useState(true);
    const [publicHolidaysInput, setPublicHolidaysInput] = useState(DEFAULT_QLD_PUBLIC_HOLIDAYS);
    const [quoteDescription, setQuoteDescription] = useState('');
    const [savedQuotes, setSavedQuotes] = useLocalStorage('savedQuotes', []);
    const [error, setError] = useState('');

    // --- Data Fetching ---
    const { ndisRates, isLoading: isLoadingRates, error: rateError } = useNdisRates();
    
    // --- Calculations ---
    const calculationResults = useMemo(() => calculateAllTotals({
        fromDate, toDate, recurringType, weeklyDays, includePublicHolidays, publicHolidaysInput, rates
    }), [fromDate, toDate, recurringType, weeklyDays, includePublicHolidays, publicHolidaysInput, rates]);
    
    useEffect(() => {
        if (calculationResults.error) {
            setError(calculationResults.error);
        } else {
            setError(''); 
        }
    }, [calculationResults.error]);
    
    // --- Handlers ---
    const handleFocus = (event) => event.target.select();
    
    const dayHandlers = {
        handleWeeklyDayChange: (day) => setWeeklyDays(p => ({ ...p, [day]: { ...p[day], selected: !p[day].selected } })),
        handleShiftChange: (day) => setWeeklyDays(p => ({ ...p, [day]: { ...p[day], shift: p[day].shift === 'day' ? 'evening' : 'day' } })),
        handleWeeklyHoursChange: (day, value) => {
             if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 24)) {
                setWeeklyDays(p => ({ ...p, [day]: { ...p[day], hours: value } }));
             }
        },
        handleFocus,
    };

    const rateHandlers = {
        handleRateChange: (rateName, value) => {
            if (value === '' || !isNaN(parseFloat(value))) {
                setRates(prev => ({ ...prev, [rateName]: { name: '', number: '', rate: value } }));
            }
        },
        setAllRatesSame: () => {
            const baseRate = rates.weekday.rate;
            const newRates = {};
            for (const key in rates) {
                newRates[key] = { ...rates[key], rate: baseRate };
            }
            setRates(newRates);
        },
        handleFocus,
    };

    const handleNdisRateSelect = useCallback((rateType, item) => {
        const getInfoFromItem = (i) => ({
            name: i["Support Item Name"],
            rate: (i.QLD || 0).toString(),
            number: i["Support Item Number"]
        });
        
        const selectedRateInfo = getInfoFromItem(item);

        if (rateType === 'weekday') {
            const newRatesToUpdate = { weekday: selectedRateInfo };
            const itemName = item["Support Item Name"].toLowerCase();
            const baseName = itemName.replace(/ - (weekday|saturday|sunday|public holiday|evening|night|daytime|day).*/, '').trim();

            const rateMappings = {
                weekdayEvening: ['evening', 'night'],
                saturday: ['saturday'],
                sunday: ['sunday'],
                publicHoliday: ['public holiday'],
            };

            for (const [key, keywords] of Object.entries(rateMappings)) {
                const foundItem = ndisRates.find(rateItem => {
                    const currentItemName = rateItem["Support Item Name"].toLowerCase();
                    return currentItemName.includes(baseName) && keywords.some(kw => currentItemName.includes(kw));
                });
                if (foundItem) {
                    newRatesToUpdate[key] = getInfoFromItem(foundItem);
                }
            }
            setRates(prev => ({ ...prev, ...newRatesToUpdate }));
        } else {
            setRates(prev => ({ ...prev, [rateType]: selectedRateInfo }));
        }
    }, [ndisRates]);

    const quoteHandlers = {
        handleAddQuote: ({ rates, results }) => {
            if (!quoteDescription.trim()) { setError('Please enter a description for the quote.'); return; }
            const newQuote = { 
                id: crypto.randomUUID(), 
                description: quoteDescription.trim(), 
                totalPay: results.totalPay, 
                totalHours: results.totalHours,
                rates,
                results
            };
            setSavedQuotes(p => [...p, newQuote]);
            setQuoteDescription('');
            setError('');
        },
        handleDeleteQuote: (id) => setSavedQuotes(p => p.filter(q => q.id !== id)),
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 font-sans antialiased text-gray-800 flex items-center justify-center">
            <FloatingNav totalPay={calculationResults.totalPay} totalHours={calculationResults.totalHours} />
            <main className="max-w-4xl w-full bg-white shadow-xl rounded-xl p-6 sm:p-8 space-y-6">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-indigo-700 mb-8">
                    Hours & Pay Forecasting App
                </h1>
                
                {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md"><strong className="font-bold">Error: </strong><span className="ml-2">{error}</span></div>)}
                {rateError && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md"><strong className="font-bold">Rate Loading Error: </strong><span className="ml-2">{rateError}</span></div>)}
                
                <DateRangeSection fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} recurringType={recurringType} setRecurringType={setRecurringType} />
                <ApplicableDaysSection weeklyDays={weeklyDays} handlers={dayHandlers} />
                <NdisRateFinderSection rates={rates} ndisRates={ndisRates} isLoading={isLoadingRates} handleNdisRateSelect={handleNdisRateSelect} />
                <ManualRatesSection rates={rates} handlers={rateHandlers} />
                <Section id="public-holidays" title="Public Holidays" color="red">
                    <div className="flex space-x-4 mb-4">
                        <label className="inline-flex items-center"><input type="radio" className="form-radio" checked={includePublicHolidays} onChange={() => setIncludePublicHolidays(true)}/><span className="ml-2">Include</span></label>
                        <label className="inline-flex items-center"><input type="radio" className="form-radio" checked={!includePublicHolidays} onChange={() => setIncludePublicHolidays(false)}/><span className="ml-2">Skip</span></label>
                    </div>
                    {includePublicHolidays && (<div><label htmlFor="publicHolidays" className="block text-sm font-semibold text-gray-700 mb-1">Custom Public Holidays (comma-separated, accepter-MM-DD):</label><textarea id="publicHolidays" rows="3" value={publicHolidaysInput} onChange={e => setPublicHolidaysInput(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md"></textarea></div>)}
                </Section>
                
                <ResultsSection results={calculationResults} />

                <SavedQuotesSection 
                    savedQuotes={savedQuotes} 
                    handlers={quoteHandlers} 
                    quoteDescription={quoteDescription} 
                    setQuoteDescription={setQuoteDescription} 
                    rates={rates} 
                    results={calculationResults} 
                />

                <PeriodBreakdownSection results={calculationResults} />
            </main>
        </div>
    );
};

export default App;
