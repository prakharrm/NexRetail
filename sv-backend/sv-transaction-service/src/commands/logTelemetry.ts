import type { Request, Response } from 'express';
import prisma from '../prisma.js';

// Persists telemetry events to database for OLAP ingestion
export const logAbandonedCart = async (req: Request, res: Response) => {
  try {
    const { storeId, cashierId, items, totalValue, reason } = req.body;

    const event = await prisma.abandonedCart.create({
      data: {
        storeId,
        cashierId,
        items, // JSON array of cart items
        itemCount: items.length,
        totalValue,
        reason: reason ?? null,
      }
    });

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to log abandoned cart' });
  }
};

export const logSearchFailure = async (req: Request, res: Response) => {
  try {
    const { storeId, cashierId, searchQuery, searchType } = req.body;

    const event = await prisma.searchFailure.create({
      data: {
        storeId,
        cashierId,
        searchQuery,
        searchType: searchType ?? 'NAME',
      }
    });

    res.status(200).json({ success: true, event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to log search failure' });
  }
};
