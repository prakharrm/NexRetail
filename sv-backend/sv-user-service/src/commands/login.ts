import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { LoginPayload } from '@sv/shared';
import prisma from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexretail-dev-secret';

export const login = async (req: Request, res: Response) => {
  try {
    const payload = req.body as LoginPayload;
    const { email, password } = payload;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { store: { select: { id: true, name: true } } }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.hashedPassword);
    if (!passwordMatch) {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, storeId: user.storeId, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      store: user.store,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};
