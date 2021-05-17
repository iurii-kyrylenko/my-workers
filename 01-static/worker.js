const { parentPort } = require("worker_threads");

parentPort.on("message", data => {
  parentPort.postMessage({ n: data, fib: fib(data)});
});

function fib(n) {
  return n === 0 ? 0 :
         n === 1 ? 1 :
         fib(n-1) + fib(n-2);
}
