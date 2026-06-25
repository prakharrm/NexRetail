import type { Request, Response } from 'express';
import prisma from '../prisma.js';

export const getOrderDetail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id: id as string },
      include: { items: true }
    });

    if (!order) {
      res.status(404).json({ success: false, error: 'Order not found' });
      return;
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Failed to fetch order detail' });
  }
};
