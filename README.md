# FocusFlow — Mobile Todo Web Application

FocusFlow is a beautiful, highly interactive, and responsive mobile-first Todo application built with pure **HTML5, CSS3, and ES6 JavaScript**. The layout is designed to match the original mobile designs, featuring light/dark theme swapping, welcome greeting progress bars, priority badges, category folders, and a glassmorphic bottom floating menu.

![FocusFlow Mobile Preview](https://images.unsplash.com/photo-1540350394557-8d14678e7f91?auto=format&fit=crop&q=80&w=430&h=800)

## Features

1. **Dashboard Home View**:
   - Welcome card containing greeting text, pending count, and horizontal task completed progress bar.
   - Urgent Widget containing high priority details and a "View urgent" text trigger.
   - Filter Tabs: All, Pending, Completed.
   - Task List: Clean rounded cards displaying title, date details, and priority badges.
2. **Daily Sprint Planner**:
   - Add Task Card containing input title ("What needs to be done?"), Category pills (Work, Personal, Shopping), Priority selection dropdown, and "Add Task" button.
   - Sprint List Filters: Pending, Completed, All.
   - Task list displaying checkbox, title, priority label, and folder icon with category name.
3. **Categories View**:
   - Grid cards displaying tasks count and progress bar indicators for Work, Personal, Shopping, and custom folders.
4. **Settings**:
   - Update display name and profile picture URL.
   - Live activity stats dashboard tracking total created, completed, pending, and productivity rate.
   - Danger zone trigger to erase cached local storage workspace.
5. **Themes Support**:
   - Light & Dark theme toggle button at the header bar with smooth visual transition states.
6. **Local Storage Support**:
   - Workspace state is persisted locally. Refreshing retains all custom tasks and configurations.

---

## Keyboard Shortcuts

* <kbd>Ctrl</kbd> + <kbd>N</kbd> (or <kbd>⌘</kbd> + <kbd>N</kbd> on macOS) — Instantly switch to the **Daily Sprint** view and focus the task title field.
* <kbd>Escape</kbd> — Dismisses the Delete Confirmation Modal.

---

## How to Run the Project

1. Open your terminal or file manager at `c:\Users\Aniket radadiya\OneDrive\Desktop\Project\TODO-app`.
2. Double-click **[index.html](file:///c:/Users/Aniket%20radadiya/OneDrive/Desktop/Project/TODO-app/index.html)** to run locally in your browser.
3. *Alternatively*, start a local development server for live updates:
   * **Node.js**: `npx serve`
   * **Python**: `python -m http.server 8000` (open `http://localhost:8000` in your web browser)
   * **VS Code**: Install the **Live Server** extension, open `index.html` and click **"Go Live"** in the bottom-right status bar.
