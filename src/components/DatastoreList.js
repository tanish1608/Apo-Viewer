import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function DatastoreList() {
  const [datastoreId, setDatastoreId] = useState('');
  const [whereClause, setWhereClause] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!datastoreId.trim()) {
      setError('Datastore ID is required');
      return;
    }

    // Build the query parameters
    const params = new URLSearchParams();
    if (whereClause.trim()) params.append('where', whereClause.trim());
    if (sortBy.trim()) params.append('sortBy', sortBy.trim());

    // Navigate to the datastore detail page with the parameters
    navigate(`/datastore/${encodeURIComponent(datastoreId)}?${params.toString()}`);
  };

  return (
    <div className="container">
      <h1>Datastore Viewer</h1>
      <div className="search-form-container bg-white p-6 rounded-lg shadow-md">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="error-message bg-red-50 text-red-700 p-3 rounded-md">
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="datastoreId" className="form-label">
              Datastore ID <span className="text-red-500">*</span>
            </label>
            <input
              id="datastoreId"
              type="text"
              value={datastoreId}
              onChange={(e) => setDatastoreId(e.target.value)}
              className="form-input"
              placeholder="Enter datastore ID (e.g., HSBCUserAction)"
            />
          </div>

          <div className="form-group">
            <label htmlFor="whereClause" className="form-label">
              Where Clause
            </label>
            <input
              id="whereClause"
              type="text"
              value={whereClause}
              onChange={(e) => setWhereClause(e.target.value)}
              className="form-input"
              placeholder="Enter where clause (optional)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Example: status='SUCCESS' AND fileType='PDF'
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="sortBy" className="form-label">
              Sort By
            </label>
            <input
              id="sortBy"
              type="text"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-input"
              placeholder="Enter sort criteria (optional)"
            />
            <p className="text-sm text-gray-500 mt-1">
              Example: creationTime DESC
            </p>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
          >
            View Files
          </button>
        </form>
      </div>
    </div>
  );
}

export default DatastoreList;