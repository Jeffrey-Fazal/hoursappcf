import React, { useState, useEffect } from 'react';

// Helper to get today's date in<x_bin_411>-MM-DD format
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
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
    if (typeof num !== 'number' || isNaN(num)) {
        return 0; // Return 0 for invalid numbers
    }
    return Math.ceil(num * 100) / 100;
};

// Main App component for the hours forecasting application
const App = () => {
    // State variables for inputs
    const [fromDate, setFromDate] = useState(getTodayDate());
    const [toDate, setToDate] = useState(getOneYearFromToday());
    const [recurringType, setRecurringType] = useState('Weekly');

    const [weeklyDays, setWeeklyDays] = useState({
        Monday: { selected: false, hours: '' },
        Tuesday: { selected: false, hours: '' },
        Wednesday: { selected: false, hours: '' },
        Thursday: { selected: false, hours: '' },
        Friday: { selected: false, hours: '' },
        Saturday: { selected: false, hours: '' },
        Sunday: { selected: false, hours: '' },
    });

    const defaultQueenslandPublicHolidays = [
        '2025-01-01', '2025-01-27', '2025-04-18', '2025-04-19', '2025-04-20',
        '2025-04-21', '2025-04-25', '2025-05-05', '2025-08-13', '2025-10-06',
        '2025-12-24', '2025-12-25', '2025-12-26'
    ].join(', ');

    const [includePublicHolidays, setIncludePublicHolidays] = useState(true);
    const [publicHolidaysInput, setPublicHolidaysInput] = useState(defaultQueenslandPublicHolidays);

    const [weekdayRate, setWeekdayRate] = useState('');
    const [saturdayRate, setSaturdayRate] = useState('');
    const [sundayRate, setSundayRate] = useState('');
    const [publicHolidayRate, setPublicHolidayRate] = useState('');

    const [budgetMode, setBudgetMode] = useState('noBudget');
    const [budget, setBudget] = useState('');

    const [totalHours, setTotalHours] = useState(0);
    const [weekdayHours, setWeekdayHours] = useState(0);
    const [saturdayHours, setSaturdayHours] = useState(0);
    const [sundayHours, setSundayHours] = useState(0);
    const [publicHolidayHours, setPublicHolidayHours] = useState(0);

    const [totalPay, setTotalPay] = useState(0);
    const [weekdayPay, setWeekdayPay] = useState(0);
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

    // State for saved quotes and their description
    const [quoteDescription, setQuoteDescription] = useState('');
    const [savedQuotes, setSavedQuotes] = useState(() => {
        // Load saved quotes from local storage on initial render
        try {
            const localData = localStorage.getItem('savedQuotes');
            return localData ? JSON.parse(localData) : [];
        } catch (error) {
            console.error("Could not parse saved quotes from local storage:", error);
            return [];
        }
    });

    // Effect to save quotes to local storage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem('savedQuotes', JSON.stringify(savedQuotes));
        } catch (error) {
            console.error("Could not save quotes to local storage:", error);
        }
    }, [savedQuotes]);
    
    const handleFocus = (event) => event.target.select();

    const handleWeeklyDayChange = (day) => {
        setWeeklyDays(prevDays => ({
            ...prevDays,
            [day]: { ...prevDays[day], selected: !prevDays[day].selected }
        }));
    };

    const handleWeeklyHoursChange = (day, value) => {
        const numValue = parseFloat(value);
        if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 24)) {
            setWeeklyDays(prevDays => ({
                ...prevDays,
                [day]: { ...prevDays[day], hours: value }
            }));
            setError('');
        } else {
            setError('Hours must be a number between 0 and 24.');
        }
    };

    const handleValueChange = (setter, value) => {
        const numValue = parseFloat(value);
        if (value === '' || (!isNaN(numValue) && numValue >= 0)) {
            setter(value);
            setError('');
        } else {
            setError('Value must be a non-negative number.');
        }
    };

    const applySuggestedHours = () => {
        if (Object.keys(suggestedDailyHours).length > 0) {
            setWeeklyDays(prevDays => {
                const updatedDays = {};
                for (const dayName in prevDays) {
                    updatedDays[dayName] = {
                        ...prevDays[dayName],
                        hours: suggestedDailyHours[dayName]?.hours !== undefined
                            ? roundUpToTwoDecimals(suggestedDailyHours[dayName].hours)
                            : prevDays[dayName].hours
                    };
                }
                return updatedDays;
            });
        }
    };

    const setAllRatesSame = () => {
        const rateToApply = weekdayRate;
        setSaturdayRate(rateToApply);
        setSundayRate(rateToApply);
        setPublicHolidayRate(rateToApply);
    };

    // Main calculation useEffect
    useEffect(() => {
        const calculateAllTotals = () => {
            const start = new Date(fromDate + 'T00:00:00');
            const end = new Date(toDate + 'T00:00:00');

            if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
                setError('Please enter valid "From" and "To" dates, with "From" date before or equal to "To" date.');
                return;
            } else {
                setError('');
            }
            
            const numWeekdayRate = parseFloat(weekdayRate) || 0;
            const numSaturdayRate = parseFloat(saturdayRate) || 0;
            const numSundayRate = parseFloat(sundayRate) || 0;
            const numPublicHolidayRate = parseFloat(publicHolidayRate) || 0;
            const numBudget = parseFloat(budget) || 0;

            let periodBreakdownDays = 0, periodBreakdownWeekdays = 0, periodBreakdownSaturdays = 0, periodBreakdownSundays = 0, periodBreakdownPublicHolidays = 0;
            let currentWeekdayHours = 0, currentSaturdayHours = 0, currentSundayHours = 0, currentPublicHolidayHours = 0;
            let finalTotalHours = 0, finalTotalPay = 0;

            const holidaySet = new Set(includePublicHolidays ? publicHolidaysInput.split(',').map(d => d.trim()).filter(d => d) : []);
            const weekDaysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dayOfWeek = d.getDay();
                const dayName = weekDaysOrder[dayOfWeek];
                const currentDateString = d.toISOString().split('T')[0];
                const isHoliday = holidaySet.has(currentDateString);
                
                const hoursToday = parseFloat(weeklyDays[dayName].hours) || 0;
                const isDaySelectedInPattern = weeklyDays[dayName].selected;
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
                    } else {
                        const rate = (dayName === 'Saturday') ? numSaturdayRate : (dayName === 'Sunday') ? numSundayRate : numWeekdayRate;
                        if (dayName === 'Saturday') {
                            currentSaturdayHours += hoursToday;
                            periodBreakdownSaturdays++;
                        } else if (dayName === 'Sunday') {
                            currentSundayHours += hoursToday;
                            periodBreakdownSundays++;
                        } else {
                            currentWeekdayHours += hoursToday;
                            periodBreakdownWeekdays++;
                        }
                        finalTotalPay += hoursToday * rate;
                    }
                }
            }

            setCalculatedTotalDays(periodBreakdownDays);
            setCalculatedTotalWeekdays(periodBreakdownWeekdays);
            setCalculatedTotalSaturdays(periodBreakdownSaturdays);
            setCalculatedTotalSundays(periodBreakdownSundays);
            setCalculatedTotalPublicHolidays(periodBreakdownPublicHolidays);

            let monthsDiff = (end.getFullYear() - start.getFullYear()) * 12;
            monthsDiff -= start.getMonth();
            monthsDiff += end.getMonth();
            if (end.getDate() < start.getDate() && monthsDiff > 0) {
                monthsDiff--;
            }
            setCalculatedFullMonths(Math.max(0, monthsDiff));
            setCalculatedFullWeeks(Math.floor(periodBreakdownDays / 7));
            setCalculatedFullFortnights(Math.floor(periodBreakdownDays / 14));

            setWeekdayHours(roundUpToTwoDecimals(currentWeekdayHours));
            setSaturdayHours(roundUpToTwoDecimals(currentSaturdayHours));
            setSundayHours(roundUpToTwoDecimals(currentSundayHours));
            setPublicHolidayHours(roundUpToTwoDecimals(currentPublicHolidayHours));
            setTotalHours(roundUpToTwoDecimals(finalTotalHours));

            setWeekdayPay(roundUpToTwoDecimals(currentWeekdayHours * numWeekdayRate));
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
    }, [fromDate, toDate, recurringType, weeklyDays, includePublicHolidays, publicHolidaysInput, weekdayRate, saturdayRate, sundayRate, publicHolidayRate, budget, budgetMode]);

    // Function to add the current calculation as a new quote
    const handleAddQuote = () => {
        if (!quoteDescription.trim()) {
            setError('Please enter a description for the quote.');
            return;
        }

        const newQuote = {
            id: crypto.randomUUID(),
            description: quoteDescription.trim(),
            totalPay,
            totalHours,
            details: { // Snapshot of the data that created the quote
                fromDate, toDate, recurringType,
                weekdayRate, saturdayRate, sundayRate, publicHolidayRate,
                weekdayHours, saturdayHours, sundayHours, publicHolidayHours,
                weekdayPay, saturdayPay, sundayPay, publicHolidayPay
            }
        };

        setSavedQuotes(prevQuotes => [...prevQuotes, newQuote]);
        setQuoteDescription(''); // Clear input after saving
        setError(''); // Clear any previous error
    };

    // Function to delete a quote by its ID
    const handleDeleteQuote = (idToDelete) => {
        setSavedQuotes(prevQuotes => prevQuotes.filter(quote => quote.id !== idToDelete));
    };

    const formatNumber = (num) => {
        if (typeof num !== 'number' || isNaN(num)) {
            return '0.00';
        }
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const Tooltip = ({ children, text }) => (
        <span className="relative inline-block group cursor-help">
            {children}
            <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-gray-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
                {text}
            </span>
        </span>
    );
    
    const numericBudget = parseFloat(budget) || 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 sm:p-6 lg:p-8 font-sans antialiased text-gray-800">
            <div className="max-w-4xl mx-auto bg-white shadow-xl rounded-xl p-6 sm:p-8 space-y-6">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-center text-indigo-700 mb-8">
                    Hours & Pay Forecasting App
                </h1>

                {error && (
                    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md relative text-sm" role="alert">
                        <strong className="font-bold">Error:</strong>
                        <span className="block sm:inline ml-2">{error}</span>
                    </div>
                )}

                {/* All input sections are unchanged... */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 border border-blue-200 rounded-lg bg-blue-50">
                    <div>
                        <label htmlFor="fromDate" className="block text-sm font-semibold text-gray-700 mb-1">From Date:</label>
                        <input type="date" id="fromDate" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base" />
                    </div>
                    <div>
                        <label htmlFor="toDate" className="block text-sm font-semibold text-gray-700 mb-1">To Date:</label>
                        <input type="date" id="toDate" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base" />
                    </div>
                </div>

                <div className="p-4 border border-purple-200 rounded-lg bg-purple-50">
                    <label htmlFor="recurringType" className="block text-lg font-semibold text-gray-700 mb-2">Recurring Type:</label>
                    <select id="recurringType" value={recurringType} onChange={(e) => setRecurringType(e.target.value)} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base bg-white">
                        <option value="Daily">Daily</option>
                        <option value="Weekly">Weekly</option>
                        <option value="Fortnightly">Fortnightly</option>
                        <option value="Monthly">Monthly</option>
                        <option value="Quarterly">Quarterly</option>
                    </select>
                    <p className="text-sm text-gray-600 mt-2">
                        This setting dictates how often your 'Applicable Days & Hours' pattern repeats within the selected date range.
                    </p>
                </div>

                <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Applicable Days & Hours per Day:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(weeklyDays).map(([day, { selected, hours }]) => (
                            <div key={day} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" id={`day-${day}`} checked={selected} onChange={() => handleWeeklyDayChange(day)} className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                    <label htmlFor={`day-${day}`} className="text-sm font-medium text-gray-700">{day}:</label>
                                    <input type="number" value={hours} onChange={(e) => handleWeeklyHoursChange(day, e.target.value)} onFocus={handleFocus} className="w-24 p-2 border border-gray-300 rounded-md text-sm text-center focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out" min="0" max="24" placeholder="0" />
                                </div>
                                {budgetMode === 'lock' && numericBudget > 0 && Object.keys(suggestedDailyHours).length > 0 && suggestedDailyHours[day]?.hours !== undefined && suggestedDailyHours[day].selected && (
                                    <div className="mt-1 text-green-600 font-semibold text-sm text-center">
                                        (Suggested: {formatNumber(suggestedDailyHours[day].hours)})
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    {budgetMode === 'lock' && totalPay > 0 && numericBudget > 0 && totalPay !== numericBudget && (
                        <div className="mt-4 text-center">
                            <button onClick={applySuggestedHours} className="px-6 py-2 bg-teal-600 text-white font-bold rounded-md shadow-md hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition duration-150 ease-in-out">
                                Apply Suggested Hours
                            </button>
                        </div>
                    )}
                </div>

                <div className="p-4 border border-teal-200 rounded-lg bg-teal-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Budget Information:</h3>
                    <div className="flex space-x-4 mb-4">
                        <label className="inline-flex items-center">
                            <input type="radio" className="form-radio h-5 w-5 text-teal-600" name="budgetOption" value="lock" checked={budgetMode === 'lock'} onChange={() => setBudgetMode('lock')} />
                            <span className="ml-2 text-gray-700">Lock Budget</span>
                            <Tooltip text="Select 'Lock Budget' to set a target monetary amount. The app will then show you how your projected pay compares and suggest hours to meet this budget based on your current rates.">
                                <span className="ml-1 text-gray-500 cursor-help">?</span>
                            </Tooltip>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" className="form-radio h-5 w-5 text-teal-600" name="budgetOption" value="noBudget" checked={budgetMode === 'noBudget'} onChange={() => setBudgetMode('noBudget')} />
                            <span className="ml-2 text-gray-700">No Budget</span>
                        </label>
                    </div>
                    {budgetMode === 'lock' && (
                        <div className="animate-fade-in">
                            <label htmlFor="budget" className="block text-sm font-semibold text-gray-700 mb-1">Your Total Budget ($):</label>
                            <input type="number" id="budget" value={budget} onChange={(e) => handleValueChange(setBudget, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base" min="0" placeholder="0.00" />
                            <div className="mt-4 text-gray-800">
                                {totalPay === 0 && numericBudget > 0 ? (<p className="text-red-600 font-bold">Please set rates and hours to calculate.</p>) : numericBudget > 0 && totalPay > 0 ? (
                                    <p className="text-lg font-semibold">Budget vs. Projected: {' '}
                                        {totalPay > numericBudget ? (<span className="text-red-600 font-bold">OVER by ${formatNumber(totalPay - numericBudget)}</span>) : totalPay < numericBudget ? (<span className="text-green-600 font-bold">UNDER by ${formatNumber(numericBudget - totalPay)}</span>) : (<span className="text-blue-600 font-bold">ON BUDGET</span>)}
                                    </p>
                                ) : (<p className="text-lg font-semibold">Enter a budget to see comparison.</p>)}
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border border-green-200 rounded-lg bg-green-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Hourly Rates:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div><label htmlFor="weekdayRate" className="block text-sm font-semibold text-gray-700 mb-1">Weekday Rate:</label><input type="number" id="weekdayRate" value={weekdayRate} onChange={(e) => handleValueChange(setWeekdayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm" min="0" placeholder="0.00" /></div>
                        <div><label htmlFor="saturdayRate" className="block text-sm font-semibold text-gray-700 mb-1">Saturday Rate:</label><input type="number" id="saturdayRate" value={saturdayRate} onChange={(e) => handleValueChange(setSaturdayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm" min="0" placeholder="0.00" /></div>
                        <div><label htmlFor="sundayRate" className="block text-sm font-semibold text-gray-700 mb-1">Sunday Rate:</label><input type="number" id="sundayRate" value={sundayRate} onChange={(e) => handleValueChange(setSundayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm" min="0" placeholder="0.00" /></div>
                        {includePublicHolidays && (
                            <div className="animate-fade-in"><label htmlFor="publicHolidayRate" className="block text-sm font-semibold text-gray-700 mb-1">Public Holiday Rate:</label><input type="number" id="publicHolidayRate" value={publicHolidayRate} onChange={(e) => handleValueChange(setPublicHolidayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm" min="0" placeholder="0.00" /></div>
                        )}
                    </div>
                    <div className="mt-4 text-center"><button onClick={setAllRatesSame} className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-md shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">Set All Rates Same</button></div>
                </div>

                <div className="p-4 border border-red-200 rounded-lg bg-red-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Public Holidays:</h3>
                    <div className="flex space-x-4 mb-4">
                        <label className="inline-flex items-center"><input type="radio" className="form-radio" name="publicHolidayOption" value="include" checked={includePublicHolidays === true} onChange={() => setIncludePublicHolidays(true)} /><span className="ml-2">Include Public Holidays</span></label>
                        <label className="inline-flex items-center"><input type="radio" className="form-radio" name="publicHolidayOption" value="skip" checked={includePublicHolidays === false} onChange={() => setIncludePublicHolidays(false)} /><span className="ml-2">Treat as normal days</span></label>
                    </div>
                    {includePublicHolidays && (
                        <div className="animate-fade-in"><label htmlFor="publicHolidays" className="block text-sm font-semibold text-gray-700 mb-1">Custom Public Holidays (YYYY-MM-DD, comma-separated):</label><textarea id="publicHolidays" rows="3" value={publicHolidaysInput} onChange={(e) => setPublicHolidaysInput(e.target.value)} placeholder="e.g., 2025-01-01, 2025-01-27" className="w-full p-3 border border-gray-300 rounded-md shadow-sm"></textarea><p className="text-sm text-gray-600 mt-1">Default is QLD 2025 holidays. Find more at: <a href="https://www.timeanddate.com/holidays/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">timeanddate.com</a></p></div>
                    )}
                </div>

                {/* --- RESULTS --- */}
                <div className="mt-8 p-6 bg-indigo-600 rounded-xl shadow-lg text-white text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Hours:</h2>
                    <p className="text-4xl sm:text-5xl font-extrabold mb-4">{formatNumber(totalHours)}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
                        <div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Weekday:</h3> <p className="text-2xl font-bold">{formatNumber(weekdayHours)}</p> </div>
                        <div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Saturday:</h3> <p className="text-2xl font-bold">{formatNumber(saturdayHours)}</p> </div>
                        <div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Sunday:</h3> <p className="text-2xl font-bold">{formatNumber(sundayHours)}</p> </div>
                        {includePublicHolidays && (<div className="bg-indigo-700 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-indigo-200">Public Hol:</h3> <p className="text-2xl font-bold">{formatNumber(publicHolidayHours)}</p> </div>)}
                    </div>
                </div>

                <div className="mt-6 p-6 bg-purple-700 rounded-xl shadow-lg text-white text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Pay:</h2>
                    <p className="text-4xl sm:text-5xl font-extrabold mb-4">${formatNumber(totalPay)}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
                        <div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Weekday:</h3> <p className="text-2xl font-bold">${formatNumber(weekdayPay)}</p> </div>
                        <div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Saturday:</h3> <p className="text-2xl font-bold">${formatNumber(saturdayPay)}</p> </div>
                        <div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Sunday:</h3> <p className="text-2xl font-bold">${formatNumber(sundayPay)}</p> </div>
                        {includePublicHolidays && (<div className="bg-purple-800 p-3 rounded-lg shadow-md"> <h3 className="text-lg font-semibold text-purple-200">Public Hol:</h3> <p className="text-2xl font-bold">${formatNumber(publicHolidayPay)}</p> </div>)}
                    </div>
                </div>
                
                {/* Saved Quotes Section */}
                <div className="p-4 border border-cyan-200 rounded-lg bg-cyan-50">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Save Calculation as Quote</h3>
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                        <input
                            type="text"
                            value={quoteDescription}
                            onChange={(e) => setQuoteDescription(e.target.value)}
                            placeholder="e.g., Standard weekly service"
                            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-cyan-500 focus:border-cyan-500"
                        />
                        <button
                            onClick={handleAddQuote}
                            disabled={!totalPay && !totalHours}
                            className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-md shadow-md hover:bg-cyan-700 w-full sm:w-auto flex-shrink-0 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            Save Quote
                        </button>
                    </div>

                    {savedQuotes.length > 0 && (
                        <div className="mt-6 space-y-4">
                            <h4 className="text-md font-semibold text-gray-700">Saved Quotes:</h4>
                            {savedQuotes.map(quote => (
                                <div key={quote.id} className="bg-white p-4 rounded-lg shadow-md border border-gray-200 flex justify-between items-start gap-4">
                                    <div className="flex-grow">
                                        <p className="font-bold text-gray-800 break-words">{quote.description}</p>
                                        <p className="text-sm text-gray-600 mt-1">
                                            <strong>Total Pay:</strong> <span className="font-semibold">${formatNumber(quote.totalPay)}</span> | <strong>Total Hours:</strong> <span className="font-semibold">{formatNumber(quote.totalHours)}</span>
                                        </p>
                                        {/* MODIFIED: Added breakdown details */}
                                        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 grid grid-cols-2 gap-x-4">
                                            <p><strong>Weekday:</strong> {formatNumber(quote.details.weekdayHours)} hrs / ${formatNumber(quote.details.weekdayPay)}</p>
                                            <p><strong>Saturday:</strong> {formatNumber(quote.details.saturdayHours)} hrs / ${formatNumber(quote.details.saturdayPay)}</p>
                                            <p><strong>Sunday:</strong> {formatNumber(quote.details.sundayHours)} hrs / ${formatNumber(quote.details.sundayPay)}</p>
                                            {quote.details.publicHolidayHours > 0 && (
                                                <p><strong>Public Hol:</strong> {formatNumber(quote.details.publicHolidayHours)} hrs / ${formatNumber(quote.details.publicHolidayPay)}</p>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteQuote(quote.id)}
                                        className="text-red-500 hover:text-red-700 font-semibold text-sm flex-shrink-0 p-1"
                                    >
                                        Delete
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded-xl shadow-md text-gray-800 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 text-indigo-700">Period Breakdown:</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-white rounded-lg shadow-sm"> <h3 className="text-lg font-semibold">Total Counted Days:</h3> <p className="text-xl font-bold">{calculatedTotalDays}</p> </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm"> <h3 className="text-lg font-semibold">Counted Weekdays:</h3> <p className="text-xl font-bold">{calculatedTotalWeekdays}</p> </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm"> <h3 className="text-lg font-semibold">Counted Saturdays:</h3> <p className="text-xl font-bold">{calculatedTotalSaturdays}</p> </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm"> <h3 className="text-lg font-semibold">Counted Sundays:</h3> <p className="text-xl font-bold">{calculatedTotalSundays}</p> </div>
                        {includePublicHolidays && (<div className="p-3 bg-white rounded-lg shadow-sm"><h3 className="text-lg font-semibold">Counted Public Hols:</h3><p className="text-xl font-bold">{calculatedTotalPublicHolidays}</p></div>)}
                        <div className="p-3 bg-white rounded-lg shadow-sm"><h3 className="text-lg font-semibold">Full Weeks:</h3><p className="text-xl font-bold">{calculatedFullWeeks}</p></div>
                        <div className="p-3 bg-white rounded-lg shadow-sm"><h3 className="text-lg font-semibold">Full Fortnights:</h3><p className="text-xl font-bold">{calculatedFullFortnights}</p></div>
                        <div className="p-3 bg-white rounded-lg shadow-sm"><h3 className="text-lg font-semibold">Full Months:</h3><p className="text-xl font-bold">{calculatedFullMonths}</p></div>
                    </div>
                    <div className="mt-6 text-left p-4 border border-gray-200 rounded-lg bg-white text-gray-800">
                        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Calculation Details:</h3>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                           <li><strong>Overall Calendar Period (Raw Duration):</strong> This refers to the total calendar time span between your 'From Date' and 'To Date'.<ul className="list-circle pl-5 mt-1 space-y-1"><li><strong>Total Calendar Days:</strong> Every day counted between the 'From Date' and 'To Date'.</li><li><strong>Full Weeks (Calendar):</strong> Total Calendar Days / 7, taking only the whole number.</li><li><strong>Full Fortnights (Calendar):</strong> Total Calendar Days / 14, taking only the whole number.</li><li><strong>Full Months (Calendar):</strong> The number of complete calendar months that fit entirely within your period.</li></ul></li>
                           <li><strong>Specific Day Counts (Total Weekdays, Saturdays, Sundays, Public Holidays):</strong> These represent the count of each type of day within the *Overall Calendar Period*, before considering which days you've marked as 'Applicable'.<ul className="list-circle pl-5 mt-1 space-y-1"><li><strong>Total Weekdays:</strong> The count of Monday-Friday dates that are NOT public holidays within the period.</li><li><strong>Total Saturdays:</strong> The count of Saturday dates that are NOT public holidays within the period.</li><li><strong>Total Sundays:</strong> The count of Sunday dates that are NOT public holidays within the period.</li><li><strong>Total Public Holidays:</strong> The count of dates explicitly listed as public holidays within the period.</li></ul></li>
                           <li><strong>Projected Hours & Pay (Influenced by 'Recurring Type' and 'Applicable Days'):</strong> The 'Total Projected Hours' and 'Total Projected Pay' (and their breakdowns) are calculated by simulating your work pattern day-by-day across the period.<ul className="list-circle pl-5 mt-1 space-y-1"><li><strong>Daily:</strong> The hours from your 'Applicable Days' are counted for *every* calendar day in the period, respecting holiday exclusions.</li><li><strong>Weekly:</strong> The hours from your 'Applicable Days' are counted for *every* occurrence of that day in each week of the period, respecting holiday exclusions.</li><li><strong>Fortnightly:</strong> The hours from your 'Applicable Days' are counted only for days falling within the *first week of each two-week cycle*, starting from your 'From Date', respecting holiday exclusions. This simulates bi-weekly work.</li><li><strong>Monthly:</strong> The hours from your 'Applicable Days' are counted only for days falling within the *first 7 days of each month*, respecting holiday exclusions. This serves as a "ballpark" for monthly recurring work.</li><li><strong>Quarterly:</strong> The hours from your 'Applicable Days' are counted only for days falling within the *first 7 days of the first month of each quarter* (January, April, July, October), respecting holiday exclusions. This provides a "ballpark" for quarterly recurring work.</li></ul></li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
