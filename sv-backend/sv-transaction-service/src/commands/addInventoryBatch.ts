import type { Request, Response } from 'express';
import type { AddInventoryPayload } from '@sv/shared';
import prisma from '../prisma.js';

export const addInventoryBatch = async (req: Request, res: Response) => {
  try {
    const payload = req.body as AddInventoryPayload;
    const { productId, storeId, quantity, costPrice, expiresAt, notes } = payload;

    const result = await prisma.$transaction(async (tx) => {
      // Create the batch
      const batch = await tx.inventoryBatch.create({
        data: {
          productId,
          storeId,
          quantityReceived: quantity,
          quantityRemaining: quantity,
          wholesalePrice: costPrice ?? 0,
          expiryDate: expiresAt ? new Date(expiresAt) : null,
        }
      });

      // Update the aggregate totalQuantity on the Product
      await tx.product.update({
        where: { id: productId },
        data: { totalQuantity: { increment: quantity } }
      });

      // Log the inventory change
      await tx.inventoryLog.create({
        data: {
          storeId,
          productId,
          batchId: batch.id,
          changeAmount: quantity,
          reason: 'RESTOCK',
          notes: notes || `Batch arrived. Wholesale price: ${costPrice ?? 0}`,
        }
      });

      return batch;
    });

    res.status(201).json({ success: true, batch: result });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to add inventory batch' });
  }
};
