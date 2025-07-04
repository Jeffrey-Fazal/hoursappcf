import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

// --- Constants ---
// URLs for fetching external data. These are hosted on a public Cloudflare Pages instance.
const NDIS_RATES_URL = 'https://hoursappcf.pages.dev/ndisrates2025.json';
const SERVICE_AGREEMENT_URL = 'https://hoursappcf.pages.dev/sa-sjon-generic.json';
// URLs for header and footer images used in the generated service agreement.
const HEADER_IMAGE_URL = 'https://hoursappcf.pages.dev/images/pc-header.png';
const FOOTER_IMAGE_URL = 'https://hoursappcf.pages.dev/images/pc-footer.png';
// Default public holidays for Queensland, 2025.
const DEFAULT_QLD_PUBLIC_HOLIDAYS = '2025-01-01,2025-01-27,2025-04-18,2025-04-19,2025-04-21,2025-04-25,2025-05-05,2025-08-13,2025-10-06,2025-12-25,2025-12-26';
// An array to map the numeric day of the week from Date.getDay() to a string.
const WEEK_DAYS_ORDER = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
// Constant object holding the service provider's details for the service agreement.
const PROVIDER_DETAILS = {
    name: 'Pivotal Connect Pty Ltd',
    abn: '32 674 328 182',
    email: 'info@pivotalconnect.com.au',
    address: 'Parcel Collect 10302 37732, Shop 32 357, Redbank Plains Road, Redbank Plains, 4301, QLD'
};

// --- Helper Functions ---
// Returns the current date in 'YYYY-MM-DD' format.
const getTodayDate = () => new Date().toISOString().split('T')[0];
// Returns the date one year from today in 'YYYY-MM-DD' format.
const getOneYearFromToday = () => {
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    return nextYear.toISOString().split('T')[0];
};
// Rounds a number up to two decimal places, essential for financial calculations.
const roundUpToTwoDecimals = (num) => typeof num === 'number' && !isNaN(num) ? Math.ceil(num * 100) / 100 : 0;
// Formats a number to a string with two decimal places and thousand separators for display.
const formatNumber = (num) => typeof num === 'number' && !isNaN(num) ? num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

// --- Custom Hooks ---
/**
 * A custom hook to persist state in the browser's local storage.
 * @param {string} key The key to use for local storage.
 * @param {*} initialValue The initial value if no value is found in local storage.
 * @returns A state and a function to update it, similar to useState.
 */
const useLocalStorage = (key, initialValue) => {
    const [storedValue, setStoredValue] = useState(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error("Error reading from localStorage", error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(storedValue));
        } catch (error) {
            console.error("Error writing to localStorage", error);
        }
    }, [key, storedValue]);

    return [storedValue, setStoredValue];
};

/**
 * A generic custom hook to handle fetching JSON data from a URL.
 * It manages loading and error states for the asynchronous request.
 * @param {string} url The URL to fetch data from.
 * @param {*} initialData The initial data state before the fetch completes.
 * @returns An object containing the fetched data, loading state, and error state.
 */
const useFetchData = (url, initialData = null) => {
    const [data, setData] = useState(initialData);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const jsonData = await response.json();
                setData(jsonData);
            } catch (e) {
                console.error(`Failed to fetch from ${url}:`, e);
                setError("Could not load required data. Please check your connection and refresh.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [url]);

    return { data, isLoading, error };
};

// --- Core Calculation Logic ---
/**
 * The main calculation engine of the application.
 * It takes all user inputs and calculates the breakdown of hours and pay.
 * @param {object} inputs An object containing all necessary state values for calculation.
 * @returns {object} An object with all calculated totals, breakdowns, and any potential errors.
 */
const calculateAllTotals = (inputs) => {
    const { fromDate, toDate, recurringType, weeklyDays, includePublicHolidays, publicHolidaysInput, rates } = inputs;
    
    const start = new Date(fromDate + 'T00:00:00');
    const end = new Date(toDate + 'T00:00:00');

    // Return a default error state if dates are invalid.
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
        return { 
            error: 'Please enter valid "From" and "To" dates.',
            totalHours: 0, totalPay: 0, weekdayHours: 0, weekdayEveningHours: 0,
            saturdayHours: 0, sundayHours: 0, publicHolidayHours: 0, weekdayPay: 0,
            weekdayEveningPay: 0, saturdayPay: 0, sundayPay: 0, publicHolidayPay: 0,
            calculatedTotalDays: 0, calculatedTotalWeekdays: 0, calculatedTotalSaturdays: 0,
            calculatedTotalSundays: 0, calculatedTotalPublicHolidays: 0, calculatedFullWeeks: 0
        };
    }

    // Convert rate strings to numbers for calculation.
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

    // Loop through each day in the selected date range.
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dayName = WEEK_DAYS_ORDER[d.getDay()];
        const dayInfo = weeklyDays[dayName];
        if (!dayInfo || !dayInfo.selected) continue;

        const hoursToday = parseFloat(dayInfo.hours) || 0;
        if (hoursToday === 0) continue;

        // Determine if the day should be counted based on the recurrence type.
        let shouldCount = false;
        switch (recurringType) {
            case 'Daily': shouldCount = true; break;
            case 'Weekly': shouldCount = true; break;
            case 'Fortnightly':
                const daysSinceStart = Math.floor((d.getTime() - start.getTime()) / (1000 * 3600 * 24));
                if (Math.floor(daysSinceStart / 7) % 2 === 0) shouldCount = true;
                break;
            case 'Monthly':
                 if (d.getDate() <= 7) shouldCount = true; // Assuming services occur in the first week of the month.
                 break;
            case 'Quarterly':
                const month = d.getMonth(); // 0-11
                if ([0, 3, 6, 9].includes(month) && d.getDate() <= 7) shouldCount = true; // Assuming services occur in the first week of Jan, Apr, Jul, Oct.
                break;
            default: shouldCount = true; break;
        }

        // If the day should be counted, categorize it and add the hours.
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
    
    // Calculate pay for each category.
    const pay = {
        weekdayPay: totals.weekdayHours * numRates.weekday,
        weekdayEveningPay: totals.weekdayEveningHours * numRates.weekdayEvening,
        saturdayPay: totals.saturdayHours * numRates.saturday,
        sundayPay: totals.sundayHours * numRates.sunday,
        publicHolidayPay: totals.publicHolidayHours * numRates.publicHoliday,
    };
    
    const totalPay = Object.values(pay).reduce((sum, p) => sum + p, 0);
    
    // Return all calculated values, rounded for financial accuracy.
    return {
        totalHours: roundUpToTwoDecimals(totalHours), totalPay: roundUpToTwoDecimals(totalPay),
        weekdayHours: roundUpToTwoDecimals(totals.weekdayHours), weekdayEveningHours: roundUpToTwoDecimals(totals.weekdayEveningHours),
        saturdayHours: roundUpToTwoDecimals(totals.saturdayHours), sundayHours: roundUpToTwoDecimals(totals.sundayHours),
        publicHolidayHours: roundUpToTwoDecimals(totals.publicHolidayHours), weekdayPay: roundUpToTwoDecimals(pay.weekdayPay),
        weekdayEveningPay: roundUpToTwoDecimals(pay.weekdayEveningPay), saturdayPay: roundUpToTwoDecimals(pay.saturdayPay),
        sundayPay: roundUpToTwoDecimals(pay.sundayPay), publicHolidayPay: roundUpToTwoDecimals(pay.publicHolidayPay),
        calculatedTotalDays: totals.breakdown.days, calculatedTotalWeekdays: totals.breakdown.weekdays,
        calculatedTotalSaturdays: totals.breakdown.saturdays, calculatedTotalSundays: totals.breakdown.sundays,
        calculatedTotalPublicHolidays: totals.breakdown.publicHolidays, calculatedFullWeeks: Math.floor(totals.breakdown.days / 7),
        error: null
    };
};

