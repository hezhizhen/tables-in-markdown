SHELL := /bin/bash

.PHONY: help serve

help:
	@echo "  make serve - Start a local HTTP server"

serve:
	@echo "Starting local server at http://localhost:8000/"
	@python3 -m http.server 8000
