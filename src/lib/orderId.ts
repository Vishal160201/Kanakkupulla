import prisma from './prisma';

import crypto from 'crypto';

export async function generateOrderNumber() {
  let isUnique = false;
  let orderNumber = '';
  
  while (!isUnique) {
    // Generate a short 6-character hex string (e.g., A1B2C3)
    const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    orderNumber = `#MDorder-${suffix}`;
    
    // Check if it already exists in active orders
    const activeExists = await prisma.productOrder.findUnique({
      where: { orderNumber }
    });
    
    if (!activeExists) {
      isUnique = true;
    }
  }
  
  return orderNumber;
}
