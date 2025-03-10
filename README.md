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




DataStore Detail
```
// First, let's update the columns logic in useEffect:

const loadFiles = async () => {
  if (!mounted) return;

  try {
    setLoading(true);
    setError(null);
    
    let data;
    
    if (id.toLowerCase().includes('mock')) {
      const mockDatastore = Object.values(mockData).find(store => 
        store.datastoreId.toLowerCase().includes('mock') ||
        store.datastoreId === id
      );
      
      if (!mockDatastore) {
        const firstMockDatastore = Object.values(mockData)[0];
        if (!firstMockDatastore) {
          throw new Error('No mock data available');
        }
        data = { element: firstMockDatastore.files };
      } else {
        data = { element: mockDatastore.files };
      }
    } else {
      const searchParams = new URLSearchParams(window.location.search);
      const where = searchParams.get('where');
      const sortBy = `${DEFAULT_SORT_FIELD} DESC`; // Default sorting moved to server
      const fromRows = ((currentPage - 1) * ITEMS_PER_PAGE).toString();
      const rows = ITEMS_PER_PAGE.toString();
      
      const queryParams = new URLSearchParams();
      if (where) queryParams.append('where', where);
      queryParams.append('sortBy', sortBy);
      queryParams.append('fromRows', fromRows);
      queryParams.append('rows', rows);
      
      data = await fetchDatastoreFiles(
        decodeURIComponent(id),
        queryParams.toString()
      );
    }

    if (!mounted) return;

    if (!data?.element || !Array.isArray(data.element)) {
      throw new Error('Invalid data format received');
    }

    setFiles(data.element);
    
    if (mounted && data.element.length > 0) {
      // Get all unique columns from all files
      const allColumns = new Set();
      data.element.forEach(file => {
        Object.keys(file).forEach(key => {
          allColumns.add(key);
        });
      });

      // Convert Set to Array and sort with priority
      const priority = ['fileName', 'fileType', 'status', 'clientName', 'direction', 'clientConnection'];
      const sortedColumns = Array.from(allColumns).sort((a, b) => {
        const aIndex = priority.indexOf(a);
        const bIndex = priority.indexOf(b);
        
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      });
      
      setColumns(sortedColumns);
      setColumnOrder(sortedColumns);
      setVisibleColumns(sortedColumns);
    }
  } catch (error) {
    if (mounted) {
      console.error('Error fetching files:', error);
      setError('Failed to load files. Please try again.');
    }
  } finally {
    if (mounted) {
      setLoading(false);
    }
  }
};

// Update the filteredFiles logic for better sorting:
const filteredFiles = useMemo(() => {
  if (!processedFiles.length) return [];
  
  let result = [...processedFiles];
  
  // Apply filters
  const searchTerm = filters.search.toLowerCase();
  if (searchTerm || filters.status.length || filters.fileType.length || 
      filters.direction.length || filters.clientName || 
      filters.dateRange.start || filters.dateRange.end) {
    result = result.filter(file => {
      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const fileDate = file.processingEndDate;
        if (!fileDate) return false;

        if (filters.dateRange.start && fileDate < new Date(filters.dateRange.start)) return false;
        if (filters.dateRange.end && fileDate > new Date(filters.dateRange.end)) return false;
      }

      // Quick exit for other filters
      if (filters.status.length && !filters.status.includes(file.status)) return false;
      if (filters.fileType.length && !filters.fileType.includes(file.fileType)) return false;
      if (filters.direction.length && !filters.direction.includes(file.direction)) return false;

      if (filters.clientName && (!file.clientName || !file.clientName.toLowerCase().includes(filters.clientName.toLowerCase()))) {
        return false;
      }

      // Optimize search
      if (searchTerm) {
        const searchableColumns = ['fileName', 'fileId', 'fileType', 'clientName'];
        return searchableColumns.some(column => {
          const value = file[column];
          return value && value.toString().toLowerCase().includes(searchTerm);
        });
      }

      return true;
    });
  }

  // Apply sorting to all results, not just the current page
  result.sort((a, b) => {
    let aValue = a[sortConfig.field];
    let bValue = b[sortConfig.field];

    // Handle special cases
    if (sortConfig.field === 'creationTime' || sortConfig.field === 'processingEndDate') {
      aValue = a.processingEndDate ? new Date(a.processingEndDate).getTime() : 0;
      bValue = b.processingEndDate ? new Date(b.processingEndDate).getTime() : 0;
    }

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    if (aValue === bValue) return 0;

    // Compare based on type
    if (typeof aValue === 'string') {
      return sortConfig.direction === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortConfig.direction === 'asc' 
      ? (aValue < bValue ? -1 : 1)
      : (bValue < aValue ? -1 : 1);
  });

  return result;
}, [processedFiles, filters, sortConfig]);

// Add environment-based date range restriction
const handleDateRangeChange = (datastoreIndex, value) => {
  const selectedEnv = localStorage.getItem('selected_env');
  
  if (selectedEnv === 'env3') {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);
    
    const startDate = value[0] ? new Date(value[0]) : null;
    if (startDate && startDate < sevenDaysAgo) {
      addError('For Environment 3, you can only select dates within the last 7 days.');
      return;
    }
  }
  
  setFilters(prev => ({
    ...prev,
    dateRange: {
      start: value[0] ? value[0].toISOString().split('T')[0] : '',
      end: value[1] ? value[1].toISOString().split('T')[0] : '',
      preset: 'custom'
    }
  }));
};

export default handleDateRangeChange
```


