api.json

```
import fetch from "node-fetch";
import https from "https";

const apiUrl = "https://mt-conn-core-api-dev.hk.hsbc:14100/api/sil/query/elements?datastoreId=HSBCUserAction";
const username = "your-username"; 
const password = "your-password";
const encodedCredentials = Buffer.from(`${username}:${password}`).toString("base64");

// Create an agent that allows self-signed SSL certificates
const agent = new https.Agent({
  rejectUnauthorized: false
});

fetch(apiUrl, {
  method: "GET",
  headers: {
    "Authorization": `Basic ${encodedCredentials}`,
    "Accept": "*/*",
    "User-Agent": "insomnia/2021.5.3",
  },
  agent, // Use the custom agent to ignore SSL validation
})
  .then(response => {
    console.log("Response Status:", response.status);
    return response.text(); // API returns XML, not JSON
  })
  .then(data => console.log("Response Data:", data))
  .catch(error => console.error("Fetch Error:", error.message || "Unknown Error"));








// Function to process and parse JSON responses
const processResponse = async (response) => {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error('Error parsing JSON:', error);
    throw new Error('Invalid JSON response from server');
  }
};

```