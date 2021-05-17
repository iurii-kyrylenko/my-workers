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

  function _runTask(fn, params, workerData, resolve, reject) {
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
    worker.postMessage({ sfn: fn.toString(), params });
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
          _runTask(fn, params, workerData, resolve, reject);
        }
        else {
          const timer = setInterval(() => {
            const workerData = workers.find(w => w.isIdle);
            if (workerData) {
              clearInterval(timer);
              _runTask(fn, params, workerData, resolve, reject);
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
  try {
    console.log(await pool.exec(fib, 41));
    console.log(await Promise.all([
      pool.exec(fib, 40),
      pool.exec(fib, 41),
      pool.exec(fib, 42),
      pool.exec(fact, 1n),
      pool.exec(fact, 2n),
      pool.exec(fact, 3n),
      pool.exec(fact, 4n),
      pool.exec(fact, 5n),
      pool.exec(fact, 6n),
      pool.exec(fact, 7n),
      pool.exec(fact, 8n),
      pool.exec(fact, 9n),
      pool.exec(fact, 10n),
      pool.exec(fact, 11n),
      pool.exec(fact, 12n),
      pool.exec(fact, 13n),
      pool.exec(fact, 14n)
    ]));
    console.log(await pool.exec(fib, 38));
    console.log(await pool.exec(fib, 39));
    console.log(await pool.exec(fib, 40));
    console.log(await pool.exec(fact, 10n));
    console.log(await pool.exec(fact, 20n));
    console.log(await pool.exec(fib, 41));
    console.log(await pool.exec(withError));
    console.log(await pool.exec(fact, 5n));
  } finally {
    pool.terminate();
  }
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
