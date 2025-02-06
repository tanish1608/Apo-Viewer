import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchDatastoreFiles } from '../api/api';
import * as XLSX from 'xlsx';

// Constants in a separate object for better organization
const CONSTANTS = {
  ITEMS_PER_PAGE: 50,
  SEARCH_DEBOUNCE_MS: 300,
  EXPORT_BATCH_SIZE: 1000,
  DATE_PRESETS: [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'Last 7 days', value: '7days' },
    { label: 'Last 30 days', value: '30days' },
    { label: 'Custom', value: 'custom' }
  ]
};

// Separate utility functions
const utils = {
  formatDate: (timestamp) => {
    if (!timestamp || timestamp === -1) return '-';
    try {
      return new Date(parseInt(timestamp)).toLocaleString();
    } catch {
      return timestamp.toString();
    }
  },

  getDatastoreName: (id) => {
    if (id.includes(',')) return 'Multiple Datastores';
    const parts = id.split('.');
    return parts[parts.length - 1];
  },

  calculateDateRange: (preset) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let start = new Date();
    let end = new Date();

    switch (preset) {
      case 'today':
        end.setHours(23, 59, 59, 999);
        return { start, end };
      case 'yesterday':
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      case '7days':
        start.setDate(start.getDate() - 7);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      case '30days':
        start.setDate(start.getDate() - 30);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      default:
        return { start: new Date(0), end: new Date() };
    }
  }
};

// Separate reusable components
const FilterSection = React.memo(({ title, options, selectedValues, onChange }) => (
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
));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="loading-spinner"></div>
  </div>
);

