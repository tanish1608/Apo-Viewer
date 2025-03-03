import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HelpPanel from './HelpPanel';
import { DateRangePicker } from 'rsuite';
import 'rsuite/dist/rsuite.min.css';
import '../styles/DatastoreList.css';

// Environment configurations
const ENV_CONFIGS = {
  env1: 'https://api-env1.example.com',
  env2: 'https://api-env2.example.com',
  env3: 'https://api-env3.example.com'
};

// Filter field options
const FILTER_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'fileType', label: 'File Type' },
  { value: 'fileId', label: 'File UUID' },
  { value: 'fileName', label: 'File Name' },
  { value: 'clientName', label: 'Client Name' },
  { value: 'direction', label: 'Direction' }
];

// Condition options
const CONDITION_OPTIONS = [
  { value: '=', label: 'Equals (=)' },
  { value: '!=', label: 'Not Equals (!=)' },
  { value: 'LIKE', label: 'Contains (LIKE)' },
  { value: 'NOT LIKE', label: 'Not Contains (NOT LIKE)' },
  { value: '>', label: 'Greater Than (>)' },
  { value: '<', label: 'Less Than (<)' },
  { value: '>=', label: 'Greater Than or Equal (>=)' },
  { value: '<=', label: 'Less Than or Equal (<=)' }
];

