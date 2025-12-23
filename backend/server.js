const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");
const csv = require("csv-parser");
const os = require("os");

/**
 * Get the local IP address of the machine
 * Prioritizes real network adapters (WiFi/Ethernet) over virtual adapters
 */
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === "IPv4" && !iface.internal) {
        const ip = iface.address;

        // Prioritize common local network ranges
        // 192.168.x.x (most common home/office networks)
        if (ip.startsWith("192.168.")) {
          candidates.unshift({ ip, priority: 1, name }); // Highest priority
        }
        // 10.x.x.x (corporate networks)
        else if (ip.startsWith("10.")) {
          candidates.push({ ip, priority: 2, name });
        }
        // Skip 172.16-31.x.x (often Docker/WSL/VirtualBox)
        else if (ip.startsWith("172.")) {
          const secondOctet = parseInt(ip.split(".")[1]);
          if (secondOctet >= 16 && secondOctet <= 31) {
            candidates.push({ ip, priority: 4, name }); // Low priority (likely virtual)
          } else {
            candidates.push({ ip, priority: 3, name });
          }
        }
        // Any other private IP
        else {
          candidates.push({ ip, priority: 5, name });
        }
      }
    }
  }

  // Sort by priority and return the best match
  candidates.sort((a, b) => a.priority - b.priority);

  if (candidates.length > 0) {
    console.log(`Detected network interfaces:`, candidates.map(c => `${c.name}: ${c.ip}`));
    console.log(`Selected IP: ${candidates[0].ip} (${candidates[0].name})`);
    return candidates[0].ip;
  }

  return "localhost";
}

const app = express();
const server = http.createServer(app);

// CORS configuration - Allow Vercel frontend
const corsOptions = {
  origin: [
    'https://live-voting-gritgags.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
};

const io = socketIo(server, {
  cors: corsOptions,
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
  allowEIO3: true,
  maxHttpBufferSize: 1e8,
});

app.use(cors(corsOptions));
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../out")));

// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../out/index.html"));
});

// Serve participant page
app.get("/participant", (req, res) => {
  res.sendFile(path.join(__dirname, "../out/participant/index.html"));
});

// Serve admin page
app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "../out/admin/index.html"));
});

// Database setup
const db = new sqlite3.Database("./voting.db");

// Initialize database tables
db.serialize(() => {
  // Drop and recreate categories table to ensure proper schema
  db.run(`DROP TABLE IF EXISTS categories`);
  db.run(`CREATE TABLE categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    options TEXT,
    active BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id TEXT,
    option TEXT NOT NULL,
    participant_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories (id)
  )`);

  db.run(
    `CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    name TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`,
    (err) => {
      if (err) {
        console.error("Error creating participants table:", err);
      } else {
        console.log("Database tables created successfully");
        // Load awards after tables are created
        loadAwardsFromCSV();
      }
    }
  );
});

