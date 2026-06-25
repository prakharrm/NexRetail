import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getProductVariants = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const variants = await prisma.product.findMany({
      where: {
        parentProductId: id as string,
        isActive: true,
      }
    });

    res.status(200).json({ success: true, data: variants });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch variants' });
  }
};
