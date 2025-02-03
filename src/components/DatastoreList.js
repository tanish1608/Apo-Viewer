import React, { useState, useEffect } from 'react';
import { fetchDatastoreIds } from '../api/api';
import { Link } from 'react-router-dom';

function DatastoreList() {
  const [datastores, setDatastores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDatastores = async () => {
      try {
        const data = await fetchDatastoreIds();
        setDatastores(data);
      } catch (error) {
        console.error('Error fetching datastores:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDatastores();
  }, []);

  const getDatastoreName = (id) => {
    const parts = id.split('.');
    return parts[parts.length - 1];
  };

  const formatDate = (timestamp) => {
    const date = new Date(parseInt(timestamp));
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="container">Loading datastores...</div>;
  }

  return (
    <div className="container">
      <h1>Datastores</h1>
      <div className="datastore-grid">
        {datastores.map(store => (
          <Link 
            to={`/datastore/${encodeURIComponent(store.id)}`}
            key={store.id}
            className="datastore-card"
          >
            <div className="datastore-icon">
              <i className="fas fa-database"></i>
            </div>
            <h2>{getDatastoreName(store.id)}</h2>
            <p>Created: {formatDate(store.creationTime)}</p>
            <p>Type: {store.publishActionType}</p>
            <div className="view-files-link">
              Click to view files →
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default DatastoreList;