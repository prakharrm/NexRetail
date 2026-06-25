import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getLowStock = async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;

    // Prisma doesn't support comparing two columns directly,
    // so we fetch active products and filter in the application layer
    const allProducts = await prisma.product.findMany({
      where: { storeId, isActive: true },
      orderBy: { totalQuantity: 'asc' }
    });

    const lowStock = allProducts.filter(p => p.totalQuantity <= p.minQuantity);

    res.status(200).json({ success: true, data: lowStock });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch low stock products' });
  }
};
