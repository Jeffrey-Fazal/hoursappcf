# AGENTS.md

## Overview

This repository supports a multi-environment development workflow across the following environments:

### Environment 1: Gemini 2.5 Pro Canvas
- Used for prototyping with AI.
- Limited to a single-page app.
- Cannot use external libraries directly but **can reference public files** (e.g. JSON) hosted via Environment 3.
- Code can reference `.json`, `.md`, and static assets deployed via the public Cloudflare Pages instance.

### Environment 2: Dev Server
- A full React app created with `create-cloudflare`.
- Local development via `npm run dev`.
- Git-tracked and used for all version control.
- Includes custom setup for React + Cloudflare Pages (see "Deploy" section below).

### Environment 3: Production (Cloudflare Pages)
- Deployed at: `https://hoursappcf.pages.dev/`
- Hosts static files like `ndisrates2025.json` for public access.
- Used as the source for external references in Gemini Canvas (Environment 1).
- Deployed from Environment 2 using `npm run deploy`.

---

## File Structure Guidelines

- All prototyping logic (Canvas or experimental workflows) should stay isolated or commented clearly.
- Any files meant for public access (JSON, CSV, docs) must be added to the appropriate `/public` folder and deployed via Environment 3.
- Internal scripts or handlers must be designed assuming SPA constraints unless noted.

---

## Core Functionality

# **React Application: Feature & Functionality Documentation**

This document outlines the features and underlying functions of the Hours and Quote Calculation application.

## **1\. Features**

*This section describes the application's capabilities from a user's perspective, based on the provided screenshots.*

### **1.1 Date Range & Recurrence Selection**

This core component allows users to define the time frame and frequency for the hours and pay calculation.

* **Date Range:** Users must select a **"From Date"** and a **"To Date"** using calendar inputs. This range sets the overall period for which the forecast is generated.  
* **Recurring Type:** A dropdown menu lets users specify the frequency of the service within the selected date range. This is essential for determining how often the hours are calculated. The available options are:  
  * Daily  
  * Weekly  
  * Fortnightly  
  * Monthly  
  * Quarterly

### **1.2 Applicable Days & Hours per Day**

This section allows users to define a standard work week by selecting which days services occur on and inputting the number of hours for each of those days.

* **Day Selection:** Users can activate calculations for any day of the week (Monday-Sunday) by checking the box next to the corresponding day.  
* **Hour Input:** For each selected day, the user must enter the number of hours to be calculated.  
* **Rate Type (Weekdays):** For weekdays (Monday-Friday), a toggle switch allows users to choose between a **"Day"** rate (default) and an **"Evening"** rate.  
* **Weekend Rates:** Saturday and Sunday have separate hour inputs, implying they are calculated at specific weekend rates distinct from the weekday Day/Evening options.  
* **Dynamic Hour Suggestion:** When the "Lock Budget" feature is active (see 1.5), this section will display suggested hours under each input field. These suggestions update in real-time as the user modifies the hour distribution, providing immediate feedback on how to meet the target budget.

### **1.3 NDIS Rate Finder**

This section provides a powerful, optional tool for users to select official NDIS rates from the pre-loaded *NDIS Pricing Arrangements and Price Limits (2025)* dataset.

* **Smart Rate Population:** When a user selects a service for the **"Weekday Day"** rate, the application automatically searches for and populates the corresponding rates for **Weekday Evening**, **Saturday**, **Sunday**, and **Public Holiday**.  
* **Flexible Search:** The search functionality is designed to be "lazy," allowing users to find the correct service without exact formatting. For example, typing "selfcare," "self care," or "self-care" will all yield the correct "Assistance With Self-Care Activities" result.  
* **Item Code Display:** Upon selecting a service, its official NDIS item number (e.g., 01\_200\_0115\_1\_1) is displayed directly below the selection box for easy reference and copying.  
* **Optional Use:** This entire section can be left empty. This allows users to bypass the NDIS rate lookup and instead use a manual rate entry method if needed.

### **1.4 Hourly Rates**

This section is where the final monetary rates for the calculation are set, either automatically or manually.

* **Automated Population:** The rate fields (**Weekday Day**, **Weekday Evening**, **Saturday**, **Sunday**, **Public Holiday**) are automatically filled with the corresponding dollar values when a service is selected using the **NDIS Rate Finder**.  
* **Manual Entry:** Users can directly type numerical values into each rate field. This allows them to use custom rates or override the pre-loaded NDIS rates.  
* **Set All Rates Same:** A convenience button that, when clicked, likely takes the value from the "Weekday Day" field and applies it to all other rate fields, streamlining the process for flat-rate calculations.

