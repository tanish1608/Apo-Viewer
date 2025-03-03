import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDatastoreFiles } from '../api/api';
import * as XLSX from 'xlsx';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import "react-datepicker/dist/react-datepicker.css";
import '../styles/Sort.css';
import '../styles/ColumnSelector.css';
import '../styles/Pagination.css';
import { mockData } from '../api/mockData';
import ErrorToast from './ErrorToast';

// Constants
const ITEMS_PER_PAGE = 50;
const SEARCH_DEBOUNCE_MS = 300;
const EXPORT_BATCH_SIZE = 1000;
const MAX_PAGES_SHOWN = 5;

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
  const [columnOrder, setColumnOrder] = useState([]); 
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState([]);
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
  const [totalCount, setTotalCount] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(ITEMS_PER_PAGE);
  const [currentBatch, setCurrentBatch] = useState(1);
  const [allBatches, setAllBatches] = useState([]);

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

  // Generate mock data for testing pagination
  const generateMockData = useCallback((count = 10000) => {
    const mockFiles = [];
    const statuses = ['SUCCESS', 'FAILED', 'PROCESSING', 'WARNING'];
    const fileTypes = ['PDF_REPORT', 'EXCEL_REPORT', 'TRANSACTION_LOG', 'AUDIT_LOG', 'PAYMENT', 'BATCH_PAYMENT'];
    const directions = ['INBOUND', 'OUTBOUND', 'INTERNAL'];
    const clientNames = ['HSBC_REPORTING', 'HSBC_ANALYTICS', 'HSBC_COMPLIANCE', 'HSBC_SECURITY', 'HSBC_PAYMENTS', 'HSBC_BATCH_PAYMENTS', 'HSBC_MONITOR', 'HSBC_ACCESS'];
    
    for (let i = 0; i < count; i++) {
      const date = new Date();
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      
      mockFiles.push({
        fileId: `FILE${i.toString().padStart(6, '0')}`,
        fileName: `TestFile_${i.toString().padStart(6, '0')}.${Math.random() > 0.5 ? 'pdf' : 'xlsx'}`,
        fileType: fileTypes[Math.floor(Math.random() * fileTypes.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        clientName: clientNames[Math.floor(Math.random() * clientNames.length)],
        direction: directions[Math.floor(Math.random() * directions.length)],
        processingEndDate: date.getTime().toString(),
        datastoreId: id,
        creationTime: date.getTime(),
        pageCount: Math.floor(Math.random() * 100),
        dataPoints: Math.floor(Math.random() * 10000),
        reportType: Math.random() > 0.5 ? 'DAILY' : (Math.random() > 0.5 ? 'WEEKLY' : 'MONTHLY'),
        department: Math.random() > 0.5 ? 'FINANCE' : (Math.random() > 0.5 ? 'OPERATIONS' : 'COMPLIANCE')
      });
    }
    
    return mockFiles;
  }, [id]);

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
          // Generate large mock dataset for testing pagination
          const mockFiles = generateMockData(10000);
          data = { 
            element: mockFiles,
            hasMore: true,
            superCount: mockFiles.length,
            type: "mock"
          };
        } else if (id.toLowerCase().includes('test')) {
          const mockDatastore = Object.values(mockData).find(store => 
            store.datastoreId.toLowerCase().includes('test') ||
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
        setTotalCount(data.superCount || data.element.length);
        setHasMoreData(data.hasMore || false);
        
        // Split data into batches for efficient rendering
        const batchSize = 1000;
        const batches = [];
        for (let i = 0; i < data.element.length; i += batchSize) {
          batches.push(data.element.slice(i, i + batchSize));
        }
        setAllBatches(batches);
        
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
  }, [id, generateMockData]);

  // Handlers
  const handleSort = useCallback((field) => {
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
    try {
      setExportLoading(true);
      
      if (filteredFiles.length === 0) {
        addError('No data available to export');
        return;
      }
      
      const csvContent = [
        visibleColumns.map(column => formatColumnHeader(column)).join(','),
        ...filteredFiles.map(file => 
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
    } catch (error) {
      console.error('Export failed:', error);
      addError('Failed to export data. Please try again.');
    } finally {
      setExportLoading(false);
    }
  }, [filteredFiles, visibleColumns, id, getDatastoreName, addError]);

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

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredFiles.length / pageSize);
  const visibleRange = {
    start: (currentPage - 1) * pageSize,
    end: currentPage * pageSize
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages = [];
    
    if (totalPages <= MAX_PAGES_SHOWN) {
      // Show all pages if there are fewer than MAX_PAGES_SHOWN
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      // Calculate start and end of middle pages
      let startPage = Math.max(2, currentPage - Math.floor(MAX_PAGES_SHOWN / 2));
      let endPage = Math.min(totalPages - 1, startPage + MAX_PAGES_SHOWN - 3);
      
      // Adjust if we're near the end
      if (endPage === totalPages - 1) {
        startPage = Math.max(2, endPage - (MAX_PAGES_SHOWN - 3));
      }
      
      // Add ellipsis after first page if needed
      if (startPage > 2) {
        pages.push('...');
      }
      
      // Add middle pages
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
      
      // Add ellipsis before last page if needed
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
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
                  <div className="date-presets">
                    {DATE_PRESETS.map(preset => (
                      <button
                        key={preset.value}
                        className={`date-preset-button ${filters.dateRange.preset === preset.value ? 'active' : ''}`}
                        onClick={() => handleDatePresetChange(preset.value)}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
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
        <div className="pagination-controls-wrapper">
          <div className="pagination-info">
            Showing <span>{visibleRange.start + 1}</span> to{' '}
            <span>{Math.min(visibleRange.end, filteredFiles.length)}</span>{' '}
            of <span>{filteredFiles.length}</span> results
          </div>
          
          <div className="pagination-size-selector">
            <label htmlFor="page-size">Rows per page:</label>
            <select 
              id="page-size" 
              value={pageSize} 
              onChange={handlePageSizeChange}
              className="page-size-select"
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          
          <div className="pagination-controls">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="pagination-button first-page"
              title="First Page"
            >
              <i className="fas fa-angle-double-left"></i>
            </button>
            
            <button
              onClick={() => setCurrentPage(prev => prev - 1)}
              disabled={currentPage === 1}
              className="pagination-button prev-page"
              title="Previous Page"
            >
              <i className="fas fa-angle-left"></i>
            </button>
            
            <div className="pagination-numbers">
              {getPageNumbers().map((page, index) => (
                page === '...' ? (
                  <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
                ) : (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`page-number ${currentPage === page ? 'active' : ''}`}
                  >
                    {page}
                  </button>
                )
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => prev + 1)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="pagination-button next-page"
              title="Next Page"
            >
              <i className="fas fa-angle-right"></i>
            </button>
            
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages || totalPages === 0}
              className="pagination-button last-page"
              title="Last Page"
            >
              <i className="fas fa-angle-double-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(DatastoreDetail);