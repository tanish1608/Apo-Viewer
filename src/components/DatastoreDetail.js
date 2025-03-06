import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDatastoreFiles } from '../api/api';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import "react-datepicker/dist/react-datepicker.css";
import '../styles/Sort.css';
import '../styles/ColumnSelector.css';
import { mockData } from '../api/mockData';
import ErrorToast from './ErrorToast';

// Constants
const ITEMS_PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const EXPORT_BATCH_SIZE = 1000;
const DEFAULT_SORT_FIELD = 'creationTime';
const DEFAULT_SORT_DIRECTION = 'desc';

// Date presets
const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: '7days' },
  { label: 'Last 30 days', value: '30days' },
  { label: 'Custom', value: 'custom' }
];

// Helper function to format column headers
const formatColumnHeader = (column) => {
  return column
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

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
  const [columnOrder, setColumnOrder] = useState([]); 
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [columnSearchInput, setColumnSearchInput] = useState('');
  const [sortConfig, setSortConfig] = useState({
    field: DEFAULT_SORT_FIELD,
    direction: DEFAULT_SORT_DIRECTION
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

  // Helper functions
  const addError = useCallback((error) => {
    const id = Date.now();
    setErrors(prev => [...prev, { id, message: error }]);
  }, []);

  const removeError = useCallback((id) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const formatDate = useCallback((date) => {
    if (!date) return '-';
    if (date instanceof Date) {
      return date.toLocaleString();
    }
    return date.toString();
  }, []);

  // Click outside handlers
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

  // Initialize visible columns
  useEffect(() => {
    setVisibleColumns(columns);
  }, [columns]);

  // Process files
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

  // Search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({
        ...prev,
        search: searchInput.toLowerCase()
      }));
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Data fetching
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
          const sortBy = `${DEFAULT_SORT_FIELD} ${DEFAULT_SORT_DIRECTION}`;
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
          // Create a map to store all unique columns and their frequencies
          const columnMap = new Map();
          const columnTypes = new Map();
          
          // First pass: collect all unique columns, their frequencies, and types
          data.element.forEach(file => {
            Object.entries(file).forEach(([key, value]) => {
              // Update frequency
              columnMap.set(key, (columnMap.get(key) || 0) + 1);
              
              // Track value type
              if (value !== null && value !== undefined) {
                const type = typeof value;
                if (!columnTypes.has(key)) {
                  columnTypes.set(key, new Set());
                }
                columnTypes.get(key).add(type);
              }
            });
          });

          // Define priority columns that should always appear first
          const priority = [
            'fileName',
            'fileType',
            'status',
            'clientName',
            'direction',
            'clientConnection',
            'processingEndDate',
            'creationTime',
            'fileId'
          ];

          // Special columns that should always be included if present
          const specialColumns = ['A_C_K_3', 'A_C_K_4'];
          
          // Sort columns maintaining priority and including ALL columns
          const sortedColumns = Array.from(columnMap.keys()).sort((a, b) => {
            // If either column is a special column, it should be included
            const aIsSpecial = specialColumns.includes(a);
            const bIsSpecial = specialColumns.includes(b);
            
            // If both are special columns, maintain their relative order
            if (aIsSpecial && bIsSpecial) {
              return specialColumns.indexOf(a) - specialColumns.indexOf(b);
            }
            
            // If only one is a special column, it comes after priority columns
            if (aIsSpecial) return priority.length;
            if (bIsSpecial) return -priority.length;
            
            const aIndex = priority.indexOf(a);
            const bIndex = priority.indexOf(b);
            
            // If both columns are priority columns, sort by priority order
            if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
            // If only a is a priority column, it comes first
            if (aIndex !== -1) return -1;
            // If only b is a priority column, it comes first
            if (bIndex !== -1) return 1;
            
            // For non-priority columns, sort by:
            // 1. Frequency (most frequent first)
            const freqDiff = columnMap.get(b) - columnMap.get(a);
            if (freqDiff !== 0) return freqDiff;
            
            // 2. Alphabetically if frequencies are equal
            return a.localeCompare(b);
          });

          // Ensure special columns are always included
          specialColumns.forEach(column => {
            if (columnMap.has(column) && !sortedColumns.includes(column)) {
              sortedColumns.push(column);
            }
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

    loadFiles();

    return () => {
      mounted = false;
    };
  }, [id, currentPage]);

  // Handlers
  const handleSort = useCallback((field) => {
    if (field === 'clear') {
      setSortConfig({
        field: DEFAULT_SORT_FIELD,
        direction: DEFAULT_SORT_DIRECTION
      });
    } else {
      setSortConfig(prev => ({
        field,
        direction: prev.field === field && prev.direction === 'desc' ? 'asc' : 'desc'
      }));
    }
    setShowSortMenu(false);
  }, []);

  const toggleColumn = useCallback((column) => {
    setVisibleColumns(prev => {
      if (prev.includes(column)) {
        return prev.filter(col => col !== column);
      } else {
        const originalIndex = columnOrder.indexOf(column);
        const newColumns = [...prev];
        let insertIndex = 0;
        while (insertIndex < newColumns.length && 
               columnOrder.indexOf(newColumns[insertIndex]) < originalIndex) {
          insertIndex++;
        }
        newColumns.splice(insertIndex, 0, column);
        return newColumns;
      }
    });
  }, [columnOrder]);

  const toggleAllColumns = useCallback(() => {
    setVisibleColumns(prev => 
      prev.length === columns.length ? [] : [...columns]
    );
  }, [columns]);

  const getDatastoreName = useCallback((datastoreId) => {
    const parts = datastoreId.split('.');
    return parts[parts.length - 1];
  }, []);

  // Filtered columns based on search
  const filteredColumns = useMemo(() => {
    if (!columnSearchInput.trim()) {
      return columns;
    }
    const searchTerm = columnSearchInput.toLowerCase();
    return columns.filter(column => 
      formatColumnHeader(column).toLowerCase().includes(searchTerm)
    );
  }, [columns, columnSearchInput]);

  // Filtered and sorted data
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

  // Filter options
  const filterOptions = useMemo(() => {
    return {
      status: Array.from(new Set(files.map(file => file.status).filter(Boolean))),
      fileType: Array.from(new Set(files.map(file => file.fileType).filter(Boolean))),
      direction: Array.from(new Set(files.map(file => file.direction).filter(Boolean)))
    };
  }, [files]);

  // Export functions
  const downloadExcel = useCallback(async () => {
    try {
      setExportLoading(true);
      
      if (filteredFiles.length === 0) {
        addError('No data available to export');
        return;
      }

      const workbook = XLSX.utils.book_new();
      let wsData = [];
      
      for (let i = 0; i < filteredFiles.length; i += EXPORT_BATCH_SIZE) {
        const batch = filteredFiles.slice(i, i + EXPORT_BATCH_SIZE);
        const batchData = batch.map(file => {
          const row = {};
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
      addError('Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }, [filteredFiles, visibleColumns, id, getDatastoreName, addError]);

  const downloadCSV = useCallback(() => {
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

  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div>
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading files...</div>
        </div>
      </div>
    );
  }

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

  const handleColumnSearchChange = (e) => {
    setColumnSearchInput(e.target.value);
  };

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

  const totalPages = Math.ceil(filteredFiles.length / ITEMS_PER_PAGE);
  const visibleRange = {
    start: (currentPage - 1) * ITEMS_PER_PAGE,
    end: currentPage * ITEMS_PER_PAGE
  };

  const FilterSection = ({ title, options, selectedValues, onChange }) => {
    const selectOptions = options.map(option => ({
      value: option,
      label: option
    }));

    const value = selectedValues.map(val => ({
      value: val,
      label: val
    }));

    return (
      <div className="filter-section">
        <h3 className="filter-title">{title}</h3>
        <Select
          isMulti
          options={selectOptions}
          value={value}
          onChange={(selected) => {
            onChange(selected ? selected.map(option => option.value) : []);
          }}
          className="filter-select"
          classNamePrefix="select"
          placeholder={`Select ${title.toLowerCase()}...`}
        />
      </div>
    );
  };

  return (
    <div className="container">
      <div className="error-container">
        {errors.map(error => (
          <ErrorToast
            key={error.id}
            error={error.message}
            onDismiss={() => removeError(error.id)}
          />
        ))}
      </div>
      
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
                  <div className="date-picker-container">
                    <div className="date-picker-wrapper">
                      <i className="fas fa-calendar date-picker-icon"></i>
                      <DatePicker
                        selected={filters.dateRange.start ? new Date(filters.dateRange.start) : null}
                        onChange={(date) => {
                          handleFilterChange('dateRange', {
                            ...filters.dateRange,
                            start: date ? date.toISOString().split('T')[0] : '',
                            preset: 'custom'
                          });
                        }}
                        className="date-picker-input"
                        placeholderText="Start date"
                        dateFormat="yyyy-MM-dd"
                      />
                    </div>
                    <div className="date-picker-wrapper">
                      <i className="fas fa-calendar date-picker-icon"></i>
                      <DatePicker
                        selected={filters.dateRange.end ? new Date(filters.dateRange.end) : null}
                        onChange={(date) => {
                          handleFilterChange('dateRange', {
                            ...filters.dateRange,
                            end: date ? date.toISOString().split('T')[0] : '',
                            preset: 'custom'
                          });
                        }}
                        className="date-picker-input"
                        placeholderText="End date"
                        dateFormat="yyyy-MM-dd"
                        minDate={filters.dateRange.start ? new Date(filters.dateRange.start) : null}
                      />
                    </div>
                  </div>
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
                <div className="column-search-container">
                  <input
                    type="text"
                    placeholder="Search columns..."
                    value={columnSearchInput}
                    onChange={handleColumnSearchChange}
                    className="column-search-input"
                  />
                </div>
                {filteredColumns.map(column => (
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
            {Array. from({ length: totalPages }, (_, i) => i + 1).map((page) => (
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