function DatastoreList() {
  const [searchFields, setSearchFields] = useState([
    { 
      datastoreId: '', 
      filters: [{ field: 'status', condition: '=', value: '' }],
      dateRange: [null, null]
    }
  ]);
  const [selectedEnv, setSelectedEnv] = useState(() => {
    return localStorage.getItem('selected_env') || 'env1';
  });
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem('selected_env', selectedEnv);
    localStorage.setItem('api_url', ENV_CONFIGS[selectedEnv]);
  }, [selectedEnv]);

  const handleAddDatastore = () => {
    setSearchFields([
      ...searchFields,
      { 
        datastoreId: '', 
        filters: [{ field: 'status', condition: '=', value: '' }],
        dateRange: [null, null]
      }
    ]);
  };

  const handleRemoveDatastore = (index) => {
    if (searchFields.length > 1) {
      setSearchFields(searchFields.filter((_, i) => i !== index));
    }
  };

  const handleDatastoreIdChange = (index, value) => {
    const newFields = [...searchFields];
    newFields[index] = { ...newFields[index], datastoreId: value };
    setSearchFields(newFields);
  };

  const handleAddFilter = (datastoreIndex) => {
    const newFields = [...searchFields];
    newFields[datastoreIndex].filters.push({ field: 'status', condition: '=', value: '' });
    setSearchFields(newFields);
  };

  const handleRemoveFilter = (datastoreIndex, filterIndex) => {
    const newFields = [...searchFields];
    if (newFields[datastoreIndex].filters.length > 1) {
      newFields[datastoreIndex].filters = newFields[datastoreIndex].filters.filter(
        (_, i) => i !== filterIndex
      );
      setSearchFields(newFields);
    }
  };

  const handleFilterChange = (datastoreIndex, filterIndex, key, value) => {
    const newFields = [...searchFields];
    newFields[datastoreIndex].filters[filterIndex][key] = value;
    setSearchFields(newFields);
  };

  const handleDateRangeChange = (datastoreIndex, value) => {
    const newFields = [...searchFields];
    newFields[datastoreIndex].dateRange = value;
    setSearchFields(newFields);
  };

  const buildWhereClause = (filters, dateRange) => {
    const conditions = [];
    
    // Add filter conditions
    filters.forEach(filter => {
      if (filter.field && filter.condition && filter.value) {
        if (filter.condition === 'LIKE' || filter.condition === 'NOT LIKE') {
          conditions.push(`${filter.field} ${filter.condition} '%${filter.value}%'`);
        } else {
          conditions.push(`${filter.field} ${filter.condition} '${filter.value}'`);
        }
      }
    });
    
    // Add date range condition if present
    if (dateRange[0] && dateRange[1]) {
      const startDate = Math.floor(dateRange[0].getTime());
      const endDate = Math.floor(dateRange[1].getTime());
      conditions.push(`processingEndDate >= '${startDate}' AND processingEndDate <= '${endDate}'`);
    }
    
    return conditions.length > 0 ? conditions.join(' AND ') : '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const processedFields = searchFields.flatMap(field => {
      const datastoreIds = field.datastoreId.split(',').map(id => id.trim()).filter(Boolean);
      return datastoreIds.map(id => ({
        ...field,
        datastoreId: id
      }));
    });

    const validFields = processedFields.filter(field => field.datastoreId);
    if (validFields.length === 0) {
      setError('At least one Datastore ID is required');
      return;
    }

    const queryParams = new URLSearchParams();
    validFields.forEach(field => {
      const whereClause = buildWhereClause(field.filters, field.dateRange);
      if (whereClause) {
        queryParams.append('where', whereClause);
      }
    });

    const datastoreIds = validFields.map(field => encodeURIComponent(field.datastoreId.trim())).join(',');
    const queryString = queryParams.toString();
    navigate(`/datastore/${datastoreIds}${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Datastore Viewer</h1>
        <div className="user-section">
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className="help-button"
            title="Show Help"
          >
            <i className="fas fa-question-circle"></i>
            Help
          </button>
          <span className="username">{user?.username}</span>
          <button onClick={logout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />
        
        <div className="search-form-container">
          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
            
            <div className="api-url-box">
              <div className="form-group">
                <label htmlFor="environment" className="form-label">
                  Environment <span className="required">*</span>
                </label>
                <select
                  id="environment"
                  value={selectedEnv}
                  onChange={(e) => setSelectedEnv(e.target.value)}
                  className="form-input env-select"
                >
                  <option value="env1">Environment 1</option>
                  <option value="env2">Environment 2</option>
                  <option value="env3">Environment 3</option>
                </select>
              </div>
            </div>
            
            {searchFields.map((field, datastoreIndex) => (
              <div key={datastoreIndex} className="datastore-box">
                <div className="datastore-header">
                  <h3 className="datastore-title">Datastore {datastoreIndex + 1}</h3>
                  {searchFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDatastore(datastoreIndex)}
                      className="remove-button"
                    >
                      <i className="fas fa-times"></i>
                      Remove
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor={`datastoreId-${datastoreIndex}`} className="form-label">
                    Datastore ID <span className="required">*</span>
                  </label>
                  <input
                    id={`datastoreId-${datastoreIndex}`}
                    type="text"
                    value={field.datastoreId}
                    onChange={(e) => handleDatastoreIdChange(datastoreIndex, e.target.value)}
                    className="form-input"
                    placeholder="Enter datastore IDs (e.g., HSBCUserAction, HSBCTestActivity)"
                  />
                  <p className="help-text">
                    You can enter multiple datastore IDs separated by commas
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Date Range</label>
                  <DateRangePicker 
                    className="date-range-picker"
                    value={field.dateRange}
                    onChange={(value) => handleDateRangeChange(datastoreIndex, value)}
                    placeholder="Select date range"
                    format="yyyy-MM-dd"
                    block
                  />
                </div>

                <div className="filters-section">
                  <div className="filters-header">
                    <label className="form-label">Filters</label>
                    <button
                      type="button"
                      onClick={() => handleAddFilter(datastoreIndex)}
                      className="add-filter-button"
                    >
                      <i className="fas fa-plus"></i>
                      Add Filter
                    </button>
                  </div>
                  
                  {field.filters.map((filter, filterIndex) => (
                    <div key={filterIndex} className="filter-row">
                      <div className="filter-field">
                        <select
                          value={filter.field}
                          onChange={(e) => handleFilterChange(datastoreIndex, filterIndex, 'field', e.target.value)}
                          className="form-input"
                        >
                          {FILTER_FIELDS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="filter-condition">
                        <select
                          value={filter.condition}
                          onChange={(e) => handleFilterChange(datastoreIndex, filterIndex, 'condition', e.target.value)}
                          className="form-input"
                        >
                          {CONDITION_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="filter-value">
                        <input
                          type="text"
                          value={filter.value}
                          onChange={(e) => handleFilterChange(datastoreIndex, filterIndex, 'value', e.target.value)}
                          className="form-input"
                          placeholder="Enter value"
                        />
                      </div>
                      
                      {field.filters.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveFilter(datastoreIndex, filterIndex)}
                          className="remove-filter-button"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div className="button-container">
              <button
                type="button"
                onClick={handleAddDatastore}
                className="add-datastore-button"
              >
                <i className="fas fa-plus"></i>
                Add Another Datastore
              </button>

              <button
                type="submit"
                className="submit-button"
              >
                View Files
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default DatastoreList;