function DatastoreDetail() {
  const { id } = useParams();
  const tableRef = useRef(null);
  const searchDebounceRef = useRef(null);

  // State management with initial values
  const [state, setState] = useState({
    files: [],
    loading: true,
    exportLoading: false,
    currentPage: 1,
    showFilters: false,
    columns: [],
    error: null,
    searchInput: '',
    filters: {
      dateRange: { start: '', end: '', preset: '' },
      classType: [],
      datastoreId: [],
      search: ''
    }
  });

  // Destructure state for easier access
  const {
    files,
    loading,
    exportLoading,
    currentPage,
    showFilters,
    columns,
    error,
    searchInput,
    filters
  } = state;

  // Optimized state updates
  const updateState = useCallback((updates) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Memoized data processing with error boundary
  const processedFiles = useMemo(() => {
    try {
      if (!files?.element) return [];
      return files.element.map(file => ({
        ...file,
        creationTime: file.creationTime ? parseInt(file.creationTime) : null,
        expirationTime: file.expirationTime === -1 ? null : parseInt(file.expirationTime)
      }));
    } catch (err) {
      console.error('Error processing files:', err);
      return [];
    }
  }, [files]);

  // Optimized search with debouncing
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    updateState({ searchInput: value });

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    searchDebounceRef.current = setTimeout(() => {
      updateState(prev => ({
        filters: {
          ...prev.filters,
          search: value.toLowerCase()
        }
      }));
    }, CONSTANTS.SEARCH_DEBOUNCE_MS);
  }, [updateState]);

  // Data fetching with error handling and cleanup
  useEffect(() => {
    let mounted = true;

    const loadFiles = async () => {
      try {
        updateState({ loading: true, error: null });
        
        const searchParams = new URLSearchParams(window.location.search);
        const queryString = searchParams.toString();
        
        const data = await fetchDatastoreFiles(decodeURIComponent(id), queryString);
        
        if (!mounted) return;

        if (!data?.element || !Array.isArray(data.element)) {
          throw new Error('Invalid data format received');
        }

        updateState({
          files: data,
          columns: data.element[0] ? Object.keys(data.element[0]) : [],
          loading: false
        });
      } catch (error) {
        if (mounted) {
          console.error('Error fetching files:', error);
          updateState({
            error: 'Failed to load files. Please try again.',
            loading: false
          });
        }
      }
    };

    loadFiles();

    return () => {
      mounted = false;
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, [id, updateState]);

  // Optimized filtering with memoization
  const filteredFiles = useMemo(() => {
    if (!processedFiles.length) return [];
    
    const searchTerm = filters.search.toLowerCase();
    if (!searchTerm && !filters.classType.length && !filters.datastoreId.length && 
        !filters.dateRange.start && !filters.dateRange.end) {
      return processedFiles;
    }

    const startDate = filters.dateRange.start ? new Date(filters.dateRange.start).getTime() : 0;
    const endDate = filters.dateRange.end ? new Date(filters.dateRange.end).getTime() : Infinity;

    return processedFiles.filter(file => {
      // Quick exit conditions
      if (filters.classType.length && !filters.classType.includes(file.classType)) return false;
      if (filters.datastoreId.length && !filters.datastoreId.includes(file.datastoreId)) return false;

      // Date range filter
      if ((filters.dateRange.start || filters.dateRange.end) && file.creationTime) {
        if (file.creationTime < startDate || file.creationTime > endDate) return false;
      }

      // Search optimization
      if (searchTerm) {
        const searchableFields = ['id', 'classType', 'datastoreId'];
        return searchableFields.some(field => 
          file[field] && file[field].toString().toLowerCase().includes(searchTerm)
        );
      }

      return true;
    });
  }, [processedFiles, filters]);

  const filterOptions = useMemo(() => {
    if (!processedFiles.length) return {};
    return {
      classType: Array.from(new Set(processedFiles.map(file => file.classType).filter(Boolean))),
      datastoreId: Array.from(new Set(processedFiles.map(file => file.datastoreId).filter(Boolean)))
    };
  }, [processedFiles]);

  const downloadExcel = useCallback(async () => {
    try {
      updateState({ exportLoading: true });
      
      const workbook = XLSX.utils.book_new();
      let wsData = [];
      
      for (let i = 0; i < filteredFiles.length; i += CONSTANTS.EXPORT_BATCH_SIZE) {
        const batch = filteredFiles.slice(i, i + CONSTANTS.EXPORT_BATCH_SIZE);
        const batchData = batch.map(file => {
          const row = {};
          columns.forEach(column => {
            row[column] = file[column] || '-';
          });
          return row;
        });
        wsData.push(...batchData);
      }

      const worksheet = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Data');
      XLSX.writeFile(workbook, `${utils.getDatastoreName(id)}_export.xlsx`);
    } catch (error) {
      console.error('Export failed:', error);
      updateState({ error: 'Export failed. Please try again.' });
    } finally {
      updateState({ exportLoading: false });
    }
  }, [filteredFiles, columns, id, updateState]);

  const downloadCSV = useCallback(() => {
    const csvContent = [
      columns.join(','),
      ...filteredFiles.map(file => 
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
    link.setAttribute('download', `${utils.getDatastoreName(id)}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [filteredFiles, columns, id]);

  const handleDatePresetChange = useCallback((preset) => {
    if (preset === 'custom') {
      updateState(prev => ({
        filters: {
          ...prev.filters,
          dateRange: { ...prev.filters.dateRange, preset }
        }
      }));
      return;
    }

    const { start, end } = utils.calculateDateRange(preset);
    updateState(prev => ({
      filters: {
        ...prev.filters,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0],
          preset
        }
      }
    }));
  }, [updateState]);

  const handleFilterChange = useCallback((filterType, value) => {
    updateState(prev => ({
      filters: {
        ...prev.filters,
        [filterType]: value
      },
      currentPage: 1
    }));
  }, [updateState]);

  const clearFilters = useCallback(() => {
    updateState({
      searchInput: '',
      filters: {
        dateRange: { start: '', end: '', preset: '' },
        classType: [],
        datastoreId: [],
        search: ''
      }
    });
  }, [updateState]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="container">
      {error && (
        <div className="error-message">
          {error}
          <button onClick={() => updateState({ error: null })}>Dismiss</button>
        </div>
      )}
      
      <div className="header-section">
        <Link to="/" className="back-link">← Back to Search</Link>
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

      <h1>{utils.getDatastoreName(id)} Files</h1>

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
          <button
            onClick={() => updateState({ showFilters: !showFilters })}
            className="filter-button"
          >
            <i className="fas fa-filter"></i>
            Show Filters
          </button>
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

      {showFilters && (
        <div className="filters-container">
          <div className="filter-section">
            <h3 className="filter-title">Date Range</h3>
            <div className="date-presets">
              {CONSTANTS.DATE_PRESETS.map(preset => (
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
              title="Class Type"
              options={filterOptions.classType || []}
              selectedValues={filters.classType}
              onChange={(values) => handleFilterChange('classType', values)}
            />
            
            <FilterSection
              title="Datastore ID"
              options={filterOptions.datastoreId || []}
              selectedValues={filters.datastoreId}
              onChange={(values) => handleFilterChange('datastoreId', values)}
            />
          </div>
        </div>
      )}

      <div className="table-container" ref={tableRef}>
        <table>
          <thead>
            <tr>
              {columns.map(column => (
                <th key={column}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredFiles.slice((currentPage - 1) * CONSTANTS.ITEMS_PER_PAGE, currentPage * CONSTANTS.ITEMS_PER_PAGE).map((file, index) => (
              <tr key={file.id || index}>
                {columns.map(column => (
                  <td key={column}>
                    {column === 'creationTime' || column === 'expirationTime' ? (
                      utils.formatDate(file[column])
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
          Showing <span>{(currentPage - 1) * CONSTANTS.ITEMS_PER_PAGE + 1}</span> to{' '}
          <span>{Math.min(currentPage * CONSTANTS.ITEMS_PER_PAGE, filteredFiles.length)}</span>{' '}
          of <span>{filteredFiles.length}</span> results
        </div>
        <div className="pagination-controls">
          <button
            onClick={() => updateState({ currentPage: currentPage - 1 })}
            disabled={currentPage === 1}
            className="pagination-button"
          >
            <i className="fas fa-chevron-left"></i>
            Previous
          </button>
          
          <div className="pagination-numbers">
            {Array.from({ length: Math.ceil(filteredFiles.length / CONSTANTS.ITEMS_PER_PAGE) }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => updateState({ currentPage: page })}
                className={`page-number ${currentPage === page ? 'active' : ''}`}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={() => updateState({ currentPage: currentPage + 1 })}
            disabled={currentPage === Math.ceil(filteredFiles.length / CONSTANTS.ITEMS_PER_PAGE)}
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


