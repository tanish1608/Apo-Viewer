import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DatastoreList.css';

function DatastoreList() {
  const [searchFields, setSearchFields] = useState([
    { datastoreId: '', whereClause: '', sortBy: '' }
  ]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

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
    
    const validFields = searchFields.filter(field => field.datastoreId.trim());
    if (validFields.length === 0) {
      setError('At least one Datastore ID is required');
      return;
    }

    const searchParams = validFields.map(field => ({
      id: encodeURIComponent(field.datastoreId.trim()),
      where: field.whereClause.trim(),
      sortBy: field.sortBy.trim()
    }));

    const queryString = searchParams
      .map(params => {
        const query = new URLSearchParams();
        if (params.where) query.append(`where_${params.id}`, params.where);
        if (params.sortBy) query.append(`sortBy_${params.id}`, params.sortBy);
        return query.toString();
      })
      .filter(Boolean)
      .join('&');

    const datastoreIds = searchParams.map(params => params.id).join(',');
    navigate(`/datastore/${datastoreIds}${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <div className="container">
      <h1>Datastore Viewer</h1>
      <div className="search-form-container">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
          
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
                  placeholder="Enter datastore ID (e.g., HSBCUserAction)"
                />
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
  );
}

export default DatastoreList;