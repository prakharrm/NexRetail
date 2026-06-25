import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const updateProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.product.update({
      where: { id: id as string },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.price !== undefined && { price: data.price }),
        ...(data.minPrice !== undefined && { minPrice: data.minPrice }),
        ...(data.minQuantity !== undefined && { minQuantity: data.minQuantity }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
      }
    });

    res.status(200).json({ success: true, product: updated });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to update product' });
  }
};
