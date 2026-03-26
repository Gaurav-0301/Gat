// Export data to CSV
import { notifyError } from './notifications';

export const exportToCSV = (data, filename) => {
  if (!data || data.length === 0) {
    notifyError('No data to export');
    return;
  }

  // Get headers from first object
  const headers = Object.keys(data[0]);
  
  // Create CSV content
  let csvContent = headers.join(',') + '\n';
  
  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header];
      // Handle nested objects
      if (typeof value === 'object' && value !== null) {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      // Handle strings with commas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value}"`;
      }
      return value;
    });
    csvContent += values.join(',') + '\n';
  });

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export data to JSON
export const exportToJSON = (data, filename) => {
  if (!data || data.length === 0) {
    notifyError('No data to export');
    return;
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Format data for export
export const formatDataForExport = (data) => {
  return data.map(item => {
    const formatted = {};
    Object.keys(item).forEach(key => {
      if (key === '_id' || key === '__v') return; // Skip MongoDB fields
      
      if (typeof item[key] === 'object' && item[key] !== null) {
        // Handle nested objects (like visitor, host)
        if (item[key].name) {
          formatted[key] = item[key].name;
        } else if (item[key].email) {
          formatted[key] = item[key].email;
        } else {
          formatted[key] = JSON.stringify(item[key]);
        }
      } else if (item[key] instanceof Date) {
        formatted[key] = item[key].toISOString();
      } else {
        formatted[key] = item[key];
      }
    });
    return formatted;
  });
};