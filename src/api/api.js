import { datastoreIds, datastoreFiles } from './mockData';

// Simulate API delay
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export const fetchDatastoreIds = async () => {
  await delay(500); // Simulate network delay
  return datastoreIds;
};

export const fetchDatastoreFiles = async (datastoreId) => {
  await delay(500); // Simulate network delay
  return datastoreFiles[datastoreId] || [];
};