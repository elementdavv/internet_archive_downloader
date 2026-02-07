/*
 * queue.js
 * Copyright (C) 2023 Element Davv<elementdavv@hotmail.com>
 *
 * Distributed under terms of the GPL3 license.
 */

class Queue {
    constructor() {
        this.items = {};
        this.headIndex = 0;
        this.tailIndex = 0;
    }

    enque(item) {
        this.items[this.tailIndex] = item;
        this.tailIndex++;
    }

    deque() {
        const item = this.items[this.headIndex];
        delete this.items[this.headIndex];
        this.headIndex++;
        return item;
    }

    peek() {
        return this.items[this.headIndex];
    }

    get isEmpty() {
        return this.headIndex == this.tailIndex;
    }
}

export default Queue;
