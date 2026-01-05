# Reddit-Chan

A Tampermonkey userscript that allows you to view 4chan threads and the catalog with a Reddit-style interface.

## Features
- **Reddit-style Layout**: View threads with a familiar nested comment structure (though 4chan is flat/linear, this script attempts to thread replies).
- **Sidebar**: Adds a Reddit-style sidebar to boards.
- **Index/Catalog View**: distinct styles for the board index versus thread view.
- **Text Size Control**: Adjustable text size (S/M/L).

## Installation
**[Click Here to Install](https://raw.githubusercontent.com/Acelogic/reddit-chan/master/reddit-chan.user.js)**

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Click the link above. Tampermonkey will automatically detect the userscript and ask if you want to install it.
3. Click "Install".
4. Visit any 4chan board (e.g., `boards.4chan.org/g/`) to see it in action.

### Auto-Update
The script is configured to automatically check for updates. If you installed it via the link above, Tampermonkey will periodically check for new versions and update it for you.

## Development

The project structure is organized as follows:

```
.
├── reddit-chan.user.js  # The main userscript source code
├── tests/
│   └── mocks/           # HTML files for offline testing/debugging
│       ├── mock_4chan.html
│       └── mock_4chan_index.html
└── README.md
```

### Testing

You can simpler open the mock HTML files in `tests/mocks/` with your browser to test the UI changes without needing to visit the live site or rely on the userscript injection for basic CSS/JS development.
