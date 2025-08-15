// Update datetime in i3 bar
function updateDateTime() {
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    const day = days[now.getDay()];
    const date = now.getDate();
    const month = months[now.getMonth()];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const dateTimeString = `${day} ${date} ${month} ${hours}:${minutes}`;
    document.getElementById('datetime').textContent = dateTimeString;
}

// Update every minute
updateDateTime();
setInterval(updateDateTime, 60000);

// Typing effect for fastfetch
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.textContent = '';
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}

// Workspace switching with terminal swapping
const workspaces = document.querySelectorAll('.workspace');
const terminals = document.querySelectorAll('.terminal');
let isAnimating = false;
let currentWorkspace = 1;

// Function to swap terminal contents with smooth animation
async function swapTerminals(workspaceNum) {
    if (isAnimating || workspaceNum === currentWorkspace) return;
    isAnimating = true;
    
    const mainTerminal = document.getElementById('main-terminal');
    let targetTerminal = null;
    
    // Determine which terminal to swap with
    switch(workspaceNum) {
        case 1: // About - no swap needed if already showing
            if (mainTerminal.dataset.content === 'about') {
                isAnimating = false;
                return;
            }
            // Find the terminal with about content
            targetTerminal = document.querySelector('[data-content="about"]:not(#main-terminal)');
            break;
        case 2: // Music
            targetTerminal = document.getElementById('music-terminal');
            break;
        case 3: // Reads
            targetTerminal = document.getElementById('readings-terminal');
            break;
        case 4: // GitHub
            targetTerminal = document.querySelector('.github-terminal');
            break;
    }
    
    if (!targetTerminal || targetTerminal === mainTerminal) {
        isAnimating = false;
        return;
    }
    
    // Store the content before animation
    const mainContent = mainTerminal.innerHTML;
    const targetContent = targetTerminal.innerHTML;
    const mainDataContent = mainTerminal.dataset.content;
    const targetDataContent = targetTerminal.dataset.content;
    
    // Create clones for animation
    const mainClone = mainTerminal.cloneNode(true);
    const targetClone = targetTerminal.cloneNode(true);
    
    // Position clones exactly over originals
    const mainRect = mainTerminal.getBoundingClientRect();
    const targetRect = targetTerminal.getBoundingClientRect();
    
    mainClone.style.position = 'fixed';
    mainClone.style.left = mainRect.left + 'px';
    mainClone.style.top = mainRect.top + 'px';
    mainClone.style.width = mainRect.width + 'px';
    mainClone.style.height = mainRect.height + 'px';
    mainClone.style.zIndex = '2000';
    mainClone.id = 'main-clone';
    
    targetClone.style.position = 'fixed';
    targetClone.style.left = targetRect.left + 'px';
    targetClone.style.top = targetRect.top + 'px';
    targetClone.style.width = targetRect.width + 'px';
    targetClone.style.height = targetRect.height + 'px';
    targetClone.style.zIndex = '2000';
    targetClone.id = 'target-clone';
    
    // Add clones to body
    document.body.appendChild(mainClone);
    document.body.appendChild(targetClone);
    
    // Hide originals
    mainTerminal.style.opacity = '0';
    targetTerminal.style.opacity = '0';
    
    // Calculate distances for clone movement
    const mainToTargetX = targetRect.left - mainRect.left;
    const mainToTargetY = targetRect.top - mainRect.top;
    const targetToMainX = mainRect.left - targetRect.left;
    const targetToMainY = mainRect.top - targetRect.top;
    
    // Animate clones to swap positions
    setTimeout(() => {
        mainClone.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        targetClone.style.transition = 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
        mainClone.style.transform = `translate(${mainToTargetX}px, ${mainToTargetY}px)`;
        targetClone.style.transform = `translate(${targetToMainX}px, ${targetToMainY}px)`;
    }, 10);
    
    // After animation, update content and remove clones
    setTimeout(() => {
        // Swap the actual content
        mainTerminal.innerHTML = targetContent;
        targetTerminal.innerHTML = mainContent;
        mainTerminal.dataset.content = targetDataContent;
        targetTerminal.dataset.content = mainDataContent;
        
        // Show originals with new content
        mainTerminal.style.opacity = '1';
        targetTerminal.style.opacity = '1';
        
        // Remove clones
        mainClone.remove();
        targetClone.remove();
        
        // Re-initialize event handlers for swapped content
        reinitializeTerminalHandlers(workspaceNum);
        
        currentWorkspace = workspaceNum;
        isAnimating = false;
    }, 410);
}

