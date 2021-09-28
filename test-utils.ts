export const resetMockFor = (fn: Function, mockVersion: (...args: any) => any) => {
    // type guard so we can use the mock API inside
      if (jest.isMockFunction(fn)) {
        // Reset the mock call and return history before each test
        fn.mockReset();
    
        // mock behaviour for tests
        fn.mockImplementation(mockVersion);
      }
    }
