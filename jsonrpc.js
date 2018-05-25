/*
 * JSON-RPC 2.0
 * http://www.jsonrpc.org/specification
 * 
 * Manages RPC-JSON messages
 * 
 * Sample usage:
 * 
 *     var http = require('http'),
 *         RpcService = require('./jsonrpc').RpcService;
 *
 *     http.createServer(function (request, response) {
 *         if(request.method == 'POST'){
 *             new RpcService(request, response, RPCMethods, true);
 *         }else{
 *             response.end('Hello world!');
 *         }
 *     }).listen(80);
 * 
 *     RPCMethods = {
 *         insert: function(rpc, param1, param2){
 *             if(param1!=param2)
 *                 rpc.error('Params doesn\'t match!');
 *             else
 *                 rpc.response('Params are OK!');
 *         },
 *         _private: function(){
 *             // leading underscore makes method private
 *             // and not accessible by public RPC interface
 *         }
 *     }
 * 
 * Sample message traffic:
 * 
 * --> {"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}
 * <-- {"jsonrpc": "2.0", "result": 19, "id": 1}
 * 
 * --> {"jsonrpc": "2.0", "method": "subtract", "params": [23, 42], "id": 2}
 * <-- {"jsonrpc": "2.0", "result": -19, "id": 2}
 * 
 */

exports.RpcService = RpcService;

/**
 * new RpcService(request, response, methods, debug)
 * - request (Object): http.ServerRequest object
 * - response (Object): http.ServerResponse object
 * - methods (Object): available RPC methods.
 *       methods = {insert: function(rpc, param1, param2, ... paramN){})
 * 
 * Creates an RPC handler object which parses the input, forwards the data
 * to a RPC method and outputs response messages.
 **/
function RpcService (request, response, methods, debug) {
  this.RPCMethods = methods;
  this.HTTPRequest = request;
  this.HTTPResponse = response;
  this.json = false;
  this.id = false;

  if (typeof this.RPCMethods == 'object' && this.HTTPRequest && this.HTTPResponse) {
    // start post body processing
    this._processRequest();
  } else {
    throw new Error('Invalid params');
  }
}

//////////// PUBLIC METHODS ////////////

/**
 * RpcService.prototype.error = function(error) -> Boolean
 * - error (String): Error message
 *
 * Sends an error message if error occured.
 * Returns true if a message was sent and false if blank was sent
 **/
RpcService.prototype.error = function (error) {
  return this._output(false, error);
}

/**
 * RpcService.prototype.response = function(result) -> Boolean
 * - result (String): Response message
 *
 * Sends the response message if everything was successful
 * Returns true if a message was sent and false if blank was sent
 **/
RpcService.prototype.response = function (result) {
  return this._output(result, false);
}

//////////// PRIVATE METHODS ////////////

/**
 * RpcService._processRequest() -> undefined
 *
 * Runs after the initialization. Calls the handler to process request body
 **/
RpcService.prototype._processRequest = function () {
  this._post_handler();
}

/**
 * RpcService._run() -> undefined
 *
 * Checks if input is correct and passes the params to an actual RPC method
 **/
RpcService.prototype._run = function () {

  if (!this.json)
    return this.error();

  if (!this.RPCMethods)
    return this.error('No methods', this.id);

  if (!this.json.method || // method name must be set
    this.json.method.substr(0, 1) == '_' || // method name cant begin with an underscore
    !this.json.method in this.RPCMethods || // method needs to be inside this.RPCMethods
    typeof this.RPCMethods[this.json.method] != 'function') // method needs to be function
    return this.error('Invalid request method', this.id);

  // runs the actual RPC method
  this.RPCMethods[this.json.method].apply(
    this.RPCMethods, [this].concat(this.json.params || []));
}

/**
 * RpcService._output(result, error) -> Boolean
 * - result (String): response message
 * - error (String): error message
 *
 * Creates the response, outputs it and closes the connection.
 * Returns true if a message was sent and false if blank was sent
 **/
RpcService.prototype._output = function (result, error) {
  this.HTTPResponse.writeHead(error ? 500 : 200, {'Content-Type': 'application/json'});
  if (typeof this.id == 'undefined' || this.id === null) {
    this.HTTPResponse.end();
    return false;
  } else {
    var resp = {
      'jsonrpc': '2.0',
      id: this.id
    }

    if (error) {
      resp.error = error
    } else {
      resp.result = result
    }

    this.HTTPResponse.end(JSON.stringify(resp));
    return true;
  }
}

/**
 * RpcService._post_handler() -> undefined
 *
 * Checks if request is valid and handles all errors
 */
RpcService.prototype._post_handler = function () {
  this.HTTPRequest.setEncoding('utf8');
  var that = this;
  this._post_body_handler(function (body) {
    try {
      that.json = JSON.parse(body);
      that.id = that.json && that.json.id;
      that._run();
    } catch (E) {
      console.log(E.message)
      that.error('Runtime error', -1);
    }
  });
}

/**
 * RpcService._post_body_handler(callback) -> undefined
 * - callback (Function): callback function to be called with the complete body
 *
 * Parses the request body into one larger string
 */
RpcService.prototype._post_body_handler = function (callback) {
  var _CONTENT = '';

  this.HTTPRequest.addListener('data', function (chunk) {
    _CONTENT += chunk;
  });

  this.HTTPRequest.addListener('end', function () {
    callback(_CONTENT);
  });
}