// Read awards from CSV and create categories
function loadAwardsFromCSV() {
  console.log("Starting to load awards from CSV...");
  const awards = [];
  const csvPath = path.join(__dirname, "../awards.csv");

  console.log("CSV path:", csvPath);
  console.log("CSV file exists:", fs.existsSync(csvPath));

  if (fs.existsSync(csvPath)) {
    fs.createReadStream(csvPath)
      .pipe(csv())
      .on("data", (row) => {
        console.log("Processing CSV row:", row);
        const awardTitle = row["Award Title"];
        if (awardTitle && awardTitle.trim() !== "") {
          // Extract participant names (all columns except 'Award Title' and 'Description')
          const participants = Object.keys(row).filter(
            (key) => key !== "Award Title" && key !== "Description"
          );

          console.log(
            "Extracted participants for",
            awardTitle,
            ":",
            participants
          );

          awards.push({
            id: awardTitle.toLowerCase().replace(/[^a-z0-9]/g, "-"),
            title: awardTitle,
            description:
              row["Description"] ||
              `Vote for the team member who best fits this award!`,
            options: participants,
          });
        }
      })
      .on("end", () => {
        console.log("Finished reading CSV. Total awards:", awards.length);
        // Insert awards into database
        awards.forEach((award) => {
          db.run(
            `INSERT INTO categories (id, title, description, options) VALUES (?, ?, ?, ?)`,
            [
              award.id,
              award.title,
              award.description,
              JSON.stringify(award.options),
            ],
            (err) => {
              if (err) {
                console.error("Error inserting award:", award.title, err);
              } else {
                console.log("Inserted award:", award.title);
              }
            }
          );
        });

        // Verify insertion
        db.all(`SELECT COUNT(*) as count FROM categories`, (err, rows) => {
          if (err) {
            console.error("Error counting categories:", err);
          } else {
            console.log("Total categories in database:", rows[0].count);
          }
        });
      })
      .on("error", (err) => {
        console.error("Error reading CSV:", err);
      });
  } else {
    console.log("awards.csv not found, using default categories");
    // Fallback to default categories
    const defaultCategories = [
      {
        id: "best-dad-joke",
        title: "Best Dad Joke",
        description: "Who tells the most cringe-worthy jokes?",
        options: ["Option A", "Option B", "Option C", "Option D"],
      },
      {
        id: "coffee-addict",
        title: "Coffee Addict",
        description: "Who can't function without caffeine?",
        options: ["Option A", "Option B", "Option C", "Option D"],
      },
      {
        id: "meeting-master",
        title: "Meeting Master",
        description: "Who can make any meeting last forever?",
        options: ["Option A", "Option B", "Option C", "Option D"],
      },
    ];

    defaultCategories.forEach((category) => {
      db.run(
        `INSERT INTO categories (id, title, description, options) VALUES (?, ?, ?, ?)`,
        [
          category.id,
          category.title,
          category.description,
          JSON.stringify(category.options),
        ],
        (err) => {
          if (err) {
            console.error(
              "Error inserting default category:",
              category.title,
              err
            );
          } else {
            console.log("Inserted default category:", category.title);
          }
        }
      );
    });
  }
}

// Store active voting session with enhanced state
let currentVotingSession = null;
let participants = new Map();
let categories = new Map(); // Track category states
let participantVotes = new Map(); // Track participant votes per category
let deviceVotes = new Map(); // Track votes by device ID to prevent refresh-based duplicate voting
let connectionStats = {
  totalConnections: 0,
  peakConnections: 0,
  activeVotes: 0,
  lastVoteTime: null,
};

// Vote processing queue for high concurrency
let voteQueue = [];
let isProcessingVotes = false;

