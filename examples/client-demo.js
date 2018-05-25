/*
 * JSON-RPC 2.0 Client Demo for testing purposes
 * There no needs to deploy it in main source, so i placed it in examples.
 * But it should
 */

/**
 * new RpcClient(endpoint)
 * - endpoint (String): JsonRpc service endpoint URL (http://localhost/api)
 * Creates an RPC client object which parses the input, forwards the data
 * to a RPC method and outputs response messages.
 **/

const http = require('http'),
  https = require('https'),
  url = require('url')

function RpcClient (endpoint) {
  const URL = url.parse(endpoint)
  this._hostname = URL.hostname
  this._port = URL.port
  this._path = URL.path
  this._protocol = URL.protocol
}

RpcClient.prototype.Invoke = function () {
  var params = Array.prototype.slice.call(arguments),
    method = params.length && params.shift(),
    callback = params.length &&
      typeof params[params.length - 1] == 'function' &&
      params.pop(),
    id = Math.round(Math.random() * Number.MAX_SAFE_INTEGER),

    req = {
      jsonrpc: '2.0',
      method: method,
      params: params,
      id: id
    }

  if (!method)
    return false;

  var body = JSON.stringify(req)

  var options = {
    hostname: this._hostname,
    port: this._port,
    path: this._path,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(body)
    }
  };
  var transport = this._protocol == 'http:'?http:https
  var req = transport.request(options, function (res) {
    console.log('Status: ' + res.statusCode);
    console.log('Headers: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');
    res.on('data', function (response) {
      var message = JSON.parse(response);
      console.log('MESSAGE', message)
      if (id) {
        if (message && message.result && callback) {
          callback(message.result);
        } else {
          callback({error: message.error || 'Runtime error'})
        }
      }
    });
  });
  req.on('error', function (e) {
    console.log('problem with request: ' + e.message);
  });

  // write data to request body
  req.write(body);
  req.end();
}

/*
 * Lets invoke an JSON-RPC procedure from our server-demo.js
 */

var JsonRpc = new RpcClient('http://127.0.0.1:9080/api')

JsonRpc.Invoke('insert', 1, 2, (res) => {
  console.log('FROM CALLBACK', res)
})