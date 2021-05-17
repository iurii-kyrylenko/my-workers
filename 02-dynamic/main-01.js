const path = require("path");
const { Worker } = require("worker_threads");
const worker = new Worker(path.resolve(__dirname, "worker.js"));

worker.on("message", console.log);
worker.on("error", console.error);

function fib(n) {
  return n === 0 ? 0 :
         n === 1 ? 1 :
         fib(n - 2) + fib(n - 1);
}

function fact(n) {
  return n === 0 ? 1 :
         n * fact(n - 1);
}

worker.postMessage({ sfn: fib.toString(), params: 40 });
worker.postMessage({ sfn: fact.toString(), params: 20 });
