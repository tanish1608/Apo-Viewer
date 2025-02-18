import React from 'react';
import '../styles/HelpPanel.css';

const HelpPanel = ({ isOpen, onClose }) => {
  return (
    <div className={`help-panel ${isOpen ? 'open' : ''}`}>
      <div className="help-header">
        <h2>Help & Documentation</h2>
        <button onClick={onClose} className="close-button">
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="help-content">
        <section>
          <h3>Getting Started</h3>
          <p>
            The Datastore Viewer allows you to view and manage datastore files with advanced filtering,
            sorting, and export capabilities.
          </p>
        </section>

        <section>
          <h3>Environment Selection</h3>
          <p>
            Choose the appropriate environment from the dropdown menu:
          </p>
          <ul>
            <li>Environment 1: Development environment</li>
            <li>Environment 2: Testing environment</li>
            <li>Environment 3: Production environment</li>
          </ul>
        </section>

        <section>
          <h3>Datastore Configuration</h3>
          <p>
            You can configure one or more datastores to view:
          </p>
          <ul>
            <li>
              <strong>Datastore ID:</strong> Enter one or multiple datastore IDs separated by commas
              (e.g., HSBCUserAction, HSBCTestActivity)
            </li>
            <li>
              <strong>Where Clause:</strong> Optional filter condition
              (e.g., status='SUCCESS' AND fileType='PDF')
            </li>
            <li>
              <strong>Sort By:</strong> Optional sorting criteria
              (e.g., creationTime DESC)
            </li>
          </ul>
        </section>

        <section>
          <h3>File View Features</h3>
          <p>
            The file view provides several features:
          </p>
          <ul>
            <li>Advanced filtering by date, status, type, and more</li>
            <li>Column customization</li>
            <li>Sorting capabilities</li>
            <li>Export to Excel or CSV</li>
          </ul>
        </section>

        <section>
          <h3>Tips & Tricks</h3>
          <ul>
            <li>Use comma-separated IDs to view multiple datastores at once</li>
            <li>Combine where clauses for precise filtering</li>
            <li>Export large datasets in batches for better performance</li>
            <li>Use the column selector to customize your view</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HelpPanel;