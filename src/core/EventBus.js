// Event bus for loose coupling between systems

export class EventBus {
    constructor() {
        this.events = new Map();
    }

    // Subscribe to an event
    on(eventName, callback) {
        if (!this.events.has(eventName)) {
            this.events.set(eventName, []);
        }
        this.events.get(eventName).push(callback);
    }

    // Unsubscribe from an event
    off(eventName, callback) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }

    // Emit an event with data
    emit(eventName, data) {
        if (!this.events.has(eventName)) return;
        
        const callbacks = this.events.get(eventName);
        callbacks.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event handler for '${eventName}':`, error);
            }
        });
    }

    // Clear all event listeners
    clear() {
        this.events.clear();
    }

    // Clear listeners for a specific event
    clearEvent(eventName) {
        this.events.delete(eventName);
    }
}