### **1.5 Budget Information**

This section allows users to perform calculations based on a fixed budget, suggesting an optimal distribution of hours.

* **Budget Mode:** Users can choose between two modes:  
  * **No Budget (Default):** Calculations are based purely on the hours entered by the user.  
  * **Lock Budget:** Activates the budget-based calculation features.  
* **Total Budget Input:** When "Lock Budget" is enabled, a field appears for the user to enter their total target budget in dollars.  
* **Live Budget Tracking:** The app displays a real-time comparison of the projected total cost versus the entered budget (e.g., "UNDER by $2,689.70").  
* **Apply Suggested Hours:** A button appears that allows the user to automatically populate the "Applicable Days & Hours per Day" section with the suggested hour distribution to meet the target budget.

### **1.6 Public Holidays**

This section defines how public holidays are factored into the calculation.

* **Calculation Control:** Users can choose to either **Include** public holidays in the calculation (applying the specific public holiday rate) or **Skip** them entirely.  
* **Default Holiday List:** The application comes pre-populated with a default list of public holidays, noted as being for Queensland.  
* **Customization:** Users have full control to override the default list. They can edit, add, or remove dates in the "Custom Public Holidays" text area. The dates must be in YYYY-MM-DD format and separated by commas.

### **1.7 Results**

This section displays the final calculated outputs based on all the user's selections in the sections above.

* **Total Projected Hours:** A summary card that shows:  
  * A large, prominent display of the **total calculated hours** for the selected period.  
  * A detailed breakdown of how those hours are distributed across the different rate categories: **W/day Day, W/day Eve, Saturday, Sunday,** and **Public Hol**.  
* **Total Projected Pay:** A summary card that shows:  
  * A large, prominent display of the **total projected pay (cost)** for the selected period.  
  * A detailed breakdown of how the total cost is distributed across the same rate categories.

### **1.8 Save Calculation as Quote**

This feature allows users to save the results of a calculation as a formal quote, manage multiple quotes, and prepare them for use in other documents.

* **Save Quote:** Users can enter a descriptive name for the current calculation and click "Save Quote" to store it.  
* **Saved Quotes List:** Saved quotes are displayed in a list. Each entry shows the quote's name, total pay, and total hours for quick reference.  
* **Detailed Breakdown:** Each saved quote can be expanded to show a detailed table of services. This table is formatted for legal/official use and includes columns for **Service**, **Item Name & Number**, **Rate**, **Hours**, and **Total**.  
* **Quote Management:** Users can **Delete** individual quotes from the saved list.  
* **Printing:** The functionality to print individual quotes or all saved quotes is a requirement for this section.

### **1.9 Generate Service Agreement**

This feature collects the necessary information to create a formal service agreement based on the generated quote(s).

* **Participant Details:** A form to collect the participant's full name and NDIS number.  
* **Review Date:** A date field for the plan's review date. This field defaults to the "To Date" that was selected in the *Date Range & Recurrence Selection* section (1.1).  
* **Funding Type:** A selection control (e.g., checkboxes) allows the user to choose one or more funding arrangements:  
  * Self Funded  
  * Plan Managed  
  * NDIA Managed  
* **Conditional Plan Manager Fields:** If "Plan Managed" is selected, input fields for the **Plan Manager's Name** and **Plan Manager's Email** become visible and are required.

### **1.10 Period Breakdown**

To provide transparency and allow users to verify the calculations, this section displays a summary of how the selected date range was categorized.

* **Counted Days:** The total number of days within the date range that were included in the calculation based on the "Applicable Days & Hours per Day" selections.  
* **Counted Weekdays:** The subset of "Counted Days" that fall on a Monday through Friday.  
* **Counted Saturdays:** The subset of "Counted Days" that fall on a Saturday.  
* **Counted Sundays:** The subset of "Counted Days" that fall on a Sunday.  
* **Public Hols:** The number of public holidays that occurred on one of the "Counted Days".  
* **Full Weeks:** The total number of full 7-day weeks within the calculation period.

## **2\. Functions**

*This section will detail the technical implementation, including code references, helper functions, and component logic. This will be populated once the code is provided.*