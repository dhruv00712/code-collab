import express from 'express';
import Room from '../models/Room';

const router = express.Router();

// GET /api/rooms/:userId → return all rooms where user is a participant
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const rooms = await Room.find({ participants: userId }).sort({ updatedAt: -1 });
    res.json(rooms);
  } catch (error) {
    console.error('❌ Failed to fetch rooms:', error);
    res.status(500).json({ message: 'Failed to load room history.' });
  }
});

export default router;