// Re-initialize handlers after swap
function reinitializeTerminalHandlers(workspace) {
    switch(workspace) {
        case 2: // Music now in main
            // Re-attach music click handlers
            addTrackClickHandlers();
            break;
        case 3: // Readings now in main
            // Re-attach reading tab handlers
            const mainTerminal = document.getElementById('main-terminal');
            const readingTabs = mainTerminal.querySelectorAll('.tab');
            readingTabs?.forEach(tab => {
                tab.addEventListener('click', async () => {
                    readingTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const tabType = tab.textContent.toLowerCase();
                    await populateReadingsInTerminal(mainTerminal, tabType);
                });
            });
            break;
        case 4: // GitHub now in main
            // Re-fetch GitHub data if needed
            const commitList = document.querySelector('#main-terminal .commit-list');
            if (commitList && commitList.children.length === 0) {
                fetchGitHubActivity();
            }
            break;
    }
    
    // Also re-init terminal input if it's in the main terminal
    const terminalInput = document.querySelector('#main-terminal #terminal-input');
    if (terminalInput) {
        terminalInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const input = terminalInput.value;
                executeCommand(input);
                terminalInput.value = '';
            }
        });
    }
}

// Helper function to populate readings in any terminal
async function populateReadingsInTerminal(terminal, tabType) {
    const readingsList = terminal.querySelector('.track-list');
    const titleElement = terminal.querySelector('.playlist-title');
    if (!readingsList || !titleElement) return;
    
    const data = await loadReadingData(tabType);
    const titles = {
        books: '📚 Readings',
        articles: '📄 Articles',
        papers: '📑 Research Papers',
        blogs: '📝 Blog Posts'
    };
    
    titleElement.textContent = titles[tabType];
    readingsList.innerHTML = '';
    
    data.forEach((item) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'track';
        const nameElement = item.url 
            ? `<a href="${item.url}" target="_blank" class="track-name clickable">${item.name}</a>`
            : `<span class="track-name">${item.name}</span>`;
        
        itemElement.innerHTML = `
            <span class="track-number">${item.icon}</span>
            <span class="track-info">
                ${nameElement}
                <span class="track-artist">${item.author}</span>
            </span>
            <span class="track-duration">${item.progress}</span>
        `;
        
        readingsList.appendChild(itemElement);
    });
}

workspaces.forEach((workspace) => {
    workspace.addEventListener('click', () => {
        const workspaceNum = parseInt(workspace.dataset.workspace);
        
        // Update active state
        workspaces.forEach(ws => ws.classList.remove('active'));
        workspace.classList.add('active');
        
        // Perform the terminal swap
        swapTerminals(workspaceNum);
    });
});

// Terminal window hover effects
terminals.forEach(terminal => {
    terminal.addEventListener('mouseenter', () => {
        // Remove hovered class from all terminals
        terminals.forEach(t => t.classList.remove('hovered'));
        // Add hovered class to current terminal
        terminal.classList.add('hovered');
    });
    
    terminal.addEventListener('mouseleave', () => {
        // Remove hovered class from current terminal
        terminal.classList.remove('hovered');
    });
});

// Sample music data
const tracks = [
    { name: "Room 6", artist: "Autonon", duration: "3:45" },
    { name: "Not so fast you are hurting me", artist: "i broke my robot", duration: "4:12" },
    { name: "3UPM", artist: "Dubioza Kollektiv", duration: "3:28" },
    { name: "If I Didn't Have You", artist: "Tim Minchin", duration: "3:37" },
    { name: "Wegschreddern", artist: "HIGHTKK", duration: "2:54" },
    { name: "WIERSZALIN III", artist: "PATRIARKH", duration: "5:33" },
    { name: "s/t", artist: "Dystopia", duration: "6:21" },
    { name: "Diäb Soulé", artist: "Acid Bath", duration: "4:45" },
    { name: "Gyokusai", artist: "M1DY", duration: "3:17" },
    { name: "Helium Vox", artist: "KaZan 303", duration: "4:08" },
    { name: "Into The Death", artist: "Atari Teenage Riot", duration: "3:52" }
];

// Reading data cache
let readingData = {};
let currentReadingTab = 'books';

// Load JSON data for a specific category
async function loadReadingData(category) {
    if (readingData[category]) {
        return readingData[category];
    }
    
    try {
        const response = await fetch(`data/${category}.json`);
        const data = await response.json();
        readingData[category] = data;
        return data;
    } catch (error) {
        console.error(`Failed to load ${category} data:`, error);
        return [];
    }
}

