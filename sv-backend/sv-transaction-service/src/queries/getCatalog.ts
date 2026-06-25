import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getCatalog = async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;

    const products = await prisma.product.findMany({
      where: {
        storeId,
        isActive: true,
        ...(category ? { category } : {}),
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch catalog' });
  }
};
