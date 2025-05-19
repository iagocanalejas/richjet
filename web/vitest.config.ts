import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults, coverageConfigDefaults, ConfigEnv } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
	viteConfig({} as ConfigEnv),
	defineConfig({
		test: {
			environment: 'jsdom',
			exclude: [...configDefaults.exclude, 'e2e/**'],
			root: fileURLToPath(new URL('./', import.meta.url)),
			coverage: {
				reporter: ['text', 'html', 'lcov'],
				exclude: [
					'**/*', // Exclude everything
					'!**/stores/*.ts', // Re-include specific folders
					...coverageConfigDefaults.exclude
				],
			},
		},
	}),
)
