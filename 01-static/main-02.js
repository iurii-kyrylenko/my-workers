const { Worker } = require("worker_threads");

const worker = new Worker(__dirname + "/worker.js");

const exec = data => worker => {
  return new Promise((resolve, reject) => {
    worker.once("message", resolve);
    worker.once("error", reject);
    worker.postMessage(data);
  });
}

exec(40)(worker)
  .then(console.log)
  .then(() => exec(41)(worker))
  .then(console.log)
  .catch(console.error);
