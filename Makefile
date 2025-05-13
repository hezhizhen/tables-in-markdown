SHELL := /bin/bash

.PHONY: help serve generate_pages

TITLE_JSON = title.json
PAGE_TEMPLATE = page_template.html

help:
	@echo "Available commands:"
	@echo "  make serve              - Generate files and start a local HTTP server"
	@echo "  make generate_pages     - Generate individual HTML pages for each CSV file (using title.json)"
	@echo "  make all                - Generate all HTML pages (title.json must be maintained manually)"

default: all serve

all: clean generate_pages

serve: all
	@echo "Starting local server at http://localhost:8000/"
	@python3 -m http.server 8000

generate_pages:
	@echo "Generating individual HTML pages from $(PAGE_TEMPLATE)..."; \
	if [ ! -f "$(TITLE_JSON)" ]; then \
		echo "Error: $(TITLE_JSON) not found. Please ensure it exists and is correctly populated."; \
		exit 1; \
	fi; \
	# Sanity check for title.json content (re-adding this)
	if ! jq -e . "$(TITLE_JSON)" >/dev/null 2>&1 || ! jq -e 'if type == "object" then true else false end' "$(TITLE_JSON)" >/dev/null 2>&1 ; then \
		echo "Error: $(TITLE_JSON) is empty, not valid JSON, or not a JSON object." >&2; \
		cat "$(TITLE_JSON)"; \
		exit 1; \
	fi; \
	jq -r 'to_entries[] | .key' "$(TITLE_JSON)" | while read -r csv_file; do \
		if [ -z "$$csv_file" ]; then \
			continue; \
		fi; \
		html_file=$$(echo "$$csv_file" | sed 's/\.csv$$/.html/'); \
		csv_basename=$$(echo "$$csv_file" | sed 's/\.csv$$//'); \
		formatted_title=$$(jq -r --arg key "$$csv_file" '.[$$key]' "$(TITLE_JSON)" 2>/dev/null); \
		if [ -z "$$formatted_title" ] || [ "$$formatted_title" == "null" ]; then \
			formatted_title="$$csv_basename"; \
		fi; \
		echo "  Generating $$html_file for $$csv_file (Title: $$formatted_title)..."; \
		sed -e "s/%%CSV_FILENAME%%/$$csv_file/g" \
		    -e "s/%%CSV_BASENAME%%/$$csv_basename/g" \
		    -e "s/%%FORMATTED_TITLE%%/$$formatted_title/g" \
		    "$(PAGE_TEMPLATE)" > "$$html_file"; \
	done; \
	echo "Individual HTML pages generated."

clean:
	@echo "Cleaning generated HTML files (except index.html, page_template.html)..."
	@if [ -f $(TITLE_JSON) ]; then \
		jq -r 'to_entries[] | .key' $(TITLE_JSON) | while read csv_file; do \
			html_file=$$(echo "$$csv_file" | sed 's/\.csv$$/.html/'); \
			rm -f "$$html_file"; \
		done; \
	fi
	@echo "Clean complete."
