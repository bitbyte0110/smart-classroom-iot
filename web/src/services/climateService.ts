import type { ClimateState } from '../types';

// This interface defines the contract for climate data operations
// Later, this can be implemented with real Firebase functions
export interface ClimateService {
  readState(roomId: string): Promise<ClimateState | null>;
  writeState(roomId: string, data: Partial<ClimateState>): Promise<void>;
  writeCommand(roomId: string, cmd: Partial<ClimateState>): Promise<void>;
  subscribeToState(roomId: string, callback: (state: ClimateState | null) => void): () => void;
}

// Mock implementation for development/demo
class MockClimateService implements ClimateService {
  private state: ClimateState | null = null;
  private subscribers: ((state: ClimateState | null) => void)[] = [];

  async readState(roomId: string): Promise<ClimateState | null> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`Mock Climate read from /climate/${roomId}/state`);
    return this.state;
  }

  async writeState(roomId: string, data: Partial<ClimateState>): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`Mock Climate write to /climate/${roomId}/state:`, data);
    
    if (this.state) {
      this.state = { ...this.state, ...data };
      this.notifySubscribers();
    }
  }

  async writeCommand(roomId: string, cmd: Partial<ClimateState>): Promise<void> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log(`Mock Climate command to /climate/${roomId}/cmd:`, cmd);
    
    // In a real implementation, this would send commands to the hardware
    // For now, we'll just update the state directly
    if (this.state) {
      this.state = { ...this.state, ...cmd };
      this.notifySubscribers();
    }
  }

  subscribeToState(roomId: string, callback: (state: ClimateState | null) => void): () => void {
    console.log(`Mock Climate subscription to /climate/${roomId}/state`);
    this.subscribers.push(callback);
    
    // Send current state immediately
    callback(this.state);
    
    // Return unsubscribe function
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  // Internal method to notify all subscribers
  private notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.state));
  }

  // Method to set initial state (for testing/demo)
  setInitialState(state: ClimateState): void {
    this.state = state;
    this.notifySubscribers();
  }
}

// Real Firebase implementation (to be implemented later)
class FirebaseClimateService implements ClimateService {
  async readState(roomId: string): Promise<ClimateState | null> {
    // TODO: Implement Firebase read
    // const stateRef = ref(database, `/climate/${roomId}/state`);
    // const snapshot = await get(stateRef);
    // return snapshot.val();
    throw new Error('Firebase implementation not yet available');
  }

  async writeState(roomId: string, data: Partial<ClimateState>): Promise<void> {
    // TODO: Implement Firebase write
    // const stateRef = ref(database, `/climate/${roomId}/state`);
    // await update(stateRef, data);
    throw new Error('Firebase implementation not yet available');
  }

  async writeCommand(roomId: string, cmd: Partial<ClimateState>): Promise<void> {
    // TODO: Implement Firebase command write
    // const cmdRef = ref(database, `/climate/${roomId}/cmd`);
    // await update(cmdRef, cmd);
    throw new Error('Firebase implementation not yet available');
  }

  subscribeToState(roomId: string, callback: (state: ClimateState | null) => void): () => void {
    // TODO: Implement Firebase subscription
    // const stateRef = ref(database, `/climate/${roomId}/state`);
    // const unsubscribe = onValue(stateRef, (snapshot) => {
    //   callback(snapshot.val());
    // });
    // return unsubscribe;
    throw new Error('Firebase implementation not yet available');
  }
}

// Configuration to switch between mock and real implementation
const USE_MOCK_SERVICE = true; // Set to false when Firebase is ready

// Export the service instance
export const climateService: ClimateService = USE_MOCK_SERVICE 
  ? new MockClimateService() 
  : new FirebaseClimateService();

// Export the mock service for direct access (useful for setting initial state)
export const mockClimateService = climateService instanceof MockClimateService 
  ? climateService 
  : null;

// Helper function to initialize the service with mock data
export const initializeMockClimateService = (initialState: ClimateState): void => {
  if (mockClimateService) {
    mockClimateService.setInitialState(initialState);
  }
};
