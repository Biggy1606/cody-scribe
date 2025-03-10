// Cody Scribe
// TUI for selecting and exporting Cody chats to markdown
// Author: Igor Barcik & Cody

const fs = require('fs');
const readline = require('readline');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  underscore: '\x1b[4m',
  blink: '\x1b[5m',
  reverse: '\x1b[7m',
  hidden: '\x1b[8m',

  fg: {
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
  },

  bg: {
    black: '\x1b[40m',
    red: '\x1b[41m',
    green: '\x1b[42m',
    blue: '\x1b[44m',
    magenta: '\x1b[45m',
    cyan: '\x1b[46m',
    white: '\x1b[47m',
  }
};

const args = process.argv.slice(2);
const flags = {
  removeEmpty: false,
  input: null,
  output: null,
  help: false
};

// Parse command line arguments
let i = 0;
while (i < args.length) {
  const arg = args[i];

  if (arg === '-r' || arg === '--remove-empty') {
    flags.removeEmpty = true;
    i++;
  } else if (arg === '-h' || arg === '--help') {
    flags.help = true;
    i++;
  } else if (arg === '-o' || arg === '--output') {
    if (i + 1 < args.length) {
      flags.output = args[i + 1];
      i += 2;
    } else {
      console.error('Error: --output requires a filename argument');
      process.exit(1);
    }
  } else if (arg.startsWith('--output=')) {
    flags.output = arg.substring('--output='.length);
    i++;
  } else if (!arg.startsWith('-')) {
    // Assume it's the input file
    flags.input = arg;
    i++;
  } else {
    console.error(`Unknown option: ${arg}`);
    process.exit(1);
  }
}

// Display help if requested
if (flags.help) {
  console.log(`
Usage: node cody-scribe.js [options] <json-file>

Options:
  -r, --remove-empty    Remove empty chats from the JSON file permanently (creates backup of original file)
  -o, --output FILE     Specify output markdown file (default: <input>.md)
  -h, --help            Display this help message

Examples:
  node cody-scribe.js chats.json
  node cody-scribe.js -r chats.json
  node cody-scribe.js --output=export.md chats.json
`);
  process.exit(0);
}


const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// // Check if file path is provided
// if (process.argv.length < 3) {
//   console.log('Usage: node convert-cody-json-to-md.js <path-to-json-file>');
//   process.exit(1);
// }

// Validate input file
const jsonFilePath = flags.input;
if (!jsonFilePath) {
  console.error('Error: No input file specified');
  console.log('Use -h or --help for usage information');
  process.exit(1);
}

// Set output file
let outputFilePath = flags.output || jsonFilePath.replace('.json', '.md');

// Function to prompt user for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Function to format text and handle code blocks with file paths and thinking processes
function formatText(text, thinkingOption) {
  // Handle thinking process sections based on user preference
  let processedText = text;

  if (thinkingOption !== 'keep') {
    // Extract thinking process sections
    const thinkRegex = /<think>([\s\S]*?)<\/think>/g;

    if (thinkingOption === 'remove') {
      // Remove thinking sections completely
      processedText = processedText.replace(thinkRegex, '');
    } else if (thinkingOption === 'fold') {
      // Replace with HTML details/summary for folding
      processedText = processedText.replace(thinkRegex, (match, content) => {
        return `<details>
<summary>Assistant's thinking process</summary>

${content.trim()}
</details>`;
      });
    }
  }

  // Handle code blocks with file paths
  const codeBlockRegex = /```([a-zA-Z0-9_-]+):([^\n]+)\n([\s\S]*?)```/g;

  // Replace code blocks with properly formatted versions
  return processedText.replace(codeBlockRegex, (match, language, filePath, code) => {
    return `**File:** \`${filePath.trim()}\`\n\n\`\`\`${language}\n${code}\`\`\``;
  });
}

