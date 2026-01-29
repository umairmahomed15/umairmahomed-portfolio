// ============================================
// UMAIR MAHOMED PORTFOLIO BACKEND
// Render.com Deployment Ready
// ============================================

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Initialize Express app
const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// CORS Configuration for Render
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'file://',
    // Add your Render frontend URL here after deployment
    'https://umair-portfolio.onrender.com',
    'https://umair-mahomed.onrender.com'
];

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            // Allow all origins for now (update for production)
            console.log('Allowing origin:', origin);
            return callback(null, true);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    credentials: false
}));

// Parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from current directory
app.use(express.static(__dirname));

// ============================================
// FILE SYSTEM SETUP
// ============================================

// Create messages directory if it doesn't exist
const messagesDir = path.join(__dirname, 'messages');
if (!fs.existsSync(messagesDir)) {
    try {
        fs.mkdirSync(messagesDir, { recursive: true });
        console.log('📁 Created messages directory:', messagesDir);
    } catch (err) {
        console.log('⚠️  Could not create messages directory, using memory storage');
    }
}

// Memory storage as fallback
let messagesMemory = [];

// ============================================
// ROUTES
// ============================================

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: '✅ Portfolio Backend is healthy and running',
        status: 'active',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        endpoints: {
            contact: 'POST /api/contact',
            messages: 'GET /api/messages',
            health: 'GET /api/health'
        },
        deployment: 'Render.com'
    });
});

// ============================================
// CONTACT FORM ENDPOINT
// ============================================

app.post('/api/contact', (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validation
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: '❌ Please fill in all fields: name, email, and message'
            });
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: '❌ Please enter a valid email address'
            });
        }

        // Create message data
        const messageData = {
            id: Date.now(),
            name: name.trim(),
            email: email.trim(),
            message: message.trim(),
            timestamp: new Date().toISOString(),
            ip: req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress
        };

        // Save message (try file, fallback to memory)
        let savedTo = 'memory';
        
        try {
            // Try to save to file
            if (fs.existsSync(messagesDir)) {
                const safeName = name.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 20);
                const filename = `message_${Date.now()}_${safeName}.json`;
                const filepath = path.join(messagesDir, filename);
                
                fs.writeFileSync(filepath, JSON.stringify(messageData, null, 2), 'utf8');
                savedTo = 'file';
            } else {
                // Save to memory
                messagesMemory.push(messageData);
                // Keep only last 50 messages in memory
                if (messagesMemory.length > 50) {
                    messagesMemory.shift();
                }
            }
        } catch (fileError) {
            // Fallback to memory storage
            console.log('⚠️  File storage failed, using memory:', fileError.message);
            messagesMemory.push(messageData);
            if (messagesMemory.length > 50) {
                messagesMemory.shift();
            }
        }

        // Console output
        console.log('\n' + '═'.repeat(70));
        console.log('📩 ' + 'NEW CONTACT FORM SUBMISSION!');
        console.log('═'.repeat(70));
        console.log(`👤 Name: ${name}`);
        console.log(`📧 Email: ${email}`);
        console.log(`🕒 Time: ${new Date().toLocaleString()}`);
        console.log(`💬 Message: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
        console.log(`💾 Saved to: ${savedTo}`);
        console.log('═'.repeat(70) + '\n');

        // Success response
        res.json({
            success: true,
            message: '✅ Message received successfully! I\'ll get back to you soon.',
            data: {
                id: messageData.id,
                name: messageData.name,
                timestamp: new Date().toLocaleString(),
                storage: savedTo
            }
        });

    } catch (error) {
        console.error('🔥 Server Error:', error);
        res.status(500).json({
            success: false,
            message: '❌ Server error. Please try again or email me directly at umairmahomed15@gmail.com'
        });
    }
});

// ============================================
// VIEW ALL MESSAGES ENDPOINT
// ============================================

app.get('/api/messages', (req, res) => {
    try {
        let fileMessages = [];
        
        // Try to get messages from files
        if (fs.existsSync(messagesDir)) {
            try {
                const files = fs.readdirSync(messagesDir)
                    .filter(file => file.endsWith('.json'))
                    .sort((a, b) => b.localeCompare(a));

                fileMessages = files.map(file => {
                    try {
                        const filepath = path.join(messagesDir, file);
                        const data = fs.readFileSync(filepath, 'utf8');
                        return JSON.parse(data);
                    } catch (err) {
                        return null;
                    }
                }).filter(msg => msg !== null);
            } catch (error) {
                console.log('Error reading files:', error.message);
            }
        }

        // Combine file and memory messages
        const allMessages = [...fileMessages, ...messagesMemory]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 100);

        res.json({
            success: true,
            count: allMessages.length,
            messages: allMessages,
            storage: {
                fileCount: fileMessages.length,
                memoryCount: messagesMemory.length,
                environment: process.env.NODE_ENV || 'development'
            },
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error reading messages:', error);
        res.status(500).json({
            success: false,
            message: 'Error reading messages'
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 - Route not found
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('🔥 Global Error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log('\n' + '✨'.repeat(40));
    console.log('   UMAIR MAHOMED PORTFOLIO');
    console.log('✨'.repeat(40));
    console.log(`🚀 Server started on port: ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📝 Frontend: http://localhost:${PORT}`);
    console.log(`📧 Contact API: http://localhost:${PORT}/api/contact`);
    console.log('─'.repeat(80));
    console.log('✅ Ready for Render deployment!');
    console.log('✨'.repeat(40) + '\n');
});