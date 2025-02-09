import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDatastoreFiles } from '../api/api';
import * as XLSX from 'xlsx';
import '../styles/Sort.css';
import '../styles/ColumnSelector.css';
import { mockData } from '../api/mockData';

// Constants
const ITEMS_PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const EXPORT_BATCH_SIZE = 1000;

// Date presets
const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Custom', value: 'custom' }
];

function DatastoreDetail() {
  // Refs for optimization
  const searchDebounceTimer = useRef(null);
  const tableRef = useRef(null);
  const sortMenuRef = useRef(null);
  const columnSelectorRef = useRef(null);
  const filterRef = useRef(null);
  
  // State
  const { id } = useParams();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [columns, setColumns] = useState([]);
  const [visibleColumns, setVisibleColumns] = useState([]);
  const [columnOrder, setColumnOrder] = useState([]); // Add this new state
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [sortConfig, setSortConfig] = useState({
    field: '',
    direction: 'desc'
  });
  const [filters, setFilters] = useState({
    dateRange: {
      start: '',
      end: '',
      preset: ''
    },
    status: [],
    fileType: [],
    direction: [],
    clientName: '',
    search: ''
  });

  // Combine all click outside handlers into one effect
  useEffect(() => {
    function handleClickOutside(event) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setShowSortMenu(false);
      }
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target)) {
        setShowColumnSelector(false);
      }
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize visible columns when columns are set
  useEffect(() => {
    setVisibleColumns(columns);
  }, [columns]);

  // Add this helper function for date formatting
  const formatDate = (date) => {
    if (!date) return '-';
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    return date.toString();
  };

  // Memoized data processing
  const processedFiles = useMemo(() => {
    try {
      return files.map(file => ({
        ...file,
        processingEndDate: file.processingEndDate ? new Date(parseInt(file.processingEndDate)) : null
      }));
    } catch (err) {
      console.error('Error processing files:', err);
      return [];
    }
  }, [files]);

  // Optimize search with debouncing and memoization
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchInput.toLowerCase()
      }));
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Data fetching with cleanup
  useEffect(() => {
    let mounted = true;

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
          const sortBy = searchParams.get('sortBy');
          
          const queryParams = new URLSearchParams();
          if (where) queryParams.append('where', where);
          if (sortBy) queryParams.append('sortBy', sortBy);
          
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
          const columnMap = new Map();
          data.element.slice(0, 100).forEach(file => {
            Object.keys(file).forEach(key => {
              columnMap.set(key, (columnMap.get(key) || 0) + 1);
            });
          });

          // Define priority columns
          const priority = ['fileName', 'fileType', 'status', 'clientName', 'direction', 'clientConnection'];
          
          // Sort columns maintaining priority
          const sortedColumns = Array.from(columnMap.keys()).sort((a, b) => {
            const aIndex = priority.indexOf(a);
            const bIndex = priority.indexOf(b);
            
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            if (aIndex !== -1) return -1;
            if (bIndex !== -1) return 1;
            return columnMap.get(b) - columnMap.get(a);
          });
          
          setColumns(sortedColumns);
          setColumnOrder(sortedColumns); // Store the original order
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

    loadFiles();

    return () => {
      mounted = false;
    };
  }, [id]);

  // Update the sort handler
  const handleSort = (field) => {
    if (field === 'clear') {
      setSortConfig({
        field: 'creationTime',
        direction: 'desc'
      });
    } else {
      setSortConfig(prev => ({
        field,
        direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
    }
    setShowSortMenu(false);
  };

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

  const toggleAllColumns = () => {
    setVisibleColumns(prev => 
      prev.length === columns.length ? [] : [...columns]
    );
  };

  // Optimized filtering
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
          // Only search through specific columns for better performance
          const searchableColumns = ['fileName', 'fileId', 'fileType', 'clientName'];
          return searchableColumns.some(column => {
            const value = file[column];
            return value && value.toString().toLowerCase().includes(searchTerm);
          });
        }

        return true;
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      let aValue = a[sortConfig.field];
      let bValue = b[sortConfig.field];

      // Handle special cases
      if (sortConfig.field === 'creationTime') {
        aValue = a.processingEndDate ? new Date(a.processingEndDate).getTime() : 0;
        bValue = b.processingEndDate ? new Date(b.processingEndDate).getTime() : 0;
      }

      if (aValue === bValue) return 0;
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      const comparison = aValue < bValue ? -1 : 1;
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [processedFiles, filters, sortConfig]);

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
          columns.forEach(column => {
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
  }, [filteredFiles, columns, id]);

  const getDatastoreName = useCallback((id) => {
    const parts = id.split('.');
    return parts[parts.length - 1];
  }, []);

  const downloadCSV = useCallback(() => {
    const csvContent = [
      columns.join(','),
      ...files.map(file => 
        columns.map(column => {
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
  }, [files, columns, id, getDatastoreName]);

  const handleDatePresetChange = (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        start = today;
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        break;
      case '7days':
        start = new Date(today);
        start.setDate(start.getDate() - 7);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case '30days':
        start = new Date(today);
        start.setDate(start.getDate() - 30);
        end = new Date(today);
        end.setHours(23, 59, 59, 999);
        break;
      case 'thisMonth':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'lastMonth':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
        break;
      case 'custom':
        return setFilters(prev => ({
          ...prev,
          dateRange: { ...prev.dateRange, preset }
        }));
      default:
        start = new Date(0);
        end = new Date();
    }

    setFilters(prev => ({
      ...prev,
      dateRange: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
        preset
      }
    }));
  };

  const filterOptions = useMemo(() => {
    return {
      status: Array.from(new Set(files.map(file => file.status).filter(Boolean))),
      fileType: Array.from(new Set(files.map(file => file.fileType).filter(Boolean))),
      direction: Array.from(new Set(files.map(file => file.direction).filter(Boolean)))
    };
  }, [files]);

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const visibleRange = {
    start: (currentPage - 1) * ITEMS_PER_PAGE,
    end: currentPage * ITEMS_PER_PAGE
  };

  const formatColumnHeader = (column) => {
    return column
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      dateRange: { start: '', end: '', preset: '' },
      status: [],
      fileType: [],
      direction: [],
      clientName: '',
      search: ''
    });
    setSearchInput('');
  };

  const handleSearchChange = (e) => {
    setSearchInput(e.target.value);
  };

  const FilterSection = ({ title, options, selectedValues, onChange }) => (
    <div className="filter-section">
      <h3 className="filter-title">{title}</h3>
      <div className="filter-options">
        {options.map(option => (
          <button
            key={option}
            onClick={() => {
              const newValues = selectedValues.includes(option)
                ? selectedValues.filter(v => v !== option)
                : [...selectedValues, option];
              onChange(newValues);
            }}
            className={`filter-option ${selectedValues.includes(option) ? 'selected' : ''}`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="container">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}
      
      <div className="header-section">
        <Link to="/" className="back-link">← Back to Datastores</Link>
        <div className="export-buttons">
          <button 
            className="export-button excel" 
            onClick={downloadExcel}
            disabled={exportLoading}
          >
            <i className="fas fa-file-excel"></i> Export to Excel
          </button>
          <button 
            className="export-button csv" 
            onClick={downloadCSV}
            disabled={exportLoading}
          >
            <i className="fas fa-file-csv"></i> Export to CSV
          </button>
        </div>
      </div>

      <h1>{getDatastoreName(id)} Files</h1>

      <div className="search-section">
        <div className="search-bar">
          <div className="search-input-container">
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="Search files..."
              value={searchInput}
              onChange={handleSearchChange}
            />
          </div>
          <div ref={filterRef}>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="filter-button"
            >
              <i className="fas fa-filter"></i>
              Show Filters
            </button>
            {showFilters && (
              <div className="filters-container">
                <div className="filter-section">
                  <h3 className="filter-title">Date Range</h3>
                  <div className="date-presets">
                    {DATE_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        onClick={() => handleDatePresetChange(preset.value)}
                        className={`date-preset ${filters.dateRange.preset === preset.value ? 'selected' : ''}`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {(filters.dateRange.preset === 'custom' || !filters.dateRange.preset) && (
                    <div className="custom-date-range">
                      <div className="date-input-container">
                        <i className="fas fa-calendar"></i>
                        <input
                          type="date"
                          value={filters.dateRange.start}
                          onChange={(e) => {
                            handleFilterChange('dateRange', {
                              ...filters.dateRange,
                              start: e.target.value,
                              preset: 'custom'
                            });
                          }}
                        />
                      </div>
                      <div className="date-input-container">
                        <i className="fas fa-calendar"></i>
                        <input
                          type="date"
                          value={filters.dateRange.end}
                          onChange={(e) => {
                            handleFilterChange('dateRange', {
                              ...filters.dateRange,
                              end: e.target.value,
                              preset: 'custom'
                            });
                          }}
                          min={filters.dateRange.start}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="filter-grid">
                  <FilterSection
                    title="Status"
                    options={filterOptions.status}
                    selectedValues={filters.status}
                    onChange={(values) => handleFilterChange('status', values)}
                  />
                  
                  <FilterSection
                    title="File Type"
                    options={filterOptions.fileType}
                    selectedValues={filters.fileType}
                    onChange={(values) => handleFilterChange('fileType', values)}
                  />
                  
                  <FilterSection
                    title="Direction"
                    options={filterOptions.direction}
                    selectedValues={filters.direction}
                    onChange={(values) => handleFilterChange('direction', values)}
                  />
                </div>
              </div>
            )}
          </div>
          <div className="sort-container" ref={sortMenuRef}>
            <button
              className="sort-button"
              onClick={() => setShowSortMenu(!showSortMenu)}
            >
              <i className="fas fa-sort"></i>
              Sort
            </button>
            
            {showSortMenu && (
              <div className="sort-menu">
                <div className="sort-menu-header">Sort by</div>
                <div
                  className={`sort-option ${sortConfig.field === 'datastoreId' ? 'active' : ''}`}
                  onClick={() => handleSort('datastoreId')}
                >
                  <i className="fas fa-database"></i>
                  Datastore ID
                  {sortConfig.field === 'datastoreId' && (
                    <span className="sort-direction">
                      <i className={`fas fa-arrow-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                    </span>
                  )}
                </div>
                <div
                  className={`sort-option ${sortConfig.field === 'creationTime' ? 'active' : ''}`}
                  onClick={() => handleSort('creationTime')}
                >
                  <i className="fas fa-clock"></i>
                  Creation Time
                  {sortConfig.field === 'creationTime' && (
                    <span className="sort-direction">
                      <i className={`fas fa-arrow-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                    </span>
                  )}
                </div>
                <div
                  className={`sort-option ${sortConfig.field === 'status' ? 'active' : ''}`}
                  onClick={() => handleSort('status')}
                >
                  <i className="fas fa-info-circle"></i>
                  Status
                  {sortConfig.field === 'status' && (
                    <span className="sort-direction">
                      <i className={`fas fa-arrow-${sortConfig.direction === 'asc' ? 'up' : 'down'}`}></i>
                    </span>
                  )}
                </div>
                <div className="sort-divider"></div>
                <div
                  className="sort-option clear-sort"
                  onClick={() => handleSort('clear')}
                >
                  <i className="fas fa-times"></i>
                  Clear Sort
                </div>
              </div>
            )}
          </div>
          <div className="column-selector-container" ref={columnSelectorRef}>
            <button
              className="column-selector-button"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
            >
              <i className="fas fa-columns"></i>
              Columns
            </button>
            
            {showColumnSelector && (
              <div className="column-selector-menu">
                <div className="column-selector-header">
                  <span>Show/Hide Columns</span>
                  <button 
                    className="select-all-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleAllColumns();
                    }}
                  >
                    {visibleColumns.length === columns.length ? 'Hide All' : 'Show All'}
                  </button>
                </div>
                {columns.map(column => (
                  <div
                    key={column}
                    className="column-option"
                    onClick={() => toggleColumn(column)}
                  >
                    <div className={`column-checkbox ${visibleColumns.includes(column) ? 'checked' : ''}`} />
                    <span className="column-label">{formatColumnHeader(column)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {Object.values(filters).some(value => 
            Array.isArray(value) ? value.length > 0 : value
          ) && (
            <button
              onClick={clearFilters}
              className="clear-filters"
            >
              <i className="fas fa-times"></i>
              Clear Filters
            </button>
          )}
        </div>
        <div className="results-count">
          {filteredFiles.length} results
        </div>
      </div>

      <div className="table-container" ref={tableRef}>
        <table>
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

      <div className="pagination-container">
        <div className="pagination-info">
          Showing <span>{visibleRange.start + 1}</span> to{' '}
          <span>{Math.min(visibleRange.end, filteredFiles.length)}</span>{' '}
          of <span>{filteredFiles.length}</span> results
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => setCurrentPage(prev => prev - 1)}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <i className="fas fa-chevron-left"></i>
            Previous
          </button>
          
          <div className="pagination-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`page-number ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => prev + 1)}
            disabled={currentPage === totalPages}
            className="pagination-button"
          >
            Next
            <i className="fas fa-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(DatastoreDetail);