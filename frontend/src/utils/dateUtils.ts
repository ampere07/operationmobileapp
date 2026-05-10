/**
 * Formats a date to MySQL format (YYYY-MM-DD HH:mm:ss) in GMT+8 (Asia/Manila)
 */
export const formatToGMT8MySQL = (date: Date = new Date()): string => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const gmt8 = new Date(utc + (3600000 * 8));
  
  const year = gmt8.getUTCFullYear();
  const month = String(gmt8.getUTCMonth() + 1).padStart(2, '0');
  const day = String(gmt8.getUTCDate()).padStart(2, '0');
  const hours = String(gmt8.getUTCHours()).padStart(2, '0');
  const minutes = String(gmt8.getUTCMinutes()).padStart(2, '0');
  const seconds = String(gmt8.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

/**
 * Formats a date to a display format (MM/DD/YYYY, HH:mm:ss AM/PM) in GMT+8
 */
export const formatToGMT8Display = (date: Date = new Date()): string => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const gmt8 = new Date(utc + (3600000 * 8));
  
  const month = String(gmt8.getUTCMonth() + 1).padStart(2, '0');
  const day = String(gmt8.getUTCDate()).padStart(2, '0');
  const year = gmt8.getUTCFullYear();
  
  const hours24 = gmt8.getUTCHours();
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  const minutes = String(gmt8.getUTCMinutes()).padStart(2, '0');
  const seconds = String(gmt8.getUTCSeconds()).padStart(2, '0');
  
  return `${month}/${day}/${year}, ${hours12}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Gets just the date part (YYYY-MM-DD) in GMT+8
 */
export const getGMT8DateOnly = (date: Date = new Date()): string => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const gmt8 = new Date(utc + (3600000 * 8));
  const year = gmt8.getUTCFullYear();
  const month = String(gmt8.getUTCMonth() + 1).padStart(2, '0');
  const day = String(gmt8.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