// Helper function to send admin status updates
function sendAdminStatusUpdate() {
  db.all(`SELECT * FROM categories ORDER BY created_at`, (err, rows) => {
    if (err) {
      console.error("Error fetching categories for admin update:", err);
      return;
    }

    const categoriesWithStatus = rows.map((category) => {
      const categoryState = categories.get(category.id) || {
        status: "not-started",
        voteCount: 0,
        results: {},
        revealed: false,
      };

      return {
        id: category.id,
        title: category.title,
        description: category.description,
        options: category.options ? JSON.parse(category.options) : [],
        completed:
          categoryState.status === "completed" ||
          categoryState.status === "revealed",
        results: categoryState.results,
        ...categoryState,
      };
    });

    io.to("admin-room").emit("admin-status", {
      currentSession: currentVotingSession,
      participantCount: participants.size,
      categories: categoriesWithStatus,
    });
  });
}

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  // Update connection stats
  connectionStats.totalConnections++;
  const currentConnections = io.engine.clientsCount;
  if (currentConnections > connectionStats.peakConnections) {
    connectionStats.peakConnections = currentConnections;
  }

  console.log(
    `Active connections: ${currentConnections}, Peak: ${connectionStats.peakConnections}`
  );

  // Add error handling for socket
  socket.on("error", (error) => {
    console.error("Socket error for", socket.id, ":", error);
  });

  // Add connection error handling
  socket.on("connect_error", (error) => {
    console.error("Socket connection error for", socket.id, ":", error);
  });

  // Join voting room
  socket.on("join-voting", (data) => {
    const participantId = data.participantId || uuidv4();
    const participantName =
      data.name || `Participant ${participantId.slice(0, 8)}`;

    // Check if participant is already in the room
    if (participants.has(participantId)) {
      console.log(
        `Participant ${participantId} already in room, updating socket ID`
      );
      const existingParticipant = participants.get(participantId);

      // Clean up old socket if it exists
      if (
        existingParticipant.socketId &&
        existingParticipant.socketId !== socket.id
      ) {
        console.log(
          `Cleaning up old socket ${existingParticipant.socketId} for participant ${participantId}`
        );
        // The old socket will be cleaned up when it disconnects
      }

      existingParticipant.socketId = socket.id;
      socket.participantId = participantId;
      socket.join("voting-room");

      // Send current status to the reconnecting participant
      if (currentVotingSession) {
        const participantSession = {
          ...currentVotingSession,
          results: {}, // Hide results from participants
        };
        socket.emit("voting-session-update", participantSession);
      }

      socket.emit("participant-info", {
        id: participantId,
        name: existingParticipant.name,
      });

      socket.emit("participant-count", participants.size);
      return;
    }

    console.log(
      `Participant ${participantId} (${participantName}) joining voting room`
    );

    participants.set(participantId, {
      id: participantId,
      name: participantName,
      socketId: socket.id,
      hasVoted: false,
      currentCategoryId: null,
      viewState: "waiting",
    });

    socket.participantId = participantId;
    socket.join("voting-room");

    // Send current voting session status (participant view - no results)
    if (currentVotingSession) {
      const participantSession = {
        ...currentVotingSession,
        results: {}, // Hide results from participants
      };
      socket.emit("voting-session-update", participantSession);
    }

    // Send participant info
    socket.emit("participant-info", {
      id: participantId,
      name: participantName,
    });

    // Update admin with participant count
    io.to("admin-room").emit("participant-count", participants.size);

    // Also send participant count to the joining participant
    socket.emit("participant-count", participants.size);

    console.log(`Total participants after join: ${participants.size}`);
  });

  // Handle participant count requests
  socket.on("request-participant-count", () => {
    socket.emit("participant-count", participants.size);
  });

  // Handle voting status requests
  socket.on("request-voting-status", () => {
    if (currentVotingSession) {
      const participantSession = {
        ...currentVotingSession,
        results: {}, // Hide results from participants
      };
      socket.emit("voting-status", participantSession);
    } else {
      socket.emit("voting-status", null);
    }
  });

  // Handle admin status requests
  socket.on("request-admin-status", () => {
    const adminStatus = {
      currentSession: currentVotingSession
        ? {
          ...currentVotingSession,
          results: {}, // Hide results from participants
        }
        : null,
      participantCount: participants.size,
      categories: Array.from(categories.values()).map((cat) => ({
        id: cat.id,
        title: cat.title,
        description: cat.description,
        status: cat.status,
        completed: cat.status === "completed",
      })),
    };
    socket.emit("admin-status", adminStatus);
  });

  // Submit vote with confirmation flow
  socket.on("submit-vote", (data) => {
    if (!currentVotingSession || currentVotingSession.phase !== "voting") {
      socket.emit("error", "No active voting session");
      return;
    }

    const { categoryId, option, deviceId } = data;
    const participantId = socket.participantId;

    // Validate device ID
    if (!deviceId) {
      socket.emit("error", "Device identification required");
      return;
    }

    // Check if this device already voted for this category (prevents refresh-based duplicate voting)
    const deviceVoteKey = `${deviceId}-${categoryId}`;
    if (deviceVotes.has(deviceVoteKey)) {
      socket.emit("error", "This device has already voted for this category");
      return;
    }

    // Check if participant already voted for this category
    const voteKey = `${participantId}-${categoryId}`;
    if (participantVotes.has(voteKey)) {
      socket.emit("error", "You have already voted for this category");
      return;
    }

    // Record the vote for both participant and device
    participantVotes.set(voteKey, {
      categoryId,
      option,
      participantId,
      deviceId,
      timestamp: Date.now(),
    });

    deviceVotes.set(deviceVoteKey, {
      categoryId,
      option,
      participantId,
      deviceId,
      timestamp: Date.now(),
    });

    // Add vote to queue for processing
    voteQueue.push({
      categoryId,
      option,
      participantId,
      timestamp: Date.now(),
    });

    // Update participant state
    const participant = participants.get(participantId);
    if (participant) {
      participant.hasVoted = true;
      participant.currentCategoryId = categoryId;
      participant.viewState = "voted";
    }

    // Process vote queue if not already processing
    if (!isProcessingVotes) {
      processVoteQueue();
    }

    // Confirm vote to participant (no results shown)
    socket.emit("vote-confirmed", {
      option,
      categoryId,
      message: "Vote submitted! Wait for the admin to begin the next category",
    });
  });

  // Admin joins admin room
  socket.on("join-admin", () => {
    socket.join("admin-room");

    // Send initial admin status
    sendAdminStatusUpdate();
  });

  // Start category voting (admin-controlled) - Updated for enhanced interface
  socket.on("start-category", (data) => {
    const { categoryId } = data;

    // Get category details
    db.get(
      `SELECT * FROM categories WHERE id = ?`,
      [categoryId],
      (err, category) => {
        if (err || !category) {
          socket.emit("error", "Category not found");
          return;
        }

        // Check if category is already active or completed
        const categoryState = categories.get(categoryId);
        if (
          categoryState &&
          (categoryState.status === "active" ||
            categoryState.status === "completed")
        ) {
          socket.emit("error", "Category is already active or completed");
          return;
        }

        // Check if another category is currently active
        if (currentVotingSession && currentVotingSession.active) {
          socket.emit(
            "error",
            "Another category is currently active. Please stop it first."
          );
          return;
        }

        // Start new session with admin-controlled state (no timers)
        currentVotingSession = {
          id: uuidv4(),
          categoryId: category.id,
          title: category.title,
          description: category.description,
          active: true,
          startTime: Date.now(),
          endTime: null, // Admin manually ends voting
          results: {},
          options: category.options
            ? JSON.parse(category.options)
            : ["Option A", "Option B", "Option C", "Option D"],
          phase: "voting",
          adminControlled: true,
        };

        // Update category state
        categories.set(categoryId, {
          status: "active",
          voteCount: 0,
          results: {},
          revealed: false,
          startedAt: Date.now(),
        });

        // Reset participant states for new category
        participants.forEach((participant) => {
          participant.hasVoted = false;
          participant.currentCategoryId = categoryId;
          participant.viewState = "voting";
        });

        // Broadcast to participants (without results)
        const participantSession = {
          ...currentVotingSession,
          results: {}, // Hide results from participants
        };
        io.to("voting-room").emit("category-started", participantSession);

        // Broadcast to admin (with full data including enhanced state)
        io.to("admin-room").emit("category-started", currentVotingSession);

        // Send updated admin status with all categories
        sendAdminStatusUpdate();
      }
    );
  });

  // Stop category voting (admin-controlled) - Updated for enhanced interface
  socket.on("stop-category", (data) => {
    const { categoryId } = data;

    if (
      !currentVotingSession ||
      currentVotingSession.categoryId !== categoryId
    ) {
      socket.emit("error", "No active session for this category");
      return;
    }

    // End the voting session
    currentVotingSession.active = false;
    currentVotingSession.phase = "completed";
    currentVotingSession.endTime = Date.now();

    // Update category state
    const categoryState = categories.get(categoryId);
    if (categoryState) {
      categoryState.status = "completed";
      categoryState.completedAt = Date.now();
      categoryState.results = { ...currentVotingSession.results };
      categoryState.voteCount = Object.values(
        currentVotingSession.results
      ).reduce((sum, count) => sum + count, 0);
    }

    // Update participant states
    participants.forEach((participant) => {
      if (participant.currentCategoryId === categoryId) {
        participant.viewState = "waiting";
      }
    });

    // Broadcast to participants (still no results)
    const participantSession = {
      ...currentVotingSession,
      results: {},
    };
    io.to("voting-room").emit("category-stopped", participantSession);

    // Broadcast to admin (with results)
    io.to("admin-room").emit("category-stopped", currentVotingSession);

    // Send updated admin status with all categories
    sendAdminStatusUpdate();
  });

  // Reveal winner (admin-controlled)
  socket.on("reveal-winner", (data) => {
    const { categoryId } = data;

    const categoryState = categories.get(categoryId);
    if (!categoryState || categoryState.status !== "completed") {
      socket.emit(
        "error",
        "Category must be completed before revealing winner"
      );
      return;
    }

    if (categoryState.revealed) {
      socket.emit("error", "Winner already revealed for this category");
      return;
    }

    // Calculate winner
    const results = categoryState.results;
    const maxVotes = Math.max(...Object.values(results));
    const winners = Object.keys(results).filter(
      (option) => results[option] === maxVotes
    );

    const categoryResult = {
      categoryId,
      title: currentVotingSession?.title || "Unknown Category",
      description: currentVotingSession?.description || "",
      results,
      winner: winners.length === 1 ? winners[0] : winners,
      totalVotes: Object.values(results).reduce((sum, count) => sum + count, 0),
      revealed: true,
      revealedAt: Date.now(),
    };

    // Update category state
    categoryState.revealed = true;
    categoryState.revealedAt = Date.now();
    categoryState.status = "revealed";

    // Broadcast winner reveal to all clients
    io.emit("winner-revealed", categoryResult);
  });

  // Legacy support for backward compatibility
  socket.on("start-voting", (data) => {
    // Handle legacy start-voting by triggering start-category logic
    const { categoryId } = data;

    // Get category details
    db.get(
      `SELECT * FROM categories WHERE id = ?`,
      [categoryId],
      (err, category) => {
        if (err || !category) {
          socket.emit("error", "Category not found");
          return;
        }

        // Check if category is already active or completed
        const categoryState = categories.get(categoryId);
        if (
          categoryState &&
          (categoryState.status === "active" ||
            categoryState.status === "completed")
        ) {
          socket.emit("error", "Category is already active or completed");
          return;
        }

        // Check if another category is currently active
        if (currentVotingSession && currentVotingSession.active) {
          socket.emit(
            "error",
            "Another category is currently active. Please stop it first."
          );
          return;
        }

        // Clear previous session if any
        if (votingTimer) {
          clearTimeout(votingTimer);
        }

        // Start new session with enhanced state
        currentVotingSession = {
          id: uuidv4(),
          categoryId: category.id,
          title: category.title,
          description: category.description,
          active: true,
          startTime: Date.now(),
          endTime: null,
          results: {},
          options: category.options
            ? JSON.parse(category.options)
            : ["Option A", "Option B", "Option C", "Option D"],
          phase: "voting",
          adminControlled: true,
        };

        // Update category state
        categories.set(categoryId, {
          status: "active",
          voteCount: 0,
          results: {},
          revealed: false,
          startedAt: Date.now(),
        });

        // Reset participant states for new category
        participants.forEach((participant) => {
          participant.hasVoted = false;
          participant.currentCategoryId = categoryId;
          participant.viewState = "voting";
        });

        // Broadcast to participants (without results)
        const participantSession = {
          ...currentVotingSession,
          results: {},
        };
        io.to("voting-room").emit("voting-started", participantSession);

        // Broadcast to admin (with full data including enhanced state)
        io.to("admin-room").emit("voting-started", currentVotingSession);

        // Send updated admin status with all categories
        sendAdminStatusUpdate();
      }
    );
  });

  socket.on("end-voting", () => {
    // Handle legacy end-voting by stopping current category
    if (currentVotingSession && currentVotingSession.active) {
      const categoryId = currentVotingSession.categoryId;

      // End the voting session
      currentVotingSession.active = false;
      currentVotingSession.phase = "completed";
      currentVotingSession.endTime = Date.now();

      // Update category state
      const categoryState = categories.get(categoryId);
      if (categoryState) {
        categoryState.status = "completed";
        categoryState.completedAt = Date.now();
        categoryState.results = { ...currentVotingSession.results };
        categoryState.voteCount = Object.values(
          currentVotingSession.results
        ).reduce((sum, count) => sum + count, 0);
      }

      // Update participant states
      participants.forEach((participant) => {
        if (participant.currentCategoryId === categoryId) {
          participant.viewState = "waiting";
        }
      });

      // Broadcast to participants (still no results)
      const participantSession = {
        ...currentVotingSession,
        results: {},
      };
      io.to("voting-room").emit("voting-ended", participantSession);

      // Broadcast to admin (with results)
      io.to("admin-room").emit("voting-ended", currentVotingSession);

      // Send updated admin status
      sendAdminStatusUpdate();
    }
  });

  // Disconnect handling
  socket.on("disconnect", (reason) => {
    console.log("Client disconnected:", socket.id, "Reason:", reason);

    if (socket.participantId) {
      console.log(
        `Removing participant ${socket.participantId} from participants list`
      );
      participants.delete(socket.participantId);
      io.to("admin-room").emit("participant-count", participants.size);
      console.log(`Total participants after disconnect: ${participants.size}`);
    }

    // Clean up any other socket references
    socket.removeAllListeners();

    console.log(`Remaining connections: ${io.engine.clientsCount}`);
  });
});

