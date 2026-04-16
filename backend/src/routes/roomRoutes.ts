// import express from 'express';
// import Room from '../models/Room';

// const router = express.Router();

// // return all rooms where user is a participant
// router.get('/:userId', async (req, res) => {
//   const { userId } = req.params;

//   try {
//     const rooms = await Room.find({ participants: userId }).sort({ updatedAt: -1 });
//     res.json(rooms);
//   } catch (error) {
//     console.error('❌ Failed to fetch rooms:', error);
//     res.status(500).json({ message: 'Failed to load room history.' });
//   }
// });

// export default router;

import express from 'express';
import Room from '../models/Room';
import { authenticateToken } from '../middlewares/authMiddleware';
import { AuthenticatedRequest } from '../types/custom';

const router = express.Router();

// Protected - only authenticated users can see room history
router.get('/:userId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { userId } = req.params;

  // Prevent users from accessing other users' room history
  if (req.user !== userId) {
    res.status(403).json({ message: 'Forbidden' });
    return;
  }

  try {
    const rooms = await Room.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .select('roomId language lastActivity updatedAt createdBy files') // include createdBy + files
      .limit(50);

    res.json(rooms);
  } catch (error) {
    console.error('❌ Failed to fetch rooms:', error);
    res.status(500).json({ message: 'Failed to load room history' });
  }
});

// DELETE /api/rooms/:roomId — creator deletes the whole room, participant removes themselves
router.delete('/:roomId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  const { roomId } = req.params;
  const userId = req.user;

  try {
    const room = await Room.findOne({ roomId });

    if (!room) {
      res.status(404).json({ message: 'Room not found' });
      return;
    }

    // Creator: delete the room entirely
    if (room.createdBy === userId) {
      await Room.deleteOne({ roomId });
      res.json({ message: 'Room deleted', action: 'deleted' });
      return;
    }

    // Participant (not creator): remove only themselves
    if (!room.participants.includes(String(userId))) {
      res.status(403).json({ message: 'You are not a participant of this room' });
      return;
    }

    await Room.findOneAndUpdate(
      { roomId },
      { $pull: { participants: userId } }
    );

    res.json({ message: 'Removed from room', action: 'left' });
  } catch (error) {
    console.error('❌ Failed to delete/leave room:', error);
    res.status(500).json({ message: 'Failed to process request' });
  }
});

export default router;