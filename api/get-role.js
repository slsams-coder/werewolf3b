// 1. Add this at the top of your server file to store the locks
const sessionLocks = {}; // Example format: { "ABCD_ann": "device12345" }

// 2. Update your /api/get-role endpoint to check the Dibs lock
app.get('/api/get-role', (req, res) => {
    const { roomCode, playerName, deviceId } = req.query;
    
    // Normalize the lock key so capitalization doesn't bypass it
    const lockKey = `${roomCode.toUpperCase()}_${playerName.toLowerCase().trim()}`;

    // --- THE DIBS LOGIC ---
    if (!sessionLocks[lockKey]) {
        // If the name is unclaimed, this device claims it!
        sessionLocks[lockKey] = deviceId; 
    } else if (sessionLocks[lockKey] !== deviceId) {
        // If someone else already claimed it, reject them!
        return res.status(403).json({ error: "This name is already connected on another device!" });
    }
    // ----------------------

    // ... (Keep the rest of your existing logic to send back the player's role)
});

// 3. IMPORTANT: When the Host resets the game or generates a new room, clear the locks!
// Add this inside your '/api/player-action' endpoint under your 'RESET_ALL' action:
if (action === 'RESET_ALL') {
    Object.keys(sessionLocks).forEach(key => {
        if (key.startsWith(`${roomCode.toUpperCase()}_`)) {
            delete sessionLocks[key];
        }
    });
    // ... (Keep your existing reset logic)
}
