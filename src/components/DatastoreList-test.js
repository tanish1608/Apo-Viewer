import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HelpPanel from './HelpPanel';
import { DateRangePicker } from 'rsuite';
import CreatableSelect from 'react-select/creatable';
import { buildSafeWhereClause } from '../utils/security';
import { useLocalStorage } from '../hooks/useLocalStorage';
import 'rsuite/dist/rsuite.min.css';
import '../styles/DatastoreList.css';

const ENV_CONFIGS = {
  env1: 'https://api-env1.example.com',
  env2: 'https://api-env2.example.com',
  env3: 'https://api-env3.example.com'
};

const DEFAULT_DATASTORES = [
  { value: 'com.seeburger.sil.hsbc.HSBCUserAction', label: 'HSBCUserAction' },
  { value: 'com.seeburger.sil.hsbc.HSBCTestActivity', label: 'HSBCTestActivity' },
  { value: 'com.seeburger.sil.hsbc.PaymentProcessing', label: 'PaymentProcessing' },
  { value: 'com.seeburger.sil.hsbc.TransactionMonitor', label: 'TransactionMonitor' },
  { value: 'com.seeburger.sil.hsbc.AuditLogger', label: 'AuditLogger' },
  { value: 'com.seeburger.sil.hsbc.ReportGenerator', label: 'ReportGenerator' }
];

