const { worker } = require("cluster");
const EventEmitter = require("events");
const path = require("path");
const { Worker } = require("worker_threads");

async function createWorker() {
    return new Promise(resolve => {
        const worker = new Worker(path.resolve(__dirname, "worker.js"));
        worker.once("online", () => resolve(worker));
    });
}

function runTask(task, workerData, watcher) {
    if (!task) {
        return;
    }

    const worker = workerData.worker;

    workerData.isIdle = false;

    worker.postMessage({
        sfn: task.fn.toString(),
        params: task.params
    });

    worker.removeAllListeners();

    worker.once("message", msg => {
        workerData.isIdle = true;
        watcher.emit("ready", workerData);
        return task.resolve(msg);
    });

    worker.once("error", task.reject);
}

async function createWorkerPool(size) {
    const workers = [];
    const tasks = [];
    const watcher = new EventEmitter();

    for (let i = 0; i < size; i++) {
        const worker = await createWorker();
        workers.push({
            isIdle: true,
            worker
        });
    }

    watcher.on("ready", workerData => {
        runTask(tasks.shift(), workerData, watcher);
    });

    return {
        async exec(fn, params) {
            return new Promise((resolve, reject) => {
                tasks.push({ fn, params, resolve, reject });
                const workerData = workers.find(w => w.isIdle);
                if (workerData) {
                    runTask(tasks.shift(), workerData, watcher);
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

    const p1 = pool.exec(fib, 43)
        .then(console.log);

    const p2 = pool.exec(fib, 42)
        .then(console.log);

    const p3 = pool.exec(fib, 41)
        .then(console.log);

    const p4 = pool.exec(fib, 40)
        .then(console.log);

    const p5 = pool.exec(fib, 39)
        .then(console.log);

    const p6 = pool.exec(fib, 38)
        .then(console.log);

    const p7 = Promise
        .all([...Array(20).keys()].map(i => pool.exec(fact, BigInt(i))))
        .then(console.log);

    return Promise.all([p1, p2, p3, p4, p5, p6, p7])
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