// Populate music tracks
function populateTracks() {
    // Use the ID to target the music terminal specifically
    const musicTerminal = document.getElementById('music-terminal');
    const trackList = musicTerminal?.querySelector('.track-list');
    if (!trackList) return;
    
    // Clear existing tracks except the first one
    const existingTracks = trackList.querySelectorAll('.track:not(:first-child)');
    existingTracks.forEach(track => track.remove());
    
    tracks.slice(1).forEach((track, index) => {
        const trackElement = document.createElement('div');
        trackElement.className = 'track';
        trackElement.innerHTML = `
            <span class="track-number">${index + 2}</span>
            <span class="track-info">
                <span class="track-name">${track.name}</span>
                <span class="track-artist">${track.artist}</span>
            </span>
            <span class="track-duration">${track.duration}</span>
        `;
        trackList.appendChild(trackElement);
    });
}

// Populate readings based on current tab
async function populateReadings(tabType = 'books') {
    // Use the ID to target the readings terminal specifically
    const readingsTerminal = document.getElementById('readings-terminal');
    
    const readingsList = readingsTerminal?.querySelector('.track-list');
    const titleElement = readingsTerminal?.querySelector('.playlist-title');
    if (!readingsList || !titleElement) return;
    
    // Load data from JSON file
    const data = await loadReadingData(tabType);
    
    const titles = {
        books: '📚 Readings',
        articles: '📄 Articles',
        papers: '📑 Research Papers',
        blogs: '📝 Blog Posts'
    };
    
    titleElement.textContent = titles[tabType];
    readingsList.innerHTML = '';
    
    data.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'track';
        
        // Make name clickable if URL exists
        const nameElement = item.url 
            ? `<a href="${item.url}" target="_blank" class="track-name clickable">${item.name}</a>`
            : `<span class="track-name">${item.name}</span>`;
        
        itemElement.innerHTML = `
            <span class="track-number">${item.icon}</span>
            <span class="track-info">
                ${nameElement}
                <span class="track-artist">${item.author}</span>
            </span>
            <span class="track-duration">${item.progress}</span>
        `;
        
        // Add click handler to blur clickable links after clicking
        if (item.url) {
            const linkElement = itemElement.querySelector('.track-name.clickable');
            linkElement?.addEventListener('click', (e) => {
                // Small delay to allow navigation, then blur the element
                setTimeout(() => {
                    linkElement.blur();
                }, 100);
            });
        }
        
        readingsList.appendChild(itemElement);
    });
}

// Initialize content
document.addEventListener('DOMContentLoaded', async () => {
    populateTracks();
    await populateReadings(currentReadingTab);
    
    // Add reading tab functionality - target only the readings terminal
    const readingsTerminal = document.getElementById('readings-terminal');
    const readingTabs = readingsTerminal?.querySelectorAll('.tab');
    
    readingTabs?.forEach(tab => {
        tab.addEventListener('click', async () => {
            // Remove active class from all tabs in readings terminal only
            readingTabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            tab.classList.add('active');
            
            // Update current tab and populate content
            currentReadingTab = tab.textContent.toLowerCase();
            await populateReadings(currentReadingTab);
            
            // Re-add click handlers for new tracks
            addTrackClickHandlers();
        });
    });
    
    // Add click handlers for tracks
    addTrackClickHandlers();
});

// Function to add click handlers to tracks (reusable after tab switching)
function addTrackClickHandlers() {
    // Only add handlers to music tracks
    const musicTerminal = document.getElementById('music-terminal');
    const musicTracks = musicTerminal?.querySelectorAll('.track') || [];
    
    // Add handlers to reading tracks
    const readingsTerminal = document.getElementById('readings-terminal');
    const readingTracks = readingsTerminal?.querySelectorAll('.track') || [];
    
    [...musicTracks, ...readingTracks].forEach(track => {
        // Remove existing event listeners by cloning the element
        const newTrack = track.cloneNode(true);
        track.parentNode.replaceChild(newTrack, track);
        
        newTrack.addEventListener('click', function() {
            // Remove playing class from all tracks in this list
            const parent = this.parentElement;
            parent.querySelectorAll('.track').forEach(t => t.classList.remove('playing'));
            // Add playing class to clicked track
            this.classList.add('playing');
            
            // Update the player bar if it's a music track
            if (parent.closest('.terminal').querySelector('.player-bar')) {
                const trackName = this.querySelector('.track-name').textContent;
                const artistName = this.querySelector('.track-artist').textContent;
                const duration = this.querySelector('.track-duration').textContent;
                const currentTrack = parent.closest('.terminal').querySelector('.current-track');
                const progressElement = parent.closest('.terminal').querySelector('.progress');
                if (currentTrack) {
                    currentTrack.textContent = `${trackName} - ${artistName}`;
                }
                if (progressElement && duration) {
                    // Update the total duration, keep the current time at 0:00 or a random start time
                    progressElement.textContent = `0:00 / ${duration}`;
                }
            }
        });
    });
}

