// src/app.js
// REST API server.
//

// imports
require("dotenv").config();
const express = require("express");
const helmet = require("helmet");
const morgan = require("morgan");
const WebSocket = require("ws");
const customRequest = require("./utils/customRequest");
const utils = require("./utils/utils");
// server router
const router = require("./routes/routes");

// Variables
const inMemoryOrderBook = { ...utils.orderBookInitState };
const PORT = process.env.PORT || 3001;

// configuring middlewares
morgan.token("body", (req, res) => {
  if (req.body == null) {
    return {};
  } else {
    const bodyString = JSON.stringify(req.body);
    return bodyString.length < 120
      ? bodyString
      : bodyString.slice(0, 120) + "...";
  }
});

// create server
const cors = require('cors');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: '*',
  }
});

// apply middlewares
app.use(cors())
app.options('*', cors());
app.use(express.json());
app.use(helmet());
app.use(
  morgan(
    "> :method :req[header] :url :status :body - :response-time ms \n----------\n"
  )
);

async function asyncApp() {
  try {
    // make API request to fetch an initial snapshot of each pair.

    for (const pair of utils.pairs) {
      // fetch snapshot of the pair
      const query = await customRequest(
        `/api/v3/depth?symbol=${pair.toUpperCase()}&limit=1000`,
        false,
        "api.binance.com"
      );

      // update global variable 'inMemoryOrderBook' that holds the data
      // being updated via websocket
      const parsedQuery = utils.createMemoryOrderBook(query);
      inMemoryOrderBook[pair].lastUpdateId = parsedQuery.lastUpdateId;
      inMemoryOrderBook[pair].bids = parsedQuery.bids;
      inMemoryOrderBook[pair].asks = parsedQuery.asks;
    }

    // using pair
    let usingPair = '';

    // create and run the serversocket in the background
    io.on('connection', (socket) => {
      console.log('a user connected');
      
      socket.on('message', ([type, payload]) => {
        switch (type) {
          case 'pair-token':
            usingPair = payload;
            break;
        }
      });

      socket.on('disconnect', () => {
        console.log('user disconnected');
      });
    });

    // create and run the websocket in the background.
    const ws = new WebSocket(utils.wsStringMulti);

    ws.on("open", () => {
      console.log("websocket connected");
      
      // Subscribe to the depth data and ticker streams
      const subscriptionMessage = JSON.stringify({
        method: 'SUBSCRIBE',
        params: [
          'btcusdt@depth',
          'ethusdt@depth',
          'bnbusdt@depth',
          'btcusdt@ticker',
          'ethusdt@ticker',
          'bnbusdt@ticker'
        ],
        id: 1
      });

      ws.send(subscriptionMessage);
    });

    ws.on("error", err => {
      console.log("error");
      console.log(err);
    });

    ws.on("close", () => {
      console.log("websocket closed");
    });

    ws.on("message", data => {
      // parse raw data
      const parsedData = JSON.parse(data);
      const stream = parsedData.stream?.toLowerCase();

      // Check the stream field to determine which type of data the message is for
      if (stream?.endsWith('@depth')) {
        // Depth data update
        // update inMemoryOrderBook
        for (let i = 0; i <= utils.pairs.length - 1; i++) {
          if (stream.includes(utils.pairs[i].toLowerCase())) {
            const updatedPair = utils.updateMemoryOrderBook(
              inMemoryOrderBook,
              parsedData
            );

            if (updatedPair != null) {
              inMemoryOrderBook[utils.pairs[i]] = {
                ...updatedPair[utils.pairs[i]]
              };
            }
            break;
          }
        }

        const copyOfOrderBook = utils.copyOrderBook(inMemoryOrderBook);
        const topOrders = utils.getTopOrders(copyOfOrderBook);
        const response = {
          result: {
            bids: topOrders[usingPair]?.bids,
            asks: topOrders[usingPair]?.asks
          }
        }

        // broadcast inMemoryOrderBook to clients
        io.emit('message', ['pair-info', response]);
      } else if (stream?.endsWith('@ticker')) {
        // Ticker data update
        if (stream.includes(usingPair)) {
          const response = {
            result: {
              high_price: parsedData.data.h,
              low_price: parsedData.data.l,
              price_change: parsedData.data.p,
              volume: parsedData.data.v,
            }
          }

          // broadcast market data directly to clients
          io.emit('message', ['pair-extra', response]);
        }
      }
    });
    
    ws.on("ping", () => {
      console.log("received ping from websocket server");
      ws.pong();
      console.log("sent pong");
    });

    // middleware to pass the updated inMemoryOrderBook to express
    app.use("/api/v1", (req, res, next) => {
      req.inMemoryOrderBook = inMemoryOrderBook;
      next();
    });

    // configure express server
    app.use("/api/v1", router);

    // catch 404
    app.use((req, res, next) => {
      res.status(404).json({
        message: "That route doesnt exists"
      });
    });

    // error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        message: "Error Message"
      });
    });

    http.listen(PORT, () => {
      console.log(`listening on port: ${PORT}`);
    });
  } catch (err) {
    console.log(err);
    throw new Error("Error running app");
  }
}

// run app
asyncApp();
