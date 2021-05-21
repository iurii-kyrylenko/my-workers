const path = require("path");
const { Worker } = require("worker_threads");

async function createWorker() {
  return new Promise(resolve => {
    const worker = new Worker(path.resolve(__dirname, "worker.js"));
    worker.once("online", () => resolve(worker));
  });
}

async function createWorkerPool(size) {
  const workers = [];
  const tasks = [];

  function _runTask(workerData, resolve, reject) {
    const worker = workerData.worker;
    const task = tasks.shift();
    if (!task) {
      return;
    }
    workerData.isIdle = false;
    worker.removeAllListeners();
    worker.once("message", msg => {
      workerData.isIdle = true;
      return resolve(msg);
    });
    worker.once("error", reject);
    worker.postMessage({
      sfn: task.fn.toString(),
      params: task.params
    });
  }

  for (let i = 0; i < size; i++) {
    const worker = await createWorker();
    workers.push({
      isIdle: true,
      worker
    });
  }

  return {
    async exec(fn, params) {
      return new Promise((resolve, reject) => {
        tasks.push({ fn, params });
        const workerData = workers.find(w => w.isIdle);
        if (workerData) {
          _runTask(workerData, resolve, reject);
        }
        else {
          const timer = setInterval(() => {
            const workerData = workers.find(w => w.isIdle);
            if (workerData) {
              clearInterval(timer);
              _runTask(workerData, resolve, reject);
            }
          }, 100);
        }
      });
    },

    async terminate() {
      return Promise.all(workers.map(w => w.worker.terminate()));
    }
  };
}

process.on('uncaughtException', error => {
  console.error(error);
  process.exit(1);
});

async function main() {
  const pool = await createWorkerPool(3);

  const p1 = pool.exec(fib, 42)
    .then(console.log);

  const p2 = pool.exec(fib, 41)
    .then(console.log);

  const p3 = pool.exec(fib, 40)
    .then(console.log);

  const p4 = pool.exec(fib, 39)
    .then(console.log);

    const p5 = pool.exec(fib, 38)
    .then(console.log);

  const p6 = pool.exec(fact, 30n)
    .then(console.log);

  return Promise.all([p1, p2, p3, p4, p5, p6])
    .finally(pool.terminate);
}

function fib(n) {
  return n === 0 ? 0 :
         n === 1 ? 1 :
         fib(n - 2) + fib(n - 1);
}

function fact(n) {
  return n === 0n ? 1n :
         n * fact(n - 1n);
}

function withError() {
  throw new Error("=== MY ERROR ====")
}

// backgrund task
let tick = 0;
setInterval(() => console.log(tick++), 1000).unref();

main()
  .catch(console.error);