function endVotingSession() {
  if (currentVotingSession && currentVotingSession.active) {
    currentVotingSession.active = false;
    currentVotingSession.phase = "completed";
    currentVotingSession.endTime = Date.now();

    // Update category state
    const categoryState = categories.get(currentVotingSession.categoryId);
    if (categoryState) {
      categoryState.status = "completed";
      categoryState.completedAt = Date.now();
      categoryState.results = { ...currentVotingSession.results };
    }

    // Broadcast end of voting (separate for admin and participants)
    const participantSession = {
      ...currentVotingSession,
      results: {}, // Hide results from participants
    };
    io.to("voting-room").emit("category-stopped", participantSession);
    io.to("admin-room").emit("category-stopped", currentVotingSession);

    // Clear timer
    if (votingTimer) {
      clearTimeout(votingTimer);
      votingTimer = null;
    }
  }
}

// Process vote queue to handle high concurrency
async function processVoteQueue() {
  if (isProcessingVotes || voteQueue.length === 0) return;

  isProcessingVotes = true;
  connectionStats.activeVotes = voteQueue.length;

  try {
    // Process votes in batches of 10
    const batchSize = 10;
    const batch = voteQueue.splice(0, batchSize);

    console.log(`Processing ${batch.length} votes...`);

    // Process each vote in the batch
    for (const vote of batch) {
      const { categoryId, option, participantId } = vote;

      // Store vote in database
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT INTO votes (category_id, option, participant_id) VALUES (?, ?, ?)`,
          [categoryId, option, participantId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      // Update current session results
      if (!currentVotingSession.results[option]) {
        currentVotingSession.results[option] = 0;
      }
      currentVotingSession.results[option]++;

      connectionStats.lastVoteTime = Date.now();
    }

    // Update category vote count
    const categoryState = categories.get(currentVotingSession.categoryId);
    if (categoryState) {
      categoryState.voteCount = Object.values(
        currentVotingSession.results
      ).reduce((sum, count) => sum + count, 0);
      categoryState.results = { ...currentVotingSession.results };
    }

    // Broadcast updated results ONLY to admin (participants don't see live results)
    io.to("admin-room").emit("voting-results", currentVotingSession);

    // Send updated admin status to refresh real-time vote counts
    sendAdminStatusUpdate();

    console.log(
      `Processed ${batch.length} votes. Queue remaining: ${voteQueue.length}`
    );
  } catch (error) {
    console.error("Error processing votes:", error);
  } finally {
    connectionStats.activeVotes = voteQueue.length;
    isProcessingVotes = false;

    // Process remaining votes if any
    if (voteQueue.length > 0) {
      setTimeout(processVoteQueue, 50); // Small delay to prevent blocking
    }
  }
}

// API Routes
app.get("/api/categories", (req, res) => {
  db.all(`SELECT * FROM categories ORDER BY created_at`, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    // Enhance categories with current state
    const enhancedCategories = rows.map((category) => {
      const categoryState = categories.get(category.id) || {
        status: "not-started",
        voteCount: 0,
        results: {},
        revealed: false,
      };

      return {
        ...category,
        options: category.options ? JSON.parse(category.options) : [],
        ...categoryState,
      };
    });

    res.json(enhancedCategories);
  });
});

app.get("/api/results/:categoryId", (req, res) => {
  const { categoryId } = req.params;
  db.all(
    `SELECT option, COUNT(*) as count FROM votes WHERE category_id = ? GROUP BY option`,
    [categoryId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(rows);
    }
  );
});

app.get("/api/completed-categories", (req, res) => {
  // Get all categories that have votes
  db.all(`SELECT DISTINCT category_id FROM votes`, (err, categoryRows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    if (categoryRows.length === 0) {
      res.json([]);
      return;
    }

    // For each completed category, get the results
    const completedCategories = [];
    let processedCount = 0;

    categoryRows.forEach((categoryRow) => {
      db.all(
        `SELECT option, COUNT(*) as count FROM votes WHERE category_id = ? GROUP BY option`,
        [categoryRow.category_id],
        (err, resultRows) => {
          if (err) {
            console.error(
              "Error getting results for category:",
              categoryRow.category_id,
              err
            );
            processedCount++;
            if (processedCount === categoryRows.length) {
              res.json(completedCategories);
            }
            return;
          }

          // Convert results to the format expected by frontend
          const results = {};
          resultRows.forEach((row) => {
            results[row.option] = row.count;
          });

          completedCategories.push({
            categoryId: categoryRow.category_id,
            results: results,
          });

          processedCount++;
          if (processedCount === categoryRows.length) {
            res.json(completedCategories);
          }
        }
      );
    });
  });
});

app.get("/api/participants", (req, res) => {
  res.json(Array.from(participants.values()));
});

// Get current session state
app.get("/api/session", (req, res) => {
  res.json({
    currentSession: currentVotingSession,
    participantCount: participants.size,
    categories: Array.from(categories.entries()).map(([id, state]) => ({
      id,
      ...state,
    })),
  });
});

// Monitoring endpoint for connection stats
app.get("/api/stats", (req, res) => {
  res.json({
    currentConnections: io.engine.clientsCount,
    peakConnections: connectionStats.peakConnections,
    totalConnections: connectionStats.totalConnections,
    activeVotes: connectionStats.activeVotes,
    voteQueueLength: voteQueue.length,
    isProcessingVotes: isProcessingVotes,
    lastVoteTime: connectionStats.lastVoteTime,
    participantsCount: participants.size,
    currentSession: currentVotingSession
      ? {
        active: currentVotingSession.active,
        phase: currentVotingSession.phase,
        title: currentVotingSession.title,
        totalVotes: Object.values(currentVotingSession.results).reduce(
          (a, b) => a + b,
          0
        ),
      }
      : null,
    categoriesStatus: Array.from(categories.entries()).map(([id, state]) => ({
      id,
      status: state.status,
      voteCount: state.voteCount,
      revealed: state.revealed,
    })),
  });
});

// Reset database endpoint
app.post("/api/reset", (req, res) => {
  try {
    // Clear all votes
    db.run(`DELETE FROM votes`, (err) => {
      if (err) {
        console.error("Error clearing votes:", err);
        res.status(500).json({ error: "Failed to clear votes" });
        return;
      }

      // Clear all participants
      db.run(`DELETE FROM participants`, (err) => {
        if (err) {
          console.error("Error clearing participants:", err);
          res.status(500).json({ error: "Failed to clear participants" });
          return;
        }

        // Clear all categories
        db.run(`DELETE FROM categories`, (err) => {
          if (err) {
            console.error("Error clearing categories:", err);
            res.status(500).json({ error: "Failed to clear categories" });
            return;
          }

          // Reset current voting session and state
          currentVotingSession = null;
          if (votingTimer) {
            clearTimeout(votingTimer);
            votingTimer = null;
          }
          participants.clear();
          categories.clear();
          participantVotes.clear();

          // Reload awards from CSV to restore initial state
          loadAwardsFromCSV();

          console.log("Database reset successfully");
          res.json({ message: "Database reset successfully" });
        });
      });
    });
  } catch (error) {
    console.error("Error resetting database:", error);
    res.status(500).json({ error: "Internal server error during reset" });
  }
});

// Server info endpoint for dynamic IP detection
app.get("/api/server-info", (req, res) => {
  const localIp = getLocalIpAddress();
  res.json({
    ip: localIp,
    port: 3001,
    url: `http://${localIp}:3001`,
    timestamp: Date.now(),
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local network URL: http://${getLocalIpAddress()}:${PORT}`);
});
