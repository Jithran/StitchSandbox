.DEFAULT_GOAL := help
.PHONY: help install dev build preview lint typecheck clean

help: ## Show available targets
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	npm install

dev: ## Run the dev server on http://localhost:5173
	npm run dev

build: ## Type-check and build for production (-> dist/)
	npm run build

preview: build ## Serve the production build on http://localhost:4173
	npm run preview

lint: ## Run ESLint
	npm run lint

typecheck: ## Type-check without emitting
	npx tsc -b

clean: ## Remove build output and caches
	rm -rf dist node_modules/.vite node_modules/.tmp
