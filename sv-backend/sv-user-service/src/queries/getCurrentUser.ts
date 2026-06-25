import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    // TODO: Extract userId from JWT middleware (req.user.userId)
    const userId = req.query.userId as string;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        store: { select: { id: true, name: true, address: true, phone: true } },
      }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
};
