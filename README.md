# Hours & Pay Forecasting App

This is a single-page React application designed to forecast work hours and pay over a given period. It allows for various recurring schedules, different pay rates for weekdays, weekends, and public holidays, and includes a budget-locking feature to suggest daily hours to meet a financial target.

## Disclaimer of Warranty

**This software is provided "as is", without warranty of any kind, express or implied, including but not limited to the warranties of merchantability, fitness for a particular purpose and noninfringement. In no event shall the authors or copyright holders be liable for any claim, damages or other liability, whether in an action of contract, tort or otherwise, arising from, out of or in connection with the software or the use or other dealings in the software.**

**There is no guarantee of accuracy for the calculations provided by this application. It is intended for estimation and forecasting purposes only. You should always verify the results with official sources and for official purposes.**

## Frameworks and Libraries Used

* **[React](https://reactjs.org/):** A JavaScript library for building user interfaces.
* **[Tailwind CSS](https://tailwindcss.com/):** A utility-first CSS framework for rapid UI development. (Inferred from the className syntax in the code).

## Setup and Installation

To get a local copy up and running, follow these simple steps.

### Prerequisites

You need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) (or [Yarn](https://yarnpkg.com/)) installed on your machine.

### Installation

1.  **Clone the repository:**
    ```sh
    git clone <your-repository-url>
    ```
2.  **Navigate to the project directory:**
    ```sh
    cd <project-directory>
    ```
3.  **Install NPM packages:**
    ```sh
    npm install
    ```
    or if you are using Yarn:
    ```sh
    yarn install
    ```

### Running the Application

1.  **Start the development server:**
    ```sh
    npm start
    ```
    or with Yarn:
    ```sh
    yarn start
    ```
2.  Open your browser and navigate to `http://localhost:3000` (or the address shown in your terminal).

## How to Use the Application

The application is designed to be intuitive. Here is a breakdown of the different sections and their functionalities:

### 1. Date Inputs

* **From Date:** The start date for your forecast period. Defaults to the current date.
* **To Date:** The end date for your forecast period. Defaults to one year from the current date.

### 2. Recurring Type

Select how often the work pattern repeats within the selected date range. The options are:
* **Daily:** The hours for the selected "Applicable Days" will be counted for every day within the date range.
* **Weekly:** The hours for the selected "Applicable Days" will be counted for every week.
* **Fortnightly:** The hours for the selected "Applicable Days" are counted only for the first week of every two-week cycle, starting from the "From Date".
* **Monthly:** The hours for the selected "Applicable Days" are counted only for the first 7 days of each month.
* **Quarterly:** The hours for the selected "Applicable Days" are counted only for the first 7 days of the first month of each quarter (January, April, July, October).

### 3. Applicable Days & Hours per Day

* **Checkboxes:** Select the days of the week you will be working.
* **Hour Inputs:** For each selected day, enter the number of hours you will work. The input is limited to a maximum of 24 hours.

### 4. Budget Information

This section allows you to work towards a specific financial goal.
* **Lock Budget:** When selected, you can enter a total budget amount. The application will then:
    * Show you if your projected pay is over or under this budget.
    * Suggest a number of daily hours to meet your budget based on your current pay rates. You can then click "Apply Suggested Hours" to update the hour inputs.
* **No Budget:** The default option, where no budget calculations are made.

### 5. Hourly Rates

Enter your pay rates for different types of days:
* **Weekday Rate**
* **Saturday Rate**
* **Sunday Rate**
* **Public Holiday Rate** (This field appears when "Include Public Holidays" is selected).

You can use the "Set All Rates Same (as Weekday Rate)" button to quickly populate all rate fields with the value entered in the Weekday Rate field.

### 6. Public Holidays

* **Include Public Holidays:** When selected, the application will treat the dates in the text area as public holidays and apply the "Public Holiday Rate". These days will be excluded from the normal weekday/weekend hour and pay calculations.
* **Skip Public Holiday Exclusion:** When selected, all dates are treated as normal weekdays or weekends, even if they are listed in the public holidays text area.
* **Custom Public Holidays Input:** A text area pre-filled with the 2025 Queensland public holidays. You can add, remove, or change these dates. The format must be `YYYY-MM-DD`, with each date separated by a comma.

### 7. Results

The application provides a detailed breakdown of the forecasted hours and pay:

* **Total Projected Hours:** The total number of hours you are forecasted to work, with a breakdown for weekdays, Saturdays, Sundays, and public holidays.
* **Total Projected Pay:** The total pay you are forecasted to earn, with a corresponding breakdown by day type.
* **Period Breakdown:** A detailed count of the different types of days within your selected forecast period, including total counted days, weekdays, weekends, public holidays, and the number of full weeks, fortnights, and months.
* **Calculation Details:** An explanation of how the different values are calculated to provide clarity on the forecasting logic.

# Log

## Latest working branch
c43fdd65a50a85936f4027016f0b869dbb3d7c78
added proposed transport

## View docx branch
docx-feature.hoursappcf.pages.dev