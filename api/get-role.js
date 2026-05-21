// Make sure this is at the top of your file, NOT inside the app.get function!
const sessionLocks = {}; 

app.get('/api/get-role', (req, res) => {
    try {
        // 1. Safely extract variables (ensure you only declare this ONCE in this route)
        const { roomCode, playerName, deviceId } = req.query;
        
        // 2. Safety Check: Prevent server crash if data is missing
        if (!roomCode || !playerName || !deviceId) {
            return res.status(400).json({ error: "Missing connection data." });
        }

        // 3. Normalize the lock key securely
        const lockKey = `${roomCode.toUpperCase()}_${playerName.toLowerCase().trim()}`;

        // 4. --- THE DIBS LOGIC ---
        if (!sessionLocks[lockKey]) {
            sessionLocks[lockKey] = deviceId; 
        } else if (sessionLocks[lockKey] !== deviceId) {
            return res.status(403).json({ error: "This name is already connected on another device!" });
        }

        // 5. --- YOUR EXISTING LOGIC GOES HERE ---
        // (Don't forget this part! You still need to look up the player 
        // in your roundsData and send their role back via res.json({...}))

    } catch (error) {
        // This stops the server from shutting down if something goes wrong
        console.error("Server error in get-role:", error);
        res.status(500).json({ error: "Backend crash prevented." });
    }
});
