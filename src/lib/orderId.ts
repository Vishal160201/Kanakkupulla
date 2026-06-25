import { prisma } from './prisma';

export async function generateOrderNumber() {
  const last = await prisma.productOrder.findFirst({
    where: { orderNumber: { startsWith: '#MDorder-' } },
    orderBy: { orderNumber: 'desc' },
  });

  if (!last || !last.orderNumber) {
    return '#MDorder-001';
  }

  const match = last.orderNumber.match(/#MDorder-(\d+)/);
  if (!match) return '#MDorder-001';

  const nextNum = parseInt(match[1], 10) + 1;
  return `#MDorder-${String(nextNum).padStart(3, '0')}`;
}
