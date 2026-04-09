// jest.setup.js

// Mock global functions per localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock
})

// Mock de window
const windowMock = {
  location: {
    href: '',
    pathname: '/'
  }
}
Object.defineProperty(global, 'window', {
  value: windowMock
})

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks()
  localStorageMock.getItem.mockReturnValue(null)
  localStorageMock.setItem.mockImplementation(() => {})
  localStorageMock.removeItem.mockImplementation(() => {})
})