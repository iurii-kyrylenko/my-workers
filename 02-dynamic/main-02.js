const path = require("path");
const { Worker } = require("worker_threads");
const worker = new Worker(path.resolve(__dirname, "worker.js"));

worker.on("online", () => console.log("=== online ==="));

function exec(fn, params) {
  return new Promise((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.postMessage({ sfn: fn.toString(), params });
  });
}

exec(fact, 100n)
  .then(console.log)
  .then(() => exec(fib, 42))
  .then(console.log)
  .then(() => worker.terminate())
  .catch(console.error);


function fib(n) {
  return n === 0 ? 0 :
         n === 1 ? 1 :
         fib(n - 2) + fib(n - 1);
}

function fact(n) {
  return n === 0n ? 1n :
         n * fact(n - 1n);
}
