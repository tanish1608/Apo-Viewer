api.json

```
// Update the toggleColumn function
const toggleColumn = (column) => {
  setVisibleColumns(prev => {
    if (prev.includes(column)) {
      // Remove the column
      return prev.filter(col => col !== column);
    } else {
      // Add the column back in its original position
      const originalIndex = columnOrder.indexOf(column);
      const newColumns = [...prev];
      
      // Find the correct insertion point
      let insertIndex = 0;
      while (insertIndex < newColumns.length && 
             columnOrder.indexOf(newColumns[insertIndex]) < originalIndex) {
        insertIndex++;
      }
      
      // Insert the column at the correct position
      newColumns.splice(insertIndex, 0, column);
      return newColumns;
    }
  });
};

// Update the downloadExcel function
const downloadExcel = useCallback(async () => {
  try {
    setExportLoading(true);
    
    // Process in batches
    const workbook = XLSX.utils.book_new();
    let wsData = [];
    
    for (let i = 0; i < filteredFiles.length; i += EXPORT_BATCH_SIZE) {
      const batch = filteredFiles.slice(i, i + EXPORT_BATCH_SIZE);
      const batchData = batch.map(file => {
        const row = {};
        // Only include visible columns
        visibleColumns.forEach(column => {
          row[formatColumnHeader(column)] = file[column] || '-';
        });
        return row;
      });
      wsData.push(...batchData);
    }

    const worksheet = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
    XLSX.writeFile(workbook, `${getDatastoreName(id)}_export.xlsx`);
  } catch (error) {
    console.error('Export failed:', error);
    setError('Export failed. Please try again.');
  } finally {
    setExportLoading(false);
  }
}, [filteredFiles, visibleColumns, id, getDatastoreName]);

// Update the downloadCSV function
const downloadCSV = useCallback(() => {
  // Only include visible columns in the header
  const csvContent = [
    visibleColumns.map(column => formatColumnHeader(column)).join(','),
    ...files.map(file => 
      visibleColumns.map(column => {
        const value = file[column] || '';
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${getDatastoreName(id)}_export.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}, [files, visibleColumns, id, getDatastoreName]);

// Update the table rendering to use CSS grid for better column handling
return (
  <div className="table-container" ref={tableRef}>
    <table style={{ tableLayout: 'fixed', width: '100%' }}>
      <colgroup>
        {visibleColumns.map((column, index) => (
          <col key={index} style={{ width: `${100 / visibleColumns.length}%` }} />
        ))}
      </colgroup>
      <thead>
        <tr>
          {visibleColumns.map(column => (
            <th key={column}>
              {formatColumnHeader(column)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {filteredFiles.slice(visibleRange.start, visibleRange.end).map((file, index) => (
          <tr key={index}>
            {visibleColumns.map(column => (
              <td key={column}>
                {column === 'fileName' ? (
                  <div className="file-cell">
                    <i className="fas fa-file-alt file-icon"></i>
                    <span>{file[column] || '-'}</span>
                  </div>
                ) : column === 'status' ? (
                  <span className={`status-badge ${(file[column] || '').toLowerCase()}`}>
                    {file[column] || '-'}
                  </span>
                ) : column === 'processingEndDate' ? (
                  <span>{formatDate(file[column])}</span>
                ) : (
                  <span>{file[column]?.toString() || '-'}</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default downloadCSV

```




# Datastore Viewer Documentation

## Overview
The Datastore Viewer is a web-based application designed to view and manage datastore files with advanced filtering, sorting, and export capabilities. It provides a secure, user-friendly interface for accessing and managing datastore data.

## Features

### 1. Authentication System
- Secure login system with username/password authentication
- Session management with 8-hour duration
- Auto session refresh every 15 minutes
- Security features:
  - Brute force protection (5 attempts limit)
  - 15-minute lockout period
  - Session-based storage for sensitive data