// Function to display chats with pagination and filtering options
async function selectChats(chatsData) {
  const PAGE_SIZE = 10;
  let currentPage = 1;
  let filteredChats = [...chatsData];
  let filterKeyword = '';
  let dateFilter = '';
  let showEmptyChats = false;

  async function showChatsPage() {
    console.clear();
    console.log(`\n${colors.bright}${colors.fg.cyan}===== Chat Selection =====${colors.reset}`);

    // Apply empty chat filtering if needed
    let displayedChats = [...filteredChats];
    if (!showEmptyChats) {
      const originalLength = displayedChats.length;
      displayedChats = displayedChats.filter(chat =>
        chat.interactions && chat.interactions.length > 0
      );

      if (displayedChats.length < originalLength) {
        console.log(`\n${colors.fg.yellow}Hidden ${originalLength - displayedChats.length} empty chats.${colors.reset} Use ${colors.fg.magenta}e${colors.reset} to toggle visibility.`);
      }
    } else {
      console.log(`\n${colors.fg.green}Showing all chats including empty ones.${colors.reset} Use ${colors.fg.magenta}e${colors.reset} to toggle visibility.`);
    }

    // Show filtering status
    if (filterKeyword || dateFilter) {
      console.log(`\n${colors.fg.yellow}Active filters:${colors.reset} ${filterKeyword ? colors.fg.green + 'Keyword: "' + filterKeyword + '"' + colors.reset : ''} ${dateFilter ? colors.fg.green + 'Date: ' + dateFilter + colors.reset : ''}`);
      console.log(`${colors.fg.yellow}Showing ${colors.fg.white}${filteredChats.length}${colors.reset}${colors.fg.yellow} of ${colors.fg.white}${chatsData.length}${colors.reset}${colors.fg.yellow} chats${colors.reset}`);
    }

    // Show pagination info
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, displayedChats.length);
    const totalPages = Math.ceil(displayedChats.length / PAGE_SIZE);

    console.log(`\n${colors.bright}${colors.fg.blue}Page ${colors.fg.white}${currentPage}/${totalPages}${colors.reset}${colors.fg.blue} (${startIdx + 1}-${endIdx} of ${displayedChats.length})${colors.reset}\n`);


    // Display chats for current page
    for (let i = startIdx; i < endIdx; i++) {
      const chat = displayedChats[i];
      const chatDate = new Date(chat.id);
      const originalIndex = chatsData.indexOf(chat) + 1;
      const messageCount = chat.interactions ? chat.interactions.length : 0;

      let previewText = '';
      if (chat.interactions && chat.interactions.length > 0 &&
        chat.interactions[0].humanMessage &&
        chat.interactions[0].humanMessage.text) {
        previewText = chat.interactions[0].humanMessage.text.substring(0, 60) +
          (chat.interactions[0].humanMessage.text.length > 60 ? '...' : '');
      }

      console.log(`${colors.fg.green}[${originalIndex}]${colors.reset} ${colors.fg.yellow}${chatDate.toLocaleString()}${colors.reset} (${colors.fg.cyan}${messageCount} msgs${colors.reset}) - ${previewText}`);
    }

    // Show navigation options
    console.log(`\n${colors.bright}${colors.fg.cyan}===== Navigation =====${colors.reset}`);
    console.log(`${colors.fg.magenta}n:${colors.reset} Next page   ${colors.fg.magenta}p:${colors.reset} Previous page   ${colors.fg.magenta}j:${colors.reset} Jump to page   ${colors.fg.magenta}f:${colors.reset} Filter by keyword   ${colors.fg.magenta}d:${colors.reset} Filter by date`);
    console.log(`${colors.fg.magenta}e:${colors.reset} ${showEmptyChats ? 'Hide' : 'Show'} empty chats   ${colors.fg.magenta}r:${colors.reset} Reset filters   ${colors.fg.magenta}s:${colors.reset} Search   ${colors.fg.magenta}all:${colors.reset} Select all chats   ${colors.fg.magenta}q:${colors.reset} Quit selection`);
    console.log(`\n${colors.bright}Enter chat numbers to export (comma-separated) or command:${colors.reset}`);
  }

  async function applyKeywordFilter() {
    filterKeyword = await prompt('Enter keyword to filter by: ');
    if (filterKeyword) {
      filteredChats = chatsData.filter(chat => {
        if (chat.interactions && chat.interactions.length > 0) {
          // Search in human messages
          if (chat.interactions.some(interaction =>
            interaction.humanMessage &&
            interaction.humanMessage.text &&
            interaction.humanMessage.text.toLowerCase().includes(filterKeyword.toLowerCase()))) {
            return true;
          }
          // Search in assistant messages
          if (chat.interactions.some(interaction =>
            interaction.assistantMessage &&
            interaction.assistantMessage.text &&
            interaction.assistantMessage.text.toLowerCase().includes(filterKeyword.toLowerCase()))) {
            return true;
          }
        }
        return false;
      });
      currentPage = 1;
    }
  }

  async function applyDateFilter() {
    dateFilter = await prompt('Enter date to filter by (YYYY-MM-DD, or use > or < before date): ');
    if (dateFilter) {
      // Extract operator and date string
      let operator = '';
      let dateString = dateFilter;

      if (dateFilter.startsWith('>') || dateFilter.startsWith('<')) {
        operator = dateFilter.charAt(0);
        dateString = dateFilter.substring(1).trim();
      }

      // Parse the date string
      const filterDate = new Date(dateString);
      const isValidDate = !isNaN(filterDate.getTime());

      if (isValidDate) {
        filteredChats = chatsData.filter(chat => {
          const chatDate = new Date(chat.id);

          if (operator === '>') {
            // After specific date
            return chatDate > filterDate;
          } else if (operator === '<') {
            // Before specific date
            return chatDate < filterDate;
          } else {
            // Exact date match (original functionality)
            return chatDate.toISOString().substring(0, 10) === dateString;
          }
        });
        currentPage = 1;
      } else {
        console.log('Invalid date format. Please use YYYY-MM-DD format.');
        await prompt('Press Enter to continue...');
      }
    }
  }

  async function searchChat() {
    const query = await prompt('Enter search term: ');
    if (query) {
      console.log('\nSearch results:');
      let results = 0;

      chatsData.forEach((chat, index) => {
        let found = false;
        let matchText = '';

        if (chat.interactions) {
          chat.interactions.forEach(interaction => {
            // Search in human messages
            if (!found && interaction.humanMessage && interaction.humanMessage.text) {
              const text = interaction.humanMessage.text;
              const position = text.toLowerCase().indexOf(query.toLowerCase());
              if (position !== -1) {
                found = true;
                const start = Math.max(0, position - 20);
                const end = Math.min(text.length, position + query.length + 20);
                matchText = '...' + text.substring(start, end) + '...';
              }
            }

            // Search in assistant messages
            if (!found && interaction.assistantMessage && interaction.assistantMessage.text) {
              const text = interaction.assistantMessage.text;
              const position = text.toLowerCase().indexOf(query.toLowerCase());
              if (position !== -1) {
                found = true;
                const start = Math.max(0, position - 20);
                const end = Math.min(text.length, position + query.length + 20);
                matchText = '...' + text.substring(start, end) + '...';
              }
            }
          });
        }

        if (found) {
          results++;
          const chatDate = new Date(chat.id);
          console.log(`[${index + 1}] ${chatDate.toLocaleString()} - ${matchText}`);
        }
      });

      console.log(`\nFound ${results} chats containing "${query}"`);
      await prompt('\nPress Enter to continue...');
    }
  }

  let selectedIndices = [];
  let done = false;

  while (!done) {
    await showChatsPage();

    const input = await prompt('> ');
    const command = input.toLowerCase().trim();

    if (command === 'n') {
      // Next page
      if (currentPage < Math.ceil(filteredChats.length / PAGE_SIZE)) {
        currentPage++;
      }
    } else if (command === 'p') {
      // Previous page
      if (currentPage > 1) {
        currentPage--;
      }
    } else if (command === 'j') {
      // Jump to specific page
      const totalPages = Math.ceil(filteredChats.length / PAGE_SIZE);
      const pageNum = await prompt(`Enter page number (1-${totalPages}): `);
      const pageInt = parseInt(pageNum.trim());

      if (!isNaN(pageInt) && pageInt >= 1 && pageInt <= totalPages) {
        currentPage = pageInt;
      } else {
        console.log(`Invalid page number. Please enter a number between 1 and ${totalPages}.`);
        await prompt('Press Enter to continue...');
      }
    } else if (command === 'f') {
      // Filter by keyword
      await applyKeywordFilter();
    } else if (command === 'd') {
      // Filter by date
      await applyDateFilter();
    } else if (command === 'e') {
      // Toggle empty chats visibility
      showEmptyChats = !showEmptyChats;
      currentPage = 1; // Reset to first page when changing visibility
    } else if (command === 'r') {
      // Reset filters
      filteredChats = [...chatsData];
      filterKeyword = '';
      dateFilter = '';
      currentPage = 1;
    } else if (command === 's') {
      // Search
      await searchChat();
    } else if (command === 'all') {
      // Select all chats
      selectedIndices = filteredChats.map(chat => chatsData.indexOf(chat));
      done = true;
    } else if (command === 'q') {
      // Quit
      done = true;
    } else {
      // Parse comma-separated numbers
      const nums = command.split(',').map(num => parseInt(num.trim()) - 1);
      const validNums = nums.filter(num => !isNaN(num) && num >= 0 && num < chatsData.length);

      if (validNums.length > 0) {
        selectedIndices = validNums;
        done = true;
      } else {
        console.log('Invalid selection. Please try again.');
        await prompt('Press Enter to continue...');
      }
    }
  }

  return selectedIndices;
}

