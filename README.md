# node-jsonrpc2
JSON-RPC 2.0 pure transport agnostic implementation for node.js.


This module makes it easy to process and respond to JSON-RPC (v2.0) messages.

JSON-RPC is an extremely simple format to communicate between the client (for example browser) and the host (server).
It's an easy way to run functions server side by providing the server the function name that needs to be executed and the params alongside with it.
Server runs this function and returns the results for it.

Illustrating pseudocode

    --> RUN FUNCTION "add_comment" WITH "user", "this is cool!"
    <-- RETURN add_comment("user", "this is cool")
    

You can find the full JSON-RPC specification [here](http://www.jsonrpc.org/specification "RPC 2.0 Specification").

## Why i created yet another JSON-RPC 2.0 module

I needed a JSON-RPC2 library which comply with Unix Philosophy (by Peter H. Salus in A Quarter-Century of Unix at 1994): 

- Write programs that do one thing and do it well.
- Write programs to work together.
- Write programs to handle text streams, because that is a universal interface.

#### and nothing else...

## Installation

You can install this package through npm

    npm install @ohyo-io/jsonrpc2
    
After this you can require the RPCHandler with

    var rpc = require("jsonrpc2").Service;


## Server side node.JS

Main handler for the RPC request is jsonrpc.RPCHandler - this is a constructor function that handles the RPC request all the way to the final output. You don't have to call response.end() for example, this is done by the handler object.

    var RPCHandler = require("jsonrpc2").RPCHandler;
    new RPCHandler(request, response, RPCMethods, debug=false);
    
Service construtor takes the following parameters
    
 - request: http.ServerRequest object
 - rsponse: http.ServerResponse object
 - RPCMethods: object that holds all the available methods
       RPCMethods: {
           method_name: function(rpc){
               rpc.response("hello world!");
           }
       }
   NB! method names that start with an underscore are private!
 
*Example script*

Server accepts method calls for "check" - this method checks if the two used parameters are equal or not.

    const http = require('http'),
      RpcService = require('jsonrpc2').RpcService,
      PORT = 9080
    
    
    // start server
    http.createServer(function (request, response) {
    
      if (request.method == 'POST') {
        // if POST request, handle RPC
        new RpcService(request, response, RPCMethods, true);
      } else {
        // if GET request response with greeting
        response.end('Hello world!');
      }
    
    }).listen(PORT);
    console.log('running on http://127.0.0.1:' + PORT)
    
    // Define available RPC methods
    // NB! Methods with leading _ before method names are considered
    //     private and can't be used publicly
    // WHY IT? Becouse we pass RPCMethods object to handler, so you can create shared functions. Profit!!!
    
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

## Cliend side JavaScript

To send a RPC call to the server, the message needs to be sent as the request body. This can't be done with forms (as form data is urlencoded etc.) but can be done with AJAX calls.

#### Request message formatting:

    {
        "jsonrpc": "2.0",
        "method": "method name to run",
        "params": ["array", "of", "params"],
        "id":     "id value (optional)"
    }

If `id` value is not set, then server takes this as a notification and return nothing (output is empty).
Parameter values are given to the RPC method as regular variables in the same order they are set in the array:

    "params": ["val1", "val2", "val3"]
    
Will be used as

    method = function(rpc, param1, param2, param3){
        console.log(param1); //val1
        console.log(param2); //val2
        console.log(param3); //val3
    }

The first parameter passed to the method is the RPCHandler object. It has two public methods - `response` and `error`.

    rpc.response("This is the normal response output");
    rpc.error("This is the output in case of error");

After you send the response (be it either `response` or `error` the http.ServerResponse connection is closed so you can't do much after it.

#### Server response

    {
        "result": "some kind of output, or null id error occured",
        "error" : "null or an error message",
        "id"    : "the same id value that was used wit the request"
    }

`result` can be any type (string, number, boolean, object, array).

For example if we need to run a RPC method named "check" with params "value" and "other" then we can do it like this (using Prototype library):

    new Ajax.Request("/path/to/rpc",{
        method: "post",
        postBody: Object.toJSON(
            {
                method: "check",
                params: ["value","other"],
                id:     1
            }),
        onComplete: function(response){
            var r = response.responseText.evalJSON();
            if(r.error)
                alert("ERROR: "+r.error);
            else
                alert("OK: "+r.result);
        }
    });

## Sample message traffic

#### rpc call with positional parameters:

    --> {"jsonrpc": "2.0", "method": "subtract", "params": [42, 23], "id": 1}
    <-- {"jsonrpc": "2.0", "result": 19, "id": 1}
    
    --> {"jsonrpc": "2.0", "method": "subtract", "params": [23, 42], "id": 2}
    <-- {"jsonrpc": "2.0", "result": -19, "id": 2}

#### rpc call with named parameters:

    --> {"jsonrpc": "2.0", "method": "subtract", "params": {"subtrahend": 23, "minuend": 42}, "id": 3}
    <-- {"jsonrpc": "2.0", "result": 19, "id": 3}
    
    --> {"jsonrpc": "2.0", "method": "subtract", "params": {"minuend": 42, "subtrahend": 23}, "id": 4}
    <-- {"jsonrpc": "2.0", "result": 19, "id": 4}

#### a Notification:

    --> {"jsonrpc": "2.0", "method": "update", "params": [1,2,3,4,5]}
    --> {"jsonrpc": "2.0", "method": "foobar"}

#### rpc call of non-existent method:

    --> {"jsonrpc": "2.0", "method": "foobar", "id": "1"}
    <-- {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "1"}
    
#### rpc call with invalid JSON:

    --> {"jsonrpc": "2.0", "method": "foobar, "params": "bar", "baz]
    <-- {"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}

#### rpc call with invalid Request object:

    --> {"jsonrpc": "2.0", "method": 1, "params": "bar"}
    <-- {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}

#### rpc call Batch, invalid JSON:

    --> [
      {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},
      {"jsonrpc": "2.0", "method"
    ]
    <-- {"jsonrpc": "2.0", "error": {"code": -32700, "message": "Parse error"}, "id": null}

#### rpc call with an empty Array:
    --> []
    <-- {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}

#### rpc call with an invalid Batch (but not empty):
    --> [1]
    <-- [
      {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}
    ]

#### rpc call with invalid Batch:

    --> [1,2,3]
    <-- [
      {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null},
      {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null},
      {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null}
    ]

#### rpc call Batch:

    --> [
            {"jsonrpc": "2.0", "method": "sum", "params": [1,2,4], "id": "1"},
            {"jsonrpc": "2.0", "method": "notify_hello", "params": [7]},
            {"jsonrpc": "2.0", "method": "subtract", "params": [42,23], "id": "2"},
            {"foo": "boo"},
            {"jsonrpc": "2.0", "method": "foo.get", "params": {"name": "myself"}, "id": "5"},
            {"jsonrpc": "2.0", "method": "get_data", "id": "9"} 
        ]
    <-- [
            {"jsonrpc": "2.0", "result": 7, "id": "1"},
            {"jsonrpc": "2.0", "result": 19, "id": "2"},
            {"jsonrpc": "2.0", "error": {"code": -32600, "message": "Invalid Request"}, "id": null},
            {"jsonrpc": "2.0", "error": {"code": -32601, "message": "Method not found"}, "id": "5"},
            {"jsonrpc": "2.0", "result": ["hello", 5], "id": "9"}
        ]
#### rpc call Batch (all notifications):

    --> [
            {"jsonrpc": "2.0", "method": "notify_sum", "params": [1,2,4]},
            {"jsonrpc": "2.0", "method": "notify_hello", "params": [7]}
        ]
    <-- //Nothing is returned for all notification batches