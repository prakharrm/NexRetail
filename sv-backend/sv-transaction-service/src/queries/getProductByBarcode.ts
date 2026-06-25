import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getProductByBarcode = async (req: Request, res: Response) => {
  try {
    const { barcode } = req.params;

    const product = await prisma.product.findUnique({
      where: { barcode: barcode as string },
      include: {
        batches: {
          where: { isActive: true },
          orderBy: { expiryDate: 'asc' } // FIFO: oldest expiry first
        }
      }
    });

    if (!product || !product.isActive) {
      res.status(404).json({ success: false, error: 'Product not found' });
      return;
    }

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch product' });
  }
};