// Terminal Command System
const terminalInput = document.getElementById('terminal-input');
const terminalOutput = document.getElementById('terminal-output');

// Command definitions
const commands = {
    help: {
        description: 'Show available commands',
        execute: () => {
            return `Available commands:
  <span class="info">help</span>     - Show this help message
  <span class="info">about</span>    - Learn more about me
  <span class="info">contact</span>  - Get in touch
  <span class="info">skills</span>   - Technical skills
  <span class="info">projects</span> - View my projects
  <span class="info">clear</span>    - Clear terminal
  <span class="info">repo</span>     - View this website's source
  <span class="info">theme</span>    - About this autumn theme
  <span class="info">whoami</span>   - Who am I?
  <span class="info">vc</span>       - Looking for funding?
  
<span class="dim">Type any command to execute it.</span>`;
        }
    },
    about: {
        description: 'Learn more about me',
        execute: () => {
            return `<span class="orange">About Me</span>
<span class="dim">─────────</span>

A lost and found soul exploring the infinite ether.

• Building Dew, Dreaming @ Indie Cartel, Community @ wallet.garden, Council @ IMGN Labs DAO
• <span class="info">Philosophy</span>: Die Würde des Menschen ist unantastbar. Wealth creation to transform into a world of Post-Coercion
• <span class="info">Interests</span>: Blockchains, Cooperative Economics, Digital Sovereignty, Raving, Gaming

Special thanks and lots of love to my wife and my dog - the best souls in my world. Without you two there wouldn't be a me.`;
        }
    },
    contact: {
        description: 'Get in touch',
        execute: () => {
            return `<span class="orange">Contact Information</span>
<span class="dim">──────────────────</span>

• <span class="info">GitHub</span>:     github.com/ciefa.eth
• <span class="info">Farcaster</span>:  @ciefa.eth
• <span class="info">Lens</span>:       @ciefa.eth
• <span class="info">Discord</span>:    On request
• <span class="info">Twitter</span>:    @ciefa_eth

<span class="success">Feel free to reach out, always happy to chat!</span>`;
        }
    },
    skills: {
        description: 'Technical skills',
        execute: () => {
            return `i genuinely have no idea.

<span class="dim">Type 'projects' to see my involvements.</span>`;
        }
    },
    projects: {
        description: 'View my projects',
        execute: () => {
            return `<span class="orange">Projects</span>
<span class="dim">────────</span>

• <span class="info">Dew</span>
  Providing LP made easy across DEXs and the Ethereum ecosystem
  <span class="dim">MVP out soon</span>

• <span class="info">Indie Cartel</span>
  Dreaming a better tomorrow, together
  <span class="dim">cartel.sh</span>

• <span class="info">wallet.garden</span>
  Community Management & Marketing
  <span class="dim">wallet.garden</span>

• <span class="info">IMGN Labs DAO</span>
  Council
  <span class="dim">imgnai.com</span>`;
        }
    },
    clear: {
        description: 'Clear terminal',
        execute: () => {
            terminalOutput.innerHTML = '';
            return '';
        }
    },
    repo: {
        description: 'View source code',
        execute: () => {
            window.open('https://github.com/ciefa/autumn-website', '_blank');
            return '<span class="success">Opening repository in new tab...</span>';
        }
    },
    theme: {
        description: 'About this theme',
        execute: () => {
            return `<span class="orange">Autumn Theme</span>
<span class="dim">────────────</span>

This website recreates my actual desktop environment:
• <span class="info">WM</span>: i3-gaps with custom autumn colors
• <span class="info">Terminal</span>: Kitty with custom theme
• <span class="info">Colors</span>: Warm oranges, browns, and creams

<span class="amber">Color Palette:</span>
  <span style="color: #e67700">█</span> Orange (#e67700)
  <span style="color: #f4a261">█</span> Amber (#f4a261)
  <span style="color: #8b6f47">█</span> Brown (#8b6f47)
  <span style="color: #f4e8d0">█</span> Cream (#f4e8d0)

<span class="dim">View the full config at github.com/ciefa/autumn-i3-theme</span>`;
        }
    },
    whoami: {
        description: 'Who am I?',
        execute: () => {
            return '<span class="info">ciefa.eth</span>';
        }
    },
    vc: {
        description: 'Looking for funding?',
        execute: () => {
            return '<img src="assets/milady-vc.png" alt="VC" style="max-width: 300px; height: auto; display: block; margin: 10px 0;">';
        }
    }
};

