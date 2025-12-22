const io = require("socket.io-client");

// Test connection with different configurations
function testConnection(config, name) {
  console.log(`\n=== Testing ${name} ===`);

  const socket = io("https://04ebc86d847b.ngrok-free.app", config);

  let connectionCount = 0;
  let disconnectCount = 0;
  let reconnectCount = 0;

  socket.on("connect", () => {
    connectionCount++;
    console.log(`[${name}] Connected (attempt ${connectionCount})`);

    // Join voting room
    socket.emit("join-voting", {
      participantId: `test-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`,
      name: `Test User ${name}`,
    });
  });

  socket.on("disconnect", (reason) => {
    disconnectCount++;
    console.log(`[${name}] Disconnected (${disconnectCount}): ${reason}`);
  });

  socket.on("reconnect", (attemptNumber) => {
    reconnectCount++;
    console.log(
      `[${name}] Reconnected after ${attemptNumber} attempts (total reconnects: ${reconnectCount})`
    );
  });

  socket.on("reconnect_error", (error) => {
    console.log(`[${name}] Reconnection error:`, error);
  });

  socket.on("reconnect_failed", () => {
    console.log(`[${name}] Reconnection failed after all attempts`);
  });

  socket.on("connect_error", (error) => {
    console.log(`[${name}] Connection error:`, error);
  });

  socket.on("participant-info", (data) => {
    console.log(`[${name}] Received participant info:`, data);
  });

  // Test disconnect after 10 seconds
  setTimeout(() => {
    console.log(`[${name}] Testing disconnect...`);
    socket.disconnect();
  }, 10000);

  // Test reconnect after 15 seconds
  setTimeout(() => {
    console.log(`[${name}] Testing reconnect...`);
    socket.connect();
  }, 15000);

  // Close after 30 seconds
  setTimeout(() => {
    console.log(`[${name}] Closing test...`);
    socket.close();
  }, 30000);

  return socket;
}

// Test different configurations
const configs = [
  {
    name: "Default Settings",
    config: {},
  },
  {
    name: "Conservative Reconnection",
    config: {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 15000,
      timeout: 30000,
    },
  },
  {
    name: "Aggressive Reconnection",
    config: {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    },
  },
];

console.log("Starting connection tests...");
console.log("Server URL: https://04ebc86d847b.ngrok-free.app");

const sockets = configs.map(({ name, config }) => testConnection(config, name));

// Cleanup on exit
process.on("SIGINT", () => {
  console.log("\nCleaning up...");
  sockets.forEach((socket) => {
    if (socket && socket.connected) {
      socket.close();
    }
  });
  process.exit(0);
});

console.log("\nTests running... Press Ctrl+C to stop");
