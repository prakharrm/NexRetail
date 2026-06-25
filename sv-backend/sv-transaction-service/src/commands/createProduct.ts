import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { storeId, category, name, barcode, imageUrl, parentProductId, variantName, price, minPrice, totalQuantity, minQuantity } = req.body;

    const newProduct = await prisma.product.create({
      data: {
        storeId,
        category: category || 'Uncategorized',
        name,
        barcode,
        imageUrl,
        parentProductId,
        variantName,
        price,
        minPrice: minPrice ?? price,
        totalQuantity: totalQuantity ?? 0,
        minQuantity: minQuantity ?? 0,
      }
    });

    res.status(201).json({ success: true, product: newProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to create product' });
  }
};
