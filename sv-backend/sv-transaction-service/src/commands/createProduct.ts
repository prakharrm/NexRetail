import type { Request, Response } from 'express';
import type { CreateProductPayload } from '@sv/shared';
import prisma from '../prisma.js';

const generateSKU = () => `SV-SKU-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

export const createProduct = async (req: Request, res: Response) => {
  try {
    const payload = req.body as CreateProductPayload;
    const { storeId, category, name, barcode, imageUrl, parentProductId, variantName, price, minPrice, totalQuantity, minQuantity } = payload;

    const newProduct = await prisma.product.create({
      data: {
        storeId,
        category: category || 'Uncategorized',
        name,
        barcode: barcode && barcode.trim() !== '' ? barcode : generateSKU(),
        imageUrl: imageUrl ?? null,
        parentProductId: parentProductId ?? null,
        variantName: variantName ?? null,
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
