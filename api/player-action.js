// Inside your player-action.js file

// --- HOST ACTIONS ---
if (action === 'RESET_ALL') {
  const lockKeys = await redis.keys(`lock:${normRoom}:*`);
  if (lockKeys.length > 0) await redis.del(...lockKeys);
  
  await redis.del(`votes:${normRoom}`);
  await redis.del(`votetimes:${normRoom}`); // <-- Add this: Clear timestamps
  await redis.del(`sheriffs:${normRoom}`);
  return res.status(200).json({ success: true });
}

if (action === 'CLEAR_VOTES') {
  await redis.del(`votes:${normRoom}`);
  await redis.del(`votetimes:${normRoom}`); // <-- Add this: Clear timestamps
  return res.status(200).json({ success: true });
}

// ... (skip down to the VOTE action segment) ...

// Process secure voting action
if (action === 'VOTE') {
  if (!target) {
    await redis.hdel(`votes:${normRoom}`, normPlayer);
    await redis.hdel(`votetimes:${normRoom}`, normPlayer); // <-- Add this: Remove timestamp
  } else {
    await redis.hset(`votes:${normRoom}`, { [normPlayer]: target.trim() });
    await redis.hset(`votetimes:${normRoom}`, { [normPlayer]: Date.now() }); // <-- Add this: Save vote time
  }
  return res.status(200).json({ success: true });
}