filters css
```
/* Update the filters section styles */
.filters-section {
  margin-top: 16px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.filter-buttons {
  display: flex;
  gap: 8px;
}

.add-filter-button,
.add-custom-where-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: white;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  color: #475569;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-filter-button:hover,
.add-custom-where-button:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #1a202c;
}

.add-filter-button i,
.add-custom-where-button i {
  font-size: 13px;
}

.filter-row {
  display: grid;
  grid-template-columns: 1fr 1fr 2fr auto;
  gap: 12px;
  margin-bottom: 12px;
  align-items: center;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.filter-field,
.filter-condition,
.filter-value {
  width: 100%;
}

.filter-field select,
.filter-condition select,
.filter-value input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 13px;
  color: #1a202c;
  background: white;
  transition: all 0.2s ease;
}

.filter-field select:focus,
.filter-condition select:focus,
.filter-value input:focus {
  outline: none;
  border-color: var(--hsbc-red);
  box-shadow: 0 0 0 2px rgba(219, 0, 17, 0.1);
}

.remove-filter-button {
  background: none;
  border: none;
  color: #ef4444;
  padding: 8px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-filter-button:hover {
  background: #fef2f2;
  color: #dc2626;
}

.remove-filter-button i {
  font-size: 16px;
}

/* Custom Where Condition Styles */
.custom-where-container {
  margin-top: 16px;
  padding: 16px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e2e8f0;
}

.custom-where-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.custom-where-input {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  resize: vertical;
  min-height: 80px;
  font-size: 13px;
  line-height: 1.5;
  padding: 12px;
  width: 100%;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  background: #f8fafc;
}

.custom-where-input:focus {
  outline: none;
  border-color: var(--hsbc-red);
  box-shadow: 0 0 0 2px rgba(219, 0, 17, 0.1);
}
```





datastore
```
{
  "name": "datastore-viewer",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^6.1.4",
    "@testing-library/react": "^14.1.2",
    "@testing-library/user-event": "^14.5.1",
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.2",
    "node-fetch": "^3.3.2",
    "react": "^18.2.0",
    "react-datepicker": "^4.25.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "react-scripts": "5.0.1",
    "react-select": "^5.8.0",
    "rsuite": "^5.46.1",
    "web-vitals": "^3.5.0",
    "xlsx": "^0.18.5"
  },
  "scripts": {
    "start": "react-scripts start",
    "server": "node server.js",
    "dev": "concurrently \"npm run server\" \"npm run start\"",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app",
      "react-app/jest"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```