# AGENTS.md

## Overview

This repository supports a multi-environment development workflow across the following environments:

### Environment 1: Gemini 2.5 Pro Canvas

* Used for prototyping with AI.  
* Limited to a single-page app.  
* Cannot use external libraries directly but **can reference public files** (e.g. JSON) hosted via Environment 3\.  
* Code can reference .json, .md, and static assets deployed via the public Cloudflare Pages instance.

### Environment 2: Dev Server

* A full React app created with create-cloudflare.  
* Local development via npm run dev.  
* Git-tracked and used for all version control.  
* Includes custom setup for React \+ Cloudflare Pages (see "Deploy" section below).

### Environment 3: Production (Cloudflare Pages)

* Deployed at: https://hoursappcf.pages.dev/  
* Hosts static files like ndisrates2025.json for public access.  
* Used as the source for external references in Gemini Canvas (Environment 1).  
* Deployed from Environment 2 using npm run deploy.

## File Structure Guidelines

* All prototyping logic (Canvas or experimental workflows) should stay isolated or commented clearly.  
* Any files meant for public access (JSON, CSV, docs) must be added to the appropriate /public folder and deployed via Environment 3\.  
* Internal scripts or handlers must be designed assuming SPA constraints unless noted.

# **React Application: Feature & Functionality Documentation**

This document outlines the features and underlying functions of the Hours and Quote Calculation application.

## **1\. Features**

*This section describes the application's capabilities from a user's perspective.*

### 1.1 Date Range & Recurrence Selection

Defines the time frame and frequency for the quote.

* **Date Range:** "From" and "To" calendar inputs that set the overall period for the forecast.  
* **Recurring Type:** A dropdown to specify service frequency (Daily, Weekly, Fortnightly, etc.), which determines how often hours and costs are calculated within the date range.

### 1.2 Budget Information

Allows for advanced calculations based on a fixed budget.

* **Budget Mode:** A radio button to switch between:  
  * **No Budget (Default):** Calculations are based purely on the hours and travel entered by the user.  
  * **Lock Budget:** Activates the advanced budget-based suggestion features.  
* **Total Budget Input:** When "Lock Budget" is enabled, a field appears for the user to enter their total target budget in dollars.  
* **Live Budget Tracking:** The app displays a real-time comparison of the projected total cost versus the entered budget.  
* **Dynamic Suggestions:** When a budget is locked, the application provides real-time suggestions to meet the target. This includes:  
  * **Suggested Hours:** Displayed under each applicable day's hour input.  
  * **Suggested ABT KM:** A new suggestion field appears in the "Activity Based Travel (ABT)" section.  
* **Apply Suggested Values:** A button appears that allows the user to automatically populate both the hour fields and the ABT kilometers field with the suggested values.

### 1.3 Applicable Days & Hours per Day

Allows users to define a standard work week and the hours for each day.

* **Day Selection:** Checkboxes to activate calculations for any day of the week (Monday-Sunday).  
* **Hour Input:** For each selected day, the user enters the number of service hours.  
* **Weekday Shift Toggle:** For weekdays (Mon-Fri), a toggle switch allows users to choose between a "Day" rate and an "Evening" rate.

### 1.4 NDIS Rate Finder

An optional tool for selecting official NDIS rates.

* **Smart Rate Population:** Selecting a weekday service automatically finds and populates the corresponding Evening, Saturday, Sunday, and Public Holiday rates.  
* **Flexible Search:** Allows users to find rates without exact terminology (e.g., "selfcare" finds "Assistance With Self-Care Activities").  
* **Item Code Display:** The official NDIS item number is displayed for reference after selection.

### 1.5 Transport Calculator

Estimates and adds transport costs to the quote, calculated based on the number of **Counted Days** from the Period Breakdown.

* **Separate NPT & ABT:** The calculator is split into two independent sections that can be enabled via checkboxes:  
  * **Non-Provider Travel (NPT):** Defined as travel from the provider's location to the participant.  
  * **Activity Based Travel (ABT):** Defined as travel with the participant during a service.  
* **Rate & Code Lookup:** For both NPT and ABT, a searchable dropdown allows the user to select the official NDIS transport item. This automatically populates the rate per kilometer and the NDIS item code.  
  * The NPT dropdown is filtered for "Provider travel \- non-labour costs".  
  * The ABT dropdown is filtered for "Activity Based Transport".  
* **Inputs:** For both NPT and ABT, the user can still manually input the estimated KM per trip.

### 1.6 Manual Hourly Rates

Allows for manual entry or override of the rates used in the calculation.