// Main function
async function main() {
  try {
    // Read and parse the JSON file
    console.log(`Loading file: ${jsonFilePath}...`);
    let chatsData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log(`Loaded ${chatsData.length} chats successfully.`);

    // Handle empty chat removal if requested
    if (flags.removeEmpty) {
      const originalLength = chatsData.length;
      chatsData = chatsData.filter(chat => chat.interactions && chat.interactions.length > 0);
      
      if (chatsData.length < originalLength) {
        console.log(`Removed ${originalLength - chatsData.length} empty chats from the data.`);
        
        // Save the modified JSON back to file
        const backupPath = `${jsonFilePath}.backup`;
        fs.writeFileSync(backupPath, fs.readFileSync(jsonFilePath)); // Create backup
        fs.writeFileSync(jsonFilePath, JSON.stringify(chatsData, null, 2));
        console.log(`Original file backed up to: ${backupPath}`);
        console.log(`Modified JSON saved with ${chatsData.length} chats.`);
      } else {
        console.log('No empty chats found to remove.');
      }
      
      // Exit after cleaning if -r flag was used
      rl.close();
      return;
    }

    // Interactive chat selection
    const selectedIndices = await selectChats(chatsData);

    if (selectedIndices.length === 0) {
      console.log('No chats selected. Exiting.');
      rl.close();
      return;
    }

    console.log(`Selected ${selectedIndices.length} chats for export.`);

    // Ask for custom filename
    const customFilename = await prompt('Enter custom filename (leave empty for default): ');
    if (customFilename.trim()) {
      outputFilePath = customFilename.endsWith('.md') ? customFilename : `${customFilename}.md`;
    }

    // Ask for formatting options
    const includeTimestamps = (await prompt('Include timestamps? (Y/n): ')).toLowerCase() !== 'n';
    const includeModelInfo = (await prompt('Include model information? (Y/n): ')).toLowerCase() !== 'n';

    // Ask how to handle thinking process sections
    console.log('\nHow to handle <think></think> sections:');
    console.log('1. Remove completely');
    console.log('2. Convert to foldable sections');
    console.log('3. Keep as is');
    const thinkingChoice = await prompt('Choose an option (1/2/3): ');

    let thinkingOption;
    switch (thinkingChoice.trim()) {
      case '1':
        thinkingOption = 'remove';
        break;
      case '2':
        thinkingOption = 'fold';
        break;
      default:
        thinkingOption = 'keep';
    }

    // Generate markdown
    let markdownContent = '# Cody Chat Exports\n\n';

    selectedIndices.forEach((idx, count) => {
      const chat = chatsData[idx];
      const chatDate = new Date(chat.id);

      // Add chat header with timestamp
      markdownContent += `## Chat ${count + 1} - ${includeTimestamps ? chatDate.toLocaleString() : ''}\n\n`;

      // Process each interaction in the chat
      chat.interactions.forEach(interaction => {
        // Add human message
        if (interaction.humanMessage && interaction.humanMessage.text) {
          markdownContent += `### Human:\n\n${formatText(interaction.humanMessage.text, thinkingOption)}\n\n`;
        }

        // Add assistant message
        if (interaction.assistantMessage && interaction.assistantMessage.text) {
          markdownContent += `### Assistant:`;

          // Add model info if requested
          if (includeModelInfo && interaction.assistantMessage.model) {
            markdownContent += ` (${interaction.assistantMessage.model})`;
          }

          markdownContent += `\n\n${formatText(interaction.assistantMessage.text, thinkingOption)}\n\n`;
        }

        // Add separator between interactions
        markdownContent += '---\n\n';
      });
    });

    // Write to markdown file
    fs.writeFileSync(outputFilePath, markdownContent);
    console.log(`Conversion complete! Markdown file saved to: ${outputFilePath}`);

  } catch (error) {
    console.log('Error processing file:', error.message);
  } finally {
    rl.close();
  }
}


main();
