import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getInventoryLogs = async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;
    const productId = req.query.productId as string | undefined;
    const reason = req.query.reason as string | undefined;
    const page = parseInt(req.query.page as string) || 0;
    const pageSize = parseInt(req.query.pageSize as string) || 50;

    const logs = await prisma.inventoryLog.findMany({
      where: {
        storeId,
        ...(productId ? { productId } : {}),
        ...(reason ? { reason } : {}),
      },
      orderBy: { createdAt: 'desc' },
      skip: page * pageSize,
      take: pageSize,
      include: { product: { select: { name: true, barcode: true } } }
    });

    res.status(200).json({ success: true, data: logs, page, pageSize });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch inventory logs' });
  }
};
