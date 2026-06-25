import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const addInventoryBatch = async (req: Request, res: Response) => {
  try {
    const { productId, storeId, quantityReceived, wholesalePrice, manufacturedDate, expiryDate } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // Create the batch
      const batch = await tx.inventoryBatch.create({
        data: {
          productId,
          storeId,
          quantityReceived,
          quantityRemaining: quantityReceived,
          wholesalePrice,
          manufacturedDate: manufacturedDate ? new Date(manufacturedDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        }
      });

      // Update the aggregate totalQuantity on the Product
      await tx.product.update({
        where: { id: productId },
        data: { totalQuantity: { increment: quantityReceived } }
      });

      // Log the inventory change
      await tx.inventoryLog.create({
        data: {
          storeId,
          productId,
          batchId: batch.id,
          changeAmount: quantityReceived,
          reason: 'RESTOCK',
          notes: `Batch arrived. Wholesale price: ${wholesalePrice}`,
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
