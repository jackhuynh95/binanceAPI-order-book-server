# Binance Market Info API

The following is a REST API build using nodejs and expressjs, it uses websocket connections to the BINANCE API to retrieve and build a local in-memory orderbook for a set of specified pairs ('btcusdt', 'ethusdt' and 'bnbusdt'). The REST server exposes the following endpoints:
* `/api/v1/pairs` > Returns a list of available pairs.
* `/api/v1/pairs/:pair` > Returns the top bids and asks for the specified pair.
* `/api/v1/eff-price/:pairName-:opType-:amount?limit={LIMIT}` > Given a pair name, operation type and amount to trade this endpoint returns the effective price. If a 'limit' value is specified it retrieves the maximum order size that can be executed.

And The SOCKET server exposes the following events:
* `pair-token` > Give the specified pair for the top bids and asks.
* `pair-info` > Returns the top bids and asks for the specified pair.
* `pair-extra` > Returns the 24-hour price change and volume for the specified pair.

# Install

Clone the repo using the following command:
```
git clone git@github.com:jackhuynh95/binanceAPI-order-book-server.git
```

After cloning the repo, run the following command to install all the dependencies:
```
npm install
```

# Run tests
The application uses Mocha for running unit test. To run the test simply use the following command:
```
npm run test
```

# REST API

## Get list of available pairs
### Request
`GET /api/v1/pairs`

```
curl localhost:3001/api/v1/pairs
```

### Response

```
{"result":["btcusdt","ethusdt","bnbusdt"]}
```

## Get top bids and asks for a given pair
### Request
`GET /api/v1/pairs/:pair`

```
curl localhost:3001/api/v1/pairs/btcusdt
```

### Response
```
{"result":{"bids":"[[\"20216.69000000\",\"0.00888000\"],[\"20216.68000000\",\"0.02775000\"],[\"20215.89000000\",\"0.00269000\"],[\"20215.88000000\",\"0.08148000\"],[\"20215.87000000\",\"0.10247000\"]]","asks":"[[\"20211.25000000\",\"0.01827000\"],[\"20211.32000000\",\"0.00000000\"],[\"20211.38000000\",\"0.01100000\"],[\"20211.39000000\",\"0.76687000\"],[\"20211.91000000\",\"0.00000000\"]]"}}
```

## Get effective price for a given pair, amount and operation type
### Request
`GET /api/v1/eff-price/:pairName-:opType-:amount?limit={LIMIT} `

```
curl localhost:3001/api/v1/eff-price/btcusdt-sell-200
```

### Response
```
{"result":20198.81}
```

## Get maximum order size for a given pair, limit and operation type
### Request
`GET /api/v1/eff-price/:pairName-:opType-:amount?limit={LIMIT} `

```
curl localhost:3001/api/v1/eff-price/btcusdt-sell-200?limit=20198
```

### Response on success
```
{"result":56.505560236602605}
```

### Response on error
```
{"result":"Order query outside of range of current orderbook"}
```

# SOCKET

## Get top bids and asks for a given pair
### Request

```
io.emit('message', ['pair-token', pair]);
```

### Response

```
io.on('message', ['pair-info', {"result":{"bids":"[[\"20216.69000000\",\"0.00888000\"],[\"20216.68000000\",\"0.02775000\"],[\"20215.89000000\",\"0.00269000\"],[\"20215.88000000\",\"0.08148000\"],[\"20215.87000000\",\"0.10247000\"]]","asks":"[[\"20211.25000000\",\"0.01827000\"],[\"20211.32000000\",\"0.00000000\"],[\"20211.38000000\",\"0.01100000\"],[\"20211.39000000\",\"0.76687000\"],[\"20211.91000000\",\"0.00000000\"]]"}}]);
```

## Get 24-hour price change and volume for a given pair
### Request

```
io.emit('message', ['pair-token', pair]);
```

### Response

```
io.on('message', ['pair-extra', {"result": "high_price": "...", low_price": "...", price_change": "...", volume": "..." }]);
```
