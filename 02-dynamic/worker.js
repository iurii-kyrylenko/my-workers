const { parentPort } = require("worker_threads");

parentPort.on("message", ({ sfn, params }) => {
  const fn = new Function("return " + sfn)();
  const result = fn(params);
  parentPort.postMessage({ params, result })
});