* **Automated Population:** Rate fields are filled automatically when using the NDIS Rate Finder.  
* **Manual Entry:** Users can directly type values into each rate field.  
* **Set All Rates Same:** A convenience button to apply the Weekday Day rate to all other rate fields.

### 1.7 Public Holidays

Defines how public holidays are factored into the calculation.

* **Calculation Control:** Users can choose to either **Include** or **Skip** public holidays.  
* **Default & Custom Lists:** Comes pre-populated with QLD public holidays but allows the user to fully customize the list.

### 1.8 Results & Breakdown

Displays the final calculated outputs and a summary of how the period was categorized.

* **Results:** Two main summary cards showing the **Total Projected Hours** and **Total Projected Budget**, each with a detailed breakdown across the different rate categories.  
* **Period Breakdown:** A set of cards showing the **Counted Days**, **Weekdays**, **Saturdays**, **Sundays**, **Public Hols**, and **Full Weeks** used in the calculations.

### 1.9 Quote Management

Allows users to save, manage, and print formal quotes.

* **Save as Quote:** Users can enter a description and save the current set of calculations. The fromDate and toDate active at the time of saving are stored as part of the quote's data.  
* **Saved Quotes List:** All saved quotes are displayed in a list. Each quote can be expanded to show a detailed table of services, including separate, clearly marked line items for NPT and ABT.  
* **Item Code Display:** The detailed table will display the NDIS item code for all services and transport types if entered.  
* **Quote Period Display:** For clarity, the specific From and To date range for each quote is displayed with its details in the saved quotes list and in the final Service Agreement.  
* **Management:** Users can delete or print individual quotes, or print all saved quotes at once.

### 1.10 Service Agreement Generation

Collects information to generate a formal service agreement document.

* **Data Collection:** A form for participant details, funding type, and conditional plan manager information.  
* **Dual Export Options (Proposed):** The generated agreement can be exported in two ways:  
  * **Generate & Print:** Opens the agreement in a new tab, perfectly formatted for printing or saving as a high-fidelity PDF. This is ideal for final versions.  
  * **Download as Word (.doc):** A new button will generate an HTML file disguised as a .doc file. This allows for easy editing in Microsoft Word, but with the known limitation that complex CSS formatting (like headers/footers) may not be preserved perfectly and may require manual adjustments.

## **2\. Code & Calculation Logic**

*This section details the technical implementation and formulas used in the application.*

### 2.1 Component & State Structure

* **Architecture:** The application is a single, comprehensive React component (App) with a modular structure, using child components for each UI section.  
* **State Management:**  
  * The main App component holds all primary state values (dates, weekly days, rates, budget info, transport details, etc.).  
  * useLocalStorage is used to persist the savedQuotes array.  
  * useFetchData is a generic hook for fetching external JSON data.  
  * **Transport State:** The transport state object is structured to hold details for both NPT and ABT independently, including their itemCode and name.  
* **Event Handlers:** All event handling logic (dayHandlers, rateHandlers, budgetHandlers, etc.) is defined in the App component and passed down as props.

### 2.2 Core Calculation Logic

All major calculations are wrapped in useMemo hooks for performance optimization.

* **Service Calculation (calculateAllTotals):**  
  * **Process:** Iterates through the selected date range, applying recurrence rules and categorizing each day (weekday, weekend, public holiday) to aggregate total hours and calculate the cost for each service type based on the specified rates.  
  * **Output:** An object containing detailed breakdowns of hours and pay, plus a count of the total service days (calculatedTotalDays).  
* **Transport Calculation:**  
  * **Formula:** Transport costs are calculated based on the calculatedTotalDays.  
    * NPT Cost \= calculatedTotalDays \* npt\_km \* npt\_rate  
    * ABT Cost \= calculatedTotalDays \* abt\_km \* abt\_rate  
* **Budget Suggestion Logic (budgetSuggestions):**  
  * **Process:**  
    1. **Identify Fixed vs. Flexible Costs:** NPT is treated as a fixed cost. Service hours and ABT are treated as flexible costs.  
    2. **Calculate Flexible Budget:** flexibleBudget \= totalBudget \- nptCost  
    3. **Calculate Scaling Factor:** A ratio is calculated to determine how to adjust the flexible costs to meet the flexible budget. scalingFactor \= flexibleBudget / (totalPay \+ abtCost)  
    4. **Generate Suggestions:** The scalingFactor is applied to the user's initial hour and ABT kilometer entries to produce new suggested values.  
  * **Output:** An object containing suggestedHours and suggestedAbtKm.