# Deadline Radar

**Never Miss a Deadline Again!**

Deadline Radar is a powerful Chrome extension that automatically scans webpages for deadlines and tasks, organizes them in a beautiful dashboard with countdown timers, and keeps you on track with intelligent reminders.

## Features

- 🔍 **Automatic Detection**: Scans webpages for deadlines using advanced regex patterns and date parsing
- ⏰ **Real-time Countdowns**: Live countdown timers show exactly how much time you have left
- 📋 **Task Management**: Save, organize, and track task completion status
- 🔔 **Smart Notifications**: Get reminders for upcoming deadlines
- 📊 **Dashboard Overview**: Beautiful dashboard with task statistics and filtering
- 💾 **Local Storage**: All data stored securely in your browser using chrome.storage.local
- 🎨 **Modern UI**: Clean, responsive interface built with Tailwind CSS

## Installation

1. Clone this repository or download as ZIP
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension folder
5. The Deadline Radar icon should appear in your browser toolbar

## Usage

### Automatic Detection
- Visit any webpage with deadlines (assignments, project due dates, etc.)
- The extension automatically scans and detects deadline-related content
- Click the extension icon to see detected tasks

### Manual Task Management
- Click the extension icon and then "Dashboard" to manage all tasks
- Add custom tasks manually with the "Add Task" button
- Mark tasks as complete or delete them as needed
- Filter tasks by urgency, due date, or completion status

### Notifications
- Receive automatic notifications for upcoming deadlines
- Urgent tasks (due within 24 hours) are highlighted in red
- System notifications remind you of important deadlines

## Development

### Setup
```bash
npm install
npm run build-css
```

### Building CSS
```bash
# Development (watch mode)
npm run build

# Production (minified)
npm run build-prod
```

### Project Structure
```
deadline-radar/
├── manifest.json          # Chrome extension manifest (Manifest V3)
├── content.js             # Content script for deadline detection
├── background.js          # Service worker for notifications
├── popup.html/js          # Extension popup interface
├── dashboard.html/js      # Full dashboard interface
├── styles/                # Compiled CSS files
├── src/styles/           # Source CSS files
└── icons/                # Extension icons
```

## Technologies Used

- **Chrome Extensions API** (Manifest V3)
- **JavaScript ES6+** for all logic and DOM manipulation
- **Tailwind CSS** for modern, responsive styling
- **Chrome Storage API** for local data persistence
- **Chrome Notifications API** for deadline reminders
- **Advanced RegEx** for deadline pattern matching
- **Date parsing** for intelligent deadline recognition

## Browser Compatibility

- Chrome 88+ (Manifest V3 requirement)
- Chromium-based browsers (Edge, Brave, etc.)

## Privacy

Deadline Radar respects your privacy:
- All data is stored locally in your browser
- No data is sent to external servers
- Only scans text content of webpages you visit
- No tracking or analytics

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details