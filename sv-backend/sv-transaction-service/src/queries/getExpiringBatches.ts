import type { Request, Response } from 'express';
import prisma from '../prisma.js';

// Get batches expiring within N days
export const getExpiringBatches = async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    const days = parseInt(req.query.days as string) || 7;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        storeId,
        isActive: true,
        quantityRemaining: { gt: 0 },
        expiryDate: { lte: cutoff, not: null },
      },
      include: { product: { select: { name: true, barcode: true, category: true } } },
      orderBy: { expiryDate: 'asc' }
    });

    res.status(200).json({ success: true, data: batches });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch expiring batches' });
  }
};
