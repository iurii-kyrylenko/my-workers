const { Worker } = require("worker_threads");

const worker = new Worker(__dirname + "/worker.js");
worker.on("message", console.log);

worker.postMessage(40);
worker.postMessage(41);
worker.postMessage(42);
