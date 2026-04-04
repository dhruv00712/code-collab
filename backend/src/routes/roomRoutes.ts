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
      .select('roomId language lastActivity updatedAt') // only return needed fields
      .limit(50); // cap at 50 rooms

    res.json(rooms);
  } catch (error) {
    console.error('❌ Failed to fetch rooms:', error);
    res.status(500).json({ message: 'Failed to load room history' });
  }
});

export default router;