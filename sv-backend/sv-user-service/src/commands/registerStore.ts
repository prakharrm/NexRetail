import type { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { RegisterStorePayload } from '@sv/shared';
import prisma from '../prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'nexretail-dev-secret';

export const registerStore = async (req: Request, res: Response) => {
  try {
    const payload = req.body as RegisterStorePayload;
    const { ownerName, email, password, storeName, storeAddress, storePhone } = payload;

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Store and Owner in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: {
          name: storeName,
          address: storeAddress ?? null,
          phone: storePhone ?? null,
        }
      });

      const owner = await tx.user.create({
        data: {
          storeId: store.id,
          name: ownerName,
          email,
          hashedPassword,
          role: 'OWNER',
        }
      });

      return { store, owner };
    });

    const token = jwt.sign(
      { userId: result.owner.id, storeId: result.store.id, role: 'OWNER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: { id: result.owner.id, name: result.owner.name, email: result.owner.email, role: 'OWNER' },
      store: { id: result.store.id, name: result.store.name },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to register store' });
  }
};