// Add a hidden easter egg
commands.neofetch = {
    hidden: true,
    execute: () => commands.about.execute()
};

// Handle command input
function executeCommand(input) {
    const trimmedInput = input.trim().toLowerCase();
    
    // Create command line display
    const commandLine = document.createElement('div');
    commandLine.className = 'command-line';
    commandLine.innerHTML = `<span class="leaf">🍂</span> <span class="path">~</span> <span class="arrow">❯</span> <span class="command">${input}</span>`;
    terminalOutput.appendChild(commandLine);
    
    // Execute command or show error
    if (trimmedInput === '') {
        return;
    }
    
    if (commands[trimmedInput]) {
        const output = commands[trimmedInput].execute();
        if (output) {
            const outputDiv = document.createElement('div');
            outputDiv.className = 'output';
            outputDiv.innerHTML = output;
            terminalOutput.appendChild(outputDiv);
        }
    } else {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'output error';
        errorDiv.innerHTML = `command not found: ${input}\n<span class="dim">Type 'help' for available commands.</span>`;
        terminalOutput.appendChild(errorDiv);
    }
    
    // Scroll to bottom
    const terminalContent = document.querySelector('.left-terminal .terminal-content');
    terminalContent.scrollTop = terminalContent.scrollHeight;
}

// Handle enter key
terminalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = terminalInput.value;
        executeCommand(input);
        terminalInput.value = '';
    }
});

// Focus terminal input when clicking terminal
document.querySelector('.left-terminal').addEventListener('click', () => {
    terminalInput.focus();
});

// Show initial help message
window.addEventListener('load', () => {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'output';
    welcomeDiv.innerHTML = `<span class="orange">Welcome to the Autumn Terminal!</span>
<span class="dim">Type 'help' to see available commands.</span>`;
    terminalOutput.appendChild(welcomeDiv);
});

// GitHub API Integration
async function fetchGitHubActivity(username = 'ciefa') {
    const commitList = document.getElementById('commit-list');
    const statusElement = document.querySelector('.github-status');
    
    try {
        // Fetch recent events from GitHub
        const response = await fetch(`https://api.github.com/users/${username}/events/public?per_page=20`);
        
        if (!response.ok) {
            throw new Error('Failed to fetch GitHub data');
        }
        
        const events = await response.json();
        
        // Filter for push events (commits)
        const pushEvents = events.filter(event => event.type === 'PushEvent');
        
        if (pushEvents.length === 0) {
            commitList.innerHTML = '<div class="commit-item"><span class="commit-message">No recent commits found</span></div>';
            statusElement.textContent = 'No activity';
            return;
        }
        
        // Clear loading message
        commitList.innerHTML = '';
        statusElement.textContent = `${pushEvents.length} recent pushes`;
        
        // Display commits
        pushEvents.slice(0, 10).forEach(event => {
            const repoName = event.repo.name;
            const commits = event.payload.commits || [];
            
            commits.forEach(commit => {
                const commitItem = document.createElement('div');
                commitItem.className = 'commit-item';
                
                const date = new Date(event.created_at);
                const timeAgo = getTimeAgo(date);
                
                commitItem.innerHTML = `
                    <div class="commit-message">${commit.message.split('\n')[0]}</div>
                    <div class="commit-meta">
                        <span class="commit-repo">${repoName}</span>
                        <span class="commit-date">${timeAgo}</span>
                    </div>
                `;
                
                commitList.appendChild(commitItem);
            });
        });
    } catch (error) {
        console.error('Error fetching GitHub activity:', error);
        commitList.innerHTML = '<div class="commit-item"><span class="commit-message">Failed to load commits</span></div>';
        statusElement.textContent = 'Error loading';
    }
}

// Helper function to format time ago
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };
    
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
        }
    }
    
    return 'just now';
}

// Load GitHub activity on page load
document.addEventListener('DOMContentLoaded', () => {
    fetchGitHubActivity();
    
    // Refresh GitHub activity every 5 minutes
    setInterval(() => fetchGitHubActivity(), 5 * 60 * 1000);
});

// Add some console Easter eggs
console.log('%c🍂 Welcome to the Autumn Terminal 🍂', 'color: #e67700; font-size: 20px; font-weight: bold;');
console.log('%cBuilt with love and autumn vibes', 'color: #f4a261; font-style: italic;');
console.log('%cTry typing commands in the terminal!', 'color: #8b6f47;');