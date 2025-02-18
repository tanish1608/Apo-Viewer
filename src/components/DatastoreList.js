import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import HelpPanel from './HelpPanel';
import '../styles/DatastoreList.css';

// Environment configurations
const ENV_CONFIGS = {
  env1: 'https://api-env1.example.com',
  env2: 'https://api-env2.example.com',
  env3: 'https://api-env3.example.com'
};

function DatastoreList() {
  const [searchFields, setSearchFields] = useState([
    { datastoreId: '', whereClause: '', sortBy: '' }
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
      { datastoreId: '', whereClause: '', sortBy: '' }
    ]);
  };

  const handleRemoveDatastore = (index) => {
    if (searchFields.length > 1) {
      setSearchFields(searchFields.filter((_, i) => i !== index));
    }
  };

  const handleFieldChange = (index, field, value) => {
    const newFields = [...searchFields];
    newFields[index] = { ...newFields[index], [field]: value };
    setSearchFields(newFields);
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
      if (field.whereClause.trim()) {
        queryParams.append('where', field.whereClause.trim());
      }
      if (field.sortBy.trim()) {
        queryParams.append('sortBy', field.sortBy.trim());
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
            
            {searchFields.map((field, index) => (
              <div key={index} className="datastore-box">
                <div className="datastore-header">
                  <h3 className="datastore-title">Datastore {index + 1}</h3>
                  {searchFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDatastore(index)}
                      className="remove-button"
                    >
                      <i className="fas fa-times"></i>
                      Remove
                    </button>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor={`datastoreId-${index}`} className="form-label">
                    Datastore ID <span className="required">*</span>
                  </label>
                  <input
                    id={`datastoreId-${index}`}
                    type="text"
                    value={field.datastoreId}
                    onChange={(e) => handleFieldChange(index, 'datastoreId', e.target.value)}
                    className="form-input"
                    placeholder="Enter datastore IDs (e.g., HSBCUserAction, HSBCTestActivity)"
                  />
                  <p className="help-text">
                    You can enter multiple datastore IDs separated by commas
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor={`whereClause-${index}`} className="form-label">
                    Where Clause
                  </label>
                  <input
                    id={`whereClause-${index}`}
                    type="text"
                    value={field.whereClause}
                    onChange={(e) => handleFieldChange(index, 'whereClause', e.target.value)}
                    className="form-input"
                    placeholder="Enter where clause (optional)"
                  />
                  <p className="help-text">
                    Example: status='SUCCESS' AND fileType='PDF'
                  </p>
                </div>

                <div className="form-group">
                  <label htmlFor={`sortBy-${index}`} className="form-label">
                    Sort By
                  </label>
                  <input
                    id={`sortBy-${index}`}
                    type="text"
                    value={field.sortBy}
                    onChange={(e) => handleFieldChange(index, 'sortBy', e.target.value)}
                    className="form-input"
                    placeholder="Enter sort criteria (optional)"
                  />
                  <p className="help-text">
                    Example: creationTime DESC
                  </p>
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