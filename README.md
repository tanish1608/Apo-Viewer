api.json

```
fetch(apiUrl, {
  method: "GET",
  headers: {
    "Authorization": "Basic " + btoa(`${username}:${password}`),
    "Content-Type": "application/json"
  }
})
  .then(async response => {
    if (!response.ok) {
      // Try to read the error message
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return response.json();
  })
  .then(data => console.log("Response Data:", data))
  .catch(error => console.error("Fetch Error:", error.message || error));



```