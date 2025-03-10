// SQL Injection Prevention Utilities
const sqlKeywords = [
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'TRUNCATE', 'ALTER', 
  'CREATE', 'UNION', 'JOIN', 'WHERE', 'FROM', 'INTO', 'SET'
];

export const sanitizeValue = (value) => {
  if (typeof value !== 'string') return value;
  
  // Replace single quotes with double quotes to prevent breaking SQL strings
  return value.replace(/'/g, "''");
};

export const validateWhereCondition = (condition) => {
  if (!condition) return true;
  
  const normalizedCondition = condition.toUpperCase();
  
  // Check for dangerous SQL keywords that shouldn't be in a WHERE clause
  const hasUnsafeKeywords = sqlKeywords.some(keyword => {
    const pattern = new RegExp(`\\b${keyword}\\b`);
    return pattern.test(normalizedCondition);
  });

  if (hasUnsafeKeywords) {
    throw new Error('Invalid WHERE condition: Contains unsafe SQL keywords');
  }

  // Check for balanced parentheses
  let parenthesesCount = 0;
  for (const char of condition) {
    if (char === '(') parenthesesCount++;
    if (char === ')') parenthesesCount--;
    if (parenthesesCount < 0) return false;
  }
  
  return parenthesesCount === 0;
};

export const buildSafeWhereClause = (filters, dateRange, customWhereCondition) => {
  const conditions = [];
  
  // Handle standard filters
  filters.forEach(filter => {
    if (filter.field && filter.condition && filter.value) {
      const safeValue = sanitizeValue(filter.value);
      
      if (filter.condition === 'LIKE' || filter.condition === 'NOT LIKE') {
        conditions.push(`${filter.field} ${filter.condition} '%${safeValue}%'`);
      } else {
        conditions.push(`${filter.field} ${filter.condition} '${safeValue}'`);
      }
    }
  });
  
  // Handle date range
  if (Array.isArray(dateRange) && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
    const startDate = Math.floor(new Date(dateRange[0]).getTime());
    const endDate = Math.floor(new Date(dateRange[1]).getTime());
    if (startDate && endDate) {
      conditions.push(`creationTime >= '${startDate}' AND creationTime <= '${endDate}'`);
    }
  }
  
  // Validate and add custom WHERE condition
  if (customWhereCondition && customWhereCondition.trim()) {
    const trimmedCondition = customWhereCondition.trim();
    if (validateWhereCondition(trimmedCondition)) {
      conditions.push(`(${trimmedCondition})`);
    } else {
      throw new Error('Invalid custom WHERE condition');
    }
  }
  
  return conditions.length > 0 ? conditions.join(' AND ') : '';
};