/**
 * Simple in-memory state manager for demo mode
 * In production, this would use Redis or a database
 */

class StateManager {
    constructor() {
        this.state = {
            // Simulation state
            isSimulating: false,

            // Error injection state
            errorInjectionMode: false,
            errorInjectionStartTime: null,

            // Stats
            totalEventsGenerated: 0,
            totalErrorsInjected: 0,
        };
    }

    // Simulation
    setSimulating(value) {
        this.state.isSimulating = value;
    }

    isSimulating() {
        return this.state.isSimulating;
    }

    // Error Injection
    enableErrorInjection() {
        this.state.errorInjectionMode = true;
        this.state.errorInjectionStartTime = Date.now();
        console.log('[state] error injection enabled');
    }

    disableErrorInjection() {
        this.state.errorInjectionMode = false;
        this.state.errorInjectionStartTime = null;
        console.log('[state] error injection disabled');
    }

    isErrorInjectionEnabled() {
        return this.state.errorInjectionMode;
    }

    incrementErrorCount() {
        this.state.totalErrorsInjected++;
    }

    // Stats
    incrementEventCount() {
        this.state.totalEventsGenerated++;
    }

    getStats() {
        return {
            ...this.state,
            errorInjectionDuration: this.state.errorInjectionStartTime
                ? Date.now() - this.state.errorInjectionStartTime
                : 0,
        };
    }

    resetStats() {
        this.state.totalEventsGenerated = 0;
        this.state.totalErrorsInjected = 0;
    }
}

export const State = new StateManager();
