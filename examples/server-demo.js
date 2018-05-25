const http = require('http'),
  RpcService = require('../jsonrpc').RpcService,
  PORT = 9080


// start server
http.createServer(function (request, response) {

  if (request.method == 'POST') {
    // if POST request, handle RPC
    new RpcService(request, response, RPCMethods);
  } else {
    // if GET request response with greeting
    response.end('Hello world!');
  }

}).listen(PORT);

console.log('running on http://127.0.0.1:' + PORT)

// Define available RPC methods
// NB! Methods with leading _ before method names are considered
//     private and can't be used publicly

// WHY IT? Becouse we pass RPCMethods object to handler, so you can create shared functions. Profit ))
RPCMethods = {
  insert: function (rpc, param1, param2) {
    if (param1 != param2) {
      console.log('Params doesn\'t match!')
      rpc.error('Params doesn\'t match!')
    } else {
      console.log('Params are OK!')
      rpc.response('Params are OK!')
    }
  },
  _private: function () {
    // this method is private and can't be accessed by the public interface
  }
}