const FILTER_FIELDS = [
  { value: 'status', label: 'Status' },
  { value: 'fileType', label: 'File Type' },
  { value: 'fileId', label: 'File UUID' },
  { value: 'fileName', label: 'File Name' },
  { value: 'clientName', label: 'Client Name' },
  { value: 'direction', label: 'Direction' }
];

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
  const [searchFields, setSearchFields] = useLocalStorage('searchFields', [
    { 
      datastoreId: '', 
      filters: [{ field: 'status', condition: '=', value: '' }],
      customWhereCondition: undefined,
      dateRange: [null, null]
    }
  ]);
  
  const [selectedEnv, setSelectedEnv] = useLocalStorage('selected_env', 'env1');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  useEffect(() => {
    localStorage.setItem('api_url', ENV_CONFIGS[selectedEnv]);

    if (selectedEnv === 'env2') {
      setSearchFields(prev => prev.map(field => ({
        ...field,
        dateRange: [null, null]
      })));
    }
  }, [selectedEnv]);

  const getDateRangeConfig = () => {
    if (selectedEnv === 'env2') {
      const today = new Date();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 7);
      
      return {
        disabledDate: date => date < sevenDaysAgo || date > today,
        defaultValue: [sevenDaysAgo, today]
      };
    }
    return {};
  };

  const handleAddDatastore = () => {
    setSearchFields([
      ...searchFields,
      { 
        datastoreId: '', 
        filters: [{ field: 'status', condition: '=', value: '' }],
        customWhereCondition: undefined,
        dateRange: [null, null]
      }
    ]);
  };

  const handleRemoveDatastore = (index) => {
    if (searchFields.length > 1) {
      setSearchFields(searchFields.filter((_, i) => i !== index));
    }
  };

  const handleDatastoreIdChange = (index, selectedOption) => {
    const newFields = [...searchFields];
    if (selectedOption) {
      if (Array.isArray(selectedOption)) {
        newFields[index] = { 
          ...newFields[index], 
          datastoreId: selectedOption.map(option => option.value).join(',') 
        };
      } else {
        newFields[index] = { 
          ...newFields[index], 
          datastoreId: selectedOption.value 
        };
      }
    } else {
      newFields[index] = { ...newFields[index], datastoreId: '' };
    }
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

  const handleCustomWhereConditionChange = (datastoreIndex, value) => {
    const newFields = [...searchFields];
    newFields[datastoreIndex].customWhereCondition = value;
    setSearchFields(newFields);
  };

  const handleDateRangeChange = (datastoreIndex, value) => {
    const newFields = [...searchFields];
    newFields[datastoreIndex].dateRange = value;
    setSearchFields(newFields);
  };

  const convertToUnixTimestamp = (date) => {
    if (!date) return null;
    return Math.floor(new Date(date).getTime());
  };

  const handleSubmit = useCallback((e) => {
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

    try {
      const queryParams = new URLSearchParams();
      validFields.forEach(field => {
        const whereClause = buildSafeWhereClause(field.filters, field.dateRange, field.customWhereCondition);
        if (whereClause) {
          queryParams.append('where', whereClause);
        }
      });

      const datastoreIds = validFields.map(field => 
        encodeURIComponent(field.datastoreId.trim())
      ).join(',');
      
      const queryString = queryParams.toString();
      navigate(`/datastore/${datastoreIds}${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
      setError(error.message);
    }
  }, [searchFields, navigate]);

  const getDatastoreSelectValue = (index) => {
    const datastoreId = searchFields[index].datastoreId;
    if (!datastoreId) return null;
    
    const ids = datastoreId.split(',').map(id => id.trim());
    
    const options = ids.map(id => {
      const existingOption = DEFAULT_DATASTORES.find(option => option.value === id);
      return existingOption || { value: id, label: id.split('.').pop() };
    });
    
    return options;
  };

  const dateRangeConfig = getDateRangeConfig();

  return (
    <div className="container">
      <div className="header">
        <div className="header-left">
          <div className="logo">
            <i className="fas fa-database"></i>
          </div>
          <div className="header-titles">
            <h1 className="header-title">Datastore Viewer</h1>
            <p className="header-subtitle">View and manage your datastore files</p>
          </div>
        </div>
        <div className="user-section">
          <span className="username">
            <i className="fas fa-user-circle"></i>
            {user?.username}
          </span>
          <button 
            onClick={() => setShowHelp(!showHelp)} 
            className="help-button"
          >
            <i className="fas fa-question-circle"></i>
            Help
          </button>
          <button onClick={logout} className="logout-button">
            <i className="fas fa-sign-out-alt"></i>
            Logout
          </button>
        </div>
      </div>
      
      <div className="main-content">
        <HelpPanel isOpen={showHelp} onClose={() => setShowHelp(false)} />
        
        <div className="search-form-container">
          <div className="search-form-header">
            <h2 className="search-form-title">Configure Datastores</h2>
            <p className="search-form-description">Select datastores and apply filters to view files</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="error-message">
                <i className="fas fa-exclamation-circle"></i>
                {error}
              </div>
            )}
            
            <div className="api-url-box">
              <div className="form-group">
                <label htmlFor="environment" className="form-label">
                  Environment<span className="required">*</span>
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
                {selectedEnv === 'env2' && (
                  <p className="help-text">
                    <i className="fas fa-info-circle"></i>
                    Date range is restricted to last 7 days in Environment 2
                  </p>
                )}
              </div>
            </div>
            
            <div className="datastore-boxes-container">
              {searchFields.map((field, datastoreIndex) => (
                <div key={datastoreIndex} className="datastore-box">
                  <div className="datastore-header">
                    <h3 className="datastore-title">
                      <i className="fas fa-database"></i>
                      Datastore {datastoreIndex + 1}
                    </h3>
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

                  <div className="datastore-content">
                    <div className="form-group">
                      <label htmlFor={`datastoreId-${datastoreIndex}`} className="form-label">
                        Datastore ID<span className="required">*</span>
                      </label>
                      <CreatableSelect
                        id={`datastoreId-${datastoreIndex}`}
                        value={getDatastoreSelectValue(datastoreIndex)}
                        onChange={(selectedOption) => handleDatastoreIdChange(datastoreIndex, selectedOption)}
                        options={DEFAULT_DATASTORES}
                        className="datastore-select"
                        classNamePrefix="datastore-select"
                        placeholder="Select or type datastore ID..."
                        isMulti
                        isClearable
                        isSearchable
                        formatCreateLabel={(inputValue) => `Use "${inputValue}"`}
                        createOptionPosition="first"
                      />
                      <p className="help-text">
                        <i className="fas fa-info-circle"></i>
                        Select from common datastores or type your own
                      </p>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Date & Time Range</label>
                      <DateRangePicker 
                        className="date-range-picker"
                        value={field.dateRange}
                        onChange={(value) => handleDateRangeChange(datastoreIndex, value)}
                        placeholder="Select date and time range"
                        format="yyyy-MM-dd HH:mm:ss"
                        block
                        showMeridian
                        {...dateRangeConfig}
                      />
                      <p className="help-text">
                        <i className="fas fa-info-circle"></i>
                        Times are converted to GMT and Unix timestamps for querying
                      </p>
                    </div>

                    <div className="filters-section">
                      <div className="filters-header">
                        <label className="form-label">Filters</label>
                        <div className="filter-buttons">
                          <button
                            type="button"
                            onClick={() => handleAddFilter(datastoreIndex)}
                            className="add-filter-button"
                          >
                            <i className="fas fa-plus"></i>
                            Add Filter
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const newFields = [...searchFields];
                              newFields[datastoreIndex].customWhereCondition = newFields[datastoreIndex].customWhereCondition || '';
                              setSearchFields(newFields);
                            }}
                            className="add-custom-where-button"
                          >
                            <i className="fas fa-code"></i>
                            Custom Where
                          </button>
                        </div>
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
                      
                      {field.customWhereCondition !== undefined && (
                        <div className="custom-where-container">
                          <div className="custom-where-header">
                            <label className="form-label">Custom Where Condition</label>
                            <button
                              type="button"
                              onClick={() => {
                                const newFields = [...searchFields];
                                delete newFields[datastoreIndex].customWhereCondition;
                                setSearchFields(newFields);
                              }}
                              className="remove-filter-button"
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          </div>
                          <textarea
                            value={field.customWhereCondition}
                            onChange={(e) => handleCustomWhereConditionChange(datastoreIndex, e.target.value)}
                            className="form-input custom-where-input"
                            placeholder="Enter custom WHERE condition (e.g., status = 'SUCCESS' AND fileType LIKE '%PDF%')"
                            rows={3}
                          />
                          <p className="help-text">
                            <i className="fas fa-info-circle"></i>
                            Write a custom SQL WHERE condition that will be combined with other filters
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="button-container">
              <div className="button-group">
                <button
                  type="button"
                  onClick={handleAddDatastore}
                  className="add-datastore-button"
                >
                  <i className="fas fa-plus"></i>
                  Add Another Datastore
                </button>
              </div>

              <button
                type="submit"
                className="submit-button"
              >
                <i className="fas fa-search"></i>
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