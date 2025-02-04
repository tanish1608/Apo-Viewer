api.json

"' 
const apiUrl = "http://localhost:3000/your-endpoint"; // Replace with your API URL
const username = "your-username"; // Replace with actual username
const password = "your-password"; // Replace with actual password

// Encode credentials for Basic Auth
const headers = new Headers({
  "Authorization": "Basic " + btoa(`${username}:${password}`),
  "Content-Type": "application/json"
});

// Make the request
fetch(apiUrl, {
  method: "GET", // Change to "POST", "PUT", etc. if needed
  headers: headers
})
  .then(response => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json(); // Assuming the API returns JSON
  })
  .then(data => console.log("Response Data:", data))
  .catch(error => console.error("Fetch Error:", error));


"'