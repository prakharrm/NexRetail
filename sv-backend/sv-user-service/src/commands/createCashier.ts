import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../prisma.js';

export const createCashier = async (req: Request, res: Response) => {
  try {
    const { storeId, name, email, password } = req.body;
    // TODO: Verify the requesting user is an OWNER via JWT middleware

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const cashier = await prisma.user.create({
      data: {
        storeId,
        name,
        email,
        hashedPassword,
        role: 'CASHIER',
      }
    });

    res.status(201).json({
      success: true,
      cashier: { id: cashier.id, name: cashier.name, email: cashier.email, role: 'CASHIER' },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to create cashier' });
  }
};
