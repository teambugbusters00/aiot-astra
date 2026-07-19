import dotenv from "dotenv";
dotenv.config();

// test.js
const apiKey = process.env.NVIDIA_API_KEY;

if (!apiKey) {
  console.error("❌ Error: NVIDIA_API_KEY environment variable is missing.");
  console.log("Make sure you are passing the .env file when running this script.");
  process.exit(1);
}

async function testNvidiaConnection() {
  console.log("Testing connection to NVIDIA API (meta/llama-3.3-70b-instruct)...");
  console.log("Waiting for response...\n");
  
  const startTime = Date.now();

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "meta/llama-3.3-70b-instruct",
        messages: [
          { role: "user", content: "Hello! Please reply with a short, one-sentence test confirmation." }
        ],
        max_tokens: 50
      })
    });

    const data = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      console.error(`❌ Connection failed! HTTP Status: ${response.status} ${response.statusText}`);
      console.error("Error details:", JSON.stringify(data, null, 2));
    } else {
      console.log(`✅ Success! (Response time: ${duration} seconds)`);
      console.log(`🤖 Llama 3.3 says: "${data.choices[0].message.content.trim()}"`);
    }
  } catch (error) {
    console.error("❌ Network connection failed or timed out.");
    console.error("Error details:", error.message);
  }
}

testNvidiaConnection();