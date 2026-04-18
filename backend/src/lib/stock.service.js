/**
 * Stock Service - Helper functions for Blood Inventory logic
 */

/**
 * Calculates expiry date based on donation date (42 days rule)
 * @param {string | Date} donationDate 
 * @returns {Date}
 */
const calculateExpiryDate = (donationDate) => {
  const date = new Date(donationDate);
  date.setDate(date.getDate() + 42);
  return date;
};

/**
 * Determines stock status based on units count
 * @param {number} units 
 * @returns {string}
 */
const calculateStockStatus = (units) => {
  if (units > 10) return 'Available';
  if (units >= 5) return 'Low';
  return 'Critical';
};

/**
 * Determines stock health indicator based on expiry and RBC count
 * @param {Date|string} expiryDate 
 * @param {number} rbcCount 
 * @returns {string}
 */
const calculateHealthIndicator = (expiryDate, rbcCount) => {
  if (!rbcCount) return 'Good'; // Default if not provided
  
  const now = new Date();
  const exp = new Date(expiryDate);
  const diffTime = Math.abs(exp - now);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Worst-first logic
  if (diffDays < 10 || rbcCount < 2.5) return 'Poor';
  if (diffDays <= 20 || rbcCount <= 3.5) return 'Fair';
  if (diffDays <= 30 || rbcCount <= 4.5) return 'Good';
  
  // Excellent is AND condition
  if (diffDays > 30 && rbcCount > 4.5) return 'Excellent';
  
  return 'Good'; // Balanced fallback
};

module.exports = {
  calculateExpiryDate,
  calculateStockStatus,
  calculateHealthIndicator
};