// --- Child Components ---
// A reusable component for creating styled sections with a title.
const Section = ({ id, title, children, color = 'blue', className = '' }) => (
    <div id={id} className={`p-4 sm:p-6 border border-${color}-200 rounded-lg bg-${color}-50 ${className}`}>
        {title && <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>}
        {children}
    </div>
);

// A floating navigation bar on the right side of the screen for easy navigation.
const FloatingNav = ({ totalPay, totalHours, transportCost }) => {
    const navItems = [
        { href: '#date-range-section', label: '1. Date & Recurrence' },
        { href: '#budget', label: '2. Budget Information'},
        { href: '#applicable-days', label: '3. Applicable Days & Hours' },
        { href: '#ndis-rates', label: '4. NDIS Rate Finder' },
        { href: '#transport-calculator', label: '5. Transport Calculator' },
        { href: '#hourly-rates', label: '6. Manual Rates' },
        { href: '#public-holidays', label: '7. Public Holidays' },
        { href: '#results', label: 'Results' },
        { href: '#saved-quotes', label: '8. Saved Quotes' },
        { href: '#service-agreement', label: '9. Service Agreement'},
    ];
    
    useEffect(() => {
        document.documentElement.style.scrollBehavior = 'smooth';
        return () => { document.documentElement.style.scrollBehavior = 'auto'; };
    }, []);
    
    const grandTotal = totalPay + transportCost;

    return (
        <div className="fixed top-1/2 right-4 transform -translate-y-1/2 bg-white/80 backdrop-blur-sm shadow-2xl rounded-xl p-4 border border-gray-200 w-64 hidden lg:block no-print">
            <div className="text-center mb-4 pb-4 border-b">
                <p className="text-sm font-semibold text-gray-600">Total Projected Budget</p>
                <p className="text-2xl font-bold text-purple-700">${formatNumber(grandTotal)}</p>
                <p className="text-sm font-semibold text-gray-600 mt-2">Total Projected Hours</p>
                <p className="text-2xl font-bold text-indigo-700">{formatNumber(totalHours)}</p>
            </div>
            <nav><ul className="space-y-2">{navItems.map(item => (<li key={item.href}><a href={item.href} className="block text-center text-sm font-semibold text-gray-700 hover:text-indigo-600 hover:bg-gray-100 p-2 rounded-md transition-colors">{item.label}</a></li>))}</ul></nav>
        </div>
    );
};

// Component for selecting the date range and recurrence type.
const DateRangeSection = ({ fromDate, toDate, setFromDate, setToDate, recurringType, setRecurringType }) => (
    <Section id="date-range-section" title="1. Date Range & Recurring Type" color="blue">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div><label htmlFor="fromDate" className="block text-sm font-semibold text-gray-700 mb-1">From Date:</label><input type="date" id="fromDate" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/></div>
            <div><label htmlFor="toDate" className="block text-sm font-semibold text-gray-700 mb-1">To Date:</label><input type="date" id="toDate" value={toDate} onChange={e => setToDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/></div>
        </div>
        <div className="mt-4">
            <label htmlFor="recurringType" className="block text-sm font-semibold text-gray-700 mb-1">Recurring Type:</label>
            <select id="recurringType" value={recurringType} onChange={e => setRecurringType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm bg-white">
                <option value="Daily">Daily</option><option value="Weekly">Weekly</option><option value="Fortnightly">Fortnightly</option>
                <option value="Monthly">Monthly</option><option value="Quarterly">Quarterly</option>
            </select>
        </div>
    </Section>
);

// Component for selecting which days of the week services apply to and their hours.
const ApplicableDaysSection = ({ weeklyDays, handlers, suggestedDailyHours }) => (
    <Section id="applicable-days" title="3. Applicable Days & Hours per Day" color="yellow">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(weeklyDays).map(([day, { selected, hours, shift }]) => {
                const isWeekday = !['Saturday', 'Sunday'].includes(day);
                const suggestion = suggestedDailyHours[day]?.hours;
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
                        {suggestion > 0 && selected && (<p className="text-xs text-center text-teal-600 font-semibold">Suggested: {formatNumber(suggestion)} hrs</p>)}
                    </div>
                )
            })}
        </div>
    </Section>
);

// A reusable dropdown component with search functionality.
const SearchableDropdown = ({ label, items, onSelectItem, includeKeywords = [], excludeKeywords = [], isLoading, value }) => {
    const [searchTerm, setSearchTerm] = useState(value || '');
    const [isFocused, setIsFocused] = useState(false);
    useEffect(() => { setSearchTerm(value || ''); }, [value]);
    const filteredItems = useMemo(() => {
        if (isLoading || !items) return [];
        let localItems = items;

        if (includeKeywords.length > 0) {
            localItems = localItems.filter(item => {
                const itemNameLower = (item["Support Item Name"] || '').toLowerCase();
                return includeKeywords.every(keyword => itemNameLower.includes(keyword));
            });
        }
        if (excludeKeywords.length > 0) {
            localItems = localItems.filter(item => {
                const itemNameLower = (item["Support Item Name"] || '').toLowerCase();
                return !excludeKeywords.some(keyword => itemNameLower.includes(keyword));
            });
        }

        if (!searchTerm.trim()) return localItems.slice(0, 100);
        
        const searchWords = searchTerm.toLowerCase().replace(/[-/]/g, ' ').split(' ').filter(Boolean);
        return localItems.filter(item => {
            const itemName = (item["Support Item Name"] || '').toLowerCase().replace(/[-/]/g, ' ');
            const itemNumber = (item["Support Item Number"] || '').toLowerCase();
            return itemNumber.includes(searchTerm.toLowerCase()) || searchWords.every(word => itemName.includes(word));
        }).slice(0, 100);
    }, [searchTerm, items, includeKeywords, excludeKeywords, isLoading]);
    
    const handleSelect = (item) => { onSelectItem(item); setSearchTerm(item["Support Item Name"]); setIsFocused(false); };

    return (
        <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">{label}:</label>
            <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onFocus={() => setIsFocused(true)} onBlur={() => setTimeout(() => setIsFocused(false), 200)} placeholder={isLoading ? "Loading rates..." : "Search..."} className="w-full p-3 border border-gray-300 rounded-md shadow-sm" disabled={isLoading}/>
            {isFocused && (
                <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-60 overflow-y-auto shadow-lg">
                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (<li key={item["Support Item Number"]} onMouseDown={() => handleSelect(item)} className="p-3 hover:bg-gray-100 cursor-pointer"><p className="font-semibold text-sm">{item["Support Item Name"]}</p><p className="text-xs text-gray-500">{item["Support Item Number"]}</p></li>))
                    ) : (<li className="p-3 text-sm text-gray-500">No results found</li>)}
                </ul>
            )}
        </div>
    );
};

// Component for finding and selecting NDIS rates.
const NdisRateFinderSection = ({ rates, ndisRates, isLoading, handleNdisRateSelect }) => {
    const rateFinderConfig = [
        { key: 'weekday', label: 'Weekday Day', include: [], exclude: ['evening', 'saturday', 'sunday', 'public holiday', 'provider travel', 'activity based transport'] },
        { key: 'weekdayEvening', label: 'Weekday Evening', include: ['weekday', 'evening'], exclude: [] },
        { key: 'saturday', label: 'Saturday', include: ['saturday'], exclude: [] },
        { key: 'sunday', label: 'Sunday', include: ['sunday'], exclude: [] },
        { key: 'publicHoliday', label: 'Public Holiday', include: ['public holiday'], exclude: [] },
    ];
    return (
        <Section id="ndis-rates" title="4. NDIS Rate Finder (Optional)" color="sky">
             <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                {rateFinderConfig.map(config => (
                    <div key={config.key}>
                        <SearchableDropdown label={config.label} items={ndisRates} value={rates[config.key].name} onSelectItem={item => handleNdisRateSelect(config.key, item)} includeKeywords={config.include} excludeKeywords={config.exclude} isLoading={isLoading}/>
                        {rates[config.key].number && (<p className="text-xs font-mono text-gray-700 mt-1 px-1 select-all">{rates[config.key].number}</p>)}
                    </div>
                ))}
            </div>
        </Section>
    );
};

