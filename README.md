api.json

```
const apiUrl = "http://mt-conn-core-api-dev.hk.hsbc:14100/api/sil/element-dna";
const username = "your-username"; // Replace with actual username
const password = "your-password"; // Replace with actual password

const encodedCredentials = btoa(`${username}:${password}`);

fetch(apiUrl, {
  method: "GET",
  headers: {
    "Authorization": `Basic ${encodedCredentials}`,
    "Accept": "*/*", // Match Insomnia’s Accept header
    "User-Agent": "insomnia/2021.5.3", // Some APIs restrict User-Agent
  },
  mode: "cors", // Ensure CORS is handled properly
  credentials: "include", // Send authentication credentials
})
  .then(response => {
    console.log("Response Status:", response.status);
    console.log("Response Headers:", response.headers);

    if (!response.ok) {
      return response.text().then(text => {
        throw new Error(`HTTP ${response.status}: ${text || "Unknown error"}`);
      });
    }

    return response.text(); // API returns XML, not JSON
  })
  .then(data => console.log("Response Data:", data))
  .catch(error => console.error("Fetch Error:", error.message || "Unknown Error", error));

```