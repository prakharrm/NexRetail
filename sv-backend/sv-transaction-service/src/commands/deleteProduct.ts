import type { Request, Response } from 'express';
import prisma from '../prisma.js';

// Soft delete — sets isActive to false instead of removing data
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deleted = await prisma.product.update({
      where: { id: id as string },
      data: { isActive: false }
    });

    res.status(200).json({ success: true, product: deleted });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to delete product' });
  }
};
