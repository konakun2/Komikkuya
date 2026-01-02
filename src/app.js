const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const app = express();

// Debug configuration
const debugConfig = {
    enabled: false, // Set to false to disable logging
    saveIpAddresses: false, // Set to true to save IP addresses to a file
    ipLogFile: path.join(__dirname, 'logs', 'ip_addresses.txt')
};

// Maintenance mode configuration
const maintenanceConfig = {
    nhentai: true // Set to true to enable maintenance mode for nhentai
};

// Create logs directory if it doesn't exist
if (debugConfig.saveIpAddresses) {
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }
}

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Add default title middleware and helpers
app.use((req, res, next) => {
    res.locals.title = 'Komikkuya';
    // Helper function to convert image URL to wsrv.nl CDN proxy URL
    res.locals.wsrvUrl = (url) => {
        if (!url) return '/images/fallback.png';
        // If already a wsrv.nl URL, return as-is
        if (url.includes('wsrv.nl')) return url;
        // If it's a local URL (starts with /), don't proxy
        if (url.startsWith('/')) return url;
        return `https://wsrv.nl/?url=${encodeURIComponent(url)}&n=-1`;
    };
    next();
});

// Debug middleware to log all requests
app.use((req, res, next) => {
    if (!debugConfig.enabled) {
        return next();
    }

    const ip = req.ip || req.connection.remoteAddress;
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;

    // Truncate long URLs (especially for image proxy)
    let displayUrl = url;
    if (url.startsWith('/manga/image/')) {
        // For image proxy URLs, just show the first part
        displayUrl = '/manga/image/[truncated]';
    } else if (url.length > 50) {
        displayUrl = url.substring(0, 50) + '...';
    }

    // Format the log message
    const logMessage = `[${timestamp}] ${method} ${displayUrl} - IP: ${ip}`;

    // Log with different colors based on method
    switch (method) {
        case 'GET':
            console.log('\x1b[36m%s\x1b[0m', logMessage); // Cyan for GET
            break;
        case 'POST':
            console.log('\x1b[32m%s\x1b[0m', logMessage); // Green for POST
            break;
        case 'PUT':
            console.log('\x1b[33m%s\x1b[0m', logMessage); // Yellow for PUT
            break;
        case 'DELETE':
            console.log('\x1b[31m%s\x1b[0m', logMessage); // Red for DELETE
            break;
        default:
            console.log(logMessage);
    }

    // Save IP address to file if enabled
    if (debugConfig.saveIpAddresses) {
        const ipLogEntry = `${timestamp} - ${ip}\n`;
        fs.appendFile(debugConfig.ipLogFile, ipLogEntry, (err) => {
            if (err) console.error('Error saving IP address:', err);
        });
    }

    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Auth middleware - inject user into all views
const { authMiddleware } = require('./middleware/authMiddleware');
app.use(authMiddleware);

// Routes
const homeRoutes = require('./routes/homeRoutes');
const mangaRoutes = require('./routes/mangaRoutes');
const searchRoutes = require('./routes/searchRoutes');
const chapterRoutes = require('./routes/chapterRoutes');
const popularRoutes = require('./routes/popularRoutes');
const genreRoutes = require('./routes/genreRoutes');
const latestRoutes = require('./routes/latestRoutes');
const legalRoutes = require('./routes/legalRoutes');
const historyRoutes = require('./routes/historyRoutes');
const doujinRoutes = require('./routes/doujinRoutes');
const doujinDetailRoutes = require('./routes/doujinDetailRoutes');
const doujinChapterRoutes = require('./routes/doujinChapterRoutes');
const nhentaiRoutes = require('./routes/nhentaiRoutes');
const nhentaiDetailRoutes = require('./routes/nhentaiDetailRoutes');
const nhentaiReadDetailRoutes = require('./routes/nhentaiReadDetailRoutes');
const nhentaiSearchRoutes = require('./routes/nhentaiSearchRoutes');
const favoriteRoutes = require('./routes/favoriteRoutes');
const seoRoutes = require('./routes/seoRoutes');
const authRoutes = require('./routes/authRoutes');

app.use('/', homeRoutes);
app.use('/auth', authRoutes);
app.use('/manga', mangaRoutes);
app.use('/api/search', searchRoutes);
app.use('/nhentai/search', nhentaiSearchRoutes);
app.use('/chapter', chapterRoutes);
app.use('/popular', popularRoutes);
app.use('/genre', genreRoutes);
app.use('/latest', latestRoutes);
app.use('/doujin', doujinRoutes);
app.use('/doujin', doujinDetailRoutes);
app.use('/doujin', doujinChapterRoutes);
app.use('/nhentai', (req, res, next) => {
    if (maintenanceConfig.nhentai) {
        return res.render('nhentai/maintenance', {
            title: 'Nhentai Maintenance - Komikkuya',
            layout: 'layouts/main'
        });
    }
    next();
});
app.use('/nhentai', nhentaiRoutes);
app.use('/nhentai', nhentaiDetailRoutes);
app.use('/nhentai', nhentaiReadDetailRoutes);
app.use('/', legalRoutes);
app.use('/history', historyRoutes);
app.use('/favorites', favoriteRoutes);
app.use('/', seoRoutes);

// Settings redirect (for Discord link callback from backend)
app.get('/settings', (req, res) => {
    const queryString = Object.keys(req.query).length > 0
        ? '?' + new URLSearchParams(req.query).toString()
        : '';
    res.redirect('/auth/dashboard' + queryString);
});

// Public user profile route
app.get('/user/:userId', (req, res) => {
    res.render('user/profile', {
        title: 'User Profile - Komikkuya',
        userId: req.params.userId
    });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);

    // Determine error status and message
    const status = err.status || 500;
    const message = err.message || 'Something went wrong!';

    res.status(status).render('error', {
        title: `${status} - Komikkuya`,
        error: {
            status: status,
            message: message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
});

// Handle 404 errors - this should be the last route
app.use((req, res) => {
    res.status(404).render('error', {
        title: '404 - Komikkuya',
        error: {
            status: 404,
            message: 'Page Not Found'
        }
    });
});

// Console commands for user statistics
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Function to analyze IP log file
function analyzeIpLogs() {
    if (!fs.existsSync(debugConfig.ipLogFile)) {
        console.log('\x1b[33m%s\x1b[0m', 'No IP log file found. Start logging to generate statistics.');
        return;
    }

    const logContent = fs.readFileSync(debugConfig.ipLogFile, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim() !== '');

    // Count unique IPs
    const uniqueIps = new Set();
    const ipCounts = {};
    const ipLastSeen = {};

    lines.forEach(line => {
        const parts = line.split(' - ');
        if (parts.length === 2) {
            const timestamp = parts[0];
            const ip = parts[1];

            uniqueIps.add(ip);

            // Count occurrences of each IP
            ipCounts[ip] = (ipCounts[ip] || 0) + 1;

            // Track last seen time
            ipLastSeen[ip] = timestamp;
        }
    });

    // Display statistics
    console.log('\n\x1b[36m===== USER STATISTICS =====\x1b[0m');
    console.log(`\x1b[32mTotal unique users (IPs): ${uniqueIps.size}\x1b[0m`);
    console.log(`\x1b[32mTotal log entries: ${lines.length}\x1b[0m`);

    // Show top 10 most active IPs
    console.log('\n\x1b[33mTop 10 most active users:\x1b[0m');
    const sortedIps = Object.entries(ipCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    sortedIps.forEach(([ip, count], index) => {
        console.log(`${index + 1}. IP: ${ip} - Requests: ${count} - Last seen: ${ipLastSeen[ip]}`);
    });
}

// Function to show all IPs
function showAllIps() {
    if (!fs.existsSync(debugConfig.ipLogFile)) {
        console.log('\x1b[33m%s\x1b[0m', 'No IP log file found.');
        return;
    }

    const logContent = fs.readFileSync(debugConfig.ipLogFile, 'utf8');
    const lines = logContent.split('\n').filter(line => line.trim() !== '');

    // Count unique IPs
    const uniqueIps = new Set();
    lines.forEach(line => {
        const parts = line.split(' - ');
        if (parts.length === 2) {
            const ip = parts[1];
            uniqueIps.add(ip);
        }
    });

    console.log('\n\x1b[36m===== ALL UNIQUE IPs =====\x1b[0m');
    console.log(`\x1b[32mTotal unique IPs: ${uniqueIps.size}\x1b[0m\n`);

    // Display all unique IPs
    Array.from(uniqueIps).sort().forEach((ip, index) => {
        console.log(`${index + 1}. ${ip}`);
    });
}

// Function to clear IP log file
function clearIpLogs() {
    if (!fs.existsSync(debugConfig.ipLogFile)) {
        console.log('\x1b[33m%s\x1b[0m', 'No IP log file found.');
        return;
    }

    fs.writeFileSync(debugConfig.ipLogFile, '');
    console.log('\x1b[32m%s\x1b[0m', 'IP log file cleared successfully.');
}

// Function to toggle logging
function toggleLogging() {
    debugConfig.enabled = !debugConfig.enabled;
    console.log(`\x1b[${debugConfig.enabled ? '32' : '31'}m%s\x1b[0m`,
        `Logging ${debugConfig.enabled ? 'enabled' : 'disabled'}.`);
}

// Function to toggle IP saving
function toggleIpSaving() {
    debugConfig.saveIpAddresses = !debugConfig.saveIpAddresses;
    console.log(`\x1b[${debugConfig.saveIpAddresses ? '32' : '31'}m%s\x1b[0m`,
        `IP address saving ${debugConfig.saveIpAddresses ? 'enabled' : 'disabled'}.`);
}

// Function to show help
function showHelp() {
    console.log('\n\x1b[36m===== AVAILABLE COMMANDS =====\x1b[0m');
    console.log('\x1b[33mstats\x1b[0m - Show user statistics');
    console.log('\x1b[33mips\x1b[0m - Show all unique IPs');
    console.log('\x1b[33mclear\x1b[0m - Clear IP log file');
    console.log('\x1b[33mtoggle-log\x1b[0m - Toggle logging on/off');
    console.log('\x1b[33mtoggle-save\x1b[0m - Toggle IP saving on/off');
    console.log('\x1b[33mhelp\x1b[0m - Show this help message');
    console.log('\x1b[33mexit\x1b[0m - Exit the command interface');
}

// Command handler
function handleCommand(command) {
    switch (command.trim().toLowerCase()) {
        case 'stats':
            analyzeIpLogs();
            break;
        case 'ips':
            showAllIps();
            break;
        case 'clear':
            clearIpLogs();
            break;
        case 'toggle-log':
            toggleLogging();
            break;
        case 'toggle-save':
            toggleIpSaving();
            break;
        case 'help':
            showHelp();
            break;
        case 'exit':
            rl.close();
            break;
        default:
            console.log('\x1b[31m%s\x1b[0m', 'Unknown command. Type "help" for available commands.');
    }
}

// Start command interface
console.log('\n\x1b[36m===== KOMIKKUYA DEBUG CONSOLE =====\x1b[0m');
console.log('\x1b[32m%s\x1b[0m', 'Type "help" for available commands.');
console.log('\x1b[32m%s\x1b[0m', 'Type "exit" to close this interface.');

rl.on('line', (input) => {
    handleCommand(input);
});

const PORT = process.env.PORT || 9123;
app.listen(PORT, () => {
    // Display ASCII art from ascii.txt
    try {
        const asciiArt = fs.readFileSync(path.join(__dirname, 'ascii.txt'), 'utf8');
        console.log('\x1b[35m%s\x1b[0m', asciiArt); // Display in magenta color
    } catch (err) {
        console.error('Error loading ASCII art:', err.message);
    }

    console.log(`\x1b[32mServer is running on port ${PORT}\x1b[0m`);
});