### 2. Home Screen (Datastore List)
- API URL configuration
- Multiple datastore selection
- Query parameters for each datastore:
  - Where clause for filtering
  - Sort criteria
- Persistent API URL storage using localStorage
- Input validation and error handling

### 3. Datastore Detail View
#### File Management
- Comprehensive file listing
- Dynamic column management
- Advanced filtering capabilities:
  - Date range filtering with presets
  - Status filtering
  - File type filtering
  - Direction filtering
  - Client name filtering
  - Full-text search

#### Data Display
- Sortable columns
- Customizable column visibility
- Status indicators with color coding
- Pagination with configurable page size
- Responsive table layout

#### Export Capabilities
- Excel export with XLSX format
- CSV export
- Batch processing for large datasets

### 4. User Interface
#### Design Elements
- Clean, enterprise-grade interface
- HSBC-inspired color scheme
- Responsive design for all screen sizes
- Interactive elements with hover states
- Loading indicators for async operations

#### Components
- Header with navigation
- Search bar with instant filtering
- Filter panel with multiple filter types
- Column selector for table customization
- Sort menu for multiple sort options
- Pagination controls

## Technical Implementation

### 1. Frontend Architecture
- React-based single-page application
- Context API for state management
- React Router for navigation
- Component-based architecture with:
  - Functional components
  - React hooks
  - Custom hooks for auth and data
  - Memoization for performance

### 2. Backend Integration
- RESTful API integration
- Proxy server for CORS handling
- Error handling and retry logic
- Response streaming for large datasets

### 3. State Management
- Local state for UI components
- Context API for global state
- localStorage for persistent data
- Session storage for auth data

### 4. Security Features
- Protected routes
- Session management
- Input sanitization
- Error boundary implementation

### 5. Performance Optimizations
- Debounced search
- Virtualized table for large datasets
- Batch processing for exports
- Memoized computations
- Optimized re-renders

## Styling

### 1. CSS Architecture
- Modular CSS files
- BEM-like naming convention
- CSS variables for theming
- Responsive design patterns

### 2. Theme Components
- Color scheme:
  - Primary: HSBC Red (#db0011)
  - Secondary: Dark Grey (#666666)
  - Background: Light Grey (#f5f5f5)
  - Accent colors for status indicators
- Typography:
  - Font: Arial, sans-serif
  - Base size: 13px
  - Consistent heading hierarchy
- Layout:
  - Responsive grid system
  - Flexible containers
  - Card-based components

## File Structure
```
src/
├── api/
│   ├── api.js         # API integration
│   └── mockData.js    # Mock data for testing
├── components/
│   ├── DatastoreList.js    # Home screen
│   ├── DatastoreDetail.js  # Detail view
│   ├── Login.js            # Authentication
│   └── PrivateRoute.js     # Route protection
├── contexts/
│   └── AuthContext.js      # Authentication context
├── styles/
│   ├── ColumnSelector.css  # Column selection styles
│   ├── DatastoreList.css   # Home screen styles
│   ├── Login.css           # Login page styles
│   └── Sort.css            # Sorting styles
└── App.js                  # Main application
```

## Usage Guide

### 1. Initial Setup
1. Enter the API URL on the home screen
2. API URL is stored in localStorage for persistence
3. Configure authentication credentials

### 2. Viewing Datastores
1. Add one or more datastores
2. Configure optional where clauses and sort criteria
3. Submit to view combined results

### 3. Managing Data
1. Use filters to narrow down results
2. Customize visible columns
3. Sort data by any column
4. Export data in desired format

### 4. Best Practices
- Regular session refresh
- Clear filters for full dataset
- Use date presets for common ranges
- Export in batches for large datasets

## Error Handling
- Input validation
- API error handling
- Session expiration
- Network issues
- Rate limiting
- Invalid credentials

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Performance Considerations
- Large dataset handling
- Search optimization
- Export processing
- Memory management
- Network optimization

## Security Considerations
- Session management
- Data encryption
- Input validation
- XSS prevention
- CSRF protection