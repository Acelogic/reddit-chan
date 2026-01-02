# Reddit-Chan

A Tampermonkey userscript that allows you to view 4chan threads and the catalog with a Reddit-style interface.

## Features
- **Reddit-style Layout**: View threads with a familiar nested comment structure (though 4chan is flat/linear, this script attempts to thread replies).
- **Sidebar**: Adds a Reddit-style sidebar to boards.
- **Index/Catalog View**: distinct styles for the board index versus thread view.
- **Text Size Control**: Adjustable text size (S/M/L).

## Installation

1. Install the [Tampermonkey](https://www.tampermonkey.net/) browser extension.
2. Create a new script in Tampermonkey.
3. Copy the contents of `src/reddit-chan.js` and paste it into the editor.
4. Save the script.
5. Visit any 4chan board (e.g., `boards.4chan.org/g/`) to see it in action.

## Development

The project structure is organized as follows:

```
.
├── src/
│   └── reddit-chan.js       # The main userscript source code
├── tests/
│   └── mocks/               # HTML files for offline testing/debugging
│       ├── mock_4chan.html
│       └── mock_4chan_index.html
└── README.md
```

### Testing

You can simpler open the mock HTML files in `tests/mocks/` with your browser to test the UI changes without needing to visit the live site or rely on the userscript injection for basic CSS/JS development.
