import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getOrderHistory = async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const type = req.query.type as string | undefined; // "SALE" or "REFUND"

    const orders = await prisma.order.findMany({
      where: {
        storeId,
        ...(type ? { type } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
      include: {
        items: {
          select: {
            nameSnapshot: true,
            quantity: true,
            total: true,
            scanMethod: true,
          }
        }
      }
    });

    res.status(200).json({ success: true, data: orders, page, pageSize });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch order history' });
  }
};
