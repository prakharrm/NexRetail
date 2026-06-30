import type { Request, Response } from 'express';
import type { BulkOnboardPayload } from '@sv/shared';
import prisma from '../prisma.js';

const generateSKU = () => `SV-SKU-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

// Onboard a product with multiple variants in a single API call
export const bulkOnboardProducts = async (req: Request, res: Response) => {
  try {
    const payload = req.body as BulkOnboardPayload;
    const { storeId, parentName, category, variants } = payload;
    
    // We need a parent price based on the first variant to fulfill Prisma's requirement
    const defaultPrice = variants[0]?.price ?? 0;

    const results = await prisma.$transaction(async (tx) => {
      // Create the parent product
      const parent = await tx.product.create({
        data: {
          storeId,
          category: category || 'Uncategorized',
          name: parentName,
          barcode: generateSKU(), // Parent product acts as a container, always auto-gen SKU
          imageUrl: null, // Or parentProduct.imageUrl if we added it to payload
          price: defaultPrice,
          minPrice: defaultPrice,
        }
      });

      // Create each variant linked to the parent
      const createdVariants = [];
      for (const variant of variants) {
        const v = await tx.product.create({
          data: {
            storeId,
            category: category || 'Uncategorized',
            name: `${parentName} - ${variant.variantName}`,
            barcode: variant.barcode && variant.barcode.trim() !== '' ? variant.barcode : generateSKU(),
            imageUrl: variant.imageUrl ?? null,
            parentProductId: parent.id,
            variantName: variant.variantName,
            price: variant.price,
            minPrice: variant.minPrice ?? variant.price,
            totalQuantity: variant.totalQuantity ?? 0,
            minQuantity: variant.minQuantity ?? 0,
          }
        });
        createdVariants.push(v);
      }

      return { parent, variants: createdVariants };
    });

    res.status(201).json({ success: true, data: results });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to onboard products' });
  }
};
