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
              <strong>Datastore ID:</strong> Select from common datastores or type your own custom ID.
              Multiple datastores can be selected.
            </li>
            <li>
              <strong>Date & Time Range:</strong> Filter files by creation time using a date and time range.
              The times are converted to Unix timestamps for querying.
            </li>
          </ul>
        </section>

        <section>
          <h3>Filtering Options</h3>
          <p>
            The application provides several ways to filter your data:
          </p>
          
          <h4>Structured Filters</h4>
          <p>
            Create filters using field, condition, and value combinations:
          </p>
          <ul>
            <li><strong>Field:</strong> Select which field to filter on (Status, File Type, File UUID, etc.)</li>
            <li><strong>Condition:</strong> Choose a comparison operator (=, !=, LIKE, etc.)</li>
            <li><strong>Value:</strong> Enter the value to compare against</li>
          </ul>
          
          <h4>Filter Examples:</h4>
          <div className="example-box">
            <p><strong>Example 1:</strong> Find all successful files</p>
            <ul>
              <li>Field: Status</li>
              <li>Condition: Equals (=)</li>
              <li>Value: SUCCESS</li>
            </ul>
          </div>
          
          <div className="example-box">
            <p><strong>Example 2:</strong> Find files containing "PDF" in the file type</p>
            <ul>
              <li>Field: File Type</li>
              <li>Condition: Contains (LIKE)</li>
              <li>Value: PDF</li>
            </ul>
          </div>
          
          <div className="example-box">
            <p><strong>Example 3:</strong> Find files from a specific client</p>
            <ul>
              <li>Field: Client Name</li>
              <li>Condition: Equals (=)</li>
              <li>Value: HSBC_LOCALISATION_TESTING</li>
            </ul>
          </div>
          
          <h4>Custom Where Conditions</h4>
          <p>
            For advanced filtering, you can write custom SQL WHERE conditions:
          </p>
          <div className="example-box">
            <p><strong>Example:</strong> Find files that are either SUCCESS status or have PDF in the file type</p>
            <pre>status = 'SUCCESS' OR fileType LIKE '%PDF%'</pre>
          </div>
          
          <div className="example-box">
            <p><strong>Example:</strong> Find files with specific client and direction</p>
            <pre>clientName = 'HSBC_TEST' AND direction = 'OUTBOUND'</pre>
          </div>
          
          <p className="note">
            Note: Custom WHERE conditions are combined with other filters using AND logic.
          </p>
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
            <li>Use multiple datastores to view combined results</li>
            <li>Combine structured filters with custom WHERE conditions for precise filtering</li>
            <li>Use date/time ranges to narrow down results by creation time</li>
            <li>Export large datasets in batches for better performance</li>
            <li>Use the column selector in the results view to customize your display</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default HelpPanel;