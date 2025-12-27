# Timesheet Explorer - User Guide

<div align="center">

**[🔗 View on GitHub](https://github.com/degercanibek/timesheet-explorer)**

</div>

Welcome to Timesheet Explorer! This comprehensive guide will help you make the most of this powerful timesheet analysis tool.

## Table of Contents

- [Getting Started](#getting-started)
- [Mapping Tab](#mapping-tab)
- [Timesheet Data Tab](#timesheet-data-tab)
- [Reports Tab](#reports-tab)
- [Filters](#filters)
- [Common Scenarios](#common-scenarios)

---

## Getting Started

Timesheet Explorer is a web-based tool for analyzing timesheet data from Jira project management systems. It helps you:
- Map people to teams, projects, and roles
- Import and filter timesheet data
- Generate visual reports and charts
- Analyze work distribution across teams, projects, and time periods

### First Time Setup

1. **Start with the Mapping tab** to set up your organizational structure
2. **Import timesheet data** in the Timesheet Data tab
3. **Generate reports** in the Reports tab

---

## Mapping Tab

The Mapping tab is where you define your organizational structure.

### Projects

**What are Projects?**
Projects represent the main initiatives or products your team works on.

**How to add a Project:**
1. Click the "Add" button in the Projects column
2. Enter the project name
3. Click "Save"

**Example:** "Customer Portal", "Mobile App", "Infrastructure"

### Teams

**What are Teams?**
Teams are groups of people working together, often aligned with projects or functional areas.

**How to add a Team:**
1. Click the "Add" button in the Teams column
2. Enter the team name
3. Click "Save"

**Example:** "Backend Team", "Frontend Team", "DevOps"

### Roles

**What are Roles?**
Roles define what people do in your organization. Each role can have a default Work Type.

**How to add a Role:**
1. Click the "Add" button in the Roles column
2. Enter the role name
3. Optionally select a default Work Type
4. Click "Save"

**Example:** "Developer", "QA Engineer", "Designer", "Product Manager"

### Work Types

**What are Work Types?**
Work Types categorize the kind of work being done (e.g., Development, Testing, Review, Meeting).

**How to add a Work Type:**
1. Click the "Add" button in the Work Types column
2. Enter the work type name
3. Click "Save"

**Example:** "Development", "Code Review", "Testing", "Planning", "Documentation"

**💡 Tip:** Work Types can be linked to Roles as defaults. When you apply mapping, people get their role's default work type automatically.

### People

**What is the People section?**
Here you assign each person to a team, project, and role.

**How to add a Person:**
1. Click the "Add" button
2. Enter the person's name (must match how it appears in your timesheet CSV)
3. Select their team from the dropdown
4. Select their project from the dropdown
5. Select their role from the dropdown
6. Click "Save"

**Importing People from CSV:**
If you have many people to add, use the "From CSV" button:
1. Click "From CSV"
2. Select a timesheet CSV file
3. The system will extract unique names
4. You can then edit each person's team, project, and role

**Filtering the People Table:**
Use the filter dropdowns above the People table to narrow down the list:
- **Search**: Filter by name
- **Team**: Show only people in specific teams
- **Project**: Show only people in specific projects
- **Role**: Show only people with specific roles

**💡 Tip:** Make sure person names in the mapping exactly match the "Full name" column in your timesheet data!

---

## Timesheet Data Tab

This is where you import, view, and filter your actual timesheet records.

### Importing Data

**Step-by-step:**
1. Click "Import CSV" button
2. Select your timesheet CSV file
3. Wait for the import to complete
4. You'll see a summary of imported records

**Required CSV Columns:**
- Full name
- Hours
- Work date
- Activity Name
- Issue summary
- Issue Status
- Project Key
- (Optional) Team, Project, Servis, Epic

**Large Datasets:**
The application uses IndexedDB to handle large datasets (17,000+ rows). Your data is stored locally in your browser.

### Viewing Filtered Data

After importing, you'll see your timesheet data in a table with these columns:
- Work Date (formatted as "1 Jan '25")
- Servis (service number with name)
- Project Key
- Person Name
- Activity Name
- Issue Summary
- Issue Status
- Efor (hours)
- Team
- Project

### Filters

<a name="filters"></a>

**Understanding Filters:**
Filters help you narrow down your data to specific criteria.

**How to use a filter:**
1. Find the filter you want to use (Project, Team, Role, etc.)
2. Click inside the dropdown
3. Hold Ctrl (Windows) or Cmd (Mac) to select multiple options
4. The data updates automatically

**The "not" option:**
Each filter has a small "not" checkbox on the right side of the filter label.

**Normal filtering (not unchecked):**
- Selects only the chosen items
- Example: Select "ProjectA" and "ProjectB" → Shows only ProjectA and ProjectB records

**Inverted filtering (not checked):**
- Excludes the chosen items, shows everything else
- Example: Select "ProjectA" and "ProjectB", check "not" → Shows all projects EXCEPT ProjectA and ProjectB

**💡 Tip:** Use "not" filtering to quickly exclude certain projects, teams, or people from your analysis!

**Available Filters:**
- **Project**: Filter by project name
- **Team**: Filter by team name
- **Role**: Filter by person's role
- **Work Type**: Filter by type of work
- **Servis**: Filter by service number
- **Work Date From/To**: Filter by date range
- **Issue Summary**: Search text in issue descriptions
- **Activity Name** (Advanced): Filter by type of activity (Development, Review, etc.)
- **Person** (Advanced): Filter by specific people
- **Issue Status** (Advanced): Filter by Jira status (In Progress, Done, etc.)
- **Project Key** (Advanced): Filter by Jira project key

<a name="date-filters"></a>

**Clearing Filters:**
Each filter has a small × button that appears when the filter is active. Click it to clear that specific filter.

**Date Filters:**
1. Click on "Work Date From" to set the start date
2. Click on "Work Date To" to set the end date
3. Click the × button next to the label to clear a date filter
4. Leave either blank to filter from the beginning or to the end

### Batch Updates

**Selecting Records:**
- Click checkboxes to select individual records
- Use "Select All" to select all records on current page
- Use "All X filtered records" to select ALL records matching your filters (across all pages)

**Updating Selected Records:**
1. Select records using checkboxes
2. Click "Update Selected" button
3. Choose what to update (Team, Project, or both)
4. Select new values from dropdowns
5. Click "Apply"

**Apply Mapping:**
Use the "Apply Mapping" button to automatically fill in Team, Project, and Work Type information based on your People mapping:

1. **Without "Override existing" checked**: Only fills in empty fields. Records that already have Team, Project, or Work Type information are left unchanged.
2. **With "Override existing" checked**: Updates ALL records with the person's mapped Team, Project, and their role's default Work Type, even if those fields already have values.

**💡 Tip:** Use "Apply Mapping" without override to complete partial data, or with override to standardize all records to match your current mapping.

**Servis Management:**
1. Click "Manage Servis" button
2. See all service numbers found in your data
3. Add custom names to service numbers (e.g., "5215 - General Efforts")
4. These names will appear throughout the application

**Clearing Data:**
Click "Clear All" button to remove all imported timesheet data. You'll need to confirm twice to prevent accidents.

---

## Reports Tab

The Reports tab is where you generate visual analytics and charts.

### Setting Up a Report

**Step 1: Apply Filters (Optional)**
The Reports tab has its own independent set of filters. These filters work separately from the Timesheet Data tab filters, allowing you to analyze different data subsets without affecting your filtered view in the Timesheet Data tab.

**Step 2: Choose Report Type**
Select what you want to analyze:
- **Person Name**: Hours per person
- **Team**: Hours per team
- **Project**: Hours per project
- **Role**: Hours per role
- **Work Type**: Hours per work type
- **Activity Name**: Hours per activity type
- **Servis**: Hours per service number
- **Issue Status**: Hours per issue status
- **Epic**: Hours per epic
- **Project Key**: Hours per Jira project
- **Issue Key**: Hours per specific issue

**Step 3: Choose Chart Type**
- **Donut Chart**: Shows distribution as a circular chart
- **Time Series**: Shows data over time as a bar chart

**Step 4: Choose Time Period** (for Time Series)
- **Daily**: One bar per day
- **Weekly**: One bar per week (labeled as "Week 1, 2025")
- **Monthly**: One bar per month
- **Quarterly**: One bar per quarter

**Step 5: Customize Appearance**
- **Theme**: Choose color palette (Default, Pastel, Vibrant, etc.)
- **Font**: Choose font family
- **Font Size**: Increase/decrease with A- and A+ buttons
- **Rotation**: Adjust the starting angle of the donut chart

**Step 6: Generate**
Click the "📈 Generate Chart" button below the filters.

### Understanding Charts

**Units Display:**
Charts show values with appropriate units:
- When viewing in Hours mode: values show as "1,234h"
- When viewing in Man-days mode: values show as "154md"

**Donut Chart:**
- Shows top 20 categories by hours
- Center displays total value with unit abbreviation
- Each slice is labeled with name, value, and percentage
- Larger slices = more hours/man-days

**Time Series Chart:**
- Shows hours over time periods
- Stacked bars colored by your Report Type
- Hover to see detailed breakdown
- Bottom shows time period labels

### Report Data Points

Below the chart, you'll see a list of all data points in your report.

**What you can do:**
- **Reorder**: Drag and drop items to change their order in the chart
- **Hide/Show**: Click the eye icon to hide/show items from the chart
- **Edit Label**: Click the pencil icon to change how an item is labeled
- **Change Color**: Click the color box to pick a custom color for each item

**Color Consistency:**
Colors remain consistent between Donut and Time Series views. If "Team A" is red in the donut chart, it will also be red in the time series chart.

---

## Common Scenarios

### Scenario 1: "I want to see how much time my team spent on each project last month"

**Steps:**
1. Go to **Timesheet Data** tab
2. Set **Work Date From** to first day of last month
3. Set **Work Date To** to last day of last month
4. In **Team** filter, select your team
5. Go to **Reports** tab
6. Set **Report Type** to "Project"
7. Click **Generate Chart**

**Result:** You'll see a donut chart showing hours per project for your team last month.

---

### Scenario 2: "Show me all work EXCEPT two specific projects"

**Steps:**
1. Go to **Reports** tab (or Timesheet Data tab)
2. In **Project** filter, select the two projects you want to exclude
3. Check the small **"not"** checkbox next to the Project label
4. Generate your report

**Result:** The report includes all projects except the two you selected.

---

### Scenario 3: "I need a weekly breakdown of hours by team for Q1 2025"

**Steps:**
1. Go to **Reports** tab
2. Set **Work Date From** to "2025-01-01"
3. Set **Work Date To** to "2025-03-31"
4. Set **Report Type** to "Team"
5. Set **Chart Type** to "Time Series"
6. Set **Time Period** to "Weekly"
7. Click **Generate Chart**

**Result:** You'll see a stacked bar chart with one bar per week, colored by team.

---

### Scenario 4: "Bulk update 500 records from TeamA to TeamB"

**Steps:**
1. Go to **Timesheet Data** tab
2. In **Team** filter, select "TeamA"
3. Check the **"All X filtered records"** checkbox at the top
4. Click **Update Selected** button
5. Select **Team**: "TeamB"
6. Click **Apply**

**Result:** All filtered records are updated to TeamB, across all pages.

---

### Scenario 5: "Compare time spent on 'Development' vs 'Review' activities over the last 6 months"

**Steps:**
1. Go to **Reports** tab
2. Set **Work Date From** to 6 months ago
3. In **Activity Name** filter, select "Development" and "Review"
4. Set **Report Type** to "Activity Name"
5. Set **Chart Type** to "Time Series"
6. Set **Time Period** to "Monthly"
7. Click **Generate Chart**

**Result:** Monthly bar chart showing Development vs Review hours stacked.

---

### Scenario 6: "Find all work on Jira issues that contain 'bug' in the summary"

**Steps:**
1. Go to **Timesheet Data** tab
2. Click **"+ Advanced Filters"**
3. In **Issue Summary** field, type "bug"
4. Data table updates automatically

**Result:** Only records where the issue summary contains "bug" are shown.

---

### Scenario 7: "Exclude all work on Jira issues containing 'meeting'"

**Steps:**
1. Go to **Timesheet Data** tab
2. Click **"+ Advanced Filters"**
3. In **Issue Summary** field, type "meeting"
4. Check the **"NOT"** checkbox next to the Issue Summary field
5. Data table updates automatically

**Result:** All records EXCEPT those with "meeting" in the summary are shown.

---

## Tips & Tricks

### 💡 Performance Tips
- For large datasets (10,000+ rows), be patient during initial import
- Filters are applied instantly, so start with broader filters and narrow down
- Use "Clear All" to reset and start fresh if things feel slow

### 💡 Data Quality Tips
- Ensure consistent naming in your CSV (e.g., always "Backend Team", not sometimes "Backend" or "BE Team")
- Use the Servis Management feature to give meaningful names to service numbers
- Regularly review the Mapping tab to keep teams/projects up to date

### 💡 Reporting Tips
- Start with broader report types (Team, Project) before drilling into specifics (Person, Issue Key)
- Use Time Series with Monthly/Quarterly for long-term trends
- Use Donut charts to quickly spot who/what is taking the most time
- Save screenshots of your charts for presentations
- Use color customization to match your company's branding

### 💡 Filter Tips
- The "not" feature is powerful for exclusion-based analysis
- Combine multiple filters for precise slicing (e.g., Team + Project + Date range)
- Use Advanced Filters for one-off analyses without cluttering main filters
- Clear filters between different analyses to avoid confusion

---

## Troubleshooting

### Problem: "My CSV import failed"

**Solutions:**
- Check that your CSV has a "Full name" and "Hours" column
- Ensure the file is properly formatted CSV (not Excel .xlsx)
- Try opening the CSV in a text editor to check for special characters
- Make sure the file isn't too corrupted or in an unusual format

---

### Problem: "I don't see any data after importing"

**Solutions:**
- Check if you have filters applied (clear them with "Clear Filters")
- Make sure you're on the "Timesheet Data" tab
- Try refreshing the page and re-importing

---

### Problem: "Person names don't match between Mapping and Timesheet Data"

**Solutions:**
- Go to Mapping > People and check exact spelling
- CSV might have extra spaces or middle names
- Use "From CSV" in People section to auto-extract names from your timesheet

---

### Problem: "Charts look weird or colors don't match"

**Solutions:**
- Try changing the Theme in report customization
- Click on a data point's color picker to manually set colors
- Refresh the page if colors seem cached incorrectly

---

### Problem: "I want to reset everything and start over"

**Solutions:**
- Go to Timesheet Data tab and click "Clear All" (removes all timesheet data)
- For mapping data (projects/teams/roles/people), manually delete items or refresh the page and don't save
- Your data is stored in browser's local storage and IndexedDB, so clearing browser data will also reset

---

## Keyboard Shortcuts

- **Ctrl/Cmd + Click**: Multi-select in filter dropdowns
- **Shift + Click**: Range select (select from last clicked to current)
- **Tab**: Navigate between form fields
- **Escape**: Close modals/popups

---

## Browser Compatibility

Timesheet Explorer works best in modern browsers:
- ✅ Chrome/Edge (recommended)
- ✅ Firefox
- ✅ Safari
- ⚠️ Internet Explorer not supported

---

## Data Privacy

**Your data stays local!**
- All data is stored in your browser's local storage and IndexedDB
- Nothing is sent to external servers
- Data persists between sessions (until you clear browser data)
- To truly delete data, use "Clear All" or clear your browser's local storage

---

## Support & Feedback

### 🐛 Report Issues

Found a bug or have a problem? Please report it on GitHub:

**[📝 Open a New Issue](https://github.com/degercanibek/timesheet-explorer/issues/new)**

When reporting an issue, please include:
- A clear description of the problem
- Steps to reproduce the issue
- Browser and version you're using
- Screenshots if applicable

### 💡 Feature Requests

Have an idea for a new feature? We'd love to hear it!

**[✨ Request a Feature](https://github.com/degercanibek/timesheet-explorer/issues/new)**

Describe your feature idea and how it would help your workflow.

### 📚 Documentation & Source Code

View the full source code, documentation, and contribute to the project:

**[GitHub Repository](https://github.com/degercanibek/timesheet-explorer)**

---

**Version:** 2.1
**Last Updated:** December 28, 2025

---

**Happy Analyzing! 📊**
