import React, { useState, useEffect } from 'react';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper to get date one year from today in YYYY-MM-DD format
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
    const [fromDate, setFromDate] = useState(getTodayDate()); // Default from date is today
    const [toDate, setToDate] = useState(getOneYearFromToday()); // Default to date is one year from today
    const [recurringType, setRecurringType] = useState('Weekly'); // Default recurring type

    // MODIFIED: State for weekly day selection and hours. Hours can be a string ('') or number.
    const [weeklyDays, setWeeklyDays] = useState({
        Monday: { selected: false, hours: '' },
        Tuesday: { selected: false, hours: '' },
        Wednesday: { selected: false, hours: '' },
        Thursday: { selected: false, hours: '' },
        Friday: { selected: false, hours: '' },
        Saturday: { selected: false, hours: '' },
        Sunday: { selected: false, hours: '' },
    });

    // Default Australian public holidays for 2025 (YYYY-MM-DD format)
    const defaultQueenslandPublicHolidays = [
        '2025-01-01', // New Year's Day
        '2025-01-27', // Australia Day (Observed)
        '2025-04-18', // Good Friday
        '2025-04-19', // The day after Good Friday
        '2025-04-20', // Easter Sunday
        '2025-04-21', // Easter Monday
        '2025-04-25', // ANZAC Day
        '2025-05-05', // Labour Day
        '2025-08-13', // Royal Queensland Show (Brisbane area only)
        '2025-10-06', // King’s Birthday
        '2025-12-24', // Christmas Eve (6pm to midnight - treated as full day for calculation)
        '2025-12-25', // Christmas Day
        '2025-12-26', // Boxing Day
    ].join(', '); // Join them into a comma-separated string for the textarea

    // State for public holiday handling
    const [includePublicHolidays, setIncludePublicHolidays] = useState(true); // Default to include
    // State for the editable public holidays input
    const [publicHolidaysInput, setPublicHolidaysInput] = useState(defaultQueenslandPublicHolidays);

    // MODIFIED: State for rates can now be a string ('') or number for better UX
    const [weekdayRate, setWeekdayRate] = useState('');
    const [saturdayRate, setSaturdayRate] = useState('');
    const [sundayRate, setSundayRate] = useState('');
    const [publicHolidayRate, setPublicHolidayRate] = useState('');

    // State variable for budget mode and value
    const [budgetMode, setBudgetMode] = useState('noBudget'); // Default to 'noBudget'
    const [budget, setBudget] = useState(''); // MODIFIED: Set initial budget to empty string

    // State for the calculated total projected hours and breakdown
    const [totalHours, setTotalHours] = useState(0);
    const [weekdayHours, setWeekdayHours] = useState(0);
    const [saturdayHours, setSaturdayHours] = useState(0);
    const [sundayHours, setSundayHours] = useState(0);
    const [publicHolidayHours, setPublicHolidayHours] = useState(0);

    // State for the calculated pay and breakdown
    const [totalPay, setTotalPay] = useState(0);
    const [weekdayPay, setWeekdayPay] = useState(0);
    const [saturdayPay, setSaturdayPay] = useState(0);
    const [sundayPay, setSundayPay] = useState(0);
    const [publicHolidayPay, setPublicHolidayPay] = useState(0);

    const [error, setError] = useState(''); // State for error messages

    // State for suggested daily hours when budget is locked
    const [suggestedDailyHours, setSuggestedDailyHours] = useState({});

    // State for period breakdown (day counts by type)
    const [calculatedTotalDays, setCalculatedTotalDays] = useState(0);
    const [calculatedTotalWeekdays, setCalculatedTotalWeekdays] = useState(0);
    const [calculatedTotalSaturdays, setCalculatedTotalSaturdays] = useState(0);
    const [calculatedTotalSundays, setCalculatedTotalSundays] = useState(0);
    const [calculatedTotalPublicHolidays, setCalculatedTotalPublicHolidays] = useState(0);
    const [calculatedFullWeeks, setCalculatedFullWeeks] = useState(0);
    const [calculatedFullFortnights, setCalculatedFullFortnights] = useState(0);
    const [calculatedFullMonths, setCalculatedFullMonths] = useState(0);
    
    // NEW: Helper to select input content on focus for better UX
    const handleFocus = (event) => event.target.select();

    // Function to handle changes in weekly day selection checkboxes
    const handleWeeklyDayChange = (day) => {
        setWeeklyDays(prevDays => ({
            ...prevDays,
            [day]: { ...prevDays[day], selected: !prevDays[day].selected }
        }));
    };

    // MODIFIED: Allows empty string for better UX, validates non-empty values
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

    // MODIFIED: Generic handler for rate and budget inputs for better UX
    const handleValueChange = (setter, value) => {
        const numValue = parseFloat(value);
        if (value === '' || (!isNaN(numValue) && numValue >= 0)) {
            setter(value);
            setError('');
        } else {
            setError('Value must be a non-negative number.');
        }
    };

    // Function to apply suggested hours to the main weeklyDays state
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


    // Function to set all hourly rates to the same value (weekday rate)
    const setAllRatesSame = () => {
        const rateToApply = weekdayRate;
        setSaturdayRate(rateToApply);
        setSundayRate(rateToApply);
        setPublicHolidayRate(rateToApply);
    };

    // useEffect hook to recalculate all totals and breakdown whenever inputs change
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
            
            // MODIFIED: Parse all state values here for calculation, with fallback to 0
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
                
                // MODIFIED: Parse hours here with a fallback to 0 for calculations
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

                {/* Date Inputs */}
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

                {/* Recurring Type Selector */}
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

                {/* Applicable Days & Hours per Day (always visible) */}
                <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Applicable Days & Hours per Day:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {Object.entries(weeklyDays).map(([day, { selected, hours }]) => (
                            <div key={day} className="bg-white p-3 rounded-md shadow-sm border border-gray-200">
                                <div className="flex items-center space-x-2">
                                    <input type="checkbox" id={`day-${day}`} checked={selected} onChange={() => handleWeeklyDayChange(day)} className="form-checkbox h-5 w-5 text-indigo-600 rounded focus:ring-indigo-500" />
                                    <label htmlFor={`day-${day}`} className="text-sm font-medium text-gray-700">{day}:</label>
                                    <input
                                        type="number"
                                        value={hours}
                                        onChange={(e) => handleWeeklyHoursChange(day, e.target.value)}
                                        onFocus={handleFocus}
                                        className="w-24 p-2 border border-gray-300 rounded-md text-sm text-center focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out"
                                        min="0"
                                        max="24"
                                        placeholder="0"
                                    />
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

                {/* Budget Information */}
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
                            <input
                                type="number"
                                id="budget"
                                value={budget}
                                onChange={(e) => handleValueChange(setBudget, e.target.value)}
                                onFocus={handleFocus}
                                className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base"
                                min="0"
                                placeholder="0.00"
                            />
                            <div className="mt-4 text-gray-800">
                                {totalPay === 0 && numericBudget > 0 ? (
                                    <p className="text-red-600 font-bold">Please set your hourly rates and applicable daily hours to calculate against the budget.</p>
                                ) : numericBudget > 0 && totalPay > 0 ? (
                                    <>
                                        <p className="text-lg font-semibold">
                                            Budget vs. Projected: {' '}
                                            {totalPay > numericBudget ? (
                                                <span className="text-red-600 font-bold">OVER by ${formatNumber(totalPay - numericBudget)}</span>
                                            ) : totalPay < numericBudget ? (
                                                <span className="text-green-600 font-bold">UNDER by ${formatNumber(numericBudget - totalPay)}</span>
                                            ) : (
                                                <span className="text-blue-600 font-bold">EXACTLY ON BUDGET</span>
                                            )}
                                        </p>
                                    </>
                                ) : (
                                    <p className="text-lg font-semibold">
                                        Enter a budget to see comparison and suggestions.
                                    </p>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Hourly Rates Input */}
                <div className="p-4 border border-green-200 rounded-lg bg-green-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Hourly Rates:</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <label htmlFor="weekdayRate" className="block text-sm font-semibold text-gray-700 mb-1">Weekday Rate:</label>
                            <input type="number" id="weekdayRate" value={weekdayRate} onChange={(e) => handleValueChange(setWeekdayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base" min="0" placeholder="0.00" />
                        </div>
                        <div>
                            <label htmlFor="saturdayRate" className="block text-sm font-semibold text-gray-700 mb-1">Saturday Rate:</label>
                            <input type="number" id="saturdayRate" value={saturdayRate} onChange={(e) => handleValueChange(setSaturdayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base" min="0" placeholder="0.00" />
                        </div>
                        <div>
                            <label htmlFor="sundayRate" className="block text-sm font-semibold text-gray-700 mb-1">Sunday Rate:</label>
                            <input type="number" id="sundayRate" value={sundayRate} onChange={(e) => handleValueChange(setSundayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base" min="0" placeholder="0.00" />
                        </div>
                        {includePublicHolidays && (
                            <div className="animate-fade-in">
                                <label htmlFor="publicHolidayRate" className="block text-sm font-semibold text-gray-700 mb-1">Public Holiday Rate:</label>
                                <input type="number" id="publicHolidayRate" value={publicHolidayRate} onChange={(e) => handleValueChange(setPublicHolidayRate, e.target.value)} onFocus={handleFocus} className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base" min="0" placeholder="0.00" />
                            </div>
                        )}
                    </div>
                    <div className="mt-4 text-center">
                        <button onClick={setAllRatesSame} className="px-6 py-2 bg-indigo-500 text-white font-bold rounded-md shadow-md hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-150 ease-in-out">
                            Set All Rates Same (as Weekday Rate)
                        </button>
                    </div>
                </div>

                {/* Public Holidays Toggle */}
                <div className="p-4 border border-red-200 rounded-lg bg-red-50 animate-fade-in">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Public Holidays:</h3>
                    <div className="flex space-x-4 mb-4">
                        <label className="inline-flex items-center">
                            <input type="radio" className="form-radio h-5 w-5 text-red-600" name="publicHolidayOption" value="include" checked={includePublicHolidays === true} onChange={() => setIncludePublicHolidays(true)} />
                            <span className="ml-2 text-gray-700">Include Public Holidays (exclude from normal pay rates)</span>
                        </label>
                        <label className="inline-flex items-center">
                            <input type="radio" className="form-radio h-5 w-5 text-red-600" name="publicHolidayOption" value="skip" checked={includePublicHolidays === false} onChange={() => setIncludePublicHolidays(false)} />
                            <span className="ml-2 text-gray-700">Skip Public Holiday Exclusion (treat as normal days)</span>
                        </label>
                    </div>

                    {/* Custom Public Holidays Input (Conditionally rendered) */}
                    {includePublicHolidays && (
                        <div className="animate-fade-in">
                            <label htmlFor="publicHolidays" className="block text-sm font-semibold text-gray-700 mb-1">
                                Enter Custom Public Holidays (YYYY-MM-DD, comma-separated):
                            </label>
                            <textarea id="publicHolidays" rows="3" value={publicHolidaysInput} onChange={(e) => setPublicHolidaysInput(e.target.value)} placeholder="e.g., 2025-01-01, 2025-01-27" className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 ease-in-out text-base"></textarea>
                            <p className="text-sm text-gray-600 mt-1">
                                Queensland 2025 public holidays are pre-filled by default.
                                Find more public holidays here: <a href="https://www.timeanddate.com/holidays/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">timeanddate.com/holidays</a>
                            </p>
                        </div>
                    )}
                </div>

                {/* Total Hours Display and Breakdown */}
                <div className="mt-8 p-6 bg-indigo-600 rounded-xl shadow-lg text-white text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Hours:</h2>
                    <p className="text-4xl sm:text-5xl font-extrabold mb-4">
                        {formatNumber(totalHours)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
                        <div className="bg-indigo-700 p-3 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-indigo-200">Weekday Hours:</h3>
                            <p className="text-2xl font-bold">{formatNumber(weekdayHours)}</p>
                        </div>
                        <div className="bg-indigo-700 p-3 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-indigo-200">Saturday Hours:</h3>
                            <p className="text-2xl font-bold">{formatNumber(saturdayHours)}</p>
                        </div>
                        <div className="bg-indigo-700 p-3 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-indigo-200">Sunday Hours:</h3>
                            <p className="text-2xl font-bold">{formatNumber(sundayHours)}</p>
                        </div>
                        {includePublicHolidays && (
                            <div className="bg-indigo-700 p-3 rounded-lg shadow-md animate-fade-in">
                                <h3 className="text-lg font-semibold text-indigo-200">Public Holiday Hours:</h3>
                                <p className="text-2xl font-bold">{formatNumber(publicHolidayHours)}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Total Pay Display and Breakdown */}
                <div className="mt-6 p-6 bg-purple-700 rounded-xl shadow-lg text-white text-center">
                    <h2 className="text-2xl sm:text-3xl font-bold mb-2">Total Projected Pay:</h2>
                    <p className="text-4xl sm:text-5xl font-extrabold mb-4">
                        ${formatNumber(totalPay)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-left">
                        <div className="bg-purple-800 p-3 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-purple-200">Weekday Pay:</h3>
                            <p className="text-2xl font-bold">${formatNumber(weekdayPay)}</p>
                        </div>
                        <div className="bg-purple-800 p-3 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-purple-200">Saturday Pay:</h3>
                            <p className="text-2xl font-bold">${formatNumber(saturdayPay)}</p>
                        </div>
                        <div className="bg-purple-800 p-3 rounded-lg shadow-md">
                            <h3 className="text-lg font-semibold text-purple-200">Sunday Pay:</h3>
                            <p className="text-2xl font-bold">${formatNumber(sundayPay)}</p>
                        </div>
                        {includePublicHolidays && (
                            <div className="bg-purple-800 p-3 rounded-lg shadow-md animate-fade-in">
                                <h3 className="text-lg font-semibold text-purple-200">Public Holiday Pay:</h3>
                                <p className="text-2xl font-bold">${formatNumber(publicHolidayPay)}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Period Breakdown Section */}
                <div className="mt-6 p-4 bg-gray-100 border border-gray-300 rounded-xl shadow-md text-gray-800 text-center">
                    <h2 className="text-xl sm:text-2xl font-bold mb-3 text-indigo-700">Period Breakdown:</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Total Counted Days:</h3>
                            <p className="text-xl font-bold">{calculatedTotalDays}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Counted Weekdays:</h3>
                            <p className="text-xl font-bold">{calculatedTotalWeekdays}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Counted Saturdays:</h3>
                            <p className="text-xl font-bold">{calculatedTotalSaturdays}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Counted Sundays:</h3>
                            <p className="text-xl font-bold">{calculatedTotalSundays}</p>
                        </div>
                        {includePublicHolidays && (
                            <div className="p-3 bg-white rounded-lg shadow-sm animate-fade-in">
                                <h3 className="text-lg font-semibold text-gray-700">Counted Public Holidays:</h3>
                                <p className="text-xl font-bold">{calculatedTotalPublicHolidays}</p>
                            </div>
                        )}
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Full Weeks:</h3>
                            <p className="text-xl font-bold">{calculatedFullWeeks}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Full Fortnights:</h3>
                            <p className="text-xl font-bold">{calculatedFullFortnights}</p>
                        </div>
                        <div className="p-3 bg-white rounded-lg shadow-sm">
                            <h3 className="text-lg font-semibold text-gray-700">Full Months:</h3>
                            <p className="text-xl font-bold">{calculatedFullMonths}</p>
                        </div>
                    </div>

                    <div className="mt-6 text-left p-4 border border-gray-200 rounded-lg bg-white text-gray-800">
                        <h3 className="text-lg font-semibold text-indigo-700 mb-2">Calculation Details:</h3>
                        <ul className="list-disc pl-5 space-y-2 text-sm">
                            <li>
                                <strong>Overall Calendar Period (Raw Duration):</strong>
                                This refers to the total calendar time span between your 'From Date' and 'To Date'.
                                <ul className="list-circle pl-5 mt-1 space-y-1">
                                    <li><strong>Total Calendar Days:</strong> Every day counted between the 'From Date' and 'To Date'.</li>
                                    <li><strong>Full Weeks (Calendar):</strong> Total Calendar Days / 7, taking only the whole number.</li>
                                    <li><strong>Full Fortnights (Calendar):</strong> Total Calendar Days / 14, taking only the whole number.</li>
                                    <li><strong>Full Months (Calendar):</strong> The number of complete calendar months that fit entirely within your period.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Specific Day Counts (Total Weekdays, Saturdays, Sundays, Public Holidays):</strong>
                                These represent the count of each type of day within the *Overall Calendar Period*, before considering which days you've marked as 'Applicable'.
                                <ul className="list-circle pl-5 mt-1 space-y-1">
                                    <li><strong>Total Weekdays:</strong> The count of Monday-Friday dates that are NOT public holidays within the period.</li>
                                    <li><strong>Total Saturdays:</strong> The count of Saturday dates that are NOT public holidays within the period.</li>
                                    <li><strong>Total Sundays:</strong> The count of Sunday dates that are NOT public holidays within the period.</li>
                                    <li><strong>Total Public Holidays:</strong> The count of dates explicitly listed as public holidays within the period.</li>
                                </ul>
                            </li>
                            <li>
                                <strong>Projected Hours & Pay (Influenced by 'Recurring Type' and 'Applicable Days'):</strong>
                                The 'Total Projected Hours' and 'Total Projected Pay' (and their breakdowns) are calculated by simulating your work pattern day-by-day across the period.
                                <ul className="list-circle pl-5 mt-1 space-y-1">
                                    <li>
                                        <strong>Daily:</strong> The hours from your 'Applicable Days' are counted for *every* calendar day in the period, respecting holiday exclusions.
                                    </li>
                                    <li>
                                        <strong>Weekly:</strong> The hours from your 'Applicable Days' are counted for *every* occurrence of that day in each week of the period, respecting holiday exclusions.
                                    </li>
                                    <li>
                                        <strong>Fortnightly:</strong> The hours from your 'Applicable Days' are counted only for days falling within the *first week of each two-week cycle*, starting from your 'From Date', respecting holiday exclusions. This simulates bi-weekly work.
                                    </li>
                                    <li>
                                        <strong>Monthly:</strong> The hours from your 'Applicable Days' are counted only for days falling within the *first 7 days of each month*, respecting holiday exclusions. This serves as a "ballpark" for monthly recurring work.
                                    </li>
                                    <li>
                                        <strong>Quarterly:</strong> The hours from your 'Applicable Days' are counted only for days falling within the *first 7 days of the first month of each quarter* (January, April, July, October), respecting holiday exclusions. This provides a "ballpark" for quarterly recurring work.
                                    </li>
                                </ul>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default App;
