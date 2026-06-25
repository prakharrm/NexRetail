import type { Request, Response } from 'express';
import prisma from '../prisma.js';

// Onboard a product with multiple variants in a single API call
export const bulkOnboardProducts = async (req: Request, res: Response) => {
  try {
    const { storeId, parentProduct, variants } = req.body;
    // parentProduct: { name, category, price, minPrice, barcode, imageUrl }
    // variants: [{ variantName, barcode, price, minPrice, imageUrl }]

    const results = await prisma.$transaction(async (tx) => {
      // Create the parent product
      const parent = await tx.product.create({
        data: {
          storeId,
          category: parentProduct.category || 'Uncategorized',
          name: parentProduct.name,
          barcode: parentProduct.barcode,
          imageUrl: parentProduct.imageUrl,
          price: parentProduct.price,
          minPrice: parentProduct.minPrice ?? parentProduct.price,
        }
      });

      // Create each variant linked to the parent
      const createdVariants = [];
      for (const variant of variants) {
        const v = await tx.product.create({
          data: {
            storeId,
            category: parentProduct.category || 'Uncategorized',
            name: `${parentProduct.name} - ${variant.variantName}`,
            barcode: variant.barcode,
            imageUrl: variant.imageUrl,
            parentProductId: parent.id,
            variantName: variant.variantName,
            price: variant.price ?? parentProduct.price,
            minPrice: variant.minPrice ?? parentProduct.minPrice ?? parentProduct.price,
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
