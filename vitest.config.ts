import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    test: {
        environment: 'node', // Use node for crypto tests
        globals: true,
        include: ['src/**/*.test.ts'],
        exclude: ['node_modules', '.next'],
        testTimeout: 60000, // RSA key generation can be slow
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
})