// Component for manually entering or overriding hourly rates.
const ManualRatesSection = ({ rates, handlers }) => (
    <Section id="hourly-rates" title="6. Manual Hourly Rates" color="green">
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

// Component for budget-based calculations.
const BudgetSection = ({ budget, setBudget, budgetMode, setBudgetMode, calculationResults, handlers, totalProjectedCost }) => (
    <Section id="budget" title="2. Budget Information" color="teal">
        <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center"><input type="radio" className="form-radio" name="budgetOption" value="lock" checked={budgetMode === 'lock'} onChange={() => setBudgetMode('lock')}/><span className="ml-2">Set Budget</span></label>
            <label className="inline-flex items-center"><input type="radio" className="form-radio" name="budgetOption" value="noBudget" checked={budgetMode === 'noBudget'} onChange={() => setBudgetMode('noBudget')}/><span className="ml-2">No Budget</span></label>
        </div>
        {budgetMode === 'lock' && (
            <div className="animate-fade-in">
                <label htmlFor="budget" className="block text-sm font-semibold text-gray-700 mb-1">Your Total Budget ($):</label>
                <input type="number" id="budget" value={budget} onChange={(e) => setBudget(e.target.value)} onFocus={handlers.handleFocus} className="w-full p-3 border border-gray-300 rounded-md" min="0" placeholder="0.00"/>
                <div className="mt-4 text-gray-800">
                    {totalProjectedCost > 0 ? (
                        <>
                            <p className="text-lg font-semibold">Budget vs. Projected: {' '}
                                {totalProjectedCost > budget ? (<span className="text-red-600 font-bold">OVER by ${formatNumber(totalProjectedCost - budget)}</span>) : totalProjectedCost < budget ? (<span className="text-green-600 font-bold">UNDER by ${formatNumber(budget - totalProjectedCost)}</span>) : (<span className="text-blue-600 font-bold">ON BUDGET</span>)}
                            </p>
                            <div className="mt-4 text-center"><button onClick={handlers.applySuggestedValues} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-md shadow-md hover:bg-teal-700">Apply Suggested Hours & ABT</button></div>
                        </>
                    ) : (<p className="text-lg font-semibold">Enter rates, hours, and travel to get suggestions.</p>)}
                </div>
            </div>
        )}
    </Section>
);

// Component for managing public holiday calculations.
const PublicHolidaysSection = ({ includePublicHolidays, setIncludePublicHolidays, publicHolidaysInput, setPublicHolidaysInput }) => (
   <Section id="public-holidays" title="7. Public Holidays" color="red">
        <div className="flex space-x-4 mb-4">
            <label className="inline-flex items-center"><input type="radio" className="form-radio" checked={includePublicHolidays} onChange={() => setIncludePublicHolidays(true)}/><span className="ml-2">Include</span></label>
            <label className="inline-flex items-center"><input type="radio" className="form-radio" checked={!includePublicHolidays} onChange={() => setIncludePublicHolidays(false)}/><span className="ml-2">Skip</span></label>
        </div>
        {includePublicHolidays && (
            <div>
                <label htmlFor="publicHolidays" className="block text-sm font-semibold text-gray-700 mb-1">
                    Custom Public Holidays (comma-separated, e.g., 2025-12-25):
                </label>
                <textarea 
                    id="publicHolidays" 
                    rows="3" 
                    value={publicHolidaysInput} 
                    onChange={e => setPublicHolidaysInput(e.target.value)} 
                    className="w-full p-3 border border-gray-300 rounded-md">
                </textarea>
            </div>
        )}
    </Section>
);

// Component displaying the final calculation results.
const ResultsSection = ({ results, transportCost }) => {
    const grandTotalPay = results.totalPay + transportCost;
    return (
    <div id="results">
        <div className="mt-8 p-6 bg-indigo-600 rounded-xl shadow-lg text-white text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Hours:</h2><p className="text-4xl sm:text-5xl font-extrabold mb-4">{formatNumber(results.totalHours)}</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-left">
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-indigo-200">W/day Day:</h3><p className="text-2xl font-bold">{formatNumber(results.weekdayHours)}</p></div>
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-indigo-200">W/day Eve:</h3><p className="text-2xl font-bold">{formatNumber(results.weekdayEveningHours)}</p></div>
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-indigo-200">Saturday:</h3><p className="text-2xl font-bold">{formatNumber(results.saturdayHours)}</p></div>
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-indigo-200">Sunday:</h3><p className="text-2xl font-bold">{formatNumber(results.sundayHours)}</p></div>
                <div className="bg-indigo-700 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-indigo-200">Public Hol:</h3><p className="text-2xl font-bold">{formatNumber(results.publicHolidayHours)}</p></div>
            </div>
        </div>
        <div className="mt-6 p-6 bg-purple-700 rounded-xl shadow-lg text-white text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Budget:</h2>
            <p className="text-sm">Services: ${formatNumber(results.totalPay)}</p>
            {transportCost > 0 && <p className="text-sm">Transport: ${formatNumber(transportCost)}</p>}
            <p className="text-4xl sm:text-5xl font-extrabold my-2">${formatNumber(grandTotalPay)}</p>
             <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-left">
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-purple-200">W/day Day:</h3><p className="text-2xl font-bold">${formatNumber(results.weekdayPay)}</p></div>
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-purple-200">W/day Eve:</h3><p className="text-2xl font-bold">${formatNumber(results.weekdayEveningPay)}</p></div>
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-purple-200">Saturday:</h3><p className="text-2xl font-bold">${formatNumber(results.saturdayPay)}</p></div>
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-purple-200">Sunday:</h3><p className="text-2xl font-bold">${formatNumber(results.sundayPay)}</p></div>
                <div className="bg-purple-800 p-3 rounded-lg shadow-md"><h3 className="text-lg font-semibold text-purple-200">Public Hol:</h3><p className="text-2xl font-bold">${formatNumber(results.publicHolidayPay)}</p></div>
            </div>
        </div>
    </div>
    );
};

// Component for calculating transport costs, now with separate NPT and ABT sections.
const TransportSection = ({ transport, setTransport, calculatedDays, suggestedAbtKm, ndisRates, isLoadingRates, onRateSelect }) => {
    const handleInputChange = (type, field, value) => {
        setTransport(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                [field]: value
            }
        }));
    };
    
    const calculateCost = (type) => {
        const details = transport[type];
        if (!details.isEnabled || !calculatedDays) return 0;
        const days = calculatedDays;
        const km = parseFloat(details.km) || 0;
        const rate = parseFloat(details.rate) || 0;
        return roundUpToTwoDecimals(days * km * rate);
    };

    const nptCost = calculateCost('npt');
    const abtCost = calculateCost('abt');

    return (
        <Section id="transport-calculator" title="5. Transport Calculator (Optional)" color="orange">
            <div className="space-y-6">
                {/* NPT Section */}
                <div className="p-4 border rounded-lg bg-white">
                    <div className="flex items-center space-x-3 mb-4">
                        <input 
                            type="checkbox" 
                            id="enableNpt" 
                            checked={transport.npt.isEnabled} 
                            onChange={e => handleInputChange('npt', 'isEnabled', e.target.checked)}
                            className="form-checkbox h-5 w-5 text-orange-600 rounded"
                        />
                        <label htmlFor="enableNpt" className="text-lg font-semibold text-gray-700">Non-Provider Travel (NPT)</label>
                    </div>
                    {transport.npt.isEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                            <SearchableDropdown 
                                label="NPT Item"
                                items={ndisRates}
                                value={transport.npt.name}
                                onSelectItem={item => onRateSelect('npt', item)}
                                includeKeywords={['provider travel - non-labour costs']}
                                isLoading={isLoadingRates}
                            />
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Est. KM per Trip:</label>
                                <input type="number" value={transport.npt.km} onChange={e => handleInputChange('npt', 'km', e.target.value)} className="w-full p-3 border rounded-md" min="0" placeholder="e.g., 10" disabled={calculatedDays === 0}/>
                            </div>
                        </div>
                    )}
                    {transport.npt.isEnabled && nptCost > 0 && (
                        <div className="mt-4 p-3 bg-orange-100 rounded-lg text-center">
                            <p className="text-md font-semibold text-orange-800">NPT Cost: ${formatNumber(nptCost)}</p>
                            <p className="text-sm text-gray-600">
                                ({calculatedDays} days x {transport.npt.km || 0} km x ${formatNumber(parseFloat(transport.npt.rate)) || '0.00'})
                            </p>
                        </div>
                    )}
                </div>

                {/* ABT Section */}
                <div className="p-4 border rounded-lg bg-white">
                     <div className="flex items-center space-x-3 mb-4">
                        <input 
                            type="checkbox" 
                            id="enableAbt" 
                            checked={transport.abt.isEnabled} 
                            onChange={e => handleInputChange('abt', 'isEnabled', e.target.checked)}
                            className="form-checkbox h-5 w-5 text-amber-600 rounded"
                        />
                        <label htmlFor="enableAbt" className="text-lg font-semibold text-gray-700">Activity Based Travel (ABT)</label>
                    </div>
                    {transport.abt.isEnabled && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                             <SearchableDropdown 
                                label="ABT Item"
                                items={ndisRates}
                                value={transport.abt.name}
                                onSelectItem={item => onRateSelect('abt', item)}
                                includeKeywords={['activity based transport']}
                                isLoading={isLoadingRates}
                            />
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Est. KM per Trip:</label>
                                <input type="number" value={transport.abt.km} onChange={e => handleInputChange('abt', 'km', e.target.value)} className="w-full p-3 border rounded-md" min="0" placeholder="e.g., 15" disabled={calculatedDays === 0}/>
                                {suggestedAbtKm > 0 && (<p className="text-xs text-center text-teal-600 font-semibold mt-1">Suggested: {formatNumber(suggestedAbtKm)} km</p>)}
                            </div>
                        </div>
                    )}
                     {transport.abt.isEnabled && abtCost > 0 && (
                        <div className="mt-4 p-3 bg-amber-100 rounded-lg text-center">
                            <p className="text-md font-semibold text-amber-800">ABT Cost: ${formatNumber(abtCost)}</p>
                            <p className="text-sm text-gray-600">
                                ({calculatedDays} days x {transport.abt.km || 0} km x ${formatNumber(parseFloat(transport.abt.rate)) || '0.00'})
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </Section>
    );
};


