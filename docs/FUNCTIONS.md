• KEY FUNCTIONS


1. createAuction
What: Creates a new English auction.
When: When you want to list an NFT/item for auction.
How:
await createAuction({ contract, client, ...auctionParams });


2. getAllAuctions / getAuction
What: Fetches all auctions or a specific auction’s details.
When:
Use getAllAuctions to display a list/gallery of auctions.
Use getAuction to show details for a single auction.
How:
// All auctions
const auctions = await getAllAuctions({ contract, client });

// Single auction
const auction = await getAuction({ contract, client, auctionId: 1n });


3. bidInAuction
Note: bidInAuction is the underlying function or parameter type used by makeBid.
(You use makeBid by placing bidInAuction)
What: Places a bid on an auction.
When: When a user wants to bid on an active auction.
How:
await bidInAuction({ contract, client, auctionId: 1n, bidAmount: "1.2" });


4. buyoutAuction
(Note: buyout instantly buys auction at buyout price)
What: Instantly buys the auctioned item at the buyout price.
When: When a user wants to purchase immediately (if a buyout price is set).
How:
await buyoutAuction({ contract, client, auctionId: 1n });


5. getWinningBid
(Note: useful for showing real-time auction status.  e.g., current highest bid: 1.2 ETH)
What: Gets the current highest bid for an auction; reads results.
When: To display the leading bid or determine the winner after the auction ends.
How:
const winningBid = await getWinningBid({ contract, client, auctionId: 1n });


6. cancelAuction
What: Cancels an auction.
When: If the auction needs to be removed before completion (by the creator).
How:
await cancelAuction({ contract, client, auctionId: 1n });


7. Displaying Auction Prices
What: Use the EnglishAuction object’s properties.
How:
// Example: Display prices
console.log(auction.minimumBidAmount); // Minimum bid
console.log(auction.buyoutBidAmount); // Buyout price
console.log(auction.currentBidAmount); // Current highest bid


8.  Webhooks
Here’s what you need to do before creating your first webhook:

a. Set Up a Webhook Endpoint on Your Server
You need a backend route (e.g., https://satoshesluggers.com/api/webhook) that:
Accepts POST requests.
Responds with a 200 OK status within 3 seconds.
Optionally, verifies the webhook signature for security.
Example (Node.js/Express):

app.post("/api/webhook", (req, res) => {
  // Process the webhook payload here
  res.status(200).send("ok"); // Respond quickly!
});

b. Update Your Webhook URL
When creating the webhook in the thirdweb dashboard or API, use the full endpoint (e.g., https://satoshesluggers.com/api/webhook), not just your homepage.

c. Test Your Endpoint
You can use tools like Postman or curl to send a test POST request to your endpoint and ensure it responds with 200 OK.

d. (Optional) Use a Tunneling Service for Local Development
If you’re developing locally, use ngrok or similar to expose your local server to the internet and get a public URL for testing.

e. Check Your Server Logs
If the webhook test fails, check your server logs for incoming requests and errors.
Docs for reference:

Insight Webhooks Guide
Summary:
You must have a backend endpoint ready to receive and respond to webhook POST requests. 

---

Here’s how you can use webhooks for in-app notifications:

1. How Webhooks Work
thirdweb sends a webhook (HTTP POST) to your backend when an event (e.g., new bid) happens.
Your backend receives the event and processes it.

2. How to Use Webhooks for In-App Notifications
Step 1: Set up a webhook endpoint on your backend to receive auction/bid events.
Step 2: When a webhook is received (e.g., someone places a bid), your backend determines if a user should be notified (e.g., the previous highest bidder was outbid).
Step 3: Your backend sends a notification to the relevant user(s).
For in-app notifications, this usually means:
Storing the notification in your database.
Using WebSockets (e.g., Socket.IO) or a service like Pusher to push the notification to the user’s browser in real time.
Or, polling for new notifications when the user is online.

3. How to Identify the User
You can associate wallet addresses with user sessions in your app.
When a webhook comes in, check if the affected wallet address is currently connected or has an active session.
If so, send the notification to that user’s browser.

4. Example Flow
User A is the highest bidder on Auction #1.
User B places a higher bid.
thirdweb sends a webhook to your backend with the new bid event.
Your backend checks: “Who was the previous highest bidder?” (User A’s wallet address).
If User A is online, your backend sends a real-time notification to their browser: “You’ve been outbid on Auction #1!”

5. Summary Table












Why Webhooks Are Optimal

Real-time: You get notified instantly when an event (like a new bid, buyout, or auction end) happens—no need to poll the blockchain or API.
Efficient: Your backend only processes relevant events, reducing unnecessary API calls and rate limit issues.

Scalable: Handles high volumes of events (e.g., many auctions, bids) without overloading your frontend or backend.

How to Use Webhooks for Buyer Notifications
Webhooks deliver the event to your backend.

Your backend then decides how to notify the buyer:
In-app notification: Use WebSockets or push notifications to alert the user in real time.
Email/SMS: Optionally, send an email or SMS if you have the user’s contact info.
This separation keeps your frontend fast and your notification logic flexible.
