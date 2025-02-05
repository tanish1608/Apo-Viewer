api.json

```
const apiUrl = "http://localhost:3000/your-endpoint"; // API URL
const username = "your-username"; // Replace with actual username
const password = "your-password"; // Replace with actual password

// Encode credentials for Basic Auth
const headers = new Headers({
  "Authorization": "Basic " + btoa(`${username}:${password}`),
  "Content-Type": "application/json"
});

// Make the request
async function fetchData() {
  try {
    console.log("Sending request to:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: headers
    });

    console.log("Response Status:", response.status);
    console.log("Response Headers:", response.headers);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText || "Unknown error"}`);
    }

    const data = await response.json(); // Assuming API returns JSON
    console.log("Response Data:", data);
  } catch (error) {
    console.error("Fetch Error:", error.message || "Unknown Error", error);
  }
}

fetchData();

```