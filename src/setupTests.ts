import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock crypto.randomUUID if not present
if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
        value: {
            randomUUID: () => 'test-uuid-' + Math.random().toString(36).substring(2)
        }
    });
} else if (!global.crypto.randomUUID) {
    // @ts-ignore
    global.crypto.randomUUID = () => 'test-uuid-' + Math.random().toString(36).substring(2);
}

// Mock window.confirm
global.confirm = vi.fn(() => true);
global.alert = vi.fn();
global.scrollTo = vi.fn();
