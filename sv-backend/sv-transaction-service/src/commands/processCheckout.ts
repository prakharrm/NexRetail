import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const processCheckout = async (req: Request, res: Response) => {
  try {
    const { storeId, cashierId, customerId, items, paymentMethod, discountReason, orderDiscount, isOfflineTransaction, checkoutDurationSeconds } = req.body;

    const order = await prisma.$transaction(async (tx) => {
      let subtotal = 0;
      let totalUnits = 0;

      const orderItemsData = items.map((item: any) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        totalUnits += item.quantity;

        return {
          productId: item.productId,
          nameSnapshot: item.name,
          categorySnapshot: item.category,
          barcodeSnapshot: item.barcode,
          originalPrice: item.originalPrice ?? item.price,
          price: item.price,
          priceOverridden: item.priceOverridden ?? false,
          wholesalePrice: item.wholesalePrice ?? 0,
          discountPerItem: item.discountPerItem ?? 0,
          quantity: item.quantity,
          total: itemTotal,
          scanMethod: item.scanMethod ?? 'BARCODE_SCAN',
          aiConfidenceScore: item.aiConfidenceScore ?? null,
        };
      });

      const discount = orderDiscount ?? 0;
      const tax = (subtotal - discount) * 0.05; // 5% tax on net
      const grandTotal = subtotal - discount + tax;

      // 1. Create Order + OrderItems atomically
      const newOrder = await tx.order.create({
        data: {
          storeId,
          cashierId,
          customerId: customerId ?? null,
          type: 'SALE',
          subtotal,
          discount,
          tax,
          grandTotal,
          itemCount: items.length,
          totalUnits,
          paymentMethod,
          discountReason: discountReason ?? null,
          isOfflineTransaction: isOfflineTransaction ?? false,
          checkoutDurationSeconds: checkoutDurationSeconds ?? 0,
          items: { create: orderItemsData }
        },
        include: { items: true }
      });

      // 2. Deduct inventory and log each change
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { totalQuantity: { decrement: item.quantity } }
        });

        await tx.inventoryLog.create({
          data: {
            storeId,
            productId: item.productId,
            changeAmount: -item.quantity,
            reason: 'SALE',
            notes: `Order ${newOrder.id}`,
          }
        });
      }

      return newOrder;
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Checkout failed' });
  }
};