// A component to display a single saved quote, including its transport costs.
const SavedQuoteItem = ({ quote, onDelete, onPrint }) => {
    const quoteRef = useRef();
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
        <div ref={quoteRef} className="bg-white p-4 rounded-lg shadow-md border printable-area">
            <div className="flex justify-between items-start gap-4">
                <div className="flex-grow">
                    <p className="font-bold text-gray-800">{quote.description}</p>
                    <p className="text-sm text-gray-600 mt-1">
                        <strong>Total budget:</strong> <span className="font-semibold">${formatNumber(quote.totalPay)}</span> | <strong>Total Hours:</strong> <span className="font-semibold">{formatNumber(quote.totalHours)}</span>
                    </p>
                </div>
                <div className="flex gap-2 no-print"><button onClick={() => onPrint(quoteRef)} className="text-blue-500 hover:text-blue-700 font-semibold text-sm p-1">Print</button><button onClick={() => onDelete(quote.id)} className="text-red-500 hover:text-red-700 font-semibold text-sm p-1">Delete</button></div>
            </div>
            <div className="mt-4 pt-4 border-t overflow-x-auto">
                <table className="w-full text-sm text-left"><thead className="bg-gray-50"><tr><th className="p-2 font-semibold">Service</th><th className="p-2 font-semibold">Item Name & Number</th><th className="p-2 font-semibold text-right">Rate</th><th className="p-2 font-semibold text-right">Qty / Hours</th><th className="p-2 font-semibold text-right">Total</th></tr></thead>
                    <tbody>
                        {quoteDetails.map(detail => (<tr key={detail.label} className="border-b">
                            <td className="p-2">
                                <p>{detail.label}</p>
                                <p className="text-xs text-gray-500 font-normal">{quote.fromDate} to {quote.toDate}</p>
                            </td>
                            <td className="p-2"><p>{detail.rateInfo.name || 'N/A'}</p><p className="font-mono text-xs text-gray-600">{detail.rateInfo.number || 'Manual Rate'}</p></td>
                            <td className="p-2 text-right">${formatNumber(parseFloat(detail.rateInfo.rate))}</td>
                            <td className="p-2 text-right">{formatNumber(detail.hours)}</td>
                            <td className="p-2 text-right font-semibold">${formatNumber(detail.pay)}</td>
                        </tr>))}
                        
                        {quote.transport && quote.transport.npt && (
                             <tr className="border-b bg-orange-50">
                                 <td className="p-2">
                                     <p>Transport (NPT)</p>
                                     <p className="text-xs text-gray-500 font-normal">{quote.fromDate} to {quote.toDate}</p>
                                 </td>
                                 <td className="p-2"><p>{quote.transport.npt.name}</p><p className="font-mono text-xs text-gray-600">{quote.transport.npt.itemCode || ''}</p></td>
                                 <td className="p-2 text-right">${formatNumber(parseFloat(quote.transport.npt.rate))} / km</td>
                                 <td className="p-2 text-right">{quote.transport.npt.totalKm} km</td>
                                 <td className="p-2 text-right font-semibold">${formatNumber(quote.transport.npt.cost)}</td>
                             </tr>
                        )}
                         {quote.transport && quote.transport.abt && (
                             <tr className="border-b bg-amber-50">
                                 <td className="p-2">
                                     <p>Transport (ABT)</p>
                                     <p className="text-xs text-gray-500 font-normal">{quote.fromDate} to {quote.toDate}</p>
                                 </td>
                                 <td className="p-2"><p>{quote.transport.abt.name}</p><p className="font-mono text-xs text-gray-600">{quote.transport.abt.itemCode || ''}</p></td>
                                 <td className="p-2 text-right">${formatNumber(parseFloat(quote.transport.abt.rate))} / km</td>
                                 <td className="p-2 text-right">{quote.transport.abt.totalKm} km</td>
                                 <td className="p-2 text-right font-semibold">${formatNumber(quote.transport.abt.cost)}</td>
                             </tr>
                        )}
                    </tbody>
                    <tfoot className="font-bold"><tr><td colSpan="3" className="p-2 text-right">Grand Total:</td><td className="p-2 text-right">{formatNumber(quote.totalHours)} hrs</td><td className="p-2 text-right">${formatNumber(quote.totalPay)}</td></tr></tfoot>
                </table>
            </div>
        </div>
    );
};


// Component for saving the current calculation as a quote.
const SavedQuotesSection = ({ savedQuotes, handlers, quoteDescription, setQuoteDescription, rates, results }) => (
    <Section id="saved-quotes" title="8. Save Calculation as Quote" color="cyan">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
            <input type="text" value={quoteDescription} onChange={e => setQuoteDescription(e.target.value)} placeholder="e.g., Standard weekly service" className="w-full p-3 border border-gray-300 rounded-md shadow-sm"/>
            <button onClick={() => handlers.handleAddQuote({ rates, results })} disabled={results.totalPay === 0 && results.totalHours === 0} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-md shadow-md hover:bg-cyan-700 w-full sm:w-auto flex-shrink-0 disabled:bg-gray-400">Save Quote</button>
        </div>
        {savedQuotes.length > 0 && (
            <div className="mt-6 space-y-4">
                <div className="flex justify-between items-center no-print"><h4 className="text-md font-semibold text-gray-700">Saved Quotes:</h4><button onClick={handlers.handlePrintAll} className="px-4 py-2 bg-gray-600 text-white font-bold rounded-md shadow-md hover:bg-gray-700 text-sm">Print All</button></div>
                {savedQuotes.map(quote => (<SavedQuoteItem key={quote.id} quote={quote} onDelete={handlers.handleDeleteQuote} onPrint={handlers.handlePrintOne} />))}
            </div>
        )}
    </Section>
);

