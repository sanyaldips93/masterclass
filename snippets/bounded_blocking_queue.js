class MinimalistBlockingQueue {
    constructor(capacity) {
        this.capacity = capacity;
        this.queue = [];
        this.producerPromises = [];
        this.consumerPromises = [];
    }

    // Enqueue an item. Blocks if the queue is full.
    async enqueue(item) {
        // If the queue is full, create a promise and wait for it to be resolved.
        while (this.queue.length >= this.capacity) {
            console.log("Queue is full, producer is waiting...");
            await new Promise(resolve => this.producerPromises.push(resolve));
        }

        // Add the item to the queue
        this.queue.push(item);
        console.log(`Enqueued: ${item}. Current size: ${this.queue.length}`);

        // If there are waiting consumers, wake one up.
        if (this.consumerPromises.length > 0) {
            const resolve = this.consumerPromises.shift();
            resolve();
        }
    }

    // Dequeue an item. Blocks if the queue is empty.
    async dequeue() {
        // If the queue is empty, create a promise and wait for it to be resolved.
        while (this.queue.length === 0) {
            console.log("Queue is empty, consumer is waiting...");
            await new Promise(resolve => this.consumerPromises.push(resolve));
        }

        // Remove and return the item
        const item = this.queue.shift();
        console.log(`Dequeued: ${item}. Current size: ${this.queue.length}`);

        // If there are waiting producers, wake one up.
        if (this.producerPromises.length > 0) {
            const resolve = this.producerPromises.shift();
            resolve();
        }

        return item;
    }
}

// --- Example usage with async functions as producers and consumers ---

const queue = new MinimalistBlockingQueue(3);

// A producer function
async function producer() {
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, Math.random() * 2000 + 100));
        await queue.enqueue(`item_${i}`);
    }
}

// A consumer function
async function consumer() {
    for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, Math.random() * 5000 + 200));
        const item = await queue.dequeue();
    }
}

// Start the producer and consumer
(async () => {
    try {
        const producerJob = producer();
        const consumerJob = consumer();

        await Promise.all([producerJob, consumerJob]);
        console.log("All tasks completed.");
    } catch (error) {
        console.error("An error occurred:", error);
    }
})();