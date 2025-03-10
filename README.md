# cody-scribe

A Terminal UI tool for selecting and exporting Sourcegraph Cody AI chat logs to Markdown.

## Overview

cody-scribe allows you to easily convert your Cody AI chat logs from JSON format to readable Markdown files. The interactive Terminal UI provides powerful filtering, search, and customization options.

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/Biggy1606/cody-scribe
   ```

2. Navigate to the directory:
   ```bash
   cd cody-scribe
   ```

3. Make sure you have Node.js installed, then run:
   ```bash
   node ./cody-scribe.js
   ```

## Usage

Basic usage:

```bash
node cody-scribe.js path/to/your/chats.json
```

With options:

```bash
node cody-scribe.js --output=exported_chats.md path/to/your/chats.json
```

### Command-line Options

- `-r, --remove-empty`: Remove empty chats from the JSON file (creates a backup)
- `-o, --output FILE`: Specify output markdown file (default: input-filename.md)
- `-h, --help`: Display help message

## Features

- **Interactive TUI**: Navigate through your chats with an easy-to-use interface
- **Powerful Filtering**: Filter chats by keyword or date
- **Pagination**: Browse through large chat collections with ease
- **Search**: Find specific content across all chats
- **Export Customization**: Include/exclude timestamps and model information
- **Smart Code Block Handling**: Preserves file paths in code blocks
- **Thinking Process Options**: Remove, fold, or keep AI thinking process sections

## Example Workflow

1. **Start the tool**:
   ```bash
   node cody-scribe.js cody_chats.json
   ```

2. **Navigate the interface**:
   - Use `n` and `p` to navigate between pages
   - Use `f` to filter by keyword
   - Use `d` to filter by date
   - Use `s` to search for specific content
   - Use `e` to toggle showing empty chats

3. **Select chats for export**:
   - Enter specific chat numbers separated by commas (e.g., `1,3,5`)
   - Or use `all` to select all filtered chats

4. **Customize your export**:
   - Choose whether to include timestamps and model information
   - Select how to handle thinking process sections
   - Provide a custom filename if desired

5. **View your exported Markdown file**:
   ```bash
   cat exported_chats.md
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - Copyright (c) 2025 Igor Barcik & Contributors