// Component showing a breakdown of the calculated period.
const PeriodBreakdownSection = ({ results }) => (
    <Section id="period-breakdown" title="Calculation Breakdown" color="gray">
        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4">
            <div className="p-3 bg-white rounded-lg shadow-sm text-center"><h3 className="text-sm font-semibold">Counted Days:</h3><p className="text-xl font-bold">{results.calculatedTotalDays}</p></div>
            <div className="p-3 bg-white rounded-lg shadow-sm text-center"><h3 className="text-sm font-semibold">Weekdays:</h3><p className="text-xl font-bold">{results.calculatedTotalWeekdays}</p></div>
            <div className="p-3 bg-white rounded-lg shadow-sm text-center"><h3 className="text-sm font-semibold">Saturdays:</h3><p className="text-xl font-bold">{results.calculatedTotalSaturdays}</p></div>
            <div className="p-3 bg-white rounded-lg shadow-sm text-center"><h3 className="text-sm font-semibold">Sundays:</h3><p className="text-xl font-bold">{results.calculatedTotalSundays}</p></div>
            <div className="p-3 bg-white rounded-lg shadow-sm text-center"><h3 className="text-sm font-semibold">Public Hols:</h3><p className="text-xl font-bold">{results.calculatedTotalPublicHolidays}</p></div>
            <div className="p-3 bg-white rounded-lg shadow-sm text-center"><h3 className="text-sm font-semibold">Full Weeks:</h3><p className="text-xl font-bold">{results.calculatedFullWeeks}</p></div>
        </div>
    </Section>
);

