import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const processRefund = async (req: Request, res: Response) => {
  try {
    const { storeId, cashierId, originalOrderId, refundItems } = req.body;
    // refundItems: [{ orderItemId, quantity }]

    const refundOrder = await prisma.$transaction(async (tx) => {
      // 1. Fetch the original order with its items
      const originalOrder = await tx.order.findUnique({
        where: { id: originalOrderId },
        include: { items: true }
      });

      if (!originalOrder) throw new Error('Original order not found');
      if (originalOrder.type === 'REFUND') throw new Error('Cannot refund a refund');

      let refundSubtotal = 0;
      let refundTotalUnits = 0;
      const refundItemsData = [];

      for (const ri of refundItems) {
        const originalItem = originalOrder.items.find((i) => i.id === ri.orderItemId);
        if (!originalItem) throw new Error(`Order item ${ri.orderItemId} not found`);

        const maxRefundable = originalItem.quantity - originalItem.refundedQuantity;
        if (ri.quantity > maxRefundable) {
          throw new Error(`Cannot refund ${ri.quantity} of ${originalItem.nameSnapshot}. Max refundable: ${maxRefundable}`);
        }

        const itemRefundTotal = originalItem.price * ri.quantity;
        refundSubtotal += itemRefundTotal;
        refundTotalUnits += ri.quantity;

        // Mark the original OrderItem as partially/fully refunded
        await tx.orderItem.update({
          where: { id: ri.orderItemId },
          data: { refundedQuantity: { increment: ri.quantity } }
        });

        // Restore inventory
        await tx.product.update({
          where: { id: originalItem.productId },
          data: { totalQuantity: { increment: ri.quantity } }
        });

        await tx.inventoryLog.create({
          data: {
            storeId,
            productId: originalItem.productId,
            changeAmount: ri.quantity,
            reason: 'REFUND',
            notes: `Refund from order ${originalOrderId}`,
          }
        });

        refundItemsData.push({
          productId: originalItem.productId,
          nameSnapshot: originalItem.nameSnapshot,
          categorySnapshot: originalItem.categorySnapshot,
          barcodeSnapshot: originalItem.barcodeSnapshot,
          originalPrice: originalItem.originalPrice,
          price: originalItem.price,
          wholesalePrice: originalItem.wholesalePrice,
          quantity: ri.quantity,
          total: itemRefundTotal,
          scanMethod: originalItem.scanMethod,
        });
      }

      const refundTax = refundSubtotal * 0.05;
      const refundGrandTotal = refundSubtotal + refundTax;

      // 2. Create the refund order
      const newRefund = await tx.order.create({
        data: {
          storeId,
          cashierId,
          type: 'REFUND',
          refundOriginalOrderId: originalOrderId,
          subtotal: refundSubtotal,
          discount: 0,
          tax: refundTax,
          grandTotal: refundGrandTotal,
          itemCount: refundItems.length,
          totalUnits: refundTotalUnits,
          paymentMethod: originalOrder.paymentMethod,
          checkoutDurationSeconds: 0,
          items: { create: refundItemsData }
        },
        include: { items: true }
      });

      return newRefund;
    });

    res.status(201).json({ success: true, refund: refundOrder });
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message || 'Refund failed' });
  }
};
