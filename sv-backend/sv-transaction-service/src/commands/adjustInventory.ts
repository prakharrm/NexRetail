import type { Request, Response } from 'express';
import prisma from '../prisma.js';

// Manual inventory adjustment for shrinkage (expired, damaged, theft)
export const adjustInventory = async (req: Request, res: Response) => {
  try {
    const { storeId, productId, batchId, changeAmount, reason, notes } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Update the aggregate product quantity
      await tx.product.update({
        where: { id: productId },
        data: { totalQuantity: { increment: changeAmount } } // changeAmount is negative for losses
      });

      // If a specific batch is referenced, update it too
      if (batchId) {
        await tx.inventoryBatch.update({
          where: { id: batchId },
          data: { quantityRemaining: { increment: changeAmount } }
        });
      }

      // Log the change with reason
      const log = await tx.inventoryLog.create({
        data: {
          storeId,
          productId,
          batchId: batchId ?? null,
          changeAmount,
          reason, // EXPIRED, DAMAGED, THEFT, UNKNOWN
          notes: notes ?? null,
        }
      });

      return log;
    });

    res.status(200).json({ success: true, log: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to adjust inventory' });
  }
};