// Component for collecting details and generating the final service agreement.
const ServiceAgreementSection = ({ info, setInfo, onGenerate, onGenerateWord, isLoading }) => {
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('.')) {
            const [outerKey, innerKey] = name.split('.');
            setInfo(prev => ({
                ...prev,
                [outerKey]: {
                    ...prev[outerKey],
                    [innerKey]: value
                }
            }));
        } else {
            setInfo(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleFundingTypeChange = (e) => {
        const { value, checked } = e.target;
        setInfo(prev => ({ ...prev, fundingType: checked ? [...prev.fundingType, value] : prev.fundingType.filter(type => type !== value) }));
    };

    return (
        <Section id="service-agreement" title="9. Generate Service Agreement" color="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input name="participantName" value={info.participantName} onChange={handleInputChange} placeholder="Participant's Name" className="w-full p-3 border rounded-md"/>
                <input name="participantAddress" value={info.participantAddress} onChange={handleInputChange} placeholder="Participant's Address" className="w-full p-3 border rounded-md"/>
                <input name="ndisNumber" value={info.ndisNumber} onChange={handleInputChange} placeholder="NDIS Number" className="w-full p-3 border rounded-md"/>
                <input name="representativeName" value={info.representativeName} onChange={handleInputChange} placeholder="Representative's Name (if any)" className="w-full p-3 border rounded-md"/>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Agreement Date:</label><input type="date" name="agreementDate" value={info.agreementDate} onChange={handleInputChange} className="w-full p-3 border rounded-md"/></div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-1">Funding Type:</label>
                    <div className="flex flex-wrap gap-4 mt-2">
                        <label className="inline-flex items-center"><input type="checkbox" className="form-checkbox" value="Self Funded" checked={info.fundingType.includes("Self Funded")} onChange={handleFundingTypeChange} /><span className="ml-2">Self Funded</span></label>
                        <label className="inline-flex items-center"><input type="checkbox" className="form-checkbox" value="Plan Managed" checked={info.fundingType.includes("Plan Managed")} onChange={handleFundingTypeChange} /><span className="ml-2">Plan Managed</span></label>
                        <label className="inline-flex items-center"><input type="checkbox" className="form-checkbox" value="NDIA Managed" checked={info.fundingType.includes("NDIA Managed")} onChange={handleFundingTypeChange} /><span className="ml-2">NDIA Managed</span></label>
                    </div>
                </div>
                {info.fundingType.includes('Plan Managed') && (<>
                    <input name="planManager.name" value={info.planManager.name} onChange={handleInputChange} placeholder="Plan Manager's Name" className="w-full p-3 border rounded-md"/>
                    <input name="planManager.address" value={info.planManager.address} onChange={handleInputChange} placeholder="Plan Manager's Address" className="w-full p-3 border rounded-md"/>
                    <input name="planManager.phone" value={info.planManager.phone} onChange={handleInputChange} placeholder="Plan Manager's Phone" className="w-full p-3 border rounded-md"/>
                    <input type="email" name="planManager.email" value={info.planManager.email} onChange={handleInputChange} placeholder="Plan Manager's Email" className="w-full p-3 border rounded-md"/>
                </>)}
            </div>
            <div className="text-center mt-6 flex flex-col sm:flex-row justify-center gap-4">
                <button onClick={onGenerate} disabled={isLoading} className="px-6 py-2 bg-purple-600 text-white font-bold rounded-md shadow-md hover:bg-purple-700 no-print disabled:bg-gray-400">Generate & Print</button>
                <button onClick={onGenerateWord} disabled={isLoading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-md shadow-md hover:bg-blue-700 no-print disabled:bg-gray-400">Download as Word</button>
            </div>
        </Section>
    );
};

// --- Main App Component ---
function App() {
    // --- State ---
    const [fromDate, setFromDate] = useState(getTodayDate());
    const [toDate, setToDate] = useState(getOneYearFromToday());
    const [recurringType, setRecurringType] = useState('Weekly');
    const [weeklyDays, setWeeklyDays] = useState({
        Monday: { selected: false, hours: '', shift: 'day' }, Tuesday: { selected: false, hours: '', shift: 'day' },
        Wednesday: { selected: false, hours: '', shift: 'day' }, Thursday: { selected: false, hours: '', shift: 'day' },
        Friday: { selected: false, hours: '', shift: 'day' }, Saturday: { selected: false, hours: '' }, Sunday: { selected: false, hours: '' },
    });
    const [rates, setRates] = useState({
        weekday: { name: '', rate: '', number: '' }, weekdayEvening: { name: '', rate: '', number: '' },
        saturday: { name: '', rate: '', number: '' }, sunday: { name: '', rate: '', number: '' }, publicHoliday: { name: '', rate: '', number: '' }
    });
    const [budgetMode, setBudgetMode] = useState('noBudget');
    const [budget, setBudget] = useState('');
    const [includePublicHolidays, setIncludePublicHolidays] = useState(true);
    const [publicHolidaysInput, setPublicHolidaysInput] = useState(DEFAULT_QLD_PUBLIC_HOLIDAYS);
    const [quoteDescription, setQuoteDescription] = useState('');
    const [savedQuotes, setSavedQuotes] = useLocalStorage('savedQuotes', []);
    const [error, setError] = useState('');
    const [serviceAgreementInfo, setServiceAgreementInfo] = useState({
        participantName: '', participantAddress: '', ndisNumber: '', agreementDate: getTodayDate(), representativeName: '',
        fundingType: [], planManager: { name: '', address: '', phone: '', email: '' }
    });
    const [transport, setTransport] = useState({
        npt: { isEnabled: false, km: '', rate: '1.00', itemCode: '', name: '' },
        abt: { isEnabled: false, km: '', rate: '1.00', itemCode: '', name: '' }
    });

    // --- Data Fetching ---
    const { data: ndisRates, isLoading: isLoadingRates, error: rateError } = useFetchData(NDIS_RATES_URL, []);
    const { data: agreementFileContent, isLoading: isLoadingAgreement, error: agreementError } = useFetchData(SERVICE_AGREEMENT_URL);
    
    // --- Calculations ---
    const calculationResults = useMemo(() => calculateAllTotals({ fromDate, toDate, recurringType, weeklyDays, includePublicHolidays, publicHolidaysInput, rates }), [fromDate, toDate, recurringType, weeklyDays, includePublicHolidays, publicHolidaysInput, rates]);
    
    const nptCost = useMemo(() => {
        if (!transport.npt.isEnabled || !calculationResults.calculatedTotalDays) return 0;
        return roundUpToTwoDecimals((parseFloat(transport.npt.km) || 0) * (parseFloat(transport.npt.rate) || 0) * calculationResults.calculatedTotalDays);
    }, [transport.npt, calculationResults.calculatedTotalDays]);

    const abtCost = useMemo(() => {
        if (!transport.abt.isEnabled || !calculationResults.calculatedTotalDays) return 0;
        return roundUpToTwoDecimals((parseFloat(transport.abt.km) || 0) * (parseFloat(transport.abt.rate) || 0) * calculationResults.calculatedTotalDays);
    }, [transport.abt, calculationResults.calculatedTotalDays]);

    const totalTransportCost = nptCost + abtCost;

    const budgetSuggestions = useMemo(() => {
        const suggestions = { suggestedHours: {}, suggestedAbtKm: 0 };
        if (budgetMode !== 'lock' || !budget || budget <= 0) return suggestions;

        const totalBudget = parseFloat(budget) || 0;
        const fixedNptCost = nptCost;
        const flexibleBudget = totalBudget - fixedNptCost;

        const initialFlexCosts = calculationResults.totalPay + abtCost;
        if (flexibleBudget <= 0 || initialFlexCosts <= 0) return suggestions;

        const scalingFactor = flexibleBudget / initialFlexCosts;

        Object.entries(weeklyDays).forEach(([dayName, { selected, hours }]) => {
            const currentHours = parseFloat(hours) || 0;
            suggestions.suggestedHours[dayName] = { hours: selected ? currentHours * scalingFactor : 0 };
        });

        if (transport.abt.isEnabled) {
            const currentAbtKm = parseFloat(transport.abt.km) || 0;
            suggestions.suggestedAbtKm = currentAbtKm * scalingFactor;
        }

        return suggestions;

    }, [budget, budgetMode, calculationResults.totalPay, weeklyDays, transport.abt, nptCost, abtCost]);
    
    useEffect(() => { if (calculationResults.error) setError(calculationResults.error); else setError(''); }, [calculationResults.error]);
    
    // --- Handlers ---
    const handleFocus = (event) => event.target.select();
    const dayHandlers = {
        handleWeeklyDayChange: (day) => setWeeklyDays(p => ({ ...p, [day]: { ...p[day], selected: !p[day].selected } })),
        handleShiftChange: (day) => setWeeklyDays(p => ({ ...p, [day]: { ...p[day], shift: p[day].shift === 'day' ? 'evening' : 'day' } })),
        handleWeeklyHoursChange: (day, value) => { if (value === '' || (!isNaN(parseFloat(value)) && parseFloat(value) >= 0 && parseFloat(value) <= 24)) { setWeeklyDays(p => ({ ...p, [day]: { ...p[day], hours: value } })); } },
        handleFocus,
    };
    const rateHandlers = {
        handleRateChange: (rateName, value) => { if (value === '' || !isNaN(parseFloat(value))) { setRates(prev => ({ ...prev, [rateName]: { ...prev[rateName], rate: value } })); } },
        setAllRatesSame: () => { const baseRate = rates.weekday.rate; setRates(prev => { const newRates = {}; for (const key in prev) { newRates[key] = { ...prev[key], rate: baseRate }; } return newRates; }); },
        handleFocus,
    };
    const budgetHandlers = {
        applySuggestedValues: () => {
            setWeeklyDays(p => {
                const updatedDays = { ...p };
                for (const day in budgetSuggestions.suggestedHours) {
                    if (updatedDays[day].selected) {
                        updatedDays[day] = { ...updatedDays[day], hours: formatNumber(budgetSuggestions.suggestedHours[day].hours) };
                    }
                }
                return updatedDays;
            });
            if (transport.abt.isEnabled && budgetSuggestions.suggestedAbtKm > 0) {
                setTransport(prev => ({
                    ...prev,
                    abt: { ...prev.abt, km: formatNumber(budgetSuggestions.suggestedAbtKm) }
                }));
            }
        },
        handleFocus
    };
    const handleNdisRateSelect = useCallback((rateType, item) => {
        const getInfo = (i) => ({ name: i["Support Item Name"], rate: (i.QLD || 0).toString(), number: i["Support Item Number"] });
        const selectedInfo = getInfo(item);
        if (rateType === 'weekday') {
            const newRates = { weekday: selectedInfo };
            const baseName = item["Support Item Name"].toLowerCase().replace(/ - (weekday|saturday|sunday|public holiday|evening|night|daytime|day).*/, '').trim();
            const mappings = { weekdayEvening: ['evening', 'night'], saturday: ['saturday'], sunday: ['sunday'], publicHoliday: ['public holiday'] };
            for (const [key, keywords] of Object.entries(mappings)) {
                const found = ndisRates.find(rate => { const name = rate["Support Item Name"].toLowerCase(); return name.includes(baseName) && keywords.some(kw => name.includes(kw)); });
                if (found) { newRates[key] = getInfo(found); }
            }
            setRates(prev => ({ ...prev, ...newRates }));
        } else { setRates(prev => ({ ...prev, [rateType]: selectedInfo })); }
    }, [ndisRates]);

    const handleTransportRateSelect = useCallback((type, item) => {
        setTransport(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                name: item["Support Item Name"],
                rate: (item.QLD || 0).toString(),
                itemCode: item["Support Item Number"]
            }
        }));
    }, []);
    
    const getAgreementHtml = () => {
        if (!serviceAgreementInfo.participantName || savedQuotes.length === 0) {
            setError("Please provide a participant name and save at least one quote before generating an agreement.");
            window.scrollTo(0, 0);
            return null;
        }

        if (!agreementFileContent || !agreementFileContent.agreementContent) {
            setError("Service agreement template could not be loaded or is in the wrong format.");
            return null;
        }

        const dataMap = {
            '{{participantName}}': serviceAgreementInfo.participantName,
            '{{participantAddress}}': serviceAgreementInfo.participantAddress,
            '{{agreementDate}}': serviceAgreementInfo.agreementDate,
            '{{fundingType}}': serviceAgreementInfo.fundingType.join(', '),
            '{{planManager.name}}': serviceAgreementInfo.planManager.name,
            '{{planManager.address}}': serviceAgreementInfo.planManager.address,
            '{{planManager.phone}}': serviceAgreementInfo.planManager.phone,
            '{{planManager.email}}': serviceAgreementInfo.planManager.email,
            '{{representativeName}}': serviceAgreementInfo.representativeName
        };

        const replacePlaceholders = (text) => {
            if (typeof text !== 'string') return text || '';
            return text.replace(/{{(.*?)}}/g, (match) => dataMap[match] || match);
        }

        const renderSection = (section) => {
            if (section.id === 'agreementSignatures') return ''; 
            
            let html = `<h2>${section.title}</h2>`;
            if (section.content) {
                html += `<p>${replacePlaceholders(section.content).replace(/\n/g, '<br>')}</p>`;
            }
            if (section.points) {
                html += `<ul>${section.points.map(p => {
                    if (typeof p === 'string') return `<li>${replacePlaceholders(p)}</li>`;
                    let pointHtml = `<li>${replacePlaceholders(p.heading || p.intro || '')}`;
                    if(p.subpoints) { pointHtml += `<ul>${p.subpoints.map(sp => `<li>${replacePlaceholders(sp)}</li>`).join('')}</ul>`; }
                    if(p.methods) { pointHtml += `<ul>${p.methods.map(m => `<li>${replacePlaceholders(m)}</li>`).join('')}</ul>`; }
                    if(p.ndisMethods) { pointHtml += `<ul>${p.ndisMethods.map(m => `<li>${replacePlaceholders(m)}</li>`).join('')}</ul>`; }
                    if (p.text) { pointHtml += `<p>${replacePlaceholders(p.text)}</p>` }
                    pointHtml += '</li>';
                    return pointHtml;
                }).join('')}</ul>`;
            }
            if (section.definitions) {
                html += `<ul>${section.definitions.map(d => `<li><strong>${replacePlaceholders(d.term)}:</strong> ${replacePlaceholders(d.definition)}</li>`).join('')}</ul>`;
            }
            if (section.fundingOptions) {
                 html += section.fundingOptions.map(fo => `<p><strong>${fo.id}:</strong> ${replacePlaceholders(fo.text)}</p>`).join('');
                 if(serviceAgreementInfo.fundingType.includes('Plan Managed') && section.planManagerSection) {
                    html += `<p>${replacePlaceholders(section.planManagerSection.intro)}</p><ul>${section.planManagerSection.fields.map(f => `<li><strong>${f.label}:</strong> ${replacePlaceholders(f.value)}</li>`).join('')}</ul>`;
                 }
            }
            
            return html;
        }
        
        const { sections, signatureSection } = agreementFileContent.agreementContent;
        const mainSections = sections.filter(s => s.id !== 'agreementSignatures' && s.id !== 'supportsAndServices');
        
        let mainContentHtml = mainSections.map(renderSection).join('<hr>');
        
        const totalAgreementPay = savedQuotes.reduce((sum, q) => sum + q.totalPay, 0);
        const totalAgreementHours = savedQuotes.reduce((sum, q) => sum + q.totalHours, 0);

        const quotesHtml = savedQuotes.map(quote => {
            const quoteDetails = [
                { label: 'Weekday Day', hours: quote.results.weekdayHours, pay: quote.results.weekdayPay, rateInfo: quote.rates.weekday }, { label: 'Weekday Evening', hours: quote.results.weekdayEveningHours, pay: quote.results.weekdayEveningPay, rateInfo: quote.rates.weekdayEvening },
                { label: 'Saturday', hours: quote.results.saturdayHours, pay: quote.results.saturdayPay, rateInfo: quote.rates.saturday }, { label: 'Sunday', hours: quote.results.sundayHours, pay: quote.results.sundayPay, rateInfo: quote.rates.sunday },
                { label: 'Public Holiday', hours: quote.results.publicHolidayHours, pay: quote.results.publicHolidayPay, rateInfo: quote.rates.publicHoliday },
            ].filter(d => d.hours > 0 && d.rateInfo);
            
            let tableRowsHtml = quoteDetails.map(d => `<tr><td><p>${d.label}</p><p style="font-size: 0.8em; color: #555; font-weight: normal;">${quote.fromDate} to ${quote.toDate}</p></td><td><p>${d.rateInfo.name || 'N/A'}</p><p style="font-size: 0.8em; color: #555;">${d.rateInfo.number || 'Manual Rate'}</p></td><td class="text-right">$${formatNumber(parseFloat(d.rateInfo.rate))}</td><td class="text-right">${formatNumber(d.hours)}</td><td class="text-right">$${formatNumber(d.pay)}</td></tr>`).join('');
            
            if (quote.transport && quote.transport.npt) {
                tableRowsHtml += `<tr style="background-color: #FFF3E0;"><td ><p>Transport (NPT)</p><p style="font-size: 0.8em; color: #555; font-weight: normal;">${quote.fromDate} to ${quote.toDate}</p></td><td><p>${quote.transport.npt.name}</p><p style="font-size: 0.8em; color: #555;">${quote.transport.npt.itemCode || ''}</p></td><td class="text-right">$${formatNumber(parseFloat(quote.transport.npt.rate))} / km</td><td class="text-right">${quote.transport.npt.totalKm} km</td><td class="text-right">$${formatNumber(quote.transport.npt.cost)}</td></tr>`;
            }
            if (quote.transport && quote.transport.abt) {
                tableRowsHtml += `<tr style="background-color: #FFF9C4;"><td ><p>Transport (ABT)</p><p style="font-size: 0.8em; color: #555; font-weight: normal;">${quote.fromDate} to ${quote.toDate}</p></td><td><p>${quote.transport.abt.name}</p><p style="font-size: 0.8em; color: #555;">${quote.transport.abt.itemCode || ''}</p></td><td class="text-right">$${formatNumber(parseFloat(quote.transport.abt.rate))} / km</td><td class="text-right">${quote.transport.abt.totalKm} km</td><td class="text-right">$${formatNumber(quote.transport.abt.cost)}</td></tr>`;
            }

            return `<div class="quote-section"><h4>Quote: ${quote.description}</h4><table><thead><tr><th>Service</th><th>Item Name & Number</th><th>Rate</th><th>Qty / Hours</th><th>Total</th></tr></thead><tbody>${tableRowsHtml}</tbody><tfoot><tr style="font-weight: bold;"><td colspan="3" class="text-right">Sub-total:</td><td class="text-right">${formatNumber(quote.totalHours)} hrs</td><td class="text-right">$${formatNumber(quote.totalPay)}</td></tr></tfoot></table></div>`;
        }).join('');
        
        const grandTotalSummaryHtml = `
            <table class="grand-total-summary" style="margin-top: 2rem;">
                <tfoot style="font-weight: bold; background-color: #f2f2f2;">
                    <tr>
                        <td colspan="3" class="text-right">Total Agreement Budget</td>
                        <td class="text-right">${formatNumber(totalAgreementHours)} hrs</td>
                        <td class="text-right">$${formatNumber(totalAgreementPay)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
        
        const signatureBlockHtml = () => {
            if (!signatureSection) return '';
            const providerParty = signatureSection.parties.find(p => p.party === 'provider');
            const participantParty = signatureSection.parties.find(p => p.party === 'participant');
            const representativeParty = signatureSection.parties.find(p => p.party === 'representative');

            const providerHtml = `<td><p style="border-bottom: 1px dotted #000; height: 2em;"></p><p>Signature</p></td><td><p style="border-bottom: 1px dotted #000; height: 2em;"></p><p>Name (please print)</p></td>`;
            const participantHtml = `<td><p style="border-bottom: 1px dotted #000; height: 2em;"></p><p>Signature</p></td><td><p style="border-bottom: 1px dotted #000; height: 2em;">${serviceAgreementInfo.participantName}</p><p>Name (please print)</p></td>`;
            const representativeHtml = serviceAgreementInfo.representativeName ? `<tr><td colspan="2"><strong>${replacePlaceholders(representativeParty.heading)}</strong></td></tr><tr><td><p style="border-bottom: 1px dotted #000; height: 2em;"></p><p>Signature</p></td><td><p style="border-bottom: 1px dotted #000; height: 2em;">${serviceAgreementInfo.representativeName}</p><p>Name (please print)</p></td></tr>` : '';
            
            return `
                <hr>
                <h2>${signatureSection.title}</h2>
                <p>Executed as an agreement on: ${serviceAgreementInfo.agreementDate}</p>
                <table class="signature-table" style="width: 100%; border: none; margin-top: 2rem;">
                    <tbody>
                        <tr><td colspan="2"><strong>${replacePlaceholders(providerParty.heading)}</strong></td></tr>
                        <tr>${providerHtml}</tr>
                        <tr><td colspan="2" style="height: 2rem;"></td></tr>
                        <tr><td colspan="2"><strong>${replacePlaceholders(participantParty.heading)}</strong></td></tr>
                        <tr>${participantHtml}</tr>
                        <tr><td colspan="2" style="height: 2rem;"></td></tr>
                        ${representativeHtml}
                    </tbody>
                </table>
            `;
        };

        const annexureHtml = `<hr><h1>Annexure A: Schedule of Supports</h1>${quotesHtml}${grandTotalSummaryHtml}`;
        return `<html><head><title>Service Agreement - ${serviceAgreementInfo.participantName}</title><style>
            @page {
                size: A4;
                margin: 0;
            }
            body { 
                font-family: sans-serif;
                margin: 0;
                color: #333;
            }
            .page-container {
                display: flex;
                flex-direction: column;
                min-height: 297mm; /* A4 height */
                width: 210mm; /* A4 width */
                margin: auto;
                background: white;
                box-shadow: 0 0 0.5cm rgba(0,0,0,0.5);
            }
            .content-body {
                flex-grow: 1;
                padding: 1em 1in 1em 1in;
            }
            .header-img, .footer-img {
                width: 100%;
                display: block;
            }
            h1,h2,h3,h4{color:#333}
            h1 { page-break-before: always; }
            h1:first-of-type { page-break-before: auto; }
            table{width:100%;border-collapse:collapse;margin-bottom:1.5rem}
            th,td{border:1px solid #ccc;padding:8px;text-align:left;word-break: break-word;}
            th{background-color:#f2f2f2}
            .text-right{text-align:right}
            .quote-section{margin-bottom:2rem;break-inside:avoid}
            .signature-table, .signature-table td {border: none;}
        </style></head><body>
            <div class="page-container">
                <div class="header"><img src="${HEADER_IMAGE_URL}" alt="Header" class="header-img"></div>
                <div class="content-body">
                    <h1>${agreementFileContent.agreementContent.title}</h1>
                    ${mainContentHtml}
                    ${annexureHtml}
                    ${signatureBlockHtml()}
                </div>
                <div class="footer"><img src="${FOOTER_IMAGE_URL}" alt="Footer" class="footer-img"></div>
            </div>
        </body></html>`;
    };

    const handleGenerateAgreement = () => {
        const finalHtml = getAgreementHtml();
        if (finalHtml) {
            const newWindow = window.open('', '_blank');
            newWindow.document.write(finalHtml);
            newWindow.document.close();
        }
    };

    const handleGenerateWordDoc = () => {
        const finalHtml = getAgreementHtml();
        if (finalHtml) {
            const blob = new Blob([finalHtml], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Service_Agreement_${serviceAgreementInfo.participantName}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    const printHandlers = {
        handlePrintAll: () => window.print(),
        handlePrintOne: (quoteRef) => { 
            const printContent = quoteRef.current.innerHTML;
            const originalContent = document.body.innerHTML;
            const printStyles = `<style>
                body { margin: 1.5rem; }
                table { width:100%; border-collapse:collapse; }
                th, td { border:1px solid #ccc; padding:8px; text-align:left; }
                th { background-color:#f2f2f2; }
                .text-right { text-align:right; }
                .no-print { display: none; }
            </style>`;
            document.body.innerHTML = printStyles + printContent;
            window.print();
            document.body.innerHTML = originalContent;
            window.location.reload(); // Reload to re-attach React listeners
        }
    };
    
    const quoteHandlers = {
        ...printHandlers,
        handleAddQuote: ({ rates, results }) => {
            if (!quoteDescription.trim()) { setError('Please enter a description for the quote.'); return; }
            
            const days = calculationResults.calculatedTotalDays || 0;
            
            const nptCostVal = nptCost;
            const abtCostVal = abtCost;
            
            const transportData = {
                npt: transport.npt.isEnabled && nptCostVal > 0 ? {
                    cost: nptCostVal,
                    totalKm: (parseFloat(transport.npt.km) || 0) * days,
                    kmPerTrip: transport.npt.km,
                    rate: transport.npt.rate,
                    itemCode: transport.npt.itemCode,
                    name: transport.npt.name
                } : null,
                abt: transport.abt.isEnabled && abtCostVal > 0 ? {
                    cost: abtCostVal,
                    totalKm: (parseFloat(transport.abt.km) || 0) * days,
                    kmPerTrip: transport.abt.km,
                    rate: transport.abt.rate,
                    itemCode: transport.abt.itemCode,
                    name: transport.abt.name
                } : null,
            };

            const grandTotalPay = results.totalPay + nptCostVal + abtCostVal;

            const newQuote = { 
                id: crypto.randomUUID(), 
                description: quoteDescription.trim(), 
                totalPay: grandTotalPay, 
                totalHours: results.totalHours, 
                rates, 
                results,
                transport: transportData,
                fromDate: fromDate,
                toDate: toDate
            };

            setSavedQuotes(p => [...p, newQuote]); 
            setQuoteDescription('');
            setTransport({
                npt: { isEnabled: false, km: '', rate: '1.00', itemCode: '', name: '' },
                abt: { isEnabled: false, km: '', rate: '1.00', itemCode: '', name: '' }
            });
            setError('');
        },
        handleDeleteQuote: (id) => setSavedQuotes(p => p.filter(q => q.id !== id)),
    };
    
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 font-sans antialiased text-gray-800">
            <style>{`
                @media print { 
                    body { margin: 1.5rem; }
                    .no-print { display: none !important; }
                    .printable-area { display: block !important; page-break-inside: avoid; box-shadow: none !important; border: 1px solid #ccc !important; }
                    main { box-shadow: none !important; }
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-in-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
            <FloatingNav totalPay={calculationResults.totalPay} totalHours={calculationResults.totalHours} transportCost={totalTransportCost} />
            <main className="max-w-4xl w-full mx-auto bg-white shadow-xl rounded-xl p-6 sm:p-8 space-y-6">
                <div className="text-center no-print">
                    <h1 className="text-3xl sm:text-4xl font-extrabold text-indigo-700">NDIS Budget & SA Generator</h1>
                    <p className="mt-2 text-gray-600">A tool for NDIS planning and quoting.</p>
                </div>
                {error && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md no-print"><strong>Error: </strong><span className="ml-2">{error}</span></div>)}
                {(rateError || agreementError) && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md no-print"><strong>Data Loading Error: </strong><span className="ml-2">{rateError || agreementError}</span></div>)}
                
                <div className="space-y-6 no-print">
                    <DateRangeSection fromDate={fromDate} toDate={toDate} setFromDate={setFromDate} setToDate={setToDate} recurringType={recurringType} setRecurringType={setRecurringType} />
                    <BudgetSection 
                        budget={budget} 
                        setBudget={setBudget} 
                        budgetMode={budgetMode} 
                        setBudgetMode={setBudgetMode} 
                        calculationResults={calculationResults} 
                        handlers={budgetHandlers} 
                        totalProjectedCost={calculationResults.totalPay + totalTransportCost}
                    />
                    <ApplicableDaysSection weeklyDays={weeklyDays} handlers={dayHandlers} suggestedDailyHours={budgetSuggestions.suggestedHours}/>
                    <NdisRateFinderSection rates={rates} ndisRates={ndisRates} isLoading={isLoadingRates} handleNdisRateSelect={handleNdisRateSelect} />
                    <TransportSection 
                        transport={transport}
                        setTransport={setTransport}
                        calculatedDays={calculationResults.calculatedTotalDays}
                        suggestedAbtKm={budgetSuggestions.suggestedAbtKm}
                        ndisRates={ndisRates}
                        isLoadingRates={isLoadingRates}
                        onRateSelect={handleTransportRateSelect}
                    />
                    <ManualRatesSection rates={rates} handlers={rateHandlers} />
                    <PublicHolidaysSection includePublicHolidays={includePublicHolidays} setIncludePublicHolidays={setIncludePublicHolidays} publicHolidaysInput={publicHolidaysInput} setPublicHolidaysInput={setPublicHolidaysInput} />
                </div>
                
                <ResultsSection results={calculationResults} transportCost={totalTransportCost}/>
                                
                <PeriodBreakdownSection results={calculationResults} />
                <SavedQuotesSection savedQuotes={savedQuotes} handlers={quoteHandlers} quoteDescription={quoteDescription} setQuoteDescription={setQuoteDescription} rates={rates} results={calculationResults} />
                <div className="no-print">
                    <ServiceAgreementSection 
                        info={serviceAgreementInfo} 
                        setInfo={setServiceAgreementInfo} 
                        onGenerate={handleGenerateAgreement} 
                        onGenerateWord={handleGenerateWordDoc}
                        isLoading={isLoadingAgreement} 
                    />
                </div>
            </main>
        </div>
    );
}

export default App;
