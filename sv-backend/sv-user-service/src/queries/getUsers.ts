import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getUsers = async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    // TODO: Verify the requesting user is an OWNER via JWT middleware

    const users = await prisma.user.findMany({
      where: { storeId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      }
    });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch users' });
  }
};
