export const formatINR = (paise: number): string => {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(rupees);
};

export const paiseToRupees = (paise: number): number => {
  return Math.round(paise) / 100;
};

export const rupeesToPaise = (rupees: number): number => {
  return Math.round(rupees * 100);